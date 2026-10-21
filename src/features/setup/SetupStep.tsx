import { View } from 'react-native';
import { Button, Screen, Text, TopBar } from '../../ui';
import { useLayout } from '../../theme';
import { nb } from '../../i18n/nb';

/** who · when · how many · where (the theme is optional, later, on Planen). */
export const SETUP_STEPS = 4;

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
  // short phone screens: tighter spacing and a slightly smaller title, so the input fits above «Neste»
  const { isShort } = useLayout();
  return (
    <Screen
      narrow
      testID={testID}
      footer={<Button label={nextLabel} onPress={onNext} disabled={nextDisabled} testID="next" />}
    >
      <TopBar onBack={onBack} step={step} of={SETUP_STEPS} />
      <View style={{ paddingHorizontal: 22, paddingTop: isShort ? 6 : 18 }}>
        <Text variant="eyebrow">{nb.common.step(step, SETUP_STEPS)}</Text>
        <Text
          variant={isShort ? 'h1Small' : 'h1'}
          style={{ marginTop: isShort ? 4 : 10, marginBottom: isShort ? 4 : 8 }}
        >
          {title}
        </Text>
        {lede ? (
          <Text variant="lede" style={{ marginBottom: isShort ? 10 : 26 }}>
            {lede}
          </Text>
        ) : null}
        {children}
      </View>
    </Screen>
  );
}
