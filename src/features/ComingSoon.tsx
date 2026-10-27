import { Image, View, type ImageSourcePropType } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useParty } from '../state/PartyProvider';
import { Loading } from './Loading';
import { BackButton, Button, Screen, Text, type TabId } from '../ui';
import { useLayout, themedStyles } from '../theme';
import { useTranslation } from 'react-i18next';

/** Placeholder for areas that arrive in later milestones (Invitasjon, Mat, Kake, Program, Festdagen). */
export function ComingSoon({
  image,
  title,
  text,
  tab = 'plan',
  showBack = true,
}: {
  image: ImageSourcePropType;
  title: string;
  text: string;
  tab?: TabId;
  showBack?: boolean;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const { ready, party } = useParty();
  const router = useRouter();
  const { isWide, gutter } = useLayout();
  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/plan'));
  return (
    <Screen tab={tab} bleedTop={!isWide}>
      <View style={[styles.hero, isWide && { height: 380, borderRadius: 32, marginHorizontal: gutter, marginTop: 24 }]}>
        <Image source={image} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        {showBack && !isWide ? (
          <View style={{ position: 'absolute', top: 16, left: 16 }}>
            <BackButton onPress={back} />
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: gutter, paddingTop: 22, maxWidth: 720 }}>
        <Text variant="eyebrow">{t('soon.eyebrow')}</Text>
        <Text variant="h1Small" style={{ marginTop: 6, marginBottom: 8 }}>
          {title}
        </Text>
        <Text variant="lede" style={{ fontSize: 17 }}>
          {text}
        </Text>
        <View style={{ marginTop: 24 }}>
          <Button kind="light" label={t('soon.backToPlan')} onPress={() => router.navigate('/plan')} />
        </View>
      </View>
    </Screen>
  );
}

const useStyles = themedStyles((colors) => ({
  hero: {
    height: 300,
    overflow: 'hidden',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    backgroundColor: colors.sage,
  },
}));
