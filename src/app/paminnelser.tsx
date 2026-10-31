import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { copyText, shareList } from '../features/share';
import { canDownloadCalendar, downloadCalendarFile } from '../features/calendarFile';
import { Button, CheckBox, Screen, Surface, Text, TopBar, useToast } from '../ui';
import { fonts, radii, TOUCH, useColors, useLayout, themedStyles } from '../theme';
import { capitalize, celebrantNames, formatLong, genitive, resolveInvitation } from '../core';
import {
  isReminderSection,
  partyReminderText,
  REMINDER_SECTIONS,
  REMINDER_TASK,
  REMINDER_TONES,
  reminderGaps,
  rsvpReminders,
  thanksText,
  type ReminderSection,
  type ReminderTone,
} from '../core/rules/reminders';
import { buildIcs, icsFileName, type IcsKind } from '../core/rules/ics';

/**
 * Påminnelser (Oct 2026): the three messages the to-dos promise («Den er ferdig skrevet»), filled in from
 * the plan by core/rules/reminders.ts. Reached from the to-dos (`?m=svar|fest|takk` opens that message)
 * and from Invitasjon. Copy and share only: nothing is sent from here and no answers are collected.
 */
export default function PaminnelserScreen() {
  const { t, i18n } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const { ready, party, today, toggleTask } = useParty();
  const router = useRouter();
  const toast = useToast();
  const { isWide, gutter } = useLayout();
  const params = useLocalSearchParams<{ m?: string }>();
  const [section, setSection] = useState<ReminderSection>(isReminderSection(params.m) ? params.m : 'svar');
  const [tone, setTone] = useState<ReminderTone>('standard');
  const [gift, setGift] = useState(false);
  const [forgotten, setForgotten] = useState(false);

  // the texts follow the active language (i18n.language re-runs them after a switch)
  const texts = useMemo(
    () =>
      party
        ? {
            svar: rsvpReminders(party, tone, today),
            fest: partyReminderText(party, tone, today),
            takk: thanksText(party, tone, { gift, forgotten }, today),
          }
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [party, today, tone, gift, forgotten, i18n.language],
  );

  if (!ready) return <Loading />;
  if (!party || !texts) return <Redirect href="/" />;

  const gen = genitive(celebrantNames(party.celebrants));
  const title = t('reminders.shareTitle', { gen });
  const inv = resolveInvitation(party, today);
  const gaps = reminderGaps(party);
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/plan'));

  const copy = async (text: string) => {
    const outcome = await copyText(title, text);
    if (outcome === 'copied') toast(t('reminders.copied'));
    else if (outcome === 'failed') toast(t('reminders.copyFailed'));
  };
  const share = async (text: string) => {
    const outcome = await shareList(title, text);
    if (outcome === 'copied') toast(t('reminders.copied'));
    else if (outcome === 'failed') toast(t('reminders.shareFailed'));
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
        {sub ? <Text variant="small">{sub}</Text> : null}
      </View>
    </Pressable>
  );

  const pill = (testID: string, label: string, on: boolean, onPress: () => void, role: 'tab' | 'radio') => (
    <Pressable
      key={testID}
      testID={testID}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={role === 'tab' ? { selected: on } : { checked: on }}
      aria-selected={role === 'tab' ? on : undefined}
      aria-checked={role === 'radio' ? on : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.pillText, on && { color: colors.onPrimary }]}>{label}</Text>
    </Pressable>
  );

  /** The message itself: selectable, wraps, never cut off. */
  const message = (testID: string, text: string) => (
    <View style={styles.message} testID={testID}>
      <Text selectable style={styles.messageText}>
        {text}
      </Text>
    </View>
  );

  const actions = (id: string, text: string, labels?: { copy: string; share: string }) => (
    <View style={styles.actions}>
      <Button
        compact
        block
        kind="light"
        testID={`${id}-copy`}
        label={t('reminders.copy')}
        accessibilityLabel={labels?.copy}
        onPress={() => copy(text)}
        style={{ flex: 1 }}
      />
      <Button
        compact
        block
        testID={`${id}-share`}
        label={t('reminders.share')}
        accessibilityLabel={labels?.share}
        onPress={() => share(text)}
        style={{ flex: 1 }}
      />
    </View>
  );

  const sentBox = (s: ReminderSection) => {
    const id = REMINDER_TASK[s];
    const done = Boolean(party.taskState[id]?.done);
    return check(`reminders-${s}-sent`, t('reminders.sent'), done, () => toggleTask(id, !done), t('reminders.sentSub'));
  };

  const link = (testID: string, label: string, route: '/gjesteliste' | '/invitasjon') => (
    <Pressable testID={testID} accessibilityRole="link" onPress={() => router.push(route)} hitSlop={8}>
      <Text style={styles.link}>{label} →</Text>
    </Pressable>
  );

  const svar = texts.svar;
  const svarBox = (
    <Surface testID="reminders-svar" style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>{t('reminders.svar.title')}</Text>
      <Text variant="small">{t('reminders.svar.lede', { date: formatLong(inv.rsvpBy) })}</Text>
      {inv.replyMode === 'ifNotComing' ? (
        <Text variant="small" testID="reminders-svar-optional">
          {t('reminders.svar.ifNotNote')}
        </Text>
      ) : null}
      {svar.personal.length ? (
        <>
          <Text style={styles.checkLabel} testID="reminders-svar-count">
            {t('reminders.svar.personal', { count: svar.personal.length })}
          </Text>
          {message('reminders-svar-preview', svar.personal[0].text)}
          {svar.personal.map(({ guest, text }) => (
            <View key={guest.id} testID={`reminders-svar-${guest.id}`} style={styles.personalRow}>
              <Text style={styles.personalName}>{t('reminders.svar.person', { name: guest.name })}</Text>
              {actions(`reminders-svar-${guest.id}`, text, {
                copy: t('reminders.svar.copyLabel', { name: guest.name }),
                share: t('reminders.svar.shareLabel', { name: guest.name }),
              })}
            </View>
          ))}
        </>
      ) : (
        <>
          <Text variant="small" testID="reminders-svar-general-why">
            {svar.why === 'allAnswered' ? t('reminders.svar.allAnswered') : t('reminders.svar.noList')}
          </Text>
          {link('reminders-svar-guests', t('reminders.svar.listLink'), '/gjesteliste')}
          {message('reminders-svar-text', svar.general ?? '')}
          {actions('reminders-svar', svar.general ?? '')}
        </>
      )}
      {sentBox('svar')}
    </Surface>
  );

  const gapText = gaps.address && gaps.phone ? 'both' : gaps.address ? 'address' : gaps.phone ? 'phone' : null;
  const festBox = (
    <Surface testID="reminders-fest" style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>{t('reminders.fest.title')}</Text>
      <Text variant="small">{t('reminders.fest.lede')}</Text>
      {gapText ? (
        <View style={styles.tip} testID="reminders-fest-tip">
          <Text variant="small">{t(`reminders.gaps.${gapText}`)}</Text>
          {link('reminders-fest-invitation', t('reminders.gaps.link'), '/invitasjon')}
        </View>
      ) : null}
      {message('reminders-fest-text', texts.fest)}
      {actions('reminders-fest', texts.fest)}
      {sentBox('fest')}
    </Surface>
  );

  const takkBox = (
    <Surface testID="reminders-takk" style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>{t('reminders.takk.title')}</Text>
      <Text variant="small">{t('reminders.takk.lede')}</Text>
      <View>
        {check('reminders-takk-gift', t('reminders.takk.gift'), gift, () => setGift(!gift))}
        {check('reminders-takk-forgotten', t('reminders.takk.forgotten'), forgotten, () => setForgotten(!forgotten))}
      </View>
      {message('reminders-takk-text', texts.takk)}
      {actions('reminders-takk', texts.takk)}
      {sentBox('takk')}
    </Surface>
  );

  const download = (kind: IcsKind) => {
    const ok = downloadCalendarFile(icsFileName(party, kind), buildIcs(party, kind, today));
    toast(ok ? t('reminders.calendar.done') : t('reminders.calendar.failed'));
  };
  const calendarBox = canDownloadCalendar ? (
    <Surface testID="reminders-calendar" style={{ gap: 12 }}>
      <Text style={styles.sectionTitle}>{t('reminders.calendar.title')}</Text>
      <Text variant="small">{t('reminders.calendar.lede')}</Text>
      <View style={styles.actions}>
        <Button
          compact
          block
          kind="light"
          testID="reminders-calendar-party"
          label={t('reminders.calendar.party')}
          accessibilityLabel={t('reminders.calendar.partyLabel')}
          onPress={() => download('party')}
          style={{ flex: 1 }}
        />
        <Button
          compact
          block
          kind="light"
          testID="reminders-calendar-rsvp"
          label={t('reminders.calendar.rsvp')}
          accessibilityLabel={t('reminders.calendar.rsvpLabel')}
          onPress={() => download('rsvp')}
          style={{ flex: 1 }}
        />
      </View>
      <Text variant="small" testID="reminders-calendar-when">
        {capitalize(formatLong(party.date))}
      </Text>
    </Surface>
  ) : null;

  const current = section === 'svar' ? svarBox : section === 'fest' ? festBox : takkBox;

  return (
    <Screen tab="plan" testID="screen-reminders">
      {!isWide ? <TopBar onBack={back} /> : null}
      <View style={{ paddingHorizontal: gutter, paddingTop: isWide ? 28 : 10 }}>
        <Text variant="eyebrow">{t('reminders.eyebrow')}</Text>
        <Text variant={isWide ? 'h1' : 'h1Small'} style={{ marginTop: 6, marginBottom: 8 }}>
          {t('reminders.title')}
        </Text>
        <Text variant="lede" style={{ marginBottom: 6, maxWidth: 640 }}>
          {t('reminders.lede')}
        </Text>
      </View>
      <View style={{ paddingHorizontal: gutter, marginTop: 14, gap: 14, maxWidth: isWide ? 720 : undefined }}>
        <View accessibilityRole="tablist" accessibilityLabel={t('reminders.tabsLabel')} style={styles.pills}>
          {REMINDER_SECTIONS.map((s) =>
            pill(`reminders-tab-${s}`, t(`reminders.tabs.${s}`), section === s, () => setSection(s), 'tab'),
          )}
        </View>
        <View style={{ gap: 8 }}>
          <Text style={styles.label}>{t('reminders.toneLabel')}</Text>
          <View accessibilityRole="radiogroup" style={styles.pills}>
            {REMINDER_TONES.map((x) =>
              pill(`reminders-tone-${x}`, t(`reminders.tones.${x}`), tone === x, () => setTone(x), 'radio'),
            )}
          </View>
        </View>
        {current}
        {calendarBox}
      </View>
      <View style={{ paddingHorizontal: gutter, marginTop: 24, alignItems: isWide ? 'flex-start' : 'stretch' }}>
        <Button kind="ghost" label={t('reminders.backToPlan')} onPress={() => router.navigate('/plan')} />
      </View>
    </Screen>
  );
}

const useStyles = themedStyles((colors) => ({
  sectionTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
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
  message: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radii.sm,
    padding: 14,
    backgroundColor: colors.bg,
  },
  messageText: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.ink },
  actions: { flexDirection: 'row', gap: 8 },
  personalRow: {
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  // long names wrap (never «…»)
  personalName: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 22, color: colors.ink },
  tip: { gap: 6, padding: 12, borderRadius: radii.sm, backgroundColor: colors.butter },
  link: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.green, paddingVertical: 6 },
}));
