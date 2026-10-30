import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { KidsFields } from '../../features/setup/KidsFields';
import { useTranslation } from 'react-i18next';
import { draftNames } from '../../core';

/** Step 3: how many children in total, the birthday children included. Shared fields: KidsFields. */
export default function KidsStep() {
  const { t } = useTranslation();
  const { draft, updateDraft } = useParty();
  const router = useRouter();
  const name = draftNames(draft) || 'bursdagsbarnet';
  return (
    <SetupStep
      step={3}
      title={t('kids.title')}
      lede={t('kids.lede', { navn: name })}
      onBack={() => router.back()}
      onNext={() => router.push('/ny/hvor')}
      testID="step-kids"
    >
      <KidsFields draft={draft} onChange={updateDraft} />
    </SetupStep>
  );
}
