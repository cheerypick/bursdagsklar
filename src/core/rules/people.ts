import type { Party } from '../model';
import { stayRate } from './constants';

export interface HeadCount {
  kidsComing: number;
  adultsEating: number;
  pendingCount: number;
}

/** Head-count (spec §4.1). 'pending' counts as coming until marked 'no' (never under-buy). */
export function headCount(
  p: Pick<Party, 'kidsInvited' | 'siblingsAttending' | 'hostAdults' | 'guests' | 'child'>,
): HeadCount {
  const noCount = p.guests.filter((g) => g.status === 'no').length;
  const answered = p.guests.filter((g) => g.status === 'yes' || g.status === 'no').length;
  const kidsComing = 1 + p.siblingsAttending + p.kidsInvited - noCount;
  const pendingCount = Math.max(0, p.kidsInvited - answered);
  const staying = p.guests.filter((g) => g.status === 'yes').reduce((s, g) => s + g.adultsStaying, 0);
  const adultsEating = p.hostAdults + staying + Math.ceil(pendingCount * stayRate(p.child.age) - 1e-9);
  return { kidsComing, adultsEating, pendingCount };
}
