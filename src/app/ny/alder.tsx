import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { Grid, Text } from '../../ui';
import { fonts, radii, shadow, useColors, themedStyles } from '../../theme';
import { nb } from '../../i18n/nb';
import { draftWithAge } from '../../core';

const AGES = Array.from({ length: 12 }, (_, i) => i + 1);

export default function AgeStep() {
  const styles = useStyles();
  const colors = useColors();
  const { draft, updateDraft } = useParty();
  const router = useRouter();
  const name = draft.name.trim() || 'barnet';
  // the age can change the default party time's reason (spec §6.2); a hand-set time is kept
  const pick = (age: number) => updateDraft(draftWithAge(draft, age));
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
              <Text style={[styles.ageText, on && { color: colors.onPrimary }]}>{age}</Text>
            </Pressable>
          );
        }}
      />
    </SetupStep>
  );
}

const useStyles = themedStyles((colors) => ({
  age: {
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  ageText: { fontFamily: fonts.display, fontSize: 30, color: colors.ink },
}));
