// Plain text of the plan for WhatsApp: the synthesis (6 cards) and the key figures. No em dash, no en
// dash, no middle dot, no narrow no-break space (shown as a box by some phones).
import type { Plan } from '../types';
import { ariary, grouper, pluriel } from '../utils/format';
import { CARTES, chiffresCles } from '../ateliers/synthese/brouillons';

export function propre(texte: string): string {
  return texte.replace(/[—–·]/g, ',').replace(/[  ]/g, ' ');
}

export function texteWhatsApp(plan: Plan): string {
  const nom = plan.identite.nomProjet.trim() || 'Projet sans nom';
  const l: string[] = [`*Mon business plan : ${nom}*`];
  const porteur = plan.identite.nomPrenom.trim();
  if (porteur) l.push(porteur);
  for (const c of CARTES) {
    const t = plan.synthese[c.cle].trim();
    if (t) l.push('', `*${c.n}. ${c.titre}*`, t);
  }
  const k = chiffresCles(plan);
  const chiffres = [
    k.besoinTotal !== null ? `Besoin total : ${ariary(k.besoinTotal)}` : null,
    k.financementDemande !== null ? `Financement demandé : ${ariary(k.financementDemande)}` : null,
    k.caAnnee1 !== null ? `Chiffre d'affaires année 1 : ${ariary(k.caAnnee1)}` : null,
    k.seuilMois !== null ? `Seuil de rentabilité : ${grouper(k.seuilMois)} ${pluriel(plan.uniteVente, k.seuilMois)} par mois` : null
  ].filter((x): x is string => !!x);
  if (chiffres.length) l.push('', '*Chiffres clés*', ...chiffres);
  l.push('', 'Fait avec Mon business plan, NEC 2026, Nosy Be');
  return propre(l.join('\n'));
}
