import { Platform, Share } from 'react-native';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Copies text on the web: the async Clipboard API, else a hidden textarea + execCommand (older Safari). */
async function copyOnWeb(text: string): Promise<boolean> {
  const nav = (globalThis as { navigator?: Navigator }).navigator;
  try {
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea
  }
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) return false;
  try {
    const ta = doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    doc.body.appendChild(ta);
    ta.select();
    const ok = doc.execCommand('copy');
    doc.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * «Del listen». Native: the system share sheet (React Native Share). Web: the Web Share API where the
 * browser has it (Safari on iPhone: the share sheet, so Messages is one tap), otherwise the text is
 * copied to the clipboard and the caller shows «Kopiert». Nothing leaves the device but this text.
 */
export async function shareList(title: string, text: string): Promise<ShareOutcome> {
  if (Platform.OS !== 'web') {
    try {
      const r = await Share.share({ message: text, title });
      return r.action === Share.dismissedAction ? 'cancelled' : 'shared';
    } catch {
      return 'failed';
    }
  }
  const nav = (globalThis as { navigator?: Navigator & { share?: (d: ShareData) => Promise<void> } }).navigator;
  if (typeof nav?.share === 'function') {
    try {
      await nav.share({ title, text });
      return 'shared';
    } catch (e) {
      // the person closed the sheet: nothing to do. Any other refusal: copy instead.
      if ((e as { name?: string })?.name === 'AbortError') return 'cancelled';
    }
  }
  return (await copyOnWeb(text)) ? 'copied' : 'failed';
}
