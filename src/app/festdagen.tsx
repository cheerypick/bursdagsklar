import { ComingSoon } from '../features/ComingSoon';
import { images } from '../theme';
import { nb } from '../i18n/nb';

export default function Screen() {
  return (
    <ComingSoon image={images.fiskedam} title={nb.soon.day.title} text={nb.soon.day.text} tab="day" showBack={false} />
  );
}
