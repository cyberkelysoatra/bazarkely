// Settings: publication (Joel only), closing date, administrators (Joel only), personal data.
import { useEffect, useState, type ReactNode } from 'react';
import { Icone, type NomIcone } from '../../composants/Icones';
import { boutonPrincipal, boutonSecondaire } from '../../composants/Mise';
import { usePudi } from '../../PudiContexte';
import { fr } from '../../i18n/fr';
import {
  DATE_PURGE,
  EMAIL_JOEL,
  PURGE_AUTOMATIQUE,
  definirAdmin,
  definirChiffresPublics,
  definirClotureEtGel,
  definirPublie,
  definirVerrou,
  lireConnexions,
  lireSuivi,
  purger
} from '../../appels/admin';
import { clotureDepasseeOuverte, dateClotureLongue, tempsRestant } from '../../utils/format';
import { dateHeureMada } from '../../utils/exports';
import { dateGel } from '../../utils/masquage';
import { Aide, Dialogue, Erreur, Titre2, champ, messageAdmin, useAppel, type DemandeConfirmation } from './communs';

/** "2026-10-26T20:00" (Madagascar time) for an <input type="datetime-local">. */
function versChampMada(iso: string): string {
  const d = new Date(Date.parse(iso) + 3 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

function Bloc({ titre, icone, children }: { titre: string; icone: NomIcone; children: ReactNode }) {
  return (
    <section className="bg-white border border-filet rounded-xl p-4 mb-3">
      <h2 className="flex items-center gap-2 font-bold text-[1.0625rem] text-marine mb-2">
        <Icone nom={icone} />
        {titre}
      </h2>
      {children}
    </section>
  );
}

export default function Parametres({ email }: { email: string }) {
  const { etat, rechargerEtat, decalage, gelListesAt, horsLigne } = usePudi();
  const joel = email.toLowerCase() === EMAIL_JOEL;
  const suivi = useAppel(lireSuivi);
  const connexions = useAppel(lireConnexions);
  const [demande, setDemande] = useState<DemandeConfirmation | null>(null);
  const [cloture, setCloture] = useState('');
  const [messageCloture, setMessageCloture] = useState<string | null>(null);
  // PUDI-CC-17: moving the closing proposes to move the freeze of the member lists by the same delta.
  const [deplacerGel, setDeplacerGel] = useState(true);
  const [erreurAdmin, setErreurAdmin] = useState<string | null>(null);
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [chiffres, setChiffres] = useState<{ cours: boolean; message: string | null }>({ cours: false, message: null });
  const chiffresPublics = !!etat?.chiffres_publics;
  const basculerChiffres = async () => {
    setChiffres({ cours: true, message: null });
    try {
      const r = await definirChiffresPublics(!chiffresPublics);
      await rechargerEtat();
      setChiffres({
        cours: false,
        message: r.chiffres_publics ? 'Allumé : le public voit tous les chiffres.' : 'Éteint : le public voit seulement les voix.'
      });
    } catch (e) {
      setChiffres({ cours: false, message: messageAdmin(e) });
    }
  };

  // PUDI-CC-21: closing switch. Online only, never queued; never changes a date.
  const [verrou, setVerrou] = useState<{ cours: boolean; message: string | null }>({ cours: false, message: null });
  const verrouActif = etat?.verrou_cloture !== false;
  const enLigne = !horsLigne && (typeof navigator === 'undefined' || navigator.onLine !== false);
  const changerVerrou = async (actif: boolean) => {
    setVerrou({ cours: true, message: null });
    try {
      const r = await definirVerrou(actif);
      await rechargerEtat();
      setVerrou({ cours: false, message: r.verrou_cloture ? 'Verrouillage activé.' : 'Verrouillage désactivé.' });
    } catch (e) {
      setVerrou({ cours: false, message: messageAdmin(e) });
    }
  };
  const basculerVerrou = () => {
    if (!etat || !enLigne) return;
    const actif = !verrouActif;
    const dejaPassee = !!etat.cloture_depassee || Date.now() + decalage >= Date.parse(etat.cloture_at);
    if (actif && dejaPassee)
      return setDemande({
        titre: 'Activer le verrouillage ?',
        texte: 'La consultation va se fermer immédiatement.',
        libelleOk: 'Activer et fermer',
        danger: true,
        action: () => changerVerrou(true)
      });
    void changerVerrou(actif);
  };

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
      const r = await definirClotureEtGel(`${cloture}:00+03:00`, deplacerGel);
      await rechargerEtat();
      setMessageCloture(
        `Date de clôture enregistrée.${r?.gel_listes_at ? ` Gel des listes : ${dateGel(r.gel_listes_at)}.` : ''}`
      );
    } catch (e) {
      setMessageCloture(messageAdmin(e));
    }
  };

  const purgerMaintenant = () =>
    setDemande({
      titre: 'Purger maintenant ?',
      texte: 'Tous les votes, listes de numéros, listes des membres des groupes, responsables de groupe, refus, connexions, administrateurs et le journal seront supprimés définitivement.',
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
        <p className="text-[0.9375rem]">
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
            <span className="font-bold text-[0.9375rem] text-marine">Consultation publiée</span>
            <span className={`relative w-12 h-7 rounded-full transition-colors ${etat?.publie ? 'bg-marine' : 'bg-filet'}`} aria-hidden="true">
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${etat?.publie ? 'left-6' : 'left-1'}`} />
            </span>
          </button>
        ) : (
          <p className="mt-2 text-[0.875rem] text-gris flex gap-2 items-center">
            <Icone nom="cadenas" className="w-4 h-4" />
            Seul Joël SOATRA peut publier
          </p>
        )}
      </Bloc>

      {joel && (
        // PUDI-CC-19 (specification v11, section 5): super administrator only, off by default.
        <Bloc titre="Chiffres publics" icone="graphique">
          <button
            type="button"
            role="switch"
            aria-checked={chiffresPublics}
            aria-describedby="pudi-chiffres-aide"
            disabled={!etat || chiffres.cours}
            onClick={() => void basculerChiffres()}
            className="w-full min-h-[48px] flex items-center justify-between gap-3 rounded-xl border border-filet px-3"
            data-chiffres-publics={chiffresPublics ? 'oui' : 'non'}
          >
            <span className="font-bold text-[0.9375rem] text-marine text-left">Afficher tous les chiffres au public</span>
            <span className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${chiffresPublics ? 'bg-marine' : 'bg-filet'}`} aria-hidden="true">
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${chiffresPublics ? 'left-6' : 'left-1'}`} />
            </span>
          </button>
          <details className="mt-2 text-[0.875rem]">
            <summary className="min-h-[44px] inline-flex items-center gap-1.5 cursor-pointer text-marine font-bold">
              <Icone nom="info" className="w-4 h-4" />
              Que change cet interrupteur ?
            </summary>
            <p id="pudi-chiffres-aide" className="mt-1 text-profond">
              Éteint : les votants et le public voient seulement les voix. Allumé : ils voient aussi le nombre de votants, les votants par programme, la répartition des voix par votant, les votes concentrés et les effectifs des répartitions, à l'écran et dans la synthèse PDF. Réversible à tout moment.
            </p>
          </details>
          <p className="text-[0.8125rem] text-gris mt-1">Les organisateurs voient toujours tous les chiffres, et leur PDF et leur CSV restent complets. Chaque changement est inscrit au journal.</p>
          {chiffres.message && (
            <p role="status" className="mt-2 text-[0.875rem] font-bold">
              {chiffres.message}
            </p>
          )}
        </Bloc>
      )}

      <Bloc titre="Clôture" icone="calendrier">
        {etat && <p className="text-[0.9375rem]">Clôture actuelle : {dateClotureLongue(etat.cloture_at)}</p>}
        {restant && (
          <p className="text-[0.875rem] text-gris mt-1">
            {etat?.clos
              ? 'La consultation est close.'
              : clotureDepasseeOuverte(etat, restant.fini)
                ? fr.accueil.depasseeOuvert
                : restant.fini
                  ? 'Date de clôture atteinte.'
                  : `Temps restant : ${restant.jours} j ${restant.heures} h ${restant.minutes} min`}
          </p>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={verrouActif}
          aria-describedby="pudi-verrou-etat"
          disabled={!etat || verrou.cours || !enLigne}
          onClick={basculerVerrou}
          className="mt-3 w-full min-h-[48px] flex items-center justify-between gap-3 rounded-xl border border-filet px-3 disabled:opacity-60"
          data-verrou-cloture={verrouActif ? 'oui' : 'non'}
        >
          <span className="font-bold text-[0.9375rem] text-marine text-left">Verrouillage à la date de clôture</span>
          <span className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${verrouActif ? 'bg-marine' : 'bg-filet'}`} aria-hidden="true">
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${verrouActif ? 'left-6' : 'left-1'}`} />
          </span>
        </button>
        <details className="mt-2 text-[0.875rem]">
          <summary className="min-h-[44px] inline-flex items-center gap-1.5 cursor-pointer text-marine font-bold">
            <Icone nom="info" className="w-4 h-4" />
            Que change cet interrupteur ?
          </summary>
          <p className="mt-1 text-profond">
            Activé : la consultation se ferme à la date affichée. Désactivé : la date reste affichée, mais tout le monde peut continuer à voter. Vous pouvez changer à tout moment, même après la date.
          </p>
        </details>
        <p id="pudi-verrou-etat" className="text-[0.9375rem] mt-1" data-etat-consultation={etat?.clos ? 'close' : 'ouverte'}>
          État :{' '}
          <span className={`font-bold ${etat?.clos ? 'text-[#B42318]' : 'text-[#1F7A3E]'}`}>
            {etat ? (etat.clos ? 'Consultation close' : 'Consultation ouverte') : '…'}
          </span>
        </p>
        {!enLigne && <p className="text-[0.8125rem] text-gris mt-1">Hors connexion : l'interrupteur demande une connexion.</p>}
        {verrou.message && (
          <p role="status" className="mt-2 text-[0.875rem] font-bold">
            {verrou.message}
          </p>
        )}
        <p className="text-[0.875rem] text-gris mt-1" data-gel-actuel="">
          Gel des listes des groupes et fin des réclamations : {dateGel(gelListesAt)}
        </p>
        <label className="block mt-3">
          <span className="block font-bold text-[0.875rem] mb-1">Nouvelle date et heure (heure de Madagascar)</span>
          <input type="datetime-local" className={champ} value={cloture} onChange={(e) => setCloture(e.target.value)} name="cloture" />
        </label>
        <label className="mt-2 flex items-start gap-3 min-h-[44px] text-[0.875rem]">
          <input
            type="checkbox"
            className="mt-1 w-5 h-5 shrink-0"
            checked={deplacerGel}
            onChange={(e) => setDeplacerGel(e.target.checked)}
            data-deplacer-gel=""
          />
          <span>Décaler aussi le gel des listes du même écart (les réclamations restent ouvertes le même temps après la clôture). Inscrit au journal.</span>
        </label>
        <p className="text-[0.8125rem] text-gris mt-1">
          Aucune mise à jour de l'application n'est nécessaire : l'accueil, le compte à rebours, les messages et le refus des votes après la clôture suivent la nouvelle date.
        </p>
        <button type="button" className={`${boutonPrincipal} mt-2 w-full sm:w-auto`} onClick={() => void enregistrerCloture()}>
          <Icone nom="coche" />
          Enregistrer la clôture
        </button>
        {messageCloture && (
          <p role="status" className="mt-2 text-[0.875rem] font-bold">
            {messageCloture}
          </p>
        )}
      </Bloc>

      <Bloc titre="Administrateurs" icone="admin">
        <p className="text-[0.875rem] text-gris mb-2">Comptes qui se sont connectés sur PUDi. Joël SOATRA coche les organisateurs.</p>
        {connexions.erreur && <Erreur texte={connexions.erreur} reessayer={() => void connexions.recharger()} />}
        {erreurAdmin && <Erreur texte={erreurAdmin} />}
        <ul className="divide-y divide-filet">
          {(connexions.donnees ?? []).map((c) => {
            const estJoel = c.email.toLowerCase() === EMAIL_JOEL;
            return (
              <li key={c.user_id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-1">
                <div className="min-w-0 flex-1 text-[0.875rem]">
                  <p className="font-bold break-all">{c.email}</p>
                  <p className="text-gris">
                    Première connexion {dateHeureMada(c.premiere)} · dernière {dateHeureMada(c.derniere)} · {c.a_vote ? 'a voté' : "n'a pas voté"}
                  </p>
                </div>
                <label className="flex items-center gap-2 min-h-[44px] text-[0.875rem]">
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
        <p className="text-[0.9375rem]">Purge prévue le {dateClotureLongue(DATE_PURGE)}.</p>
        <p className="text-[0.875rem] text-gris mt-1">
          {PURGE_AUTOMATIQUE
            ? 'Purge automatique programmée sur le serveur (tâche « pudi-purge »). Vérifiez le 28 janvier 2027 que les données ont bien disparu.'
            : 'Aucune purge automatique sur le serveur : Joël SOATRA doit utiliser le bouton ci-dessous le 28 janvier 2027.'}
        </p>
        <Titre2>Ce qui est supprimé</Titre2>
        <p className="text-[0.875rem]">Votes, listes de numéros codés, tentatives refusées, connexions, organisateurs nommés et journal. Les canaux et le réglage de la consultation sont gardés.</p>
        <p className="text-[0.875rem] mt-1">
          Les listes des membres saisies par les responsables de groupe (numéros, e-mails, établissements, fokontany) et la liste des responsables sont supprimées à la purge avec tout le reste.
        </p>
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
