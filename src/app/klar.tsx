import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { InvitationCard } from '../features/InvitationCard';
import { LicenseNote } from '../features/LicenseNote';
import { Button, Icon, Screen, Text } from '../ui';
import { fonts, useLayout, useColors, themedStyles } from '../theme';
import { nb } from '../i18n/nb';
import { genitive, summarize } from '../core';

export default function Ready() {
  const styles = useStyles();
  const colors = useColors();
  const { ready, party, today } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();
  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;
  const s = summarize(party, today);
  const items = [nb.ready.invite, nb.ready.todos, s.menuLine, s.cakeIdea, s.programmeLine];

  const text = (
    <View style={{ paddingHorizontal: isWide ? 0 : gutter }}>
      <Text variant="h1" color={colors.onPrimary} style={{ marginTop: 28, marginBottom: 6 }}>
        {nb.ready.title(genitive(party.child.name))}
      </Text>
      <Text variant="lede" color={colors.readyText} style={{ marginBottom: 18 }}>
        {nb.ready.lede(s.daysLeft, s.tasksThisWeek)}
      </Text>
      <View style={{ gap: 10 }} accessibilityRole="list">
        {items.map((it) => (
          <View key={it} style={styles.li} accessibilityRole="text">
            <View style={styles.tick}>
              <Icon name="check" size={16} color={colors.green} strokeWidth={3} />
            </View>
            <Text style={styles.liText}>{it}</Text>
          </View>
        ))}
      </View>
      <LicenseNote onPrimary />
    </View>
  );
  const cta = <Button kind="onDark" label={nb.ready.cta} onPress={() => router.replace('/plan')} testID="see-plan" />;

  return (
    <Screen background={colors.green} footer={cta} testID="screen-ready">
      {isWide ? (
        <View
          style={{ flexDirection: 'row', gap: 56, alignItems: 'center', paddingHorizontal: gutter, paddingTop: 40 }}
        >
          <View style={{ flex: 1, maxWidth: 440 }}>
            <InvitationCard party={party} />
          </View>
          <View style={{ flex: 1 }}>{text}</View>
        </View>
      ) : (
        <>
          <View style={{ marginTop: 24, marginHorizontal: gutter }}>
            <InvitationCard party={party} />
          </View>
          {text}
        </>
      )}
    </Screen>
  );
}

const useStyles = themedStyles((colors) => ({
  li: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tick: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liText: { color: colors.onPrimary, fontFamily: fonts.bodySemi, fontSize: 17, flexShrink: 1 },
}));
