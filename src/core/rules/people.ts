import type { Party } from '../model';
import { stayRate } from './constants';
import { youngestAge } from './celebrants';

export interface HeadCount {
  kidsComing: number;
  adultsEating: number;
  pendingCount: number;
}

/**
 * Head-count (spec §4.1). 'pending' counts as coming until marked 'no' (never under-buy).
 * `children` already counts the birthday children, so it is used as is (no +celebrants): 12 children
 * means 12 children eat. The guests' families are everyone except the birthday children, which is
 * what the not-yet-answered estimate of staying adults counts. How many adults stay follows the youngest child (guests are
 * assumed to be around the birthday children's ages).
 */
export function headCount(p: Pick<Party, 'children' | 'hostAdults' | 'guests' | 'celebrants'>): HeadCount {
  const noCount = p.guests.filter((g) => g.status === 'no').length;
  const answered = p.guests.filter((g) => g.status === 'yes' || g.status === 'no').length;
  const kidsComing = p.children - noCount;
  const guestFamilies = Math.max(0, p.children - p.celebrants.length);
  const pendingCount = Math.max(0, guestFamilies - answered);
  const staying = p.guests.filter((g) => g.status === 'yes').reduce((s, g) => s + g.adultsStaying, 0);
  const adultsEating = p.hostAdults + staying + Math.ceil(pendingCount * stayRate(youngestAge(p.celebrants)) - 1e-9);
  return { kidsComing, adultsEating, pendingCount };
}
