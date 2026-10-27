import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CONTENT_MAX, fonts, shadow, useColors, themedStyles } from '../theme';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { Text } from './Text';

export type TabId = 'plan' | 'todo' | 'day';

const TABS: {
  id: TabId;
  labelKey: 'tabs.plan' | 'tabs.todo' | 'tabs.day';
  route: '/plan' | '/gjoremal' | '/festdagen';
  icon: 'home' | 'list' | 'star';
}[] = [
  { id: 'plan', labelKey: 'tabs.plan', route: '/plan', icon: 'home' },
  { id: 'todo', labelKey: 'tabs.todo', route: '/gjoremal', icon: 'list' },
  { id: 'day', labelKey: 'tabs.day', route: '/festdagen', icon: 'star' },
];

/** Bottom tab bar on phones; a top navigation bar on wide screens. */
export function NavBar({ active, placement }: { active: TabId; placement: 'top' | 'bottom' }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  if (placement === 'top') {
    return (
      <View style={[styles.top, { paddingTop: insets.top }]} role="navigation" aria-label={t('tabs.menu')}>
        <View style={styles.topInner}>
          <Text style={styles.brand}>{t('brand')}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {TABS.map((tab) => {
              const on = tab.id === active;
              return (
                <Pressable
                  key={tab.id}
                  accessibilityRole="link"
                  accessibilityLabel={t(tab.labelKey)}
                  accessibilityState={{ selected: on }}
                  onPress={() => router.navigate(tab.route)}
                  style={[styles.topLink, on && styles.topLinkOn]}
                >
                  <Icon
                    name={tab.icon}
                    size={20}
                    color={on ? colors.onPrimary : colors.green}
                    strokeWidth={on ? 2.4 : 2}
                  />
                  <Text style={[styles.topLabel, { color: on ? colors.onPrimary : colors.green }]}>
                    {t(tab.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.bottom, { paddingBottom: 10 + insets.bottom }]} role="navigation" aria-label={t('tabs.menu')}>
      {TABS.map((tab) => {
        const on = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={t(tab.labelKey)}
            accessibilityState={{ selected: on }}
            onPress={() => router.navigate(tab.route)}
            style={styles.tab}
          >
            <Icon name={tab.icon} size={24} color={on ? colors.green : colors.muted} strokeWidth={on ? 2.4 : 2} />
            <Text style={[styles.tabLabel, { color: on ? colors.green : colors.muted }]}>{t(tab.labelKey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tab: { alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 14, minWidth: 72, minHeight: 48 },
  tabLabel: { fontFamily: fonts.bodySemi, fontSize: 12 },
  top: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    alignItems: 'center',
    ...shadow,
  },
  topInner: {
    width: '100%',
    maxWidth: CONTENT_MAX,
    paddingHorizontal: 32,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { fontFamily: fonts.displayHeavy, fontSize: 22, color: colors.green, letterSpacing: -0.4 },
  topLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  topLinkOn: { backgroundColor: colors.green },
  topLabel: { fontFamily: fonts.bodySemi, fontSize: 15 },
}));
