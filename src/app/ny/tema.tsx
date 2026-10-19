import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { Grid, ThemeTile } from '../../ui';
import { themeImages, useLayout } from '../../theme';
import { nb } from '../../i18n/nb';
import { draftComplete, THEMES } from '../../core';

export default function ThemeStep() {
  const { draft, updateDraft, finishSetup } = useParty();
  const router = useRouter();
  const { isWide } = useLayout();
  const [busy, setBusy] = useState(false);
  const name = draft.name.trim() || 'barnet';
  const make = async () => {
    if (!draftComplete(draft)) {
      // something earlier is missing: go back to the first unanswered step
      if (!draft.name.trim()) return router.replace('/ny/navn');
      if (!draft.age) return router.replace('/ny/alder');
      if (!draft.date) return router.replace('/ny/dato');
      return;
    }
    setBusy(true);
    await finishSetup();
    router.replace('/klar');
  };
  return (
    <SetupStep
      step={5}
      title={nb.theme.title(name)}
      lede={nb.theme.lede}
      onBack={() => router.back()}
      onNext={make}
      nextLabel={nb.theme.cta}
      nextDisabled={!draft.theme || busy}
      testID="step-theme"
    >
      <Grid
        items={THEMES}
        columns={isWide ? 3 : 2}
        keyOf={(t) => t.id}
        render={(t) => (
          <ThemeTile
            image={themeImages[t.id]}
            label={t.name}
            selected={draft.theme === t.id}
            onPress={() => updateDraft({ theme: t.id })}
          />
        )}
      />
    </SetupStep>
  );
}
