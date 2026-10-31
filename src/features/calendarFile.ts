import { Platform } from 'react-native';

/**
 * «Legg i kalenderen» on the web: the .ics file as a download (a Blob URL; iPhone Safari offers «Legg til i
 * Kalender» when it opens). No server, nothing leaves the device. On iOS/Android the button is not shown yet:
 * sharing a file there needs a file-system module the app does not have (a follow-up), and a button that
 * does nothing is worse than no button.
 */
export const canDownloadCalendar = Platform.OS === 'web';

export function downloadCalendarFile(fileName: string, ics: string): boolean {
  if (!canDownloadCalendar) return false;
  const doc = (globalThis as { document?: Document }).document;
  const url = (globalThis as { URL?: typeof URL }).URL;
  if (!doc || !url?.createObjectURL) return false;
  try {
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const href = url.createObjectURL(blob);
    const a = doc.createElement('a');
    a.href = href;
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    // give the browser a moment to start the download before the URL is released
    setTimeout(() => url.revokeObjectURL(href), 4000);
    return true;
  } catch {
    return false;
  }
}
