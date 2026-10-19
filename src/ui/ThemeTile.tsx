import { Image, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { colors, fonts, radii, shadow } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

export function ThemeTile({
  image,
  label,
  selected,
  onPress,
}: {
  image: ImageSourcePropType;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, selected && styles.on, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.imgWrap}>
        <Image source={image} style={styles.img} resizeMode="cover" />
      </View>
      <Text style={styles.label}>{label}</Text>
      {selected ? (
        <View style={styles.check}>
          <Icon name="check" size={18} color={colors.white} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 3,
    borderColor: 'transparent',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    overflow: 'hidden',
    ...shadow,
  },
  on: { borderColor: colors.green },
  imgWrap: { width: '100%', aspectRatio: 1, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  label: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, fontFamily: fonts.bodyBold, fontSize: 17 },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
