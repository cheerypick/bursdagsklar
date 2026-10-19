import { ActivityIndicator, View } from 'react-native';
import { useColors } from '../theme';
import { nb } from '../i18n/nb';

export function Loading() {
  const colors = useColors();
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}
      accessibilityLabel={nb.loading}
    >
      <ActivityIndicator color={colors.green} />
    </View>
  );
}
