import { View } from 'react-native';
import { LICENSE_DISCLAIMER } from '../core';
import { useAppTheme, useColors } from '../theme';
import { Text } from '../ui';

/**
 * «Bursdagsklar er ikke tilknyttet …». Shown only where a licensed theme name appears:
 * on the theme picker (`always`) and on screens of a party with a licensed theme.
 */
export function LicenseNote({ always, onPrimary }: { always?: boolean; onPrimary?: boolean }) {
  const { theme } = useAppTheme();
  const colors = useColors();
  if (!always && !theme?.licensed) return null;
  return (
    <View style={{ paddingTop: 20, paddingBottom: 4 }} testID="license-note">
      <Text
        variant="small"
        color={onPrimary ? colors.onPrimarySoft : colors.muted}
        style={{ fontSize: 13, lineHeight: 18, textAlign: 'center' }}
      >
        {LICENSE_DISCLAIMER}
      </Text>
    </View>
  );
}
