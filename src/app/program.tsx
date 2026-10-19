import { ComingSoon } from '../features/ComingSoon';
import { images } from '../theme';
import { nb } from '../i18n/nb';

export default function Screen() {
  return (
    <ComingSoon
      image={images.pinata}
      title={nb.soon.programme.title}
      text={nb.soon.programme.text}
      tab="plan"
      showBack={true}
    />
  );
}
