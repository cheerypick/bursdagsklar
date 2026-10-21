import { ComingSoon } from '../features/ComingSoon';
import { images } from '../theme';
import { useTranslation } from 'react-i18next';

export default function Screen() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      image={images.fiskedam}
      title={t('soon.day.title')}
      text={t('soon.day.text')}
      tab="day"
      showBack={false}
    />
  );
}
