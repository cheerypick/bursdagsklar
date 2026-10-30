import { View } from 'react-native';
import { useParty } from '../state/PartyProvider';
import { Button, Surface, Text, useToast } from '../ui';
import { radii, themedStyles } from '../theme';
import { useTranslation } from 'react-i18next';
import { invitationChangeHint } from '../core';

/**
 * Invitasjon, after «Endre festen»: she has written her own invitation text and a detail it was written
 * from has changed (the date, the time, names or ages, the place). Her text is never overwritten; this soft
 * card offers a new text from the plan («Oppdater teksten») or to keep hers («Behold teksten min»).
 */
export function InvitationUpdateHint() {
  const { t } = useTranslation();
  const styles = useStyles();
  const toast = useToast();
  const { party, setInvitation, dismissInvitationChanges } = useParty();
  const changes = party ? invitationChangeHint(party) : null;
  if (!changes) return null;
  const words = changes.map((k) => t(`editParty.hint.what.${k}`));
  const what =
    words.length > 1 ? `${words.slice(0, -1).join(', ')} ${t('common.and')} ${words[words.length - 1]}` : words[0];
  return (
    <Surface testID="invitation-update-hint" style={styles.box}>
      <Text testID="invitation-update-hint-text" style={styles.title}>
        {t('editParty.hint.title', { what })}
      </Text>
      <Text variant="small">{t('editParty.hint.sub')}</Text>
      <View style={styles.buttons}>
        <Button
          compact
          testID="invitation-update-hint-update"
          label={t('editParty.hint.update')}
          onPress={() => {
            setInvitation({ customText: undefined });
            toast(t('editParty.hint.updated'));
          }}
        />
        <Button
          compact
          kind="ghost"
          testID="invitation-update-hint-keep"
          label={t('editParty.hint.keep')}
          onPress={dismissInvitationChanges}
        />
      </View>
    </Surface>
  );
}

const useStyles = themedStyles((colors) => ({
  box: { gap: 8, marginTop: 12, backgroundColor: colors.lilac, borderRadius: radii.lg },
  title: { fontSize: 17, lineHeight: 24 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
}));
