// Settings: publication (Joel only), closing date, administrators (Joel only), personal data.
import { useEffect, useState, type ReactNode } from 'react';
import { Icone, type NomIcone } from '../../composants/Icones';
import { boutonPrincipal, boutonSecondaire } from '../../composants/Mise';
import { usePudi } from '../../PudiContexte';
import {
  DATE_PURGE,
  EMAIL_JOEL,
  PURGE_AUTOMATIQUE,
  definirAdmin,
  definirCloture,
  definirPublie,
  lireConnexions,
  lireSuivi,
  purger
} from '../../appels/admin';
import { dateClotureLongue, tempsRestant } from '../../utils/format';
import { dateHeureMada } from '../../utils/exports';
import { Aide, Dialogue, Erreur, Titre2, champ, messageAdmin, useAppel, type DemandeConfirmation } from './communs';

/** "2026-10-26T20:00" (Madagascar time) for an <input type="datetime-local">. */
function versChampMada(iso: string): string {
  const d = new Date(Date.parse(iso) + 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

function Bloc({ titre, icone, children }: { titre: string; icone: NomIcone; children: ReactNode }) {
  return (
    <section className="bg-white border border-filet rounded-xl p-4 mb-3">
      <h2 className="flex items-center gap-2 font-bold text-[17px] text-marine mb-2">
        <Icone nom={icone} />
        {titre}
      </h2>
      {children}
    </section>
  );
}

export default function Parametres({ email }: { email: string }) {
  const { etat, rechargerEtat, decalage } = usePudi();
  const joel = email.toLowerCase() === EMAIL_JOEL;
  const suivi = useAppel(lireSuivi);
  const connexions = useAppel(lireConnexions);
  const [demande, setDemande] = useState<DemandeConfirmation | null>(null);
  const [cloture, setCloture] = useState('');
  const [messageCloture, setMessageCloture] = useState<string | null>(null);
  const [erreurAdmin, setErreurAdmin] = useState<string | null>(null);
  const [maintenant, setMaintenant] = useState(() => Date.now());

  useEffect(() => {
    if (etat?.cloture_at) setCloture(versChampMada(etat.cloture_at));
  }, [etat?.cloture_at]);
  useEffect(() => {
    const id = window.setInterval(() => setMaintenant(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const nbTests = suivi.donnees?.nb_tests;
  const publier = (p: boolean) =>
    setDemande(
      p
        ? {
            titre: 'Publier la consultation ?',
            texte: (
              <>
                <p>Vérifiez que la confirmation écrite du coordinateur régional du PIC a été reçue.</p>
                <p>
                  Les votes de test (<span className="font-bold" data-nb-tests>{nbTests ?? '?'}</span>) seront supprimés.
                </p>
              </>
            ),
            libelleOk: 'Publier',
            action: async () => {
              await definirPublie(true);
              await Promise.all([rechargerEtat(), suivi.recharger()]);
            }
          }
        : {
            titre: 'Dépublier la consultation ?',
            texte: "Le vote sera de nouveau fermé au public (bandeau « Consultation en préparation »). Les votes déjà envoyés sont gardés.",
            libelleOk: 'Dépublier',
            danger: true,
            action: async () => {
              await definirPublie(false);
              await rechargerEtat();
            }
          }
    );

  const enregistrerCloture = async () => {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(cloture)) return setMessageCloture(messageAdmin('PUDI_DATE'));
    setMessageCloture(null);
    try {
      await definirCloture(`${cloture}:00+03:00`);
      await rechargerEtat();
      setMessageCloture('Date de clôture enregistrée.');
    } catch (e) {
      setMessageCloture(messageAdmin(e));
    }
  };

  const purgerMaintenant = () =>
    setDemande({
      titre: 'Purger maintenant ?',
      texte: 'Tous les votes, listes de numéros, refus, connexions, administrateurs et le journal seront supprimés définitivement.',
      libelleOk: 'Continuer',
      danger: true,
      action: async () => {
        window.setTimeout(
          () =>
            setDemande({
              titre: 'Confirmer la purge définitive',
              texte: "Cette action ne peut pas être annulée. Les résultats ne pourront plus être recalculés.",
              libelleOk: 'Purger définitivement',
              danger: true,
              action: async () => {
                await purger();
                await rechargerEtat();
              }
            }),
          0
        );
      }
    });

  const restant = etat ? tempsRestant(Date.parse(etat.cloture_at), maintenant + decalage) : null;

  return (
    <div>
      <Aide titre="Réglages de la consultation">
        <p>Seul Joël SOATRA peut publier la consultation, nommer les organisateurs et purger les données. Les autres organisateurs voient ces réglages sans pouvoir les changer.</p>
        <p>Publier supprime les votes de test faits avant. Les heures sont celles de Madagascar.</p>
      </Aide>

      <Bloc titre="Publication" icone="drapeau">
        <p className="text-[15px]">
          État :{' '}
          <span className={`font-bold ${etat?.publie ? 'text-[#1F7A3E]' : 'text-[#7A5306]'}`} data-etat-publication>
            {etat ? (etat.publie ? 'publiée (le vote est ouvert)' : 'non publiée (consultation en préparation)') : '…'}
          </span>
        </p>
        {joel ? (
          <button
            type="button"
            role="switch"
            aria-checked={!!etat?.publie}
            disabled={!etat}
            onClick={() => publier(!etat?.publie)}
            className="mt-3 w-full min-h-[48px] flex items-center justify-between gap-3 rounded-xl border border-filet px-3"
          >
            <span className="font-bold text-[15px] text-marine">Consultation publiée</span>
            <span className={`relative w-12 h-7 rounded-full transition-colors ${etat?.publie ? 'bg-marine' : 'bg-filet'}`} aria-hidden="true">
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${etat?.publie ? 'left-6' : 'left-1'}`} />
            </span>
          </button>
        ) : (
          <p className="mt-2 text-[14px] text-gris flex gap-2 items-center">
            <Icone nom="cadenas" className="w-4 h-4" />
            Seul Joël SOATRA peut publier
          </p>
        )}
      </Bloc>

      <Bloc titre="Clôture" icone="calendrier">
        {etat && <p className="text-[15px]">Clôture actuelle : {dateClotureLongue(etat.cloture_at)}</p>}
        {restant && (
          <p className="text-[14px] text-gris mt-1">
            {restant.fini ? 'La consultation est close.' : `Temps restant : ${restant.jours} j ${restant.heures} h ${restant.minutes} min`}
          </p>
        )}
        <label className="block mt-3">
          <span className="block font-bold text-[14px] mb-1">Nouvelle date et heure (heure de Madagascar)</span>
          <input type="datetime-local" className={champ} value={cloture} onChange={(e) => setCloture(e.target.value)} name="cloture" />
        </label>
        <button type="button" className={`${boutonPrincipal} mt-2 w-full sm:w-auto`} onClick={() => void enregistrerCloture()}>
          <Icone nom="coche" />
          Enregistrer la clôture
        </button>
        {messageCloture && (
          <p role="status" className="mt-2 text-[14px] font-bold">
            {messageCloture}
          </p>
        )}
      </Bloc>

      <Bloc titre="Administrateurs" icone="admin">
        <p className="text-[14px] text-gris mb-2">Comptes qui se sont connectés sur PUDi. Joël SOATRA coche les organisateurs.</p>
        {connexions.erreur && <Erreur texte={connexions.erreur} reessayer={() => void connexions.recharger()} />}
        {erreurAdmin && <Erreur texte={erreurAdmin} />}
        <ul className="divide-y divide-filet">
          {(connexions.donnees ?? []).map((c) => {
            const estJoel = c.email.toLowerCase() === EMAIL_JOEL;
            return (
              <li key={c.user_id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1">
                <div className="min-w-0 flex-1 text-[14px]">
                  <p className="font-bold break-all">{c.email}</p>
                  <p className="text-gris">
                    Première connexion {dateHeureMada(c.premiere)} · dernière {dateHeureMada(c.derniere)} · {c.a_vote ? 'a voté' : "n'a pas voté"}
                  </p>
                </div>
                <label className="flex items-center gap-2 min-h-[44px] text-[14px]">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-[#0B2A8C]"
                    checked={estJoel || c.est_admin}
                    disabled={!joel || estJoel}
                    onChange={async (e) => {
                      setErreurAdmin(null);
                      try {
                        await definirAdmin(c.user_id, e.target.checked);
                        await connexions.recharger();
                      } catch (er) {
                        setErreurAdmin(messageAdmin(er));
                      }
                    }}
                  />
                  {estJoel ? 'Organisateur (toujours)' : 'Organisateur (administrateur)'}
                </label>
              </li>
            );
          })}
        </ul>
      </Bloc>

      <Bloc titre="Données personnelles" icone="bouclier">
        <p className="text-[15px]">Purge prévue le {dateClotureLongue(DATE_PURGE)}.</p>
        <p className="text-[14px] text-gris mt-1">
          {PURGE_AUTOMATIQUE
            ? 'Purge automatique programmée sur le serveur (tâche « pudi-purge »). Vérifiez le 28 janvier 2027 que les données ont bien disparu.'
            : 'Aucune purge automatique sur le serveur : Joël SOATRA doit utiliser le bouton ci-dessous le 28 janvier 2027.'}
        </p>
        <Titre2>Ce qui est supprimé</Titre2>
        <p className="text-[14px]">Votes, listes de numéros codés, tentatives refusées, connexions, organisateurs nommés et journal. Les canaux et le réglage de la consultation sont gardés.</p>
        {joel && (
          <button type="button" className={`${boutonSecondaire} mt-3 w-full sm:w-auto !border-[#B42318] !text-[#B42318]`} onClick={purgerMaintenant}>
            <Icone nom="poubelle" />
            Purger maintenant
          </button>
        )}
      </Bloc>
      <Dialogue demande={demande} fermer={() => setDemande(null)} />
    </div>
  );
}
