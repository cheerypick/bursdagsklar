import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useParty } from '../state/PartyProvider';
import { ConfirmDialog, Icon, Text } from '../ui';
import { fonts, useColors, themedStyles } from '../theme';
import { celebrantNames } from '../core';
import { nb } from '../i18n/nb';

/**
 * «Start på nytt»: a quiet text button that opens our confirm dialog. On «Slett og start på nytt»
 * everything the app stored on this device is deleted (party, unfinished setup, theme), the theme
 * falls back to the neutral look, and the start screen opens.
 *
 * `onPrimary` is for coloured backgrounds (Festen er klar).
 */
export function StartOverButton({
  onPrimary,
  align = 'center',
  testID = 'start-over',
}: {
  onPrimary?: boolean;
  align?: 'center' | 'flex-start' | 'flex-end';
  testID?: string;
}) {
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const { party, draft, startOver } = useParty();
  const [open, setOpen] = useState(false);

  const names = party
    ? celebrantNames(party.celebrants)
    : celebrantNames(draft.celebrants.filter((c) => c.name.trim()));
  const message = party || names ? nb.startOver.message(names) : nb.startOver.messageDraft;
  const color = onPrimary ? colors.onPrimarySoft : colors.muted;

  const cancel = useCallback(() => setOpen(false), []);
  const confirm = useCallback(async () => {
    setOpen(false);
    await startOver();
    router.replace('/');
  }, [router, startOver]);

  return (
    <View style={{ alignItems: align }}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={nb.startOver.action}
        onPress={() => setOpen(true)}
        hitSlop={8}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.button,
          hovered && { opacity: 0.75 },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Icon name="reset" size={18} color={color} strokeWidth={2.4} />
        <Text style={[styles.label, { color }]}>{nb.startOver.action}</Text>
      </Pressable>
      <ConfirmDialog
        visible={open}
        destructive
        title={nb.startOver.title}
        message={message}
        confirmLabel={nb.startOver.confirm}
        cancelLabel={nb.startOver.cancel}
        onConfirm={confirm}
        onCancel={cancel}
      />
    </View>
  );
}

const useStyles = themedStyles(() => ({
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12 },
  label: { fontFamily: fonts.bodyBold, fontSize: 16, textDecorationLine: 'underline' },
}));
