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
 * Every birthday child eats too; how many adults stay follows the youngest child (guests are
 * assumed to be around the birthday children's ages).
 */
export function headCount(
  p: Pick<Party, 'kidsInvited' | 'siblingsAttending' | 'hostAdults' | 'guests' | 'celebrants'>,
): HeadCount {
  const noCount = p.guests.filter((g) => g.status === 'no').length;
  const answered = p.guests.filter((g) => g.status === 'yes' || g.status === 'no').length;
  const kidsComing = p.celebrants.length + p.siblingsAttending + p.kidsInvited - noCount;
  const pendingCount = Math.max(0, p.kidsInvited - answered);
  const staying = p.guests.filter((g) => g.status === 'yes').reduce((s, g) => s + g.adultsStaying, 0);
  const adultsEating = p.hostAdults + staying + Math.ceil(pendingCount * stayRate(youngestAge(p.celebrants)) - 1e-9);
  return { kidsComing, adultsEating, pendingCount };
}
