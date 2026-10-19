import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import { Text } from './Text';

const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2200);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <View pointerEvents="none" style={styles.wrap} accessibilityLiveRegion="polite" aria-live="polite">
        {msg ? (
          <View style={styles.toast}>
            <Text style={styles.text}>{msg}</Text>
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 110, alignItems: 'center' },
  toast: { backgroundColor: colors.ink, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 20 },
  text: { color: colors.white, fontFamily: fonts.bodySemi, fontSize: 15 },
});
