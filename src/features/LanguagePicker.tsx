import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, useLanguage, type Language } from '../i18n';
import { fonts, useColors, themedStyles } from '../theme';
import { Text } from '../ui';

/**
 * «Språk / Language»: a small, quiet switch between Norsk and English (front page and the foot of
 * Planen). The choice is kept on this device, in the same store as the parties.
 * `onPrimary` is for coloured backgrounds.
 */
export function LanguagePicker({
  onPrimary,
  align = 'center',
}: {
  onPrimary?: boolean;
  align?: 'center' | 'flex-start';
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const colors = useColors();
  const [lng, setLng] = useLanguage();
  const color = onPrimary ? colors.onPrimarySoft : colors.muted;
  const strong = onPrimary ? colors.onPrimary : colors.ink;
  return (
    <View
      style={[styles.row, { justifyContent: align === 'center' ? 'center' : 'flex-start' }]}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('language.choose')}
      testID="language-picker"
    >
      <Text style={[styles.label, { color }]}>{t('language.label')}</Text>
      {LANGUAGES.map((code: Language, i) => {
        const on = code === lng;
        return (
          <View key={code} style={styles.item}>
            {i > 0 ? <Text style={[styles.sep, { color }]}>·</Text> : null}
            <Pressable
              testID={`language-${code}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on, selected: on }}
              accessibilityLanguage={code}
              onPress={() => setLng(code)}
              hitSlop={8}
              style={({ pressed }) => [styles.button, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.option, { color: on ? strong : color }, on && styles.optionOn]}>
                {t(`language.${code}`)}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = themedStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, paddingVertical: 4 },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, marginRight: 4 },
  item: { flexDirection: 'row', alignItems: 'center' },
  sep: { fontSize: 14, marginHorizontal: 2 },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  option: { fontFamily: fonts.bodySemi, fontSize: 15 },
  optionOn: { fontFamily: fonts.bodyBold, textDecorationLine: 'underline' },
}));
