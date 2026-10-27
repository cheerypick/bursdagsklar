import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { Grid, HomeToggle, Screen, Surface, TaskRow, Text, useToast } from '../ui';
import { useLayout } from '../theme';
import { useTranslation } from 'react-i18next';
import { buildTasks, groupTasks, homeItemsFor, MONTHS_SHORT, parts, progress } from '../core';

export default function TodoScreen() {
  const { t } = useTranslation();
  const { ready, party, today, toggleTask, toggleHome } = useParty();
  const router = useRouter();
  const toast = useToast();
  const { isWide, gutter } = useLayout();
  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;

  const { tasks } = buildTasks(party);
  const groups = groupTasks(party, tasks, today);
  const pr = progress(party, tasks, today);
  const homeItems = homeItemsFor(party);

  const groupViews = groups.map((g, gi) => {
    const tick = g.tasks.filter((x) => !x.task.milestone);
    return (
      <View key={g.id} testID={`group-${g.id}`}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginTop: 24,
            marginBottom: 10,
          }}
        >
          <Text variant="h3" style={{ fontSize: 22 }}>
            {g.title}
          </Text>
          {gi === 0 ? (
            <Text variant="small">{t('todo.counter', { x: pr.done, y: pr.total })}</Text>
          ) : (
            <Text variant="small">{t('todo.counter', { x: tick.filter((x) => x.done).length, y: tick.length })}</Text>
          )}
        </View>
        <Surface padded={false} style={{ paddingHorizontal: 18, paddingVertical: 4 }}>
          {g.tasks.map(({ task, done, overdue, overdueText }, i) => {
            const { d, m } = parts(task.date);
            return (
              <TaskRow
                key={task.id}
                first={i === 0}
                day={String(d)}
                month={MONTHS_SHORT[m - 1]}
                hot={overdue || task.date === today || task.milestone}
                title={task.title}
                detail={task.detail}
                overdueText={overdueText}
                linkLabel={task.link?.label}
                onLink={task.link ? () => router.push(task.link!.route) : undefined}
                checked={done}
                milestone={task.milestone}
                onToggle={() => toggleTask(task.id, !done)}
                a11yToggle={
                  done ? t('todo.markUndone', { item: task.title }) : t('todo.markDone', { item: task.title })
                }
              />
            );
          })}
        </Surface>
      </View>
    );
  });

  return (
    <Screen tab="todo" testID="screen-todo">
      <View style={{ paddingHorizontal: gutter, paddingTop: 22 }}>
        <Text variant="h1Small">{t('todo.title')}</Text>
        <Text variant="lede" style={{ marginTop: 8, fontSize: 17 }}>
          {t('todo.lede')}
        </Text>
      </View>
      <View style={{ paddingHorizontal: gutter }}>
        {isWide ? (
          <Grid items={groupViews} columns={2} gap={20} keyOf={(_, i) => String(i)} render={(v) => v} />
        ) : (
          groupViews
        )}
      </View>

      <View style={{ paddingHorizontal: gutter, marginTop: 28 }}>
        <Surface>
          <Text variant="h3" style={{ marginBottom: 6 }}>
            {t('todo.homeTitle')}
          </Text>
          <Text variant="small" style={{ marginBottom: 12 }}>
            {t('todo.homeLede')}
          </Text>
          <Grid
            items={homeItems}
            columns={isWide ? 4 : 2}
            gap={10}
            keyOf={(id) => id}
            render={(id) => (
              <HomeToggle
                label={t(`home.${id}`)}
                on={party.haveAtHome.includes(id)}
                onPress={() => {
                  const nowHas = toggleHome(id);
                  toast(nowHas ? t('todo.removed') : t('todo.added'));
                }}
              />
            )}
          />
        </Surface>
      </View>
    </Screen>
  );
}
