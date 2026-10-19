import { View } from 'react-native';
import { Button, Screen, Text, TopBar } from '../../ui';
import { nb } from '../../i18n/nb';

export const SETUP_STEPS = 5;

interface Props {
  step: number;
  title: string;
  lede?: string;
  children: React.ReactNode;
  onBack: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  testID?: string;
}

/** One question per screen: progress, eyebrow, big title, lede, the input, and a big «Neste». */
export function SetupStep({
  step,
  title,
  lede,
  children,
  onBack,
  onNext,
  nextLabel = nb.common.next,
  nextDisabled,
  testID,
}: Props) {
  return (
    <Screen
      narrow
      testID={testID}
      footer={<Button label={nextLabel} onPress={onNext} disabled={nextDisabled} testID="next" />}
    >
      <TopBar onBack={onBack} step={step} of={SETUP_STEPS} />
      <View style={{ paddingHorizontal: 22, paddingTop: 18 }}>
        <Text variant="eyebrow">{nb.common.step(step, SETUP_STEPS)}</Text>
        <Text variant="h1" style={{ marginTop: 10, marginBottom: 8 }}>
          {title}
        </Text>
        {lede ? (
          <Text variant="lede" style={{ marginBottom: 26 }}>
            {lede}
          </Text>
        ) : null}
        {children}
      </View>
    </Screen>
  );
}
