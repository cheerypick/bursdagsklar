import { StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { colors, fonts } from '../../theme';
import { nb } from '../../i18n/nb';

export default function NameStep() {
  const { draft, updateDraft } = useParty();
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const valid = draft.name.trim().length >= 1;
  const next = () => valid && router.push('/ny/alder');
  return (
    <SetupStep
      step={1}
      title={nb.name.title}
      lede={nb.name.lede}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onNext={next}
      nextDisabled={!valid}
      testID="step-name"
    >
      <TextInput
        testID="name-input"
        value={draft.name}
        onChangeText={(name) => updateDraft({ name: name.replace(/\s+/g, ' ').slice(0, 20) })}
        placeholder={nb.name.placeholder}
        placeholderTextColor="#B8B2A8"
        accessibilityLabel={nb.name.label}
        autoCapitalize="words"
        autoComplete="off"
        autoCorrect={false}
        autoFocus
        maxLength={20}
        returnKeyType="next"
        onSubmitEditing={next}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.field, focused && { borderBottomColor: colors.pink }]}
      />
    </SetupStep>
  );
}

const styles = StyleSheet.create({
  field: {
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.ink,
    borderBottomWidth: 3,
    borderBottomColor: colors.green,
    paddingVertical: 8,
    paddingHorizontal: 2,
    outlineStyle: 'none',
  } as object,
});
