// Local database of "Mon business plan": everything stays on the phone (no account, nothing sent).
import Dexie, { type Table } from 'dexie';
import type { Plan } from '../types';

class NecBusinessPlanDB extends Dexie {
  plans!: Table<Plan, string>;

  constructor() {
    super('NecBusinessPlanDB');
    this.version(1).stores({ plans: 'id, modifieLe' });
  }
}

export const db = new NecBusinessPlanDB();
