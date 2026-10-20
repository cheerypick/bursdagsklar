import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, View } from 'react-native';
import { fonts, radii, themedStyles, useColors, useLayout } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

/**
 * The one big, inviting call to action on a coloured screen («Se planen din 🎉»): white, extra
 * large, with an arrow and a gentle entrance (fade + rise). Full width on phones, prominent but
 * sized to its label on wide screens. No animation when the device asks for reduced motion.
 */
export function HeroButton({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  const styles = useStyles();
  const colors = useColors();
  const { isWide } = useLayout();
  const [anim] = useState(() => new Animated.Value(0));
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => alive && setReduced(r))
      .catch(() => alive && setReduced(true));
    // never leave the button hidden: if the setting can't be read quickly, just show it
    const t = setTimeout(() => alive && setReduced((r) => r ?? true), 600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (reduced === null) return;
    if (reduced) {
      anim.setValue(1);
      return;
    }
    Animated.spring(anim, {
      toValue: 1,
      delay: 250,
      friction: 6,
      tension: 60,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [anim, reduced]);

  const style = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  };

  return (
    <Animated.View style={[style, isWide ? { alignSelf: 'flex-start' } : { alignSelf: 'stretch' }]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label.replace(/[^\p{L}\p{N}\s]/gu, '').trim()}
        onPress={onPress}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.button,
          isWide ? styles.wide : null,
          hovered && styles.hover,
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={{ width: 48 }} />
        <Text style={styles.label}>{label}</Text>
        <View style={styles.arrow}>
          <Icon name="arrow" size={22} strokeWidth={2.6} color={colors.onPrimary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = themedStyles((colors) => ({
  button: {
    minHeight: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingLeft: 12,
    paddingRight: 12,
    boxShadow: '0 10px 30px rgba(0,0,0,0.28)',
  } as object,
  wide: { minWidth: 380 },
  hover: { boxShadow: '0 14px 36px rgba(0,0,0,0.34)' } as object,
  label: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.ink, flex: 1, textAlign: 'center' },
  arrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
