import { useState } from 'react';
import { View } from 'react-native';
import { pickedDate } from '../../core';
import { DateField } from './DateField';
import type { DatePickerProps } from './DatePicker.types';

/**
 * Web: a real <input type="date"> laid invisibly over the big date card, so one tap
 * opens the platform picker (the wheel/calendar on iPhone Safari, the calendar
 * popover on desktop) while the card shows the date in Norwegian words.
 */
export function DatePicker({ value, min, max, onChange, label, placeholder, testID }: DatePickerProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ position: 'relative' }}>
      <DateField value={value} placeholder={placeholder} active={focused} />
      <input
        type="date"
        lang="nb"
        data-testid={testID}
        aria-label={label}
        value={value ?? ''}
        min={min}
        max={max}
        onChange={(e) => {
          // min is today, so pickedDate's range (today … +1 year) is the picker's own
          const d = pickedDate(e.currentTarget.value, min);
          if (d && d <= max) onChange(d);
        }}
        onClick={(e) => {
          // Desktop browsers only open the calendar from their own icon; open it from anywhere.
          const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
          try {
            el.showPicker?.();
          } catch {
            // showPicker can throw outside a user gesture; the native tap still works
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          margin: 0,
          padding: 0,
          border: 0,
          opacity: 0,
          cursor: 'pointer',
          fontSize: 16, // stops iOS zooming in on focus
          boxSizing: 'border-box',
          WebkitAppearance: 'none',
          appearance: 'none',
        }}
      />
    </View>
  );
}
