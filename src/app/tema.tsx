import { Pressable, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useParty } from '../state/PartyProvider';
import { Loading } from '../features/Loading';
import { LicenseNote } from '../features/LicenseNote';
import { Button, Grid, Icon, Screen, Text, ThemeTile, TopBar } from '../ui';
import { fonts, radii, shadow, themeImages, useColors, useLayout, themedStyles } from '../theme';
import { useTranslation } from 'react-i18next';
import { THEMES } from '../core';

/**
 * «Velg tema (valgfritt)», opened from Planen. A tap applies the theme at once (the whole app
 * repaints, so the parent sees it); «Uten tema» goes back to the neutral look.
 */
export default function ThemePicker() {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const { ready, party, setTheme } = useParty();
  const router = useRouter();
  const { isWide } = useLayout();
  if (!ready) return <Loading />;
  if (!party) return <Redirect href="/" />;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/plan'));
  const none = party.theme === null;
  return (
    <Screen narrow testID="screen-theme" footer={<Button label={t('theme.done')} onPress={back} testID="theme-done" />}>
      <TopBar onBack={back} />
      <View style={{ paddingHorizontal: 22, paddingTop: 18 }}>
        <Text variant="h1" style={{ marginBottom: 8 }}>
          {t('theme.title')}
        </Text>
        <Text variant="lede" style={{ marginBottom: 22 }}>
          {t('theme.lede')}
        </Text>
        <Pressable
          testID="theme-none"
          accessibilityRole="radio"
          accessibilityLabel={t('theme.none')}
          accessibilityState={{ checked: none, selected: none }}
          onPress={() => setTheme(null)}
          style={[styles.none, none && styles.noneOn]}
        >
          <Text style={{ fontSize: 26 }}>🎈</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.noneLabel}>{t('theme.none')}</Text>
            <Text variant="small">{t('theme.noneSub')}</Text>
          </View>
          {none ? (
            <View style={styles.check}>
              <Icon name="check" size={16} color={colors.onPrimary} strokeWidth={3} />
            </View>
          ) : null}
        </Pressable>
        <View style={{ marginTop: 16 }} accessibilityRole="radiogroup" accessibilityLabel={t('theme.title')}>
          <Grid
            items={THEMES}
            columns={isWide ? 3 : 2}
            keyOf={(th) => th.id}
            render={(th) => (
              <ThemeTile
                image={themeImages[th.id]}
                label={th.name}
                selected={party.theme === th.id}
                onPress={() => setTheme(th.id)}
              />
            )}
          />
        </View>
        <LicenseNote always />
      </View>
    </Screen>
  );
}

const useStyles = themedStyles((colors) => ({
  none: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 3,
    borderColor: 'transparent',
    ...shadow,
  },
  noneOn: { borderColor: colors.green },
  noneLabel: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.ink },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
