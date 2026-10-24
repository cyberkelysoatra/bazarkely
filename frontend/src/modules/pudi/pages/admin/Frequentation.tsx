// PUDI-CC-14.3: « En ligne en ce moment » and the figures table of the funnel card (Suivi).
// Figures only, never a list of devices; refreshed every 60 s while the page is visible.
import { useCallback, useEffect, useState } from 'react';
import { rpc } from '../../appels/api';
import { extraireCode } from '../../utils/erreurs';
import { Aide, Erreur } from './communs';

export interface ChiffresFrequentation {
  venus: number;
  sans_coche: number;
  commence: number;
  complet: number;
  votes: number;
}
export interface Frequentation extends ChiffresFrequentation {
  calcule_at: string;
  en_ligne: number;
  par_canal: (ChiffresFrequentation & { canal: string })[];
}

export const lireFrequentation = () => rpc<Frequentation>('pudi_admin_frequentation');

const COLONNES: { cle: keyof ChiffresFrequentation; libelle: string }[] = [
  { cle: 'venus', libelle: 'Venus' },
  { cle: 'sans_coche', libelle: 'Sans coche' },
  // Soft hyphens: the five columns stay readable at 360 px.
  { cle: 'commence', libelle: 'Commen­cé' },
  { cle: 'complet', libelle: 'Com­plet' },
  { cle: 'votes', libelle: 'Votes' }
];

export default function FrequentationEnDirect({ nomCanal }: { nomCanal: (code: string) => string }) {
  const [f, setF] = useState<Frequentation | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const lire = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    try {
      setF(await lireFrequentation());
      setErreur(null);
    } catch (e) {
      setErreur(extraireCode(e) === 'RESEAU' ? 'Le réseau ne répond pas.' : 'Chiffres indisponibles.');
    }
  }, []);
  useEffect(() => {
    void lire();
    const id = window.setInterval(() => void lire(), 60000);
    const visible = () => void lire();
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [lire]);

  const ligne = (nom: string, c: ChiffresFrequentation, gras = false) => (
    <tr key={nom} className={gras ? 'font-bold' : ''}>
      <th scope="row" className="text-left font-normal py-1 pr-2 break-words">{gras ? <strong>{nom}</strong> : nom}</th>
      {COLONNES.map((k) => (
        <td key={k.cle} className="text-right py-1 pl-1 tabular-nums">
          {c[k.cle]}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="mb-3 space-y-3" data-frequentation="">
      {erreur && <Erreur texte={erreur} reessayer={() => void lire()} />}
      <p className="bg-white border-l-4 border-[#1E7A46] rounded-r-lg px-3 py-2.5 text-[1rem] flex items-center gap-2" data-en-ligne="">
        <span className="w-2.5 h-2.5 rounded-full bg-[#1E7A46] animate-pulse" aria-hidden="true" />
        En ligne en ce moment : <strong>{f ? f.en_ligne : '…'}</strong>
      </p>
      <Aide titre="Appareil ou personne ?">
        <p>Un appareil est un navigateur (un téléphone, un ordinateur), pas une personne : une même personne qui utilise deux téléphones compte deux fois, une famille qui partage un téléphone compte une fois.</p>
        <p>« En ligne en ce moment » : appareils dont la page est ouverte et visible depuis moins de 2 minutes. « Sans coche » : appareils venus sans placer aucune voix. « Commencé » : au moins une voix placée ; « Complet » : prêt à envoyer, au moins 1 voix (avant le 24/10/2026 : 3 priorités choisies). « Votes » : votes réels (sans votes masqués ni votes de test).</p>
      </Aide>
      {f && (
        <div className="bg-white border border-filet rounded-xl p-3 overflow-hidden">
          <table className="w-full text-[0.8125rem] table-fixed" data-tableau-frequentation="">
            <caption className="sr-only">Appareils et votes, par canal</caption>
            <colgroup>
              <col className="w-[30%]" />
              {COLONNES.map((k) => (
                <col key={k.cle} />
              ))}
            </colgroup>
            <thead>
              <tr className="text-gris">
                <th scope="col" className="text-left font-normal pb-1">Canal</th>
                {COLONNES.map((k) => (
                  <th key={k.cle} scope="col" className="text-right font-normal pb-1 pl-1 leading-tight text-[0.6875rem]" lang="fr">
                    {k.libelle}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-filet">
              {ligne('Tous les canaux', f, true)}
              {f.par_canal.map((c) => ligne(c.canal === '(aucun)' ? 'Sans canal' : nomCanal(c.canal), c))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
