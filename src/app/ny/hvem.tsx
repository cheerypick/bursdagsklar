import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { CelebrantFields } from '../../features/setup/CelebrantFields';
import { useTranslation } from 'react-i18next';
import { celebrantsComplete } from '../../core';

/**
 * Step 1: who has a birthday. One child by default; «+ Legg til et barn til» for siblings or
 * friends who celebrate together (up to three). Each child: first name and age (3–10).
 * The fields themselves are shared with «Endre festen» (features/setup/CelebrantFields.tsx).
 */
export default function WhoStep() {
  const { t } = useTranslation();
  const { draft, updateDraft } = useParty();
  const router = useRouter();
  const valid = celebrantsComplete(draft);
  return (
    <SetupStep
      step={1}
      title={t('who.title')}
      lede={t('who.lede')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onNext={() => valid && router.push('/ny/dato')}
      nextDisabled={!valid}
      testID="step-who"
    >
      <CelebrantFields draft={draft} onChange={updateDraft} autoFocusFirst />
    </SetupStep>
  );
}
