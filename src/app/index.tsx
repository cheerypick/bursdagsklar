import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useParty } from '../state/PartyProvider';
import { LanguagePicker } from '../features/LanguagePicker';
import { Loading } from '../features/Loading';
import { Button, Screen, Text } from '../ui';
import { fonts, images, useLayout, themedStyles } from '../theme';
import { useTranslation } from 'react-i18next';

export default function Welcome() {
  const { t } = useTranslation();
  const styles = useStyles();
  const { ready, party } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (!ready) return <Loading />;
  if (party) return <Redirect href="/plan" />;

  const start = () => router.push('/ny/hvem');
  // Phones: the photo gives way so the title, the text and «Planlegg bursdagen» fit above Safari's
  // toolbar (≈ 400 px for the copy); never smaller than 240 px, never taller than 62 % or 600 px.
  const heroHeight = isWide
    ? Math.min(620, Math.max(460, height - 160))
    : Math.max(240, Math.min(600, height * 0.62, height - 400));

  const copy = (
    <View style={{ paddingHorizontal: isWide ? 0 : gutter, paddingTop: 28, paddingBottom: 32, gap: 0 }}>
      <Text variant="hero">{t('welcome.title')}</Text>
      <Text variant="lede" style={{ marginTop: 12, marginBottom: 26 }}>
        {t('welcome.lede')}
      </Text>
      <Button label={t('welcome.cta')} onPress={start} testID="start" />
      <Text variant="small" style={{ textAlign: isWide ? 'left' : 'center', marginTop: 14, fontSize: 14 }}>
        {t('welcome.note')}
      </Text>
      <View style={{ marginTop: 18 }}>
        <LanguagePicker align={isWide ? 'flex-start' : 'center'} />
      </View>
    </View>
  );

  const hero = (
    <View style={[styles.hero, { height: heroHeight }, isWide && { borderRadius: 36 }]}>
      <Image
        source={images.hero}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        resizeMode="cover"
        accessibilityLabel={t('welcome.heroAlt')}
      />
      <Text style={[styles.brand, { top: (isWide ? 0 : insets.top) + 20 }]}>{t('brand')}</Text>
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
