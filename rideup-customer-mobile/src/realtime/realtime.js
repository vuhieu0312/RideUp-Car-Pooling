import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { getWsUrl } from '../api/api';

// Client STOMP tối giản qua WebSocket (không cần cài thư viện).
// Server gửi sự kiện về /user/queue/events với body JSON: { type, ... }

const listeners = new Set();
let socket = null;
let connected = false;
let wanted = false; // true khi đã đăng nhập và muốn giữ kết nối
let retry = 0;
let retryTimer = null;

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

function sendFrame(command, headers, body = '') {
  if (!socket || socket.readyState !== 1) return;
  const head = Object.entries(headers).map(([k, v]) => `${k}:${v}`).join('\n');
  socket.send(`${command}\n${head}\n\n${body}\0`);
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
    sendFrame('SUBSCRIBE', { id: 'sub-0', destination: '/user/queue/events' });
    emit({ type: 'CONNECTED' });
  } else if (command === 'MESSAGE') {
    try { emit(JSON.parse(body)); } catch (e) { /* bỏ qua */ }
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
  const token = await AsyncStorage.getItem('accessToken');
  if (!token || !wanted || socket) return;

  const s = new WebSocket(`${getWsUrl()}?token=${encodeURIComponent(token)}`);
  socket = s;
  s.onopen = () => sendFrame('CONNECT', { 'accept-version': '1.2', 'heart-beat': '0,0' });
  s.onmessage = (e) => String(e.data).split('\0').forEach(handleFrame);
  s.onerror = () => {};
  s.onclose = () => {
    const wasConnected = connected;
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
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  if (appStateSub) { appStateSub.remove(); appStateSub = null; }
  closeSocket();
  connected = false;
}
