import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { Stepper, Text } from '../../ui';
import { radii, useColors } from '../../theme';
import { nb } from '../../i18n/nb';
import { draftNames, draftYoungest, MAX_CHILDREN, minChildren } from '../../core';

export default function KidsStep() {
  const colors = useColors();
  const { draft, updateDraft } = useParty();
  const router = useRouter();
  const name = draftNames(draft) || 'bursdagsbarnet';
  const hint = (draftYoungest(draft) ?? 5) <= 5 ? nb.kids.hintSmall : nb.kids.hintSchool;
  return (
    <SetupStep
      step={3}
      title={nb.kids.title}
      lede={nb.kids.lede(name)}
      onBack={() => router.back()}
      onNext={() => router.push('/ny/hvor')}
      testID="step-kids"
    >
      <Stepper
        testID="kids-count"
        value={draft.children}
        min={minChildren(draft.celebrants.length)}
        max={MAX_CHILDREN}
        unit={nb.kids.unit}
        onChange={(children) => updateDraft({ children })}
        lessLabel={nb.kids.fewer}
        moreLabel={nb.kids.more}
      />
      <Text variant="small" style={{ marginTop: 10 }}>
        {(draftYoungest(draft) ?? 5) <= 4 ? nb.kids.adultsHelp : nb.kids.adultsCounted}
      </Text>
      <View
        style={{
          marginTop: 16,
          padding: 16,
          paddingHorizontal: 18,
          borderRadius: radii.md,
          backgroundColor: colors.lilac,
        }}
      >
        <Text style={{ fontSize: 16 }}>{hint}</Text>
      </View>
    </SetupStep>
  );
}
