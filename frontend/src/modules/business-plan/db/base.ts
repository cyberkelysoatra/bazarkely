// Local database of "Mon business plan": every plan stays on the phone. Version 2 (NEC-CC-02) adds
// `liens`: the plans whose owner joined the training (trainer tracking), nothing else is sent.
import Dexie, { type Table } from 'dexie';
import type { Plan } from '../types';

/** A plan that joined the training, with the state of its last send. */
export interface Lien {
  planId: string;
  code: string;
  /** 32 random bytes in hex, created on this phone at join; the server only keeps its sha256. */
  jeton: string;
  prenom: string;
  accord: true;
  /** false while the join was asked offline and not yet confirmed by the server. */
  confirme: boolean;
  /** A change not yet received by the server. */
  sale: boolean;
  /** ISO time of the last send accepted by the server. */
  envoyeLe: string | null;
  /** Waiting for the network to send. */
  enAttente: boolean;
  /** Reason given by the server for the last refusal (SESSION_FERMEE, CODE_INCONNU, JETON, TROP_GROS, RETIRE). */
  refus: string | null;
}

class NecBusinessPlanDB extends Dexie {
  plans!: Table<Plan, string>;
  liens!: Table<Lien, string>;

  constructor() {
    super('NecBusinessPlanDB');
    this.version(1).stores({ plans: 'id, modifieLe' });
    this.version(2).stores({ plans: 'id, modifieLe', liens: 'planId' });
  }
}

export const db = new NecBusinessPlanDB();
