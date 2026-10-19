import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { colors } from '../../theme';
import { parts, toISO, type ISODate } from '../../core';
import { DateField } from './DateField';
import type { DatePickerProps } from './DatePicker.types';

const toDate = (iso: ISODate) => {
  const { y, m, d } = parts(iso);
  return new Date(y, m - 1, d, 12);
};
const toIso = (dt: Date): ISODate => toISO(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());

/**
 * iOS: tap the card to open the inline calendar under it. Android: tap opens the
 * system date dialog. Both are bounded to today … today + 1 year.
 */
export function DatePicker({ value, min, max, onChange, label, placeholder, testID }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const current = toDate(value ?? min);

  const pick = (event: DateTimePickerEvent, dt?: Date) => {
    if (Platform.OS === 'ios') setOpen(false);
    if (event.type === 'set' && dt) onChange(toIso(dt));
  };

  const onPress = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate: toDate(min),
        maximumDate: toDate(max),
        onChange: pick,
      });
    } else {
      setOpen((v) => !v);
    }
  };

  return (
    <View>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        onPress={onPress}
      >
        <DateField value={value} placeholder={placeholder} active={open} />
      </Pressable>
      {open && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={current}
          mode="date"
          display="inline"
          locale="nb-NO"
          accentColor={colors.green}
          minimumDate={toDate(min)}
          maximumDate={toDate(max)}
          onChange={pick}
        />
      ) : null}
    </View>
  );
}
