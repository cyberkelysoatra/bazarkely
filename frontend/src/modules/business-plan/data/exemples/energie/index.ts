// JIRO KELY (energie), assembled from one file per section.
import type { SectionsExemple } from '../assembler';
import { identite, uniteVente } from './identite';
import { m1 } from './m1';
import { m2 } from './m2';
import { m3 } from './m3';
import { m4 } from './m4';
import { m5 } from './m5';
import { impact } from './impact';
import { mission } from './mission';

export const sections: SectionsExemple = { identite, uniteVente, m1, m2, m3, m4, m5, impact, mission };
