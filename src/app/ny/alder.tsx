import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { Grid, Text } from '../../ui';
import { colors, fonts, radii, shadow } from '../../theme';
import { nb } from '../../i18n/nb';
import { defaultPartyTime, isWeekend } from '../../core';

const AGES = Array.from({ length: 12 }, (_, i) => i + 1);

export default function AgeStep() {
  const { draft, updateDraft } = useParty();
  const router = useRouter();
  const name = draft.name.trim() || 'barnet';
  const pick = (age: number) => {
    const patch: Partial<typeof draft> = { age };
    // the age changes the default party time (spec §6.2)
    if (draft.date) {
      const t = defaultPartyTime(age, isWeekend(draft.date));
      patch.start = t.start;
      patch.end = t.end;
    }
    updateDraft(patch);
  };
  return (
    <SetupStep
      step={2}
      title={nb.age.title(name)}
      lede={nb.age.lede}
      onBack={() => router.back()}
      onNext={() => router.push('/ny/dato')}
      nextDisabled={!draft.age}
      testID="step-age"
    >
      <Grid
        items={AGES}
        columns={4}
        gap={10}
        keyOf={(a) => String(a)}
        render={(age) => {
          const on = draft.age === age;
          return (
            <Pressable
              testID={`age-${age}`}
              accessibilityRole="radio"
              accessibilityLabel={nb.age.label(age)}
              accessibilityState={{ checked: on, selected: on }}
              onPress={() => pick(age)}
              style={[styles.age, on && { backgroundColor: colors.green }]}
            >
              <Text style={[styles.ageText, on && { color: colors.white }]}>{age}</Text>
            </Pressable>
          );
        }}
      />
    </SetupStep>
  );
}

const styles = StyleSheet.create({
  age: {
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  ageText: { fontFamily: fonts.display, fontSize: 30, color: colors.ink },
});
