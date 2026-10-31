import { useMemo } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { InvitationCard } from '../features/InvitationCard';
import { copyText, shareList } from '../features/share';
import { Button, CheckBox, Icon, Screen, Surface, Text, TopBar, useToast } from '../ui';
import { fonts, radii, TOUCH, useColors, useLayout, themedStyles } from '../theme';
import { useTranslation } from 'react-i18next';
import {
  addDays,
  buildInvitation,
  capitalize,
  celebrantNames,
  formatLong,
  helpingParents,
  inviteeGuests,
  personalInvitation,
  INVITATION_ADDRESS_MAX,
  INVITATION_PHONE_MAX,
  INVITATION_TEXT_MAX,
  rsvpBounds,
  type ReplyMode,
} from '../core';

/**
 * Invitasjon (from the Invitasjon card on Planen and the «Send invitasjonen» to-dos). The invitation text
 * is generated from the party by core/rules/invitation.ts (names, ages, date, time, address, theme line)
 * plus the choices here: parents who stay and help (pre-ticked for 3–4-year-olds; counted in the food),
 * siblings welcome, reply mode, svarfrist and the hosts' phone. RSVP stays with the hosts: nothing is
 * collected here. The text can be edited freely before sharing; «Lag teksten på nytt» resets it.
 *
 * After the MVP (not built): the parents' own picture on the card (needs image hosting).
 */
