import Svg, { Circle } from 'react-native-svg';
import { View } from 'react-native';
import { fonts, useColors } from '../theme';
import { Text } from '../ui';

/** Ring showing the share of to-dos done, with days left in the middle. */
export function CountdownRing({ percent, label, size = 58 }: { percent: number; label: string; size?: number }) {
  const colors = useColors();
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.sage} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.green}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${(c * p) / 100} ${c}`}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{ fontFamily: fonts.display, fontSize: 15 }}>{label}</Text>
    </View>
  );
}
