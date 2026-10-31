import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { CheckBox, Icon, Screen, Surface, Text } from '../ui';
import { fonts, images, radii, shadow, themeImages, TOUCH, useColors, useLayout, themedStyles } from '../theme';
import { formatClock, partyDayView, resolveActivity, themeById, type ActivityId } from '../core';

/**
 * Festdagen (the «Festdagen» tab and the party-day to-do): the day itself, all read from the plan.
 * 1. the checklist: the to-dos dated the party day, ticked in step with Gjøremål (same `taskState`);
 * 2. the day step by step: Program's suggested order with the food, cake and song, goodie bags and pickup;
 *    a picked idea opens its rules here;
 * 3. allergies and notes from Gjesteliste and Mat (notes only);
 * 4. Handleliste, the invitation's phone number and Program one tap away.
 * Soft wording throughout: a suggestion for the day, never a schedule to keep.
 */
export default function PartyDayScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const { ready, party, today, toggleTask } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();
  const [open, setOpen] = useState<ActivityId | null>(null);
  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;

  const v = partyDayView(party, today);
  const theme = party.theme ? themeById(party.theme) : null;
  const heroImage = party.theme ? themeImages[party.theme] : images.fiskedam;
  const eyebrow =
    v.when === 'today'
      ? t('day.eyebrowToday')
      : v.when === 'before'
        ? t('day.eyebrowBefore', { count: v.daysLeft })
        : t('day.eyebrowAfter');
  const doneCount = v.checklist.filter((c) => c.done).length;

  const checklist = (
    <Surface testID="day-checklist" style={{ gap: 4 }}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t('day.checklist.title')}</Text>
        {v.checklist.length ? (
          <Text variant="small" testID="day-checklist-counter">
            {t('day.checklist.counter', { x: doneCount, y: v.checklist.length })}
          </Text>
        ) : null}
      </View>
      <Text variant="small">{v.checklist.length ? t('day.checklist.note') : t('day.checklist.empty')}</Text>
      {v.checklist.map(({ task, done, time }, i) => (
        <View key={task.id} style={[styles.checkRow, i > 0 && styles.divider]} testID={`day-check-${task.id}`}>
          <View style={styles.timeChip}>
            <Text style={styles.timeChipText}>
              {time ? t('day.checklist.approx', { time: formatClock(time) }) : t('day.checklist.before')}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.checkTitle, done && styles.checkTitleDone]}>{task.title}</Text>
            {task.detail ? <Text variant="small">{task.detail}</Text> : null}
            {task.link ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`${task.link.label}: ${task.title}`}
                onPress={() => router.push(task.link!.route)}
                style={styles.tag}
                hitSlop={8}
              >
                <Text style={styles.tagText}>{task.link.label} →</Text>
              </Pressable>
            ) : null}
          </View>
          <Pressable
            testID={`day-check-${task.id}-toggle`}
            accessibilityRole="checkbox"
            accessibilityLabel={
              done ? t('todo.markUndone', { item: task.title }) : t('todo.markDone', { item: task.title })
            }
            accessibilityState={{ checked: done }}
            aria-checked={done}
            onPress={() => toggleTask(task.id, !done)}
            style={styles.hit}
          >
            <CheckBox checked={done} />
          </Pressable>
        </View>
      ))}
    </Surface>
  );

  const steps = (
    <Surface testID="day-steps" style={{ gap: 10 }}>
      <Text style={styles.sectionTitle}>{t('day.steps.title')}</Text>
      <Text variant="small">{t('day.steps.note')}</Text>
      {v.steps.map((s) => {
        const isOpen = s.activity !== undefined && open === s.activity;
        const a = s.activity ? resolveActivity(s.activity, party.theme) : null;
        return (
          <View key={`${s.id}-${s.time}`} style={styles.step} testID={`day-step-${s.id}`}>
            <Text style={styles.stepTime}>{s.time}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              {s.detail ? <Text variant="small">{s.detail}</Text> : null}
              {a ? (
                <Pressable
                  testID={`day-step-${s.id}-rules`}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('day.steps.rules')}: ${s.title}`}
                  accessibilityState={{ expanded: isOpen }}
                  onPress={() => setOpen(isOpen ? null : a.id)}
                  style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.linkText}>{`${t('day.steps.rules')} ${isOpen ? '▴' : '▾'}`}</Text>
                </Pressable>
              ) : null}
              {a && isOpen ? (
                <View style={styles.rules} testID={`day-step-${s.id}-rules-view`}>
                  {a.need ? <Text variant="small">{`${t('program.needTitle')}: ${a.need}`}</Text> : null}
                  {a.steps.map((line, i) => (
                    <View key={i} style={styles.ruleRow}>
                      <Text style={styles.ruleNo}>{i + 1}</Text>
                      <Text style={{ flex: 1 }}>{line}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
      {v.noActivities ? (
        <View style={styles.soft} testID="day-no-activities">
          <Text variant="small">{t('day.steps.noActivities')}</Text>
          <Pressable
            testID="day-to-programme"
            accessibilityRole="link"
            onPress={() => router.push('/program')}
            style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.linkText}>{t('day.steps.toProgramme')} →</Text>
          </Pressable>
        </View>
      ) : null}
    </Surface>
  );

  const hasNotes = v.guestNotes.length > 0 || v.diets.length > 0;
  const notes = (
    <Surface testID="day-notes" style={{ gap: 8 }}>
      <Text style={styles.sectionTitle}>{t('day.notes.title')}</Text>
      {v.guestNotes.length ? (
        <View style={{ gap: 4 }} testID="day-notes-guests">
          <Text style={styles.label}>{t('day.notes.guests')}</Text>
          {v.guestNotes.map((g, i) => (
            <Text key={i}>
              <Text style={{ fontFamily: fonts.bodyBold }}>{g.name}</Text>
              {`: ${g.note}`}
            </Text>
          ))}
        </View>
      ) : null}
      {v.diets.length ? (
        <View style={{ gap: 4 }} testID="day-notes-diets">
          <Text style={styles.label}>{t('day.notes.diets')}</Text>
          <Text>{v.diets.join(', ')}</Text>
        </View>
      ) : null}
      <Text variant="small">{hasNotes ? t('day.notes.onlyNotes') : t('day.notes.empty')}</Text>
      {!hasNotes ? (
        <Pressable
          testID="day-to-guests"
          accessibilityRole="link"
          onPress={() => router.push('/gjesteliste')}
          style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.linkText}>{t('day.notes.toGuests')} →</Text>
        </Pressable>
      ) : null}
    </Surface>
  );

  const shoppingLine =
    v.shoppingCount === 0
      ? t('day.links.shoppingEmpty')
      : v.shoppingLeft === 0
        ? t('day.links.shoppingDone')
        : t('day.links.shoppingLeft', { count: v.shoppingLeft });
  const links = [
    { key: 'shopping', emoji: '🛒', title: t('day.links.shopping'), line: shoppingLine, route: '/handleliste' },
    {
      key: 'invite',
      emoji: '💌',
      title: t('day.links.invite'),
      line: v.phone ? t('day.links.phone', { phone: v.phone }) : t('day.links.noPhone'),
      route: '/invitasjon',
    },
    {
      key: 'programme',
      emoji: '🎲',
      title: t('day.links.programme'),
      line: v.noActivities ? t('day.links.programmeEmpty') : t('day.links.programmeLine'),
      route: '/program',
    },
  ];
  const linkRows = (
    <View style={{ gap: 12 }} testID="day-links">
      <Text style={styles.sectionTitle}>{t('day.links.title')}</Text>
      {links.map((l) => (
        <Pressable
          key={l.key}
          testID={`day-link-${l.key}`}
          accessibilityRole="link"
          accessibilityLabel={`${l.title}. ${l.line}`}
          onPress={() => router.push(l.route)}
          style={({ pressed }) => [styles.linkCard, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.linkThumb}>
            <Text style={{ fontSize: 26 }}>{l.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>{l.title}</Text>
            <Text variant="small" testID={`day-link-${l.key}-line`}>
              {l.line}
            </Text>
          </View>
          <Icon name="forward" size={22} strokeWidth={2.4} color={colors.green} />
        </Pressable>
      ))}
    </View>
  );

  return (
    <Screen tab="day" testID="screen-day">
      <View style={[styles.hero, { marginHorizontal: gutter, marginTop: isWide ? 24 : 14 }]} testID="day-hero">
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" color={colors.onPrimarySoft} testID="day-eyebrow">
            {theme ? `${theme.emoji} ` : ''}
            {eyebrow}
          </Text>
          <Text variant="h1Small" color={colors.onPrimary} style={{ marginTop: 6 }} testID="day-title">
            {v.title}
          </Text>
          <Text variant="small" color={colors.onPrimarySoft} style={{ marginTop: 8, fontSize: 16 }} testID="day-meta">
            {t('day.meta', { dato: v.dateLine, tid: v.timeLine })}
          </Text>
        </View>
        <View style={[styles.heroArt, isWide && { width: 140, height: 140, borderRadius: 32 }]}>
          <Image source={heroImage} style={{ width: '100%', height: '100%' }} />
        </View>
      </View>
      <View style={{ paddingHorizontal: gutter, paddingTop: 16 }}>
        <Text variant="lede" style={{ fontSize: 17, maxWidth: 640 }}>
          {t('day.lede')}
        </Text>
      </View>
      {isWide ? (
        <View
          style={{ flexDirection: 'row', gap: 20, paddingHorizontal: gutter, marginTop: 18, alignItems: 'flex-start' }}
        >
          <View style={{ flex: 1, gap: 20 }}>
            {checklist}
            {notes}
          </View>
          <View style={{ flex: 1, gap: 20 }}>
            {steps}
            {linkRows}
          </View>
        </View>
      ) : (
        <View style={{ paddingHorizontal: gutter, marginTop: 18, gap: 18 }}>
          {checklist}
          {steps}
          {notes}
          {linkRows}
        </View>
      )}
    </Screen>
  );
}

const useStyles = themedStyles((colors) => ({
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroArt: { width: 92, height: 92, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.cardTint },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink, flexShrink: 1 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: colors.line },
  timeChip: {
    minWidth: 64,
    borderRadius: radii.sm,
    backgroundColor: colors.sage,
    paddingVertical: 6,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  timeChipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink, textAlign: 'center' },
  checkTitle: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 22, color: colors.ink },
  checkTitleDone: { textDecorationLine: 'line-through', color: colors.muted },
  tag: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: colors.sage,
    borderRadius: radii.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  tagText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.green },
  hit: { minWidth: TOUCH, minHeight: TOUCH, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 12, paddingTop: 4 },
  stepTime: { width: 52, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.green },
  stepTitle: { fontFamily: fonts.bodySemi, fontSize: 16, lineHeight: 21, color: colors.ink },
  link: { minHeight: TOUCH, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.green, textDecorationLine: 'underline' },
  rules: { gap: 6, paddingTop: 6, paddingBottom: 4, borderTopWidth: 1, borderTopColor: colors.line },
  ruleRow: { flexDirection: 'row', gap: 10 },
  ruleNo: { width: 18, fontFamily: fonts.bodyBold, color: colors.green },
  soft: { backgroundColor: colors.butter, borderRadius: radii.md, padding: 12, gap: 2 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 76,
    padding: 12,
    paddingRight: 18,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    ...shadow,
  },
  linkThumb: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.butter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
}));
