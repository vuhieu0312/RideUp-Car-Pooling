import { AppState } from 'react-native';
import { getFreshAccessToken, getWsUrl } from '../api/api';

// Client STOMP tối giản qua WebSocket (không cần cài thư viện).
// Server gửi sự kiện về /user/queue/events với body JSON: { type, ... }

// Log để kiểm tra realtime (chỉ khi dev). Xem trong terminal Expo / console trình duyệt, lọc "[RT]".
const t = () => new Date().toISOString().slice(11, 23);
export const rtLog = (...args) => { if (__DEV__) console.log(`[RT ${t()}]`, ...args); };

const listeners = new Set();
let socket = null;
let connected = false;
let wanted = false; // true khi đã đăng nhập và muốn giữ kết nối
let retry = 0;
let retryTimer = null;
let connectTimer = null; // chờ CONNECTED quá lâu → đóng và nối lại
const CONNECT_TIMEOUT_MS = 10000;

export const isRealtimeConnected = () => connected;

/** Đăng ký nhận sự kiện. Trả về hàm huỷ đăng ký. */
export function subscribeEvents(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(event) {
  listeners.forEach((fn) => {
    try { fn(event); } catch (e) { /* bỏ qua lỗi của listener */ }
  });
}

// React Native (Android/iOS) cắt chuỗi tại ký tự NULL khi gửi WebSocket dạng text → frame STOMP mất "\0" ở cuối,
// Spring đợi mãi không xử lý CONNECT. Vì vậy luôn gửi frame dạng BINARY (UTF-8 bytes), nhận thì chấp nhận cả text lẫn binary.
function utf8Encode(str) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
  const out = [];
  for (let i = 0; i < str.length; i += 1) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
      c = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(i + 1) - 0xdc00);
      i += 1;
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return new Uint8Array(out);
}

function utf8Decode(buf) {
  const bytes = new Uint8Array(buf);
  if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(bytes);
  let out = '';
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i];
    let c;
    if (b < 0x80) { c = b; i += 1; }
    else if (b < 0xe0) { c = ((b & 31) << 6) | (bytes[i + 1] & 63); i += 2; }
    else if (b < 0xf0) { c = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63); i += 3; }
    else { c = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63); i += 4; }
    out += String.fromCodePoint(c);
  }
  return out;
}

function sendFrame(command, headers, body = '') {
  if (!socket || socket.readyState !== 1) return;
  const head = Object.entries(headers).map(([k, v]) => `${k}:${v}`).join('\n');
  const bytes = utf8Encode(`${command}\n${head}\n\n${body}\0`);
  // Gửi ArrayBuffer cắt đúng độ dài (một số runtime không nhận Uint8Array trực tiếp)
  socket.send(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

function handleFrame(frame) {
  const text = frame.replace(/^\n+/, '');
  if (!text) return;
  const sep = text.indexOf('\n\n');
  const head = sep >= 0 ? text.slice(0, sep) : text;
  const body = sep >= 0 ? text.slice(sep + 2) : '';
  const command = head.split('\n')[0];
  if (command === 'CONNECTED') {
    connected = true;
    retry = 0;
    if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
    rtLog('CONNECTED — đang nhận realtime qua WebSocket');
    sendFrame('SUBSCRIBE', { id: 'sub-0', destination: '/user/queue/events' });
    emit({ type: 'CONNECTED' });
  } else if (command === 'ERROR') {
    rtLog('STOMP ERROR', head, body);
  } else if (command === 'MESSAGE') {
    try {
      const event = JSON.parse(body);
      rtLog('EVENT', event.type, event);
      emit(event);
    } catch (e) { /* bỏ qua */ }
  }
}

function scheduleReconnect() {
  if (!wanted || retryTimer) return;
  const delay = Math.min(30000, 1000 * 2 ** retry) + Math.random() * 500;
  retry += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    connect();
  }, delay);
}

function closeSocket() {
  if (!socket) return;
  const s = socket;
  socket = null;
  s.onopen = null;
  s.onmessage = null;
  s.onerror = null;
  s.onclose = null;
  try { s.close(); } catch (e) { /* bỏ qua */ }
}

async function connect() {
  if (!wanted || socket) return;
  // Token hết hạn thì refresh trước — nếu không handshake sẽ bị từ chối mãi
  const token = await getFreshAccessToken();
  if (!token) { rtLog('không có token hợp lệ → chưa kết nối'); scheduleReconnect(); return; }
  if (!wanted || socket) return;

  rtLog('connecting', getWsUrl());
  const s = new WebSocket(`${getWsUrl()}?token=${encodeURIComponent(token)}`);
  socket = s;
  s.binaryType = 'arraybuffer';
  s.onopen = () => {
    rtLog('socket mở, gửi STOMP CONNECT');
    sendFrame('CONNECT', { 'accept-version': '1.2', host: 'rideup', 'heart-beat': '0,0' });
    connectTimer = setTimeout(() => {
      connectTimer = null;
      if (!connected && socket === s) {
        rtLog(`không nhận được CONNECTED sau ${CONNECT_TIMEOUT_MS / 1000}s → đóng và nối lại`);
        try { s.close(); } catch (err) { /* bỏ qua */ }
      }
    }, CONNECT_TIMEOUT_MS);
  };
  s.onmessage = (e) => {
    const text = typeof e.data === 'string' ? e.data : utf8Decode(e.data);
    // Server có thể gửi nhiều frame trong 1 message; RN có thể làm rơi "\0" cuối — split vẫn đúng.
    text.split('\0').forEach(handleFrame);
  };
  s.onerror = () => {};
  s.onclose = (e) => {
    if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
    const wasConnected = connected;
    rtLog(wasConnected ? 'DISCONNECTED' : 'KHÔNG KẾT NỐI ĐƯỢC (handshake bị từ chối?)',
      'code=', e?.code, e?.reason || '', '→ tạm dùng polling 30s');
    connected = false;
    if (socket === s) socket = null;
    // Báo cho màn hình biết để bật lại polling dự phòng và tải lại dữ liệu
    emit({ type: 'DISCONNECTED' });
    if (wasConnected) retry = 0;
    scheduleReconnect();
  };
}

let appStateSub = null;

function onAppState(state) {
  if (!wanted) return;
  if (state === 'active') {
    retry = 0;
    connect();
  } else {
    // App xuống nền: đóng kết nối để tiết kiệm pin
    closeSocket();
    connected = false;
  }
}

export function startRealtime() {
  if (wanted) return;
  wanted = true;
  retry = 0;
  appStateSub = AppState.addEventListener('change', onAppState);
  connect();
}

export function stopRealtime() {
  wanted = false;
  if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  if (appStateSub) { appStateSub.remove(); appStateSub = null; }
  closeSocket();
  connected = false;
}
