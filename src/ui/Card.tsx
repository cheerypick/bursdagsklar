import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, radii, shadow } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

/** White surface with the prototype's soft shadow. */
export function Surface({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return <View style={[styles.surface, padded && { padding: 20 }, style]}>{children}</View>;
}

interface PhotoCardProps {
  image: ImageSourcePropType;
  title: string;
  sub?: string;
  badge?: string;
  onPress: () => void;
  /** 16/10 for the wide plan cards, 1 for square half cards */
  aspectRatio?: number;
  arrow?: boolean;
  imagePosition?: 'top' | 'center';
  style?: StyleProp<ViewStyle>;
}

/** A big tappable photo card (Planen). */
export function PhotoCard({
  image,
  title,
  sub,
  badge,
  onPress,
  aspectRatio = 16 / 10,
  arrow = true,
  style,
}: PhotoCardProps) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={[title, sub, badge].filter(Boolean).join('. ')}
      onPress={onPress}
      style={({ pressed }) => [styles.surface, styles.card, pressed && { transform: [{ scale: 0.985 }] }, style]}
    >
      <View style={{ aspectRatio, overflow: 'hidden' }}>
        <Image source={image} style={styles.img} resizeMode="cover" accessibilityIgnoresInvertColors />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.txt}>
        <View style={{ flex: 1 }}>
          <Text variant="h3">{title}</Text>
          {sub ? (
            <Text variant="small" style={{ marginTop: 3 }}>
              {sub}
            </Text>
          ) : null}
        </View>
        {arrow ? (
          <View style={styles.arrow}>
            <Icon name="arrow" size={20} color={colors.green} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  surface: { backgroundColor: colors.card, borderRadius: radii.lg, ...shadow },
  card: { overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.green },
  txt: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
