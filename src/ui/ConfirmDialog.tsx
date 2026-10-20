import { useEffect, useRef, type ComponentRef } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { fonts, radii, useLayout, useColors, themedStyles } from '../theme';
import { Text } from './Text';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Paints the confirm button in the warning red (deleting something). */
  destructive?: boolean;
  testID?: string;
}

/**
 * A confirm dialog in our own look, the same on iOS, Android and web (window.confirm is blocked in
 * some Safari contexts and looks foreign everywhere). A dimmed backdrop, a white card with a big
 * title, one line of text and two big buttons: the action and «Avbryt». Tapping the backdrop, the
 * Android back button or Escape on the web cancels. «Avbryt» gets focus first, so a stray Enter
 * never deletes anything.
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive,
  testID = 'confirm-dialog',
}: Props) {
  const styles = useStyles();
  const colors = useColors();
  const { isWide } = useLayout();
  const cancelRef = useRef<ComponentRef<typeof Pressable>>(null);

  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    // after the modal has mounted its content
    const t = setTimeout(() => (cancelRef.current as unknown as { focus?: () => void } | null)?.focus?.(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [visible, onCancel]);

  const confirmBg = destructive ? colors.hot : colors.green;
  const confirmFg = destructive ? colors.white : colors.onPrimary;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onCancel}
          accessibilityLabel={cancelLabel}
          accessibilityRole="button"
          testID={`${testID}-backdrop`}
        />
        <View
          testID={testID}
          style={[styles.card, isWide && { maxWidth: 440 }]}
          role="alertdialog"
          aria-modal
          aria-labelledby={`${testID}-title`}
          aria-describedby={`${testID}-message`}
          accessibilityViewIsModal
        >
          <Text variant="h2Small" nativeID={`${testID}-title`} style={{ marginBottom: 8 }}>
            {title}
          </Text>
          <Text nativeID={`${testID}-message`} style={{ color: colors.muted, fontSize: 17, lineHeight: 24 }}>
            {message}
          </Text>
          <View style={[styles.buttons, isWide && styles.buttonsWide]}>
            <Pressable
              testID={`${testID}-confirm`}
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.button,
                isWide && { flex: 1 },
                { backgroundColor: confirmBg },
                hovered && { opacity: 0.92 },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={[styles.label, { color: confirmFg }]}>{confirmLabel}</Text>
            </Pressable>
            <Pressable
              ref={cancelRef}
              testID={`${testID}-cancel`}
              accessibilityRole="button"
              onPress={onCancel}
              style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
                styles.button,
                styles.cancel,
                isWide && { flex: 1 },
                hovered && { backgroundColor: colors.bg },
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={[styles.label, { color: colors.ink }]}>{cancelLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = themedStyles((colors) => ({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20, 28, 25, 0.5)' },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  buttons: { marginTop: 22, gap: 10 },
  buttonsWide: { flexDirection: 'row-reverse' },
  button: {
    minHeight: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cancel: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.line },
  label: { fontFamily: fonts.bodyBold, fontSize: 17, textAlign: 'center' },
}));
