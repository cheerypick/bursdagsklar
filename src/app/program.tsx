import { ComingSoon } from '../features/ComingSoon';
import { images } from '../theme';
import { useTranslation } from 'react-i18next';

export default function Screen() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      image={images.pinata}
      title={t('soon.programme.title')}
      text={t('soon.programme.text')}
      tab="plan"
      showBack={true}
    />
  );
}
