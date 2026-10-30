import { Pressable, View } from 'react-native';
import { Icon, Text } from '../../ui';
import { fonts, radii, shadow, useColors, themedStyles } from '../../theme';
import { useTranslation } from 'react-i18next';
import type { PlaceType, SetupDraft } from '../../core';

const PLACES: { id: PlaceType; emoji: string }[] = [
  { id: 'hus', emoji: '🏡' },
  { id: 'leilighet', emoji: '🏢' },
  { id: 'lokale', emoji: '🎪' },
  { id: 'ute', emoji: '🌳' },
];

/** Where the party is: four tiles. Shared by setup step 4 and «Endre festen». */
export function PlaceFields({
  draft,
  onChange,
}: {
  draft: SetupDraft;
  onChange: (patch: Partial<SetupDraft>) => void;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  return (
    <View style={{ gap: 12 }} accessibilityRole="radiogroup" accessibilityLabel={t('place.title')}>
      {PLACES.map((p) => {
        const on = draft.place === p.id;
        const o = { label: t(`place.options.${p.id}.label`), sub: t(`place.options.${p.id}.sub`) };
        return (
          <Pressable
            key={p.id}
            testID={`place-${p.id}`}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: on, selected: on }}
            aria-checked={on}
            onPress={() => onChange({ place: p.id })}
            style={({ pressed }) => [styles.tile, on && styles.on, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.emoji}>{p.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{o.label}</Text>
              <Text variant="small">{o.sub}</Text>
            </View>
            <View style={[styles.radio, on && { backgroundColor: colors.green, borderColor: colors.green }]}>
              {on ? <Icon name="check" size={16} strokeWidth={3} color={colors.onPrimary} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = themedStyles((colors) => ({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 76,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadow,
  },
  on: { borderColor: colors.green },
  emoji: { fontSize: 30, lineHeight: 36, width: 40, textAlign: 'center' },
  label: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  radio: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.boxBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
