// Refused attempts (a number already used by another account, or, since v6, a person who already
// voted with another number of the same group line) and release of a number.
import { useEffect, useState } from 'react';
import { Icone } from '../../composants/Icones';
import { definirBadgeRefus } from '../../composants/MenuCompte';
import { fr } from '../../i18n/fr';
import { libererNumero, lireRefus, type Refus as LigneRefus } from '../../appels/admin';
import { marquerRefusVus } from '../../appels/refusVus';
import { dateHeureMada } from '../../utils/exports';
import { libelleMotifRefus } from '../../utils/format';
import { Aide, Dialogue, Erreur, petitBouton, useAppel, type DemandeConfirmation } from './communs';

export default function Refus() {
  const appel = useAppel(lireRefus);
  const [demande, setDemande] = useState<DemandeConfirmation | null>(null);
  const liste = appel.donnees ?? [];

  // Opening this screen marks the refusals as seen (badge of the account menu).
  useEffect(() => {
    if (!appel.donnees) return;
    marquerRefusVus(appel.donnees.length);
    definirBadgeRefus(0);
  }, [appel.donnees]);

  const liberer = (r: LigneRefus) =>
    setDemande({
      titre: 'Libérer le numéro ?',
      texte: (
        <>
          <p>
            Le vote <span className="font-bold">{r.id_anonyme_detenteur}</span> qui utilise ce numéro sera masqué, avec votre motif, et ne comptera plus.
          </p>
          <p>La personne qui a prouvé que le numéro est le sien pourra alors voter. L'action est inscrite au journal.</p>
        </>
      ),
      motif: true,
      libelleOk: 'Libérer le numéro',
      danger: true,
      action: async (motif) => {
        await libererNumero(r.id_anonyme_detenteur!, motif);
        await appel.recharger();
      }
    });

  return (
    <div>
      <Aide titre="Tentatives refusées">
        <p>
          Quelqu'un a essayé de voter avec un numéro déjà utilisé par un autre compte. Si la personne prouve que c'est son numéro, vous pouvez le libérer :
          le vote qui l'utilisait est masqué, avec le motif, et la personne peut voter.
        </p>
        <p>
          Motif « Personne ayant déjà voté avec un autre numéro » : un autre numéro de la même personne (même ligne d'un responsable de groupe) a
          déjà servi à voter avec un autre compte. Il n'y a rien à libérer : la personne modifie son vote avec le compte qu'elle a utilisé.
        </p>
      </Aide>
      <div className="flex justify-end mb-3">
        <button type="button" className={petitBouton} onClick={() => void appel.recharger()} disabled={appel.charge}>
          <Icone nom="actualiser" className="w-4 h-4" />
          Actualiser
        </button>
      </div>
      {appel.erreur && <Erreur texte={appel.erreur} reessayer={() => void appel.recharger()} />}
      {appel.charge && !appel.donnees ? (
        <p className="text-gris py-6 text-center">{fr.app.chargement}</p>
      ) : !liste.length ? (
        <p className="text-gris py-6 text-center">Aucune tentative refusée pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {liste.map((r, i) => (
            <li key={`${r.at}-${i}`} className="bg-white border border-filet rounded-xl p-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1 text-[14px] space-y-0.5">
                <p className="font-bold">{dateHeureMada(r.at)}</p>
                <p className="break-all">Compte refusé : {r.email_refuse ?? 'compte supprimé'}</p>
                <p data-refus-motif={r.motif ?? ''}>Motif : {libelleMotifRefus(r.motif)}</p>
                {r.motif !== 'personne_deja_votee' && (
                  <p>
                    Numéro détenu par le vote :{' '}
                    {r.id_anonyme_detenteur ? <span className="font-bold">{r.id_anonyme_detenteur}</span> : <span className="text-gris">déjà libéré</span>}
                  </p>
                )}
              </div>
              {r.id_anonyme_detenteur && r.motif !== 'personne_deja_votee' && (
                <button type="button" className={petitBouton} onClick={() => liberer(r)}>
                  <Icone nom="deverrouiller" className="w-4 h-4" />
                  Libérer le numéro
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <Dialogue demande={demande} fermer={() => setDemande(null)} />
    </div>
  );
}
