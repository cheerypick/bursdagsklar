import { useRouter } from 'expo-router';
import { useParty } from '../../state/PartyProvider';
import { SetupStep } from '../../features/setup/SetupStep';
import { DateTimeFields } from '../../features/setup/DateTimeFields';
import { useTranslation } from 'react-i18next';
import { dateBounds } from '../../core';

/** Step 2: the date (our own calendar) and the time. The fields are shared with «Endre festen». */
export default function DateStep() {
  const { t } = useTranslation();
  const { draft, updateDraft, today } = useParty();
  const router = useRouter();
  const { min, max } = dateBounds(today);
  return (
    <SetupStep
      step={2}
      title={t('date.title')}
      lede={t('date.lede')}
      onBack={() => router.back()}
      onNext={() => router.push('/ny/barn')}
      nextDisabled={!draft.date}
      testID="step-date"
    >
      <DateTimeFields draft={draft} onChange={updateDraft} today={today} min={min} max={max} />
    </SetupStep>
  );
}
