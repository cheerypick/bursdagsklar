import { ComingSoon } from '../features/ComingSoon';
import { images } from '../theme';
import { useTranslation } from 'react-i18next';

export default function Screen() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      image={images.inviteArt}
      title={t('soon.invite.title')}
      text={t('soon.invite.text')}
      tab="plan"
      showBack={true}
    />
  );
}
