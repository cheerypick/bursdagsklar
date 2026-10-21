import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { Button, Screen, Text } from '../ui';
import { fonts, images, useLayout, themedStyles } from '../theme';
import { nb } from '../i18n/nb';

export default function Welcome() {
  const styles = useStyles();
  const { ready, party } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!ready) return <Loading />;
  if (party) return <Redirect href="/plan" />;

  const start = () => router.push('/ny/hvem');
  const heroHeight = isWide ? Math.min(620, Math.max(460, height - 160)) : Math.min(600, Math.max(430, height * 0.62));

  const copy = (
    <View style={{ paddingHorizontal: isWide ? 0 : gutter, paddingTop: 28, paddingBottom: 32, gap: 0 }}>
      <Text variant="hero">{nb.welcome.title}</Text>
      <Text variant="lede" style={{ marginTop: 12, marginBottom: 26 }}>
        {nb.welcome.lede}
      </Text>
      <Button label={nb.welcome.cta} onPress={start} testID="start" />
      <Text variant="small" style={{ textAlign: isWide ? 'left' : 'center', marginTop: 14, fontSize: 14 }}>
        {nb.welcome.note}
      </Text>
    </View>
  );

  const hero = (
    <View style={[styles.hero, { height: heroHeight }, isWide && { borderRadius: 36 }]}>
      <Image
        source={images.hero}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        resizeMode="cover"
        accessibilityLabel={nb.welcome.heroAlt}
      />
      <Text style={[styles.brand, { top: (isWide ? 0 : insets.top) + 20 }]}>{nb.brand}</Text>
    </View>
  );

  if (isWide) {
    return (
      <Screen>
        <View
          style={{
            flexDirection: 'row',
            gap: 48,
            alignItems: 'center',
            paddingHorizontal: gutter,
            paddingVertical: 40,
            minHeight: height - insets.top - insets.bottom,
          }}
        >
          <View style={{ flex: 1.15 }}>{hero}</View>
          <View style={{ flex: 1, maxWidth: 460 }}>{copy}</View>
        </View>
      </Screen>
    );
  }
  return (
    <Screen bleedTop>
      {hero}
      {copy}
    </Screen>
  );
}

const useStyles = themedStyles((colors) => ({
  hero: { overflow: 'hidden', borderBottomLeftRadius: 36, borderBottomRightRadius: 36, backgroundColor: colors.sage },
  brand: {
    position: 'absolute',
    left: 22,
    fontFamily: fonts.displayHeavy,
    fontSize: 22,
    color: colors.white,
    letterSpacing: -0.4,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 12,
  },
}));
