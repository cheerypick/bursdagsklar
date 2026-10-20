import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../theme';

type Name = 'back' | 'forward' | 'close' | 'arrow' | 'check' | 'home' | 'list' | 'star' | 'plus' | 'minus' | 'calendar';

export function Icon({
  name,
  size = 22,
  color = colors.ink,
  strokeWidth = 2,
}: {
  name: Name;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const common = {
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {name === 'back' && <Path d="M15 18l-6-6 6-6" {...common} />}
      {name === 'forward' && <Path d="M9 18l6-6-6-6" {...common} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...common} />}
      {name === 'arrow' && <Path d="M5 12h14M13 6l6 6-6 6" {...common} />}
      {name === 'check' && <Path d="M5 12l5 5L20 7" {...common} />}
      {name === 'home' && (
        <>
          <Path d="M3 11l9-8 9 8" {...common} />
          <Path d="M5 10v10h14V10" {...common} />
        </>
      )}
      {name === 'list' && (
        <>
          <Rect x={4} y={4} width={16} height={17} rx={3} {...common} />
          <Path d="M8 10l2 2 4-4M8 16h8" {...common} />
        </>
      )}
      {name === 'star' && (
        <Path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z" {...common} />
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...common} />}
      {name === 'minus' && <Path d="M5 12h14" {...common} />}
      {name === 'calendar' && (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={3} {...common} />
          <Path d="M3.5 10h17M8 3v4M16 3v4" {...common} />
        </>
      )}
    </Svg>
  );
}
