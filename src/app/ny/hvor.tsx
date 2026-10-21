import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { Icon, Text } from '../../ui';
import { fonts, radii, shadow, useColors, themedStyles } from '../../theme';
import { useTranslation } from 'react-i18next';
import { celebrantsComplete, draftComplete, type PlaceType } from '../../core';

const PLACES: { id: PlaceType; emoji: string }[] = [
  { id: 'hus', emoji: '🏡' },
  { id: 'leilighet', emoji: '🏢' },
  { id: 'lokale', emoji: '🎪' },
  { id: 'ute', emoji: '🌳' },
];

/** Step 4, the last: where the party is. «Lag planen» creates the party. */
export default function PlaceStep() {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const { draft, updateDraft, finishSetup } = useParty();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const make = async () => {
    if (!draftComplete(draft)) {
      // something earlier is missing: go back to the first unanswered step
      if (!celebrantsComplete(draft)) return router.replace('/ny/hvem');
      if (!draft.date) return router.replace('/ny/dato');
      return;
    }
    setBusy(true);
    await finishSetup();
    router.replace('/klar');
  };
  return (
    <SetupStep
      step={4}
      title={t('place.title')}
      lede={t('place.lede')}
      onBack={() => router.back()}
      onNext={make}
      nextLabel={t('place.cta')}
      nextDisabled={!draft.place || busy}
      testID="step-place"
    >
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
              onPress={() => updateDraft({ place: p.id })}
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
    </SetupStep>
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
