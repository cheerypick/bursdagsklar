import { ActivityIndicator, View } from 'react-native';
import { useColors } from '../theme';
import { useTranslation } from 'react-i18next';

export function Loading() {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}
      accessibilityLabel={t('loading')}
    >
      <ActivityIndicator color={colors.green} />
    </View>
  );
}
