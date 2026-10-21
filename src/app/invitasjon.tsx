import { ComingSoon } from '../features/ComingSoon';
import { images } from '../theme';
import { nb } from '../i18n/nb';

export default function Screen() {
  return (
    <ComingSoon
      image={images.inviteArt}
      title={nb.soon.invite.title}
      text={nb.soon.invite.text}
      tab="plan"
      showBack={true}
    />
  );
}
