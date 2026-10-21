import { Image, Pressable, View, type ImageSourcePropType } from 'react-native';
import { fonts, radii, shadow, useColors, themedStyles } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

/** A big picture card you pick (Mat: Pølser, Pizza, Noe annet). `multi`: several can be picked (a checkbox). */
export function ChoiceTile({
  image,
  label,
  sub,
  selected,
  onPress,
  testID,
  multi,
}: {
  image: ImageSourcePropType;
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
  multi?: boolean;
}) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      aria-checked={selected}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      accessibilityState={{ checked: selected, selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, selected && styles.on, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.imgWrap}>
        <Image source={image} style={styles.img} resizeMode="cover" accessibilityIgnoresInvertColors />
      </View>
      <View style={styles.txt}>
        <Text style={styles.label}>{label}</Text>
        {sub ? (
          <Text variant="small" style={{ marginTop: 2 }}>
            {sub}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <View style={styles.check}>
          <Icon name="check" size={18} color={colors.onPrimary} strokeWidth={3} />
        </View>
      ) : null}
    </Pressable>
  );
}

const useStyles = themedStyles((colors) => ({
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
  imgWrap: { width: '100%', aspectRatio: 4 / 3, overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
  txt: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14 },
  label: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  check: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
