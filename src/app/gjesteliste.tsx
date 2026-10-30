import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { Button, Icon, Screen, Surface, Text, TopBar, useToast } from '../ui';
import { fonts, radii, TOUCH, useColors, useLayout, themedStyles } from '../theme';
import {
  celebrantNames,
  GUEST_NAME_MAX,
  GUEST_NOTE_MAX,
  GUEST_STATUSES,
  guestCounts,
  guestHint,
  guestHintText,
  MAX_GUESTS,
  type Guest,
  type GuestStatus,
} from '../core';

/**
 * Gjesteliste (optional, from the Gjesteliste card on Planen and the «Lag gjestelisten» to-do). The guests'
 * names (the birthday children come from setup), each with an answer (Kommer / Kommer ikke / Venter på svar)
 * and a short allergy/diet note. Soft hints only (Ekaterina, 30 Oct): the list never changes the party's one
 * children number; when they differ she sees a gentle line and may tap «Bruk N barn i planen». The names stay
 * on this device (rules/guests.ts). Names wrap, never cut off.
 */
export default function GjestelisteScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const toast = useToast();
  const { ready, party, addGuest, removeGuest, setGuestStatus, setGuestNote, applyGuestCount } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();
  const [draft, setDraft] = useState('');

  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;

  const back = () => (router.canGoBack() ? router.back() : router.navigate('/plan'));
  const counts = guestCounts(party);
  const hint = guestHint(party);
  const full = party.guests.length >= MAX_GUESTS;
  const add = () => {
    if (!draft.trim() || full) return;
    addGuest(draft);
    setDraft('');
  };
  const apply = () => {
    if (!hint?.canApply) return;
    applyGuestCount();
    toast(t('guests.hint.applied', { count: hint.suggested }));
  };

  const addBox = (
    <Surface testID="guests-add-box" style={{ gap: 10 }}>
      <Text style={styles.label} nativeID="guests-add-label">
        {t('guests.addLabel')}
      </Text>
      <View style={styles.addRow}>
        <TextInput
          testID="guests-add-input"
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder={t('guests.addPlaceholder')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('guests.addLabel')}
          aria-labelledby="guests-add-label"
          maxLength={GUEST_NAME_MAX}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="next"
          blurOnSubmit={false}
          editable={!full}
          style={styles.input}
        />
        <Pressable
          testID="guests-add"
          accessibilityRole="button"
          accessibilityLabel={t('guests.add')}
          accessibilityState={{ disabled: !draft.trim() || full }}
          onPress={add}
          style={({ pressed }) => [
            styles.addBtn,
            (!draft.trim() || full) && { opacity: 0.5 },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Icon name="plus" size={22} color={colors.onPrimary} strokeWidth={2.6} />
          <Text style={styles.addBtnText}>{t('guests.add')}</Text>
        </Pressable>
      </View>
      <Text variant="small">{full ? t('guests.full', { n: MAX_GUESTS }) : t('guests.addHint')}</Text>
    </Surface>
  );

  const hintBox = hint ? (
    <Surface testID="guests-hint" style={[{ gap: 8 }, hint.kind !== 'same' && styles.hintSoft]}>
      <Text testID="guests-hint-text">{guestHintText(hint)}</Text>
      {hint.kind === 'differs' && hint.fewer ? (
        <Text variant="small" testID="guests-hint-not-all">
          {t('guests.hint.notAll')}
        </Text>
      ) : null}
      {hint.kind !== 'same' ? (
        <>
          <Text variant="small">{t('guests.hint.keep')}</Text>
          {hint.canApply ? (
            <Button
              compact
              kind="light"
              testID="guests-hint-apply"
              label={t('guests.hint.apply', { count: hint.suggested })}
              onPress={apply}
            />
          ) : null}
        </>
      ) : null}
    </Surface>
  ) : null;

  const list = (
    <View style={{ gap: 10 }} testID="guests-list">
      <Text style={styles.sectionTitle}>{t('guests.listTitle')}</Text>
      {party.guests.length ? (
        <>
          <Text variant="small" testID="guests-counts">
            {t('guests.counts', { yes: counts.yes, no: counts.no, pending: counts.pending })}
          </Text>
          {party.guests.map((g) => (
            <GuestRow
              key={g.id}
              guest={g}
              onStatus={(s) => setGuestStatus(g.id, s)}
              onNote={(n) => setGuestNote(g.id, n)}
              onRemove={() => removeGuest(g.id)}
            />
          ))}
        </>
      ) : (
        <Text variant="small" testID="guests-empty">
          {t('guests.empty')}
        </Text>
      )}
    </View>
  );

  const ideas = party.guests.length ? (
    <Surface testID="guests-ideas" style={{ gap: 6 }}>
      <Text style={styles.label}>{t('guests.ideasTitle')}</Text>
      {(
        [
          ['invite', 'guests.ideaInvite', '/invitasjon'],
          ['goodie', 'guests.ideaGoodie', '/godteposer'],
          ['food', 'guests.ideaFood', '/mat'],
        ] as const
      ).map(([id, key, route]) => (
        <Pressable
          key={id}
          testID={`guests-idea-${id}`}
          accessibilityRole="link"
          accessibilityLabel={t(key)}
          onPress={() => router.push(route)}
          style={({ pressed }) => [styles.ideaRow, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.ideaText}>{t(key)}</Text>
          <Icon name="forward" size={18} strokeWidth={2.4} color={colors.green} />
        </Pressable>
      ))}
    </Surface>
  ) : null;

  return (
    <Screen tab="plan" testID="screen-guests">
      {!isWide ? <TopBar onBack={back} /> : null}
      <View style={{ paddingHorizontal: gutter, paddingTop: isWide ? 28 : 10 }}>
        <Text variant="eyebrow">{t('guests.eyebrow')}</Text>
        <Text variant={isWide ? 'h1' : 'h1Small'} style={{ marginTop: 6, marginBottom: 8 }}>
          {t('guests.title')}
        </Text>
        <Text variant="lede" style={{ marginBottom: 6, maxWidth: 640 }}>
          {t('guests.lede')}
        </Text>
        <Text variant="small" testID="guests-celebrants" style={{ maxWidth: 640 }}>
          {t('guests.celebrantsNote', { names: celebrantNames(party.celebrants) })}
        </Text>
      </View>
      <View style={{ paddingHorizontal: gutter, marginTop: 18, gap: 18, maxWidth: isWide ? 720 : undefined }}>
        {addBox}
        {hintBox}
        {list}
        {ideas}
        <Text variant="small" testID="guests-privacy">
          {t('guests.privacy')}
        </Text>
        <Button testID="guests-done" label={t('guests.done')} onPress={() => router.navigate('/plan')} />
        <Button kind="ghost" label={t('guests.backToPlan')} onPress={() => router.navigate('/plan')} />
      </View>
    </Screen>
  );
}

/** One child: the name (wraps), the remove button, the three answers and the short note. */
function GuestRow({
  guest,
  onStatus,
  onNote,
  onRemove,
}: {
  guest: Guest;
  onStatus: (s: GuestStatus) => void;
  onNote: (note: string) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  // the note is saved when she leaves the field (or presses Enter), so spaces while typing are kept
  const [note, setNote] = useState(guest.note ?? '');
  const commit = () => {
    if (note.trim() !== (guest.note ?? '')) onNote(note);
  };
  return (
    <Surface testID={`guest-${guest.id}`} style={{ gap: 10 }}>
      <View style={styles.rowHead}>
        <Text style={styles.name} testID={`guest-${guest.id}-name`}>
          {guest.name}
        </Text>
        <Pressable
          testID={`guest-${guest.id}-remove`}
          accessibilityRole="button"
          accessibilityLabel={t('guests.remove', { name: guest.name })}
          onPress={onRemove}
          hitSlop={8}
          style={({ pressed }) => [styles.remove, pressed && { opacity: 0.6 }]}
        >
          <Icon name="close" size={20} strokeWidth={2.4} color={colors.muted} />
        </Pressable>
      </View>
      <View accessibilityRole="radiogroup" style={styles.statusRow}>
        {GUEST_STATUSES.map((s) => {
          const on = guest.status === s;
          const label = t(`guests.status.${s}`);
          return (
            <Pressable
              key={s}
              testID={`guest-${guest.id}-status-${s}`}
              accessibilityRole="radio"
              accessibilityLabel={t('guests.statusLabel', { name: guest.name, status: label })}
              accessibilityState={{ checked: on }}
              aria-checked={on}
              onPress={() => onStatus(s)}
              style={({ pressed }) => [styles.status, on && styles.statusOn, pressed && { opacity: 0.85 }]}
            >
              <Text style={[styles.statusText, on && { color: colors.onPrimary }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        testID={`guest-${guest.id}-note`}
        value={note}
        onChangeText={setNote}
        onBlur={commit}
        onSubmitEditing={commit}
        placeholder={t('guests.notePlaceholder')}
        placeholderTextColor={colors.muted}
        accessibilityLabel={t('guests.noteLabel', { name: guest.name })}
        maxLength={GUEST_NOTE_MAX}
        returnKeyType="done"
        style={styles.noteInput}
      />
    </Surface>
  );
}

const useStyles = themedStyles((colors) => ({
  sectionTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    fontFamily: fonts.bodySemi,
    fontSize: 18,
    color: colors.ink,
  },
  addBtn: {
    minHeight: 56,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onPrimary },
  hintSoft: { backgroundColor: colors.blush },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  // long names wrap onto the next line (never «…»)
  name: { flex: 1, minWidth: 0, fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24, color: colors.ink },
  remove: {
    width: TOUCH,
    height: TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
    marginRight: -10,
  },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  status: {
    minHeight: TOUCH,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOn: { backgroundColor: colors.green, borderColor: colors.green },
  statusText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  noteInput: {
    minHeight: 48,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  ideaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: TOUCH },
  ideaText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 16, color: colors.green },
}));
