/**
 * Platform files: DatePicker.web.tsx (a native <input type="date">: the iOS wheel in
 * Safari, the browser calendar on desktop) and DatePicker.native.tsx
 * (@react-native-community/datetimepicker). Metro picks the right one; this file
 * only gives TypeScript the shared signature.
 */
import type { DatePickerProps } from './DatePicker.types';

export type { DatePickerProps };
export declare function DatePicker(props: DatePickerProps): React.JSX.Element;
