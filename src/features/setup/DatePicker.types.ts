import type { ISODate } from '../../core';

export interface DatePickerProps {
  /** The chosen date, or null before anything is picked. */
  value: ISODate | null;
  /** Earliest and latest pickable dates (today … today + 1 year). */
  min: ISODate;
  max: ISODate;
  onChange: (date: ISODate) => void;
  /** Accessible name, e.g. «Dato for festen». */
  label: string;
  /** Shown in the field before a date is picked. */
  placeholder: string;
  testID?: string;
}
