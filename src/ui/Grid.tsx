import { View, type StyleProp, type ViewStyle } from 'react-native';

/** Simple responsive grid: `columns` equal columns with a gap; the last row is padded with spacers. */
export function Grid<T>({
  items,
  columns,
  gap = 12,
  render,
  keyOf,
  style,
}: {
  items: T[];
  columns: number;
  gap?: number;
  render: (item: T, index: number) => React.ReactNode;
  keyOf: (item: T, index: number) => string;
  style?: StyleProp<ViewStyle>;
}) {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={[{ gap }, style]}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {row.map((item, c) => (
            <View key={keyOf(item, r * columns + c)} style={{ flex: 1 }}>
              {render(item, r * columns + c)}
            </View>
          ))}
          {Array.from({ length: columns - row.length }).map((_, i) => (
            <View key={`spacer-${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}
