import { ComingSoon } from '../features/ComingSoon';
import { images } from '../theme';
import { nb } from '../i18n/nb';

export default function Screen() {
  return (
    <ComingSoon image={images.cake} title={nb.soon.cake.title} text={nb.soon.cake.text} tab="plan" showBack={true} />
  );
}
