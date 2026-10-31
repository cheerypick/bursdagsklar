import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { PlaceFields } from '../../features/setup/PlaceFields';
import { useTranslation } from 'react-i18next';
import { celebrantsComplete, draftComplete } from '../../core';

/** Step 4, the last: where the party is. «Lag planen» creates the party. Shared fields: PlaceFields. */
export default function PlaceStep() {
  const { t } = useTranslation();
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
      <PlaceFields draft={draft} onChange={updateDraft} />
    </SetupStep>
  );
}
