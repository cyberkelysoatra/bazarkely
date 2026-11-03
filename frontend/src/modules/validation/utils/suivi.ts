// Follow-up stage of a confirmed version (VC-37, RM15), shared by the receipt (`SuiviDossier`), the
// home card of the person who decides and the PDF receipt. Pure, unit tested in suivi.test.ts.

export type CleEtape = 'analyse' | 'preparation' | 'disponible';

export interface EtapeSuivi {
  cle: CleEtape;
  /** Rank in the receipt steps (« Réponses reçues » is 0, always done). */
  rang: 1 | 2 | 3;
  /** Title of the home card block. */
  titreAccueil: string;
  /** The countdown (and the « Engagement CyberKELY » line) shows on this stage. */
  compteARebours: boolean;
}

export const TEXTE_DISPONIBLE = 'La suite de votre projet est prête.';

/** `etape_suivi` of vc_mon_espace → stage; unknown or empty reads « analyse » (set on confirmation). */
export function etapeSuivi(etape: string | null | undefined): EtapeSuivi {
  if (etape === 'disponible') return { cle: 'disponible', rang: 3, titreAccueil: 'Disponible', compteARebours: false };
  if (etape === 'preparation') return { cle: 'preparation', rang: 2, titreAccueil: 'En préparation', compteARebours: true };
  return { cle: 'analyse', rang: 1, titreAccueil: 'En analyse chez CyberKELY', compteARebours: true };
}
