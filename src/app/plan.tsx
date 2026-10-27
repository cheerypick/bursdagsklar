import { Image, Pressable, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { CountdownRing } from '../features/CountdownRing';
import { LanguagePicker } from '../features/LanguagePicker';
import { LicenseNote } from '../features/LicenseNote';
import { StartOverButton } from '../features/StartOver';
import { Button, Grid, Icon, PhotoCard, Screen, Surface, Text } from '../ui';
import { fonts, images, radii, shadow, themeImages, useLayout, themedStyles, useColors } from '../theme';
import { useTranslation } from 'react-i18next';
import {
  buildTasks,
  foodCardSummary,
  formatLongCap,
  formatRangeCompact,
  handleliste,
  menuCardOf,
  shoppingCardLine,
  nextTask,
  planTitle,
  summarize,
  themeById,
} from '../core';

export default function PlanScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const { ready, party, today } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();
  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;

  const s = summarize(party, today);
  // the theme is optional: without one, the neutral look, our own picture and neutral words
  const theme = party.theme ? themeById(party.theme) : null;
  const heroImage = party.theme ? themeImages[party.theme] : images.hero;
  const place = t(`place.eyebrow.${party.home.type ?? 'none'}`);
  const { tasks } = buildTasks(party);
  const next = nextTask(party, tasks, today);
  const tid = formatRangeCompact(party.start, party.end);
  const food = foodCardSummary(party);
  const shopping = handleliste(party);
  const foodCard = menuCardOf(party.menu);
  const foodImage =
    foodCard === 'pizza'
      ? images.menuPizza
      : foodCard === 'taco'
        ? images.menuTaco
        : foodCard === 'pasta'
          ? images.menuPasta
          : foodCard === 'annet'
            ? images.menuAnnet
            : images.grill;

  const cards = [
    {
      key: 'invite',
      image: heroImage,
      title: t('plan.cards.invite.title'),
      sub: t('plan.cards.invite.sub'),
      // done-state: «Invitasjonen er sendt» ticked (on Invitasjon or the to-do «Send invitasjonen»)
      badge: party.taskState.sendInvite?.done ? t('invitation.cardSent') : t('plan.cards.invite.badge'),
      route: '/invitasjon',
    },
    {
      key: 'food',
      image: foodImage,
      title: food ? t('plan.cards.food.chosenTitle', { menu: food.title }) : t('plan.cards.food.title'),
      sub: food ? food.line : t('plan.cards.food.sub'),
      badge: food ? undefined : t('plan.cards.food.badgeChoose'),
      route: '/mat',
    },
    {
      key: 'cake',
      image: images.cake,
      title: t('plan.cards.cake.title'),
      // Kake: the chosen cake (the Toro default until she picks), «Valgt» once picked or confirmed;
      // with a theme, its decoration idea as before («Lyseblå og hvit kake med snøkrystaller»)
      sub: theme ? `${s.cakeChoice}\n${theme.copy.cakeIdea}` : s.cakeChoice,
      badge: s.cakeChosen ? t('plan.cards.cake.done') : undefined,
      route: '/kake',
      half: true,
    },
    {
      key: 'programme',
      image: images.pinata,
      title: t('plan.cards.programme.title'),
      // Program: the picked ideas («Skattejakt og piñata»), «2 valgt» as the done state; else a soft invitation
      sub: s.programmeChoice || t('program.cardEmpty'),
      badge: s.programmeCount > 0 ? t('plan.cards.programme.done', { count: s.programmeCount }) : undefined,
      route: '/program',
      half: true,
    },
    {
      key: 'todo',
      image: images.gjoremal,
      title: t('plan.cards.todo.title'),
      sub: t('plan.cards.todo.sub'),
      badge: s.tasksThisWeek > 0 ? t('plan.cards.todo.badge', { n: s.tasksThisWeek }) : undefined,
      route: '/gjoremal',
    },
  ];

  const countdown = (
    <Surface style={[styles.row, { paddingVertical: 16, paddingHorizontal: 18 }]}>
      <CountdownRing percent={s.percentDone} label={String(s.daysLeft)} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 20 }}>{s.countdownLabel}</Text>
        <Text variant="small">{s.progressLine}</Text>
      </View>
    </Surface>
  );

  // Handleliste: generated from the party (food lines, drinks, party things, candy); «12 varer · 3 kjøpt»
  const shoppingCard = (
    <Pressable
      testID="plan-card-shopping"
      accessibilityRole="link"
      accessibilityLabel={`${t('plan.cards.shopping.title')}. ${shoppingCardLine(shopping)}`}
      onPress={() => router.push('/handleliste')}
      style={({ pressed }) => [styles.shopCard, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.shopThumb}>
        <Text style={{ fontSize: 28 }}>🛒</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.themeTitle}>{t('plan.cards.shopping.title')}</Text>
        <Text variant="small" testID="plan-card-shopping-count">
          {shoppingCardLine(shopping)}
        </Text>
      </View>
      <Icon name="forward" size={22} strokeWidth={2.4} color={colors.green} />
    </Pressable>
  );

  const nextCard = (
    <View style={styles.next} testID="next-task">
      {next.task ? (
        <>
          <View style={styles.when}>
            <Text style={styles.whenText}>{next.when}</Text>
          </View>
          <Text variant="h2Small" style={{ marginTop: 12, marginBottom: 6 }}>
            {next.task.title}
          </Text>
          <Text style={{ color: colors.muted }}>{next.quiet ?? next.task.detail ?? ''}</Text>
          <View style={{ marginTop: 16, flexDirection: 'row', gap: 10 }}>
            <Button
              testID="next-task-cta"
              compact
              block={!isWide}
              label={next.task.link?.label ?? t('tabs.todo')}
              onPress={() => router.push(next.task?.link?.route ?? '/gjoremal')}
            />
          </View>
        </>
      ) : (
        <Text variant="h3">{t('plan.allDone')}</Text>
      )}
    </View>
  );

  return (
    <Screen tab="plan" testID="screen-plan">
      <View style={[styles.hero, { marginHorizontal: gutter, marginTop: isWide ? 24 : 14 }]} testID="plan-hero">
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" color={colors.onPrimarySoft}>
            {theme ? `${theme.emoji} ` : ''}
            {place}
          </Text>
          <Text variant="h1Small" color={colors.onPrimary} style={{ marginTop: 6 }} testID="plan-title">
            {planTitle(party)}
          </Text>
          <Text style={styles.greeting} testID="plan-greeting">
            {theme ? theme.copy.greeting : t('plan.greeting')}
          </Text>
          <Text variant="small" color={colors.onPrimarySoft} style={{ marginTop: 8, fontSize: 16 }} testID="plan-meta">
            {t('plan.meta', {
              dato: formatLongCap(party.date),
              tid,
              kids: t('common.kids', { count: party.children }),
            })}
          </Text>
        </View>
        <View style={[styles.heroArt, isWide && { width: 140, height: 140, borderRadius: 32 }]}>
          <Image source={heroImage} style={{ width: '100%', height: '100%' }} />
        </View>
      </View>
      <View style={{ paddingHorizontal: gutter - 12, marginTop: 4 }}>
        <StartOverButton align="flex-end" />
      </View>

      {isWide ? (
        <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: gutter, marginTop: 14 }}>
          <View style={{ flex: 1 }}>{countdown}</View>
          <View style={{ flex: 1.4 }}>{nextCard}</View>
        </View>
      ) : (
        <View style={{ paddingHorizontal: gutter, marginTop: 14, gap: 14 }}>
          {countdown}
          {nextCard}
        </View>
      )}

      <View style={{ paddingHorizontal: gutter, marginTop: 14 }}>
        <Pressable
          testID="theme-card"
          accessibilityRole="button"
          accessibilityLabel={`${theme ? t('theme.cardChosen.title', { tema: theme.name }) : t('theme.card.title')}. ${theme ? t('theme.cardChosen.sub') : t('theme.card.sub')}`}
          onPress={() => router.push('/tema')}
          style={({ pressed }) => [styles.themeCard, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.themeThumb}>
            {party.theme ? (
              <Image source={themeImages[party.theme]} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={{ fontSize: 28 }}>🎨</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.themeTitle}>
              {theme ? t('theme.cardChosen.title', { tema: theme.name }) : t('theme.card.title')}
            </Text>
            <Text variant="small">{theme ? t('theme.cardChosen.sub') : t('theme.card.sub')}</Text>
          </View>
          <Icon name="forward" size={22} strokeWidth={2.4} color={colors.green} />
        </Pressable>
      </View>

      <Text variant="h2Small" style={{ marginTop: 28, marginBottom: 12, paddingHorizontal: gutter }}>
        {t('plan.section')}
      </Text>
      <View style={{ paddingHorizontal: gutter, gap: 14 }}>
        {isWide ? (
          <Grid
            items={cards}
            columns={3}
            gap={16}
            keyOf={(c) => c.key}
            render={(c) => (
              <PhotoCard
                testID={`plan-card-${c.key}`}
                image={c.image}
                title={c.title}
                sub={c.sub}
                badge={c.badge}
                aspectRatio={16 / 11}
                arrow={false}
                onPress={() => router.push(c.route)}
              />
            )}
          />
        ) : null}
        {isWide ? shoppingCard : null}
        {isWide ? null : (
          <>
            {cards
              .filter((c) => !c.half && c.key !== 'todo')
              .map((c) => (
                <PhotoCard
                  key={c.key}
                  testID={`plan-card-${c.key}`}
                  image={c.image}
                  title={c.title}
                  sub={c.sub}
                  badge={c.badge}
                  onPress={() => router.push(c.route)}
                />
              ))}
            {shoppingCard}
            <Grid
              items={cards.filter((c) => c.half)}
              columns={2}
              gap={14}
              keyOf={(c) => c.key}
              render={(c) => (
                <PhotoCard
                  testID={`plan-card-${c.key}`}
                  image={c.image}
                  title={c.title}
                  sub={c.sub}
                  badge={c.badge}
                  aspectRatio={1}
                  arrow={false}
                  onPress={() => router.push(c.route)}
                />
              )}
            />
            {cards
              .filter((c) => c.key === 'todo')
              .map((c) => (
                <PhotoCard
                  key={c.key}
                  testID={`plan-card-${c.key}`}
                  image={c.image}
                  title={c.title}
                  sub={c.sub}
                  badge={c.badge}
                  onPress={() => router.push(c.route)}
                />
              ))}
          </>
        )}
      </View>
      <View style={{ paddingHorizontal: gutter }}>
        <LicenseNote />
        <View style={{ paddingTop: 12 }}>
          <LanguagePicker />
        </View>
      </View>
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
  greeting: { fontFamily: fonts.displaySemi, fontSize: 19, lineHeight: 24, color: colors.onPrimary, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  next: { backgroundColor: colors.blush, borderRadius: radii.lg, padding: 20 },
  when: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  whenText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.hot },
  themeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    padding: 12,
    paddingRight: 18,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.boxBorder,
  },
  themeThumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 80,
    padding: 12,
    paddingRight: 18,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    ...shadow,
  },
  shopThumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.butter,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
