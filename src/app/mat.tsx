import { ComingSoon } from '../features/ComingSoon';
import { images } from '../theme';
import { nb } from '../i18n/nb';

export default function Screen() {
  return (
    <ComingSoon image={images.grill} title={nb.soon.food.title} text={nb.soon.food.text} tab="plan" showBack={true} />
  );
}
