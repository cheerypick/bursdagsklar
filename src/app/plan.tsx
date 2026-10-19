import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { CountdownRing } from '../features/CountdownRing';
import { Button, Grid, PhotoCard, Pill, PillRow, Screen, Surface, Text } from '../ui';
import { colors, fonts, images, radii, themeImages, useLayout } from '../theme';
import { nb } from '../i18n/nb';
import { buildTasks, formatLongCap, formatRangeCompact, genitive, nextTask, summarize, themeById } from '../core';

export default function PlanScreen() {
  const { ready, party, today, startOver } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();
  const [confirm, setConfirm] = useState(false);
  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;

  const s = summarize(party, today);
  const theme = themeById(party.theme);
  const { tasks } = buildTasks(party);
  const next = nextTask(party, tasks, today);
  const tid = formatRangeCompact(party.start, party.end);

  const cards = [
    {
      key: 'invite',
      image: images.inviteArt,
      title: nb.plan.cards.invite.title,
      sub: nb.plan.cards.invite.sub,
      badge: nb.plan.cards.invite.badge,
      route: '/invitasjon',
    },
    {
      key: 'food',
      image: images.grill,
      title: nb.plan.cards.food.title,
      sub: nb.plan.cards.food.sub,
      badge: party.menuChosen ? undefined : nb.plan.cards.food.badgeChoose,
      route: '/mat',
    },
    { key: 'cake', image: images.cake, title: nb.plan.cards.cake.title, sub: s.cakeLine, route: '/kake', half: true },
    {
      key: 'programme',
      image: images.pinata,
      title: nb.plan.cards.programme.title,
      sub: `${party.start.replace(':', '.')}–${party.end.replace(':', '.')}`,
      route: '/program',
      half: true,
    },
    {
      key: 'todo',
      image: images.gjoremal,
      title: nb.plan.cards.todo.title,
      sub: nb.plan.cards.todo.sub,
      badge: s.tasksThisWeek > 0 ? nb.plan.cards.todo.badge(s.tasksThisWeek) : undefined,
      route: '/gjoremal',
    },
  ];

  const startNew = async () => {
    await startOver();
    router.replace('/ny/navn');
  };

  const countdown = (
    <Surface style={[styles.row, { paddingVertical: 16, paddingHorizontal: 18 }]}>
      <CountdownRing percent={s.percentDone} label={String(s.daysLeft)} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 20 }}>{s.countdownLabel}</Text>
        <Text variant="small">{s.progressLine}</Text>
      </View>
    </Surface>
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
          <Text style={{ color: '#5a4a4f' }}>{next.quiet ?? next.task.detail ?? ''}</Text>
          <View style={{ marginTop: 16, flexDirection: 'row', gap: 10 }}>
            <Button
              compact
              block={!isWide}
              label={next.task.link?.label ?? nb.tabs.todo}
              onPress={() => router.push(next.task?.link?.route ?? '/gjoremal')}
            />
          </View>
        </>
      ) : (
        <Text variant="h3">{nb.plan.allDone}</Text>
      )}
    </View>
  );

  return (
    <Screen tab="plan" testID="screen-plan">
      <View style={[styles.head, { paddingHorizontal: gutter }]}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow">{nb.plan.eyebrow(theme.name)}</Text>
          <Text variant="h1Small" style={{ marginTop: 4 }}>
            {nb.plan.title(genitive(party.child.name), party.child.age)}
          </Text>
          <Text variant="small" style={{ marginTop: 6, fontSize: 16 }}>
            {nb.plan.meta(formatLongCap(party.date), tid, party.kidsInvited)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={styles.avatar}>
            <Image source={themeImages[party.theme]} style={{ width: '100%', height: '100%' }} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={nb.plan.newParty}
            onPress={() => setConfirm(true)}
            hitSlop={10}
            style={{ minHeight: 32, justifyContent: 'center' }}
          >
            <Text style={styles.newLink}>{nb.plan.newParty}</Text>
          </Pressable>
        </View>
      </View>

      {confirm ? (
        <View style={[styles.confirm, { marginHorizontal: gutter }]} accessibilityLiveRegion="polite">
          <Text style={{ fontFamily: fonts.bodySemi }}>{nb.plan.confirmNew}</Text>
          <View style={{ marginTop: 12 }}>
            <PillRow>
              <Pill label={nb.plan.confirmYes} on onPress={startNew} />
              <Pill label={nb.plan.confirmNo} light onPress={() => setConfirm(false)} />
            </PillRow>
          </View>
        </View>
      ) : null}

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

      <Text variant="h2Small" style={{ marginTop: 28, marginBottom: 12, paddingHorizontal: gutter }}>
        {nb.plan.section}
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
        ) : (
          <>
            {cards
              .filter((c) => !c.half && c.key !== 'todo')
              .map((c) => (
                <PhotoCard
                  key={c.key}
                  image={c.image}
                  title={c.title}
                  sub={c.sub}
                  badge={c.badge}
                  onPress={() => router.push(c.route)}
                />
              ))}
            <Grid
              items={cards.filter((c) => c.half)}
              columns={2}
              gap={14}
              keyOf={(c) => c.key}
              render={(c) => (
                <PhotoCard
                  image={c.image}
                  title={c.title}
                  sub={c.sub}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', borderWidth: 3, borderColor: colors.white },
  newLink: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.green2, textDecorationLine: 'underline' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  next: { backgroundColor: colors.blush, borderRadius: radii.lg, padding: 20 },
  when: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  whenText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.pink },
  confirm: { marginTop: 10, backgroundColor: colors.butter, borderRadius: radii.md, padding: 18 },
});
