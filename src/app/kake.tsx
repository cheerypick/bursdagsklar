import { ComingSoon } from '../features/ComingSoon';
import { images } from '../theme';
import { useTranslation } from 'react-i18next';

export default function Screen() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      image={images.cake}
      title={t('soon.cake.title')}
      text={t('soon.cake.text')}
      tab="plan"
      showBack={true}
    />
  );
}
