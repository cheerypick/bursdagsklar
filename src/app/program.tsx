import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { copyText, shareList } from '../features/share';
import { Button, Screen, Surface, Text, TopBar, useToast } from '../ui';
import { fonts, radii, TOUCH, useColors, useLayout, themedStyles } from '../theme';
import {
  activityName,
  fitsParty,
  moreIdeas,
  partyActivityName,
  photoHuntItems,
  photoHuntText,
  pickedActivities,
  programmeTimeline,
  resolveActivity,
  suggestActivities,
  type ActivityId,
} from '../core';

/**
 * Program (from the Program card on Planen and the activity to-dos). Ekaterina, 27 Oct: mostly IDEAS, «you
 * can have these or these or these», each with its rules, at least one free. On top: three ideas for THIS
 * party (rules/programme.ts `suggestActivities`); below, «Flere ideer» (collapsed) grouped Gratis / Litt å
 * kjøpe / Ute. Pick any number, or none. A picked idea puts what it needs on Handleliste and its to-dos on
 * Gjøremål; the day's order at the bottom is only a suggestion.
 */
export default function ProgramScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const toast = useToast();
  const { ready, party, setActivity } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();
  const [open, setOpen] = useState<ActivityId | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [round, setRound] = useState(0);

  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;

  const picked = pickedActivities(party);
  const suggested = suggestActivities(party);
  const more = moreIdeas(party);
  const timeline = programmeTimeline(party);
  const back = () => (router.canGoBack() ? router.back() : router.navigate('/plan'));
  const photoItems = photoHuntItems(party.theme, round);
  const photoText = photoHuntText(photoItems, party.theme);
  const photoTitle = t('program.photoHunt.title');

  const copy = async () => {
    const outcome = await copyText(photoTitle, photoText);
    if (outcome === 'copied') toast(t('invitation.copied'));
    else if (outcome === 'failed') toast(t('invitation.copyFailed'));
  };
  const share = async () => {
    const outcome = await shareList(photoTitle, photoText);
    if (outcome === 'copied') toast(t('invitation.copied'));
    else if (outcome === 'failed') toast(t('invitation.shareFailed'));
  };

  const photoList = (
    <View style={styles.photo} testID="program-photo-list">
      <Text style={styles.label}>{t('program.photoHunt.listTitle')}</Text>
      {photoItems.map((it, i) => (
        <View key={i} style={styles.step}>
          <Text style={styles.stepNo}>{i + 1}</Text>
          <Text style={{ flex: 1 }}>{it}</Text>
        </View>
      ))}
      <View style={styles.row}>
        <Button compact kind="light" testID="program-photo-copy" label={t('program.photoHunt.copy')} onPress={copy} />
        <Button
          compact
          kind="light"
          testID="program-photo-share"
          label={t('program.photoHunt.share')}
          onPress={share}
        />
        <Button
          compact
          kind="ghost"
          testID="program-photo-new"
          label={t('program.photoHunt.newList')}
          onPress={() => setRound((r) => r + 1)}
        />
      </View>
    </View>
  );

  const card = (id: ActivityId) => {
    const a = resolveActivity(id, party.theme);
    const on = picked.includes(id);
    const isOpen = open === id;
    const name = partyActivityName(id, party);
    const fits = fitsParty(a, party);
    // a picked idea that needs something: «Står på handlelista» (one tap to the list)
    const shopNote = on && a.shopping.length > 0;
    return (
      <Surface key={id} testID={`activity-${id}`} style={[styles.card, on && styles.cardOn]}>
        <View style={styles.head}>
          <Text style={styles.name}>{name}</Text>
          {a.free ? (
            <View style={styles.free} testID={`activity-${id}-free`}>
              <Text style={styles.freeText}>{t('program.free')}</Text>
            </View>
          ) : null}
        </View>
        <Text variant="small" testID={`activity-${id}-meta`}>
          {fits ? `${a.ages} · ${a.minutesLabel}` : `${t('program.bestFor', { ages: a.ages })} · ${a.minutesLabel}`}
        </Text>
        <Text>{a.short}</Text>
        {!a.free && a.need ? (
          <Text variant="small" testID={`activity-${id}-need`}>
            {`${t('program.needTitle')}: ${a.need}`}
          </Text>
        ) : null}
        <View style={styles.row}>
          <Pressable
            testID={`activity-${id}-rules`}
            accessibilityRole="button"
            accessibilityLabel={`${t('program.rulesTitle')}: ${name}`}
            accessibilityState={{ expanded: isOpen }}
            onPress={() => setOpen(isOpen ? null : id)}
            style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.linkText}>{`${t('program.rulesTitle')} ${isOpen ? '▴' : '▾'}`}</Text>
          </Pressable>
          <Pressable
            testID={`activity-${id}-pick`}
            accessibilityRole="checkbox"
            accessibilityLabel={`${on ? t('program.chosen') : t('program.choose')}: ${name}`}
            accessibilityState={{ checked: on }}
            aria-checked={on}
            onPress={() => setActivity(id, !on)}
            style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && { opacity: 0.85 }]}
          >
            <Text style={[styles.pillText, on && { color: colors.onPrimary }]}>
              {on ? `✓ ${t('program.chosen')}` : t('program.choose')}
            </Text>
          </Pressable>
        </View>
        {shopNote ? (
          <Pressable
            testID={`activity-${id}-shop`}
            accessibilityRole="link"
            onPress={() => router.push('/handleliste')}
            style={({ pressed }) => [styles.link, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.linkText}>{t('program.onShoppingList')}</Text>
          </Pressable>
        ) : null}
        {isOpen ? (
          <View style={styles.rules} testID={`activity-${id}-rules-view`}>
            <View style={{ gap: 4 }}>
              <Text style={styles.label}>{t('program.needTitle')}</Text>
              <Text variant="small">{a.need}</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>{t('program.rulesTitle')}</Text>
              {a.steps.map((s, i) => (
                <View key={i} style={styles.step}>
                  <Text style={styles.stepNo}>{i + 1}</Text>
                  <Text style={{ flex: 1 }}>{s}</Text>
                </View>
              ))}
            </View>
            {a.tipYounger ? (
              <Text variant="small">
                <Text style={styles.tipLabel}>{`${t('program.tipYounger')}: `}</Text>
                {a.tipYounger}
              </Text>
            ) : null}
            {a.tipOlder ? (
              <Text variant="small">
                <Text style={styles.tipLabel}>{`${t('program.tipOlder')}: `}</Text>
                {a.tipOlder}
              </Text>
            ) : null}
            {a.themeTip ? <Text variant="small">{a.themeTip}</Text> : null}
            {id === 'fotojakt' ? photoList : null}
          </View>
        ) : null}
      </Surface>
    );
  };

  return (
    <Screen tab="plan" testID="screen-program">
      {!isWide ? <TopBar onBack={back} /> : null}
      <View style={{ paddingHorizontal: gutter, paddingTop: isWide ? 28 : 10 }}>
        <Text variant="eyebrow">{t('program.eyebrow')}</Text>
        <Text variant={isWide ? 'h1' : 'h1Small'} style={{ marginTop: 6, marginBottom: 8 }}>
          {t('program.title')}
        </Text>
        <Text variant="lede" style={{ marginBottom: 6, maxWidth: 640 }}>
          {t('program.lede')}
        </Text>
      </View>
      <View style={{ paddingHorizontal: gutter, marginTop: 18, gap: 18, maxWidth: isWide ? 720 : undefined }}>
        <Surface testID="program-chosen" style={styles.summary}>
          <Text style={styles.summaryTitle}>
            {picked.length ? t('program.chosenCount', { count: picked.length }) : t('program.cardEmpty')}
          </Text>
          <Text variant="small">
            {picked.length ? picked.map((id) => partyActivityName(id, party)).join(', ') : t('program.none')}
          </Text>
        </Surface>
        <View style={{ gap: 10 }} testID="program-suggested">
          <Text style={styles.sectionTitle}>{t('program.suggestedTitle')}</Text>
          <Text variant="small">{t('program.suggestedWhy')}</Text>
          {suggested.map(card)}
        </View>
        <Pressable
          testID="program-more-toggle"
          accessibilityRole="button"
          accessibilityState={{ expanded: showMore }}
          onPress={() => setShowMore((v) => !v)}
          style={({ pressed }) => [styles.more, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.sectionTitle}>{`${t('program.moreIdeas')} ${showMore ? '▴' : '▾'}`}</Text>
        </Pressable>
        {showMore
          ? more.map((g) => (
              <View key={g.id} style={{ gap: 10 }} testID={`program-group-${g.id}`}>
                <Text style={styles.groupTitle}>{t(`program.groups.${g.id}`)}</Text>
                {g.id === 'ute' ? (
                  <Text variant="small">{t('program.uteNote', { name: activityName('stoppdans') })}</Text>
                ) : null}
                {g.activities.map(card)}
              </View>
            ))
          : null}
        <Surface testID="program-timeline" style={{ gap: 10 }}>
          <Text style={styles.sectionTitle}>{t('program.timeline.title')}</Text>
          <Text variant="small">{t('program.timeline.note')}</Text>
          {timeline.map((b) => (
            <View key={`${b.id}-${b.time}`} style={styles.step} testID={`program-timeline-${b.id}`}>
              <Text style={styles.time}>{b.time}</Text>
              <Text style={{ flex: 1 }}>{b.title}</Text>
            </View>
          ))}
        </Surface>
        {picked.length ? (
          <View style={styles.row}>
            <Button
              compact
              kind="light"
              testID="program-shopping-link"
              label={t('plan.cards.shopping.title')}
              onPress={() => router.push('/handleliste')}
            />
            <Button
              compact
              kind="light"
              testID="program-todo-link"
              label={t('plan.cards.todo.title')}
              onPress={() => router.push('/gjoremal')}
            />
          </View>
        ) : null}
        <Button testID="program-done" label={t('program.done')} onPress={() => router.navigate('/plan')} />
      </View>
    </Screen>
  );
}

