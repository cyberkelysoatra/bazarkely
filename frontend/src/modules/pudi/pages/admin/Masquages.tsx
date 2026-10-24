// Automatic maskings (PUDI-CC-09): a manager linked on one line numbers that had each voted with a
// different account; the most recent vote is kept, the others are masked. Shown on the Refus
// screen. Never a vote's content, never a phone number: the masked account's Gmail is there to
// answer a claim. Restorations not seen yet on this device are highlighted (same mechanism as the
// refusals badge).
import { useEffect, useState } from 'react';
import { Icone } from '../../composants/Icones';
import { definirBadgeRefus } from '../../composants/MenuCompte';
import { fr } from '../../i18n/fr';
import { lireMasquages, retablirMasquage, type MasquageAdmin } from '../../appels/admin';
import { marquerRetablisVus, retablisVus } from '../../appels/refusVus';
import { dateHeureMada } from '../../utils/exports';
import { dateGel, retablissementsNouveaux } from '../../utils/masquage';
import { usePudi } from '../../PudiContexte';
import { Aide, Dialogue, Erreur, Titre2, petitBouton, useAppel, type DemandeConfirmation } from './communs';

export default function Masquages() {
  const { gelListesAt } = usePudi();
  const appel = useAppel(lireMasquages);
  const [demande, setDemande] = useState<DemandeConfirmation | null>(null);
  const [nouveaux, setNouveaux] = useState<Set<string> | null>(null);
  const liste = appel.donnees ?? [];

  // First answer: remember what is new for this visit, then mark everything as seen.
  useEffect(() => {
    if (!appel.donnees || nouveaux) return;
    setNouveaux(retablissementsNouveaux(appel.donnees, retablisVus()));
    marquerRetablisVus(appel.donnees.filter((m) => m.retabli_at).length);
    definirBadgeRefus(0);
  }, [appel.donnees, nouveaux]);

  const retablir = (m: MasquageAdmin) =>
    setDemande({
      titre: `Rétablir le vote ${m.id_anonyme} ?`,
      texte: (
        <>
          <p>
            Le vote masqué par <span className="font-bold">{m.id}</span> sera de nouveau compté. Il ne sera plus masqué automatiquement, même si la
            ligne du responsable est enregistrée à nouveau.
          </p>
          <p>Indiquez le motif (par exemple la réclamation reçue). L'action est inscrite au journal.</p>
        </>
      ),
      motif: true,
      libelleOk: 'Rétablir',
      action: async (motif) => {
        await retablirMasquage(m.id, motif);
        // Restored here by this organiser: already seen, never highlighted as new.
        marquerRetablisVus(retablisVus() + 1);
        await appel.recharger();
      }
    });

  const actifs = liste.filter((m) => !m.retabli_at).length;
  return (
    <section className="mt-4" data-masquages="">
      <Titre2>Masquages automatiques</Titre2>
      <Aide titre="Pourquoi un vote est masqué automatiquement ?">
        <p>
          Quand un responsable de groupe met sur une même ligne (une même personne) des numéros qui ont chacun déjà voté avec des comptes
          différents, le vote le plus récent est gardé et les autres sont masqués : ils ne comptent plus. Rien n'est effacé.
        </p>
        <p>
          Si les numéros sont ensuite séparés (ligne modifiée ou supprimée), le vote est rétabli tout seul. La personne concernée voit un message
          dans l'application et peut réclamer jusqu'à la fin de la saisie des listes ({dateGel(gelListesAt)}).
        </p>
        <p>
          « Rétablir » remet un vote en place après vérification, avec un motif. Après le gel des listes, seul Joël SOATRA peut le faire. Le
          contenu des votes et les numéros de téléphone ne sont jamais montrés ici.
        </p>
      </Aide>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[0.875rem] text-gris" data-masquages-compte="">
          {liste.length ? `${actifs} actif${actifs > 1 ? 's' : ''} · ${liste.length - actifs} rétabli${liste.length - actifs > 1 ? 's' : ''}` : ''}
        </p>
        <button type="button" className={petitBouton} onClick={() => void appel.recharger()} disabled={appel.charge}>
          <Icone nom="actualiser" className="w-4 h-4" />
          Actualiser
        </button>
      </div>
      {appel.erreur && <Erreur texte={appel.erreur} reessayer={() => void appel.recharger()} />}
      {appel.charge && !appel.donnees ? (
        <p className="text-gris py-6 text-center">{fr.app.chargement}</p>
      ) : !liste.length ? (
        <p className="text-gris py-6 text-center">Aucun masquage automatique pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {liste.map((m) => {
            const nouveau = !!nouveaux?.has(m.id);
            return (
              <li
                key={m.id}
                data-masquage-ligne={m.id}
                data-nouveau={nouveau ? 'oui' : 'non'}
                className={`border rounded-xl p-3 flex flex-wrap items-center gap-x-4 gap-y-2 ${
                  nouveau ? 'bg-[#FFF6E0] border-[#E9D29A]' : 'bg-white border-filet'
                }`}
              >
                <div className="min-w-0 flex-1 text-[0.875rem] space-y-0.5">
                  <p className="font-bold">
                    {m.id} · {dateHeureMada(m.at)}
                    {nouveau && <span className="ml-2 rounded-full bg-[#926407] text-white text-[0.75rem] px-2 py-0.5">Nouveau</span>}
                  </p>
                  <p>Canal : {m.canal_code ?? '(aucun)'}</p>
                  <p className="break-all">Ligne créée ou modifiée par : {m.auteur_email ?? 'compte supprimé'}</p>
                  <p className="break-all">Compte masqué : {m.email_masque ?? 'compte supprimé'}</p>
                  <p>
                    Vote masqué : <span className="font-bold">{m.id_anonyme}</span>
                  </p>
                  <p data-etat={m.retabli_at ? 'retabli' : 'actif'}>
                    État :{' '}
                    {m.retabli_at ? (
                      <>
                        rétabli le {dateHeureMada(m.retabli_at)} ({m.retabli_motif ?? 'sans motif'}
                        {m.retabli_par_email ? `, par ${m.retabli_par_email}` : ''})
                      </>
                    ) : (
                      <span className="font-bold text-[#9C3F21]">actif</span>
                    )}
                  </p>
                </div>
                {!m.retabli_at && (
                  <button type="button" className={petitBouton} onClick={() => retablir(m)}>
                    <Icone nom="deverrouiller" className="w-4 h-4" />
                    Rétablir
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <Dialogue demande={demande} fermer={() => setDemande(null)} />
    </section>
  );
}
