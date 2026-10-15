import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';
import { Text, TextInput } from './Typography';

/**
 * Hộp thoại của chính app (thay Alert mặc định của iOS/Android).
 *   const dialog = useDialog();
 *   await dialog.alert('Tiêu đề', 'Nội dung');
 *   const ok = await dialog.confirm({ title, message, confirmText, cancelText, danger });
 *   const text = await dialog.prompt({ title, message, defaultValue, confirmText, cancelText, danger });
 * confirm trả true/false, prompt trả chuỗi nhập (hoặc null nếu bấm Huỷ).
 */
const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dlg, setDlg] = useState(null);
  const [text, setText] = useState('');
  const resolver = useRef(null);

  const open = useCallback((config) => new Promise((resolve) => {
    if (resolver.current) resolver.current(null);
    resolver.current = resolve;
    setText(config.defaultValue || '');
    setDlg(config);
  }), []);

  const api = useMemo(() => ({
    alert: (title, message) => open({ kind: 'alert', title, message }),
    confirm: (opts) => open({ kind: 'confirm', ...opts }),
    prompt: (opts) => open({ kind: 'prompt', ...opts }),
  }), [open]);

  function close(result) {
    const resolve = resolver.current;
    resolver.current = null;
    setDlg(null);
    if (resolve) resolve(result);
  }

  function cancelValue() {
    if (!dlg) return null;
    if (dlg.kind === 'confirm') return false;
    if (dlg.kind === 'alert') return true;
    return null;
  }

  function okValue() {
    if (!dlg) return null;
    return dlg.kind === 'prompt' ? text.trim() : true;
  }

  const accent = dlg?.danger ? colors.danger : colors.primary;

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal visible={!!dlg} transparent animationType="fade" onRequestClose={() => close(cancelValue())}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.card}>
            {!!dlg?.title && <Text style={styles.title}>{dlg.title}</Text>}
            {!!dlg?.message && <Text style={styles.message}>{dlg.message}</Text>}

            {dlg?.kind === 'prompt' && (
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={dlg.placeholder || ''}
                multiline
                autoFocus
                style={styles.input}
              />
            )}

            <View style={styles.actions}>
              {dlg?.kind !== 'alert' && (
                <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={() => close(cancelValue())}>
                  <Text style={styles.btnGhostText}>{dlg?.cancelText || 'Huỷ'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.btn, { backgroundColor: accent }]} onPress={() => close(okValue())}>
                <Text style={styles.btnText}>{dlg?.confirmText || 'OK'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog phải nằm trong <DialogProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 18, padding: 20 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 8 },
  message: { fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginBottom: 16 },
  input: {
    minHeight: 48, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text, marginBottom: 16,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: 10, minWidth: 84, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnGhost: { backgroundColor: '#f1f5f9' },
  btnGhostText: { color: '#334155', fontWeight: '600', fontSize: 14 },
});