const useStyles = themedStyles((colors) => ({
  sectionTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  groupTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink, marginTop: 4 },
  label: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  summary: { gap: 4, backgroundColor: colors.blush },
  summaryTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  card: { gap: 8, borderWidth: 2, borderColor: 'transparent' },
  cardOn: { borderColor: colors.green },
  head: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  name: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 23, color: colors.ink, flexShrink: 1 },
  free: { backgroundColor: colors.sage, borderRadius: radii.pill, paddingVertical: 2, paddingHorizontal: 10 },
  freeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.green },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  link: { minHeight: TOUCH, justifyContent: 'center' },
  linkText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.green, textDecorationLine: 'underline' },
  pill: {
    minHeight: TOUCH,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.white,
    marginLeft: 'auto',
  },
  pillOn: { backgroundColor: colors.green, borderColor: colors.green },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.green },
  rules: { gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line },
  step: { flexDirection: 'row', gap: 10 },
  stepNo: { width: 20, fontFamily: fonts.bodyBold, color: colors.green },
  tipLabel: { fontFamily: fonts.bodyBold, color: colors.ink },
  time: { width: 56, fontFamily: fonts.bodySemi, color: colors.ink },
  more: { minHeight: TOUCH, justifyContent: 'center' },
  photo: { gap: 6, backgroundColor: colors.butter, borderRadius: radii.md, padding: 12 },
}));
