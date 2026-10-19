import { ActivityIndicator, View } from 'react-native';
import { colors } from '../theme';
import { nb } from '../i18n/nb';

export function Loading() {
  return (
    <View
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}
      accessibilityLabel={nb.loading}
    >
      <ActivityIndicator color={colors.green} />
    </View>
  );
}