export default function InvitasjonScreen() {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const { ready, party, today, setInvitation, toggleTask } = useParty();
  const router = useRouter();
  const toast = useToast();
  const { isWide, gutter } = useLayout();
  // the generated text follows the active language (i18n.language re-runs it after a switch)
  const inv = useMemo(
    () => (party ? buildInvitation(party, today) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [party, today, i18n.language],
  );

  if (!ready) return <Loading />;
  if (!party || !inv) return <Redirect href="/" />;

  const s = inv.settings;
  const helpers = helpingParents(party);
  const bounds = rsvpBounds(party, today);
  const sent = Boolean(party.taskState.sendInvite?.done);
  const title = t('invitation.shareTitle', { names: celebrantNames(party.celebrants) });
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/plan'));

  const copy = async () => {
    const outcome = await copyText(title, inv.text);
    if (outcome === 'copied') toast(t('invitation.copied'));
    else if (outcome === 'failed') toast(t('invitation.copyFailed'));
  };
  const share = async () => {
    const outcome = await shareList(title, inv.text);
    if (outcome === 'copied') toast(t('invitation.copied'));
    else if (outcome === 'failed') toast(t('invitation.shareFailed'));
  };
  const moveRsvp = (days: number) => {
    const next = addDays(s.rsvpBy, days);
    if (next < bounds.min || next > bounds.max) return;
    setInvitation({ rsvpBy: next });
  };

  const check = (testID: string, label: string, checked: boolean, onPress: () => void, sub?: string) => (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      onPress={onPress}
      style={({ pressed }) => [styles.check, pressed && { opacity: 0.85 }]}
    >
      <CheckBox checked={checked} size={28} />
      <View style={{ flex: 1 }}>
        <Text style={styles.checkLabel}>{label}</Text>
        {sub ? (
          <Text variant="small" testID={`${testID}-sub`}>
            {sub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  const replyOption = (mode: ReplyMode, label: string) => {
    const on = s.replyMode === mode;
    return (
      <Pressable
        key={mode}
        testID={`invitation-reply-${mode}`}
        accessibilityRole="radio"
        accessibilityLabel={label}
        accessibilityState={{ checked: on }}
        aria-checked={on}
        onPress={() => setInvitation({ replyMode: mode })}
        style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && { opacity: 0.85 }]}
      >
        <Text style={[styles.pillText, on && { color: colors.onPrimary }]}>{label}</Text>
      </Pressable>
    );
  };

  const stepBtn = (testID: string, label: string, icon: 'back' | 'forward', disabled: boolean, days: number) => (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => moveRsvp(days)}
      style={({ pressed }) => [styles.stepBtn, disabled && { opacity: 0.35 }, pressed && { opacity: 0.7 }]}
    >
      <Icon name={icon} size={22} strokeWidth={2.6} color={colors.green} />
    </Pressable>
  );

  const preview = (
    <View testID="invitation-preview" style={{ gap: 10 }}>
      <Text variant="eyebrow">{t('invitation.preview')}</Text>
      <InvitationCard party={party} />
    </View>
  );

  const details = (
    <Surface testID="invitation-details" style={{ gap: 14 }}>
      <Text style={styles.sectionTitle}>{t('invitation.detailsTitle')}</Text>
      <View style={{ gap: 6 }}>
        <Text style={styles.label} nativeID="invitation-address-label">
          {t('invitation.addressLabel')}
        </Text>
        <TextInput
          testID="invitation-address"
          value={party.invitation?.address ?? ''}
          onChangeText={(address) => setInvitation({ address })}
          placeholder={t('invitation.addressPlaceholder')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('invitation.addressLabel')}
          aria-labelledby="invitation-address-label"
          maxLength={INVITATION_ADDRESS_MAX}
          autoComplete="street-address"
          style={styles.input}
        />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={styles.label} nativeID="invitation-phone-label">
          {t('invitation.phoneLabel')}
        </Text>
        <TextInput
          testID="invitation-phone"
          value={party.invitation?.phone ?? ''}
          onChangeText={(phone) => setInvitation({ phone })}
          placeholder={t('invitation.phonePlaceholder')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('invitation.phoneLabel')}
          aria-labelledby="invitation-phone-label"
          maxLength={INVITATION_PHONE_MAX}
          keyboardType="phone-pad"
          autoComplete="tel"
          style={styles.input}
        />
        {inv.phoneMissing ? (
          <Text variant="small" testID="invitation-phone-tip">
            {t('invitation.phoneTip')}
          </Text>
        ) : null}
      </View>
      {check(
        'invitation-parents-help',
        t('invitation.parentsHelp'),
        s.parentsHelp,
        () => setInvitation({ parentsHelp: !s.parentsHelp }),
        s.parentsHelp && helpers > 0 ? t('invitation.parentsHelpFood', { count: helpers }) : undefined,
      )}
      {check(
        'invitation-siblings',
        t('invitation.siblings'),
        s.siblings,
        () => setInvitation({ siblings: !s.siblings }),
        t('invitation.siblingsSub'),
      )}
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>{t('invitation.replyTitle')}</Text>
        <View accessibilityRole="radiogroup" style={styles.pills}>
          {replyOption('ifNotComing', t('invitation.replyIfNot'))}
          {replyOption('ifComing', t('invitation.replyIfComing'))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={styles.label}>{t('invitation.rsvpLabel')}</Text>
        <View style={styles.rsvpRow}>
          {stepBtn('invitation-rsvp-earlier', t('invitation.rsvpEarlier'), 'back', s.rsvpBy <= bounds.min, -1)}
          <Text testID="invitation-rsvp" style={styles.rsvpText}>
            {capitalize(formatLong(s.rsvpBy))}
          </Text>
          {stepBtn('invitation-rsvp-later', t('invitation.rsvpLater'), 'forward', s.rsvpBy >= bounds.max, 1)}
        </View>
      </View>
    </Surface>
  );

  const textBox = (
    <Surface testID="invitation-text-box" style={{ gap: 12 }}>
      <Text style={styles.sectionTitle} nativeID="invitation-text-label">
        {t('invitation.textTitle')}
      </Text>
      <Text variant="small">{t('invitation.textHelp')}</Text>
      <TextInput
        testID="invitation-text"
        value={inv.text}
        onChangeText={(customText) => setInvitation({ customText })}
        multiline
        accessibilityLabel={t('invitation.textTitle')}
        aria-labelledby="invitation-text-label"
        maxLength={INVITATION_TEXT_MAX}
        textAlignVertical="top"
        // sized from the text so the whole invitation shows without scrolling inside the box
        style={[styles.textArea, { height: estimateHeight(inv.text) }]}
      />
      {inv.edited ? (
        <View style={{ gap: 10 }}>
          <Text variant="small" testID="invitation-edited">
            {t('invitation.textEdited')}
          </Text>
          <Button
            compact
            kind="light"
            testID="invitation-regenerate"
            label={t('invitation.regenerate')}
            onPress={() => {
              setInvitation({ customText: undefined });
              toast(t('invitation.regenerated'));
            }}
          />
        </View>
      ) : null}
      <View style={{ gap: 10, marginTop: 4 }}>
        <Button testID="invitation-share" label={t('invitation.share')} onPress={share} disabled={!inv.text.trim()} />
        <Button
          testID="invitation-copy"
          kind="light"
          label={t('invitation.copy')}
          onPress={copy}
          disabled={!inv.text.trim()}
        />
      </View>
      {check(
        'invitation-sent',
        t('invitation.sent'),
        sent,
        () => toggleTask('sendInvite', !sent),
        t('invitation.sentSub'),
      )}
    </Surface>
  );

  // Gjesteliste: the same invitation with «Hei Ola!» on top, one child at a time (only when names exist)
  const invitees = inviteeGuests(party);
  const personal = (name: string) => personalInvitation(name, inv.text);
  const copyFor = async (name: string) => {
    const outcome = await copyText(t('guests.inviteShareTitle', { name }), personal(name));
    if (outcome === 'copied') toast(t('invitation.copied'));
    else if (outcome === 'failed') toast(t('invitation.copyFailed'));
  };
  const shareFor = async (name: string) => {
    const outcome = await shareList(t('guests.inviteShareTitle', { name }), personal(name));
    if (outcome === 'copied') toast(t('invitation.copied'));
    else if (outcome === 'failed') toast(t('invitation.shareFailed'));
  };
  const personalBox = invitees.length ? (
    <Surface testID="invitation-personal" style={{ gap: 10 }}>
      <Text style={styles.sectionTitle}>{t('guests.inviteTitle')}</Text>
      <Text variant="small">{t('guests.inviteLede')}</Text>
      {invitees.map((g) => (
        <View key={g.id} testID={`invitation-personal-${g.id}`} style={styles.personalRow}>
          <Text style={styles.personalName}>{t('guests.inviteHello', { name: g.name })}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              compact
              block
              kind="light"
              testID={`invitation-personal-${g.id}-copy`}
              label={t('guests.inviteCopy')}
              accessibilityLabel={t('guests.inviteCopyLabel', { name: g.name })}
              onPress={() => copyFor(g.name)}
              disabled={!inv.text.trim()}
            />
            <Button
              compact
              block
              testID={`invitation-personal-${g.id}-share`}
              label={t('guests.inviteShare')}
              accessibilityLabel={t('guests.inviteShareLabel', { name: g.name })}
              onPress={() => shareFor(g.name)}
              disabled={!inv.text.trim()}
            />
          </View>
        </View>
      ))}
    </Surface>
  ) : null;

  return (
    <Screen tab="plan" testID="screen-invitation">
      {!isWide ? <TopBar onBack={back} /> : null}
      <View style={{ paddingHorizontal: gutter, paddingTop: isWide ? 28 : 10 }}>
        <Text variant="eyebrow">{t('invitation.eyebrow')}</Text>
        <Text variant={isWide ? 'h1' : 'h1Small'} style={{ marginTop: 6, marginBottom: 8 }}>
          {t('invitation.title')}
        </Text>
        <Text variant="lede" style={{ marginBottom: 6, maxWidth: 640 }}>
          {t('invitation.lede')}
        </Text>
      </View>
      {isWide ? (
        <View
          style={{ flexDirection: 'row', gap: 28, paddingHorizontal: gutter, marginTop: 22, alignItems: 'flex-start' }}
        >
          <View style={{ flex: 1, maxWidth: 460 }}>{preview}</View>
          <View style={{ flex: 1, gap: 20 }}>
            {details}
            {textBox}
            {personalBox}
          </View>
        </View>
      ) : (
        <View style={{ paddingHorizontal: gutter, marginTop: 18, gap: 18 }}>
          {preview}
          {details}
          {textBox}
          {personalBox}
        </View>
      )}
      <View style={{ paddingHorizontal: gutter, marginTop: 24, alignItems: isWide ? 'flex-start' : 'stretch' }}>
        <Button kind="ghost" label={t('invitation.backToPlan')} onPress={() => router.navigate('/plan')} />
      </View>
    </Screen>
  );
}

/**
 * The text field's height from the text (17 px text, 25 px lines, ~30 characters per line on a phone; a
 * little generous on purpose, and on wide screens there is simply some air). Deterministic, the same on web
 * and native.
 */
function estimateHeight(text: string): number {
  const rows = text.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 30)), 0);
  return Math.max(200, rows * 25 + 30);
}

const useStyles = themedStyles((colors) => ({
  sectionTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  personalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  // long names wrap (never «…»)
  personalName: { flexShrink: 1, minWidth: 120, fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  input: {
    minHeight: TOUCH,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radii.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 200,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radii.sm,
    padding: 14,
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 25,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: TOUCH, paddingVertical: 4 },
  checkLabel: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 22, color: colors.ink },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    minHeight: TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  pillOn: { backgroundColor: colors.green, borderColor: colors.green },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  rsvpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rsvpText: { flex: 1, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink },
  stepBtn: {
    width: TOUCH,
    height: TOUCH,
    borderRadius: TOUCH / 2,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
