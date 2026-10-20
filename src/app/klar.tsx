import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { InvitationCard } from '../features/InvitationCard';
import { LicenseNote } from '../features/LicenseNote';
import { HeroButton, Icon, Screen, Text } from '../ui';
import { fonts, useLayout, useColors, themedStyles } from '../theme';
import { nb } from '../i18n/nb';
import { readyTitle, summarize } from '../core';

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

  const title = (
    <>
      <Text variant="h1" color={colors.onPrimary} style={{ marginBottom: 6 }}>
        {readyTitle(party)}
      </Text>
      <Text variant="lede" color={colors.readyText}>
        {nb.ready.lede(s.daysLeft, s.tasksThisWeek)}
      </Text>
    </>
  );
  // the way on is the hero of this screen: big, inviting, above the fold (it sits right under the card)
  const cta = <HeroButton label={nb.ready.cta} onPress={() => router.replace('/plan')} testID="see-plan" />;
  const list = (
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
  );

  return (
    <Screen background={colors.green} testID="screen-ready">
      {isWide ? (
        <View
          style={{ flexDirection: 'row', gap: 56, alignItems: 'center', paddingHorizontal: gutter, paddingTop: 40 }}
        >
          <View style={{ flex: 1, maxWidth: 440 }}>
            <InvitationCard party={party} />
          </View>
          <View style={{ flex: 1, paddingTop: 12 }}>
            {title}
            <View style={{ marginTop: 26, marginBottom: 30 }}>{cta}</View>
            {list}
            <LicenseNote onPrimary />
          </View>
        </View>
      ) : (
        <View style={{ paddingHorizontal: gutter, paddingTop: 22 }}>
          {title}
          <View style={{ marginTop: 18 }}>
            <InvitationCard party={party} compact />
          </View>
          <View style={{ marginTop: 22, marginBottom: 26 }}>{cta}</View>
          {list}
          <LicenseNote onPrimary />
        </View>
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
