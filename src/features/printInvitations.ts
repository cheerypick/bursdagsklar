import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { PrintSheet } from '../core';

export type PrintOutcome = 'printed' | 'shared' | 'failed';

/** The element the web print adds to the page (hidden on screen, the only thing printed). */
export const WEB_PRINT_ID = 'bk-print';

/**
 * «Skriv ut invitasjoner (PDF)», without any server.
 *
 * - iOS / Android: expo-print turns the HTML into an A4 PDF on the phone, then the share sheet opens with it
 *   (print, AirDrop, Messages, «Arkiver i Filer» …). Where sharing is not available, the system print dialog
 *   opens with the PDF instead.
 * - Web: the pages are added to the document behind a print style sheet that hides the app, and the
 *   browser's print dialog opens (window.print), where «Lagre som PDF» gives the file. The title is the
 *   suggested file name. The pages are taken away again after printing.
 */
export async function printInvitations(sheet: PrintSheet, dialogTitle: string): Promise<PrintOutcome> {
  if (Platform.OS === 'web') return printOnWeb(sheet);
  try {
    // A4 in points (72 per inch); the page layout itself is relative to the page, so it fills it
    const { uri } = await Print.printToFileAsync({ html: sheet.html, width: 595, height: 842 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle });
      return 'shared';
    }
    await Print.printAsync({ uri });
    return 'printed';
  } catch {
    return 'failed';
  }
}

function printOnWeb(sheet: PrintSheet): PrintOutcome {
  const g = globalThis as { document?: Document; window?: Window };
  const doc = g.document;
  const win = g.window;
  if (!doc || !win || typeof win.print !== 'function') return 'failed';
  try {
    doc.getElementById(WEB_PRINT_ID)?.remove();
    const root = doc.createElement('div');
    root.id = WEB_PRINT_ID;
    // scoped to the print: on screen nothing changes; in print only these pages show
    const css = `${sheet.css}
@media screen { #${WEB_PRINT_ID} { display: none !important; } }
@media print {
  html, body { height: auto !important; min-height: 0 !important; overflow: visible !important; background: #fff !important; }
  body > *:not(#${WEB_PRINT_ID}) { display: none !important; }
  #${WEB_PRINT_ID} { display: block !important; width: 100%; }
}`;
    root.innerHTML = `<style>${css}</style>${sheet.body}`;
    doc.body.appendChild(root);
    const oldTitle = doc.title;
    doc.title = sheet.title;
    const cleanUp = () => {
      doc.title = oldTitle;
      root.remove();
      win.removeEventListener('afterprint', cleanUp);
    };
    win.addEventListener('afterprint', cleanUp);
    win.print();
    return 'printed';
  } catch {
    return 'failed';
  }
}
