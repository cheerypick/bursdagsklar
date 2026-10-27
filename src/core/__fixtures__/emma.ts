import type { Party } from '../model';

/**
 * Emma's party, the worked example in the spec (§6.9):
 * Emma, 5 år, lørdag 2026-11-07, 12.00–14.00, enhjørning, 13 children in total (Emma + 12 guests,
 * the same head-count the spec calls «12 invited»), hus med hage, plannedFrom 2026-10-19, hostAdults 2, cake bake + muffins, skattejakt and piñata picked on Program, grill.
 */
export function emma(overrides: Partial<Party> = {}): Party {
  return {
    id: '7d0c3f5e-1c1a-4f6b-9a51-6a3c2b1e0e01',
    schemaVersion: 6,
    createdAt: '2026-10-19T08:00:00.000Z',
    updatedAt: '2026-10-19T08:00:00.000Z',
    plannedFrom: '2026-10-19',
    celebrants: [{ id: 'c1', name: 'Emma', age: 5 }],
    date: '2026-11-07',
    start: '12:00',
    end: '14:00',
    theme: 'enhjorning',
    home: { type: 'hus', garden: true },
    children: 13,
    hostAdults: 2,
    menu: { kind: 'grillpolser' },
    diets: [],
    foodItems: {},
    goodieBags: { contents: [] },
    shopping: { ticked: [], custom: [] },
    cake: { mode: 'bake', cakeId: 'vaniljekake-langpanne', muffins: true },
    programme: { activities: ['skattejakt', 'pinata'] },
    guests: [],
    haveAtHome: [],
    taskState: {},
    ...overrides,
  };
}

export const EMMA_PEOPLE = { kidsComing: 13, adultsEating: 4, age: 5 };
