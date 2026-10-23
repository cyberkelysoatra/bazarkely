// "Mon groupe" (PUDI-CC-07): a group manager keeps the member list of the channels he manages
// (administrators see every channel). One row = one person: 1 to 3 phone numbers, optional
// Gmail address, establishment and fokontany. The numbers feed the channel's list
// « Saisie des responsables » on the server, so these members count « dans nos réseaux ».
// Online only (the list is never kept on the device): offline shows a clear message.
// v6: each line shows whether the person voted (never what she chose), with the participation
// of the group and a filter.
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Icone } from '../composants/Icones';
import { Page, boutonPrincipal, boutonSecondaire } from '../composants/Mise';
import { fr } from '../i18n/fr';
import { usePudi, useDonnees } from '../PudiContexte';
import { connexionGoogle, useSessionLocale } from '../appels/session';
import {
  enregistrerMembre,
  lireMembres,
  lireMesGroupes,
  supprimerMembre,
  type Groupe as GroupeServeur,
  type Membre,
  type SaisieMembre
} from '../appels/groupe';
import {
  afficherNumero,
  filtrerMembres,
  filtrerParVote,
  messageGroupe,
  participation,
  verifierSaisie,
  type FiltreVote
} from '../utils/groupe';
import { extraireCode } from '../utils/erreurs';
import { allerAuChamp } from '../utils/champFautif';
import { BandeauReseau, estErreurReseau, useEnvoiFiable } from '../composants/Reseau';
import { normaliserTelephone } from '../utils/regles';
import { Aide, Dialogue, champ, petitBouton, type DemandeConfirmation } from './admin/communs';

const T = fr.groupe;
const AUTRE = '__autre__';
/** PUDI-CC-11: JOEL's « Responsable de groupe » preview is read-only. */
const BLOQUE_APERCU = 'Aperçu : modification désactivée';

type Chargement<D> = { t: 'cours' } | { t: 'horsLigne' } | { t: 'erreur'; message: string } | { t: 'ok'; d: D };

/** navigator.onLine only: a failed call is reported by the call itself (RESEAU). */
function useEnLigne(): boolean {
  const [en, setEn] = useState(typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const maj = () => setEn(navigator.onLine !== false);
    window.addEventListener('online', maj);
    window.addEventListener('offline', maj);
    return () => {
      window.removeEventListener('online', maj);
      window.removeEventListener('offline', maj);
    };
  }, []);
  return en;
}

/** Loads with the network; a network failure (or no network) gives the offline message. */
function useChargement<D>(fn: () => Promise<D>, cle: string) {
  const enLigne = useEnLigne();
  const [etat, setEtat] = useState<Chargement<D>>({ t: 'cours' });
  const charger = useCallback(async () => {
    // PUDI-CC-14.4: a list already shown stays (with a line being typed) when the network drops.
    const garderOuHorsLigne = (e: Chargement<D>): Chargement<D> => (e.t === 'ok' ? e : { t: 'horsLigne' });
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return setEtat(garderOuHorsLigne);
    setEtat((e) => (e.t === 'ok' ? e : { t: 'cours' }));
    try {
      setEtat({ t: 'ok', d: await fn() });
    } catch (e) {
      if (extraireCode(e) === 'RESEAU') setEtat(garderOuHorsLigne);
      else setEtat({ t: 'erreur', message: messageGroupe(e) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  useEffect(() => {
    void charger();
  }, [charger, enLigne]);
  return { etat: enLigne || etat.t === 'ok' ? etat : ({ t: 'horsLigne' } as Chargement<D>), charger, horsLigne: !enLigne };
}

function Message({ texte, reessayer, icone = 'horsLigne' }: { texte: string; reessayer?: () => void; icone?: 'horsLigne' | 'alerte' }) {
  return (
    <div role="status" className="bg-white border border-filet rounded-xl p-4 space-y-3" data-groupe-message="">
      <p className="text-[1rem] flex gap-2 items-start">
        <Icone nom={icone} className="w-5 h-5 text-marine mt-0.5 shrink-0" />
        {texte}
      </p>
      {reessayer && (
        <button type="button" className={boutonSecondaire} onClick={reessayer}>
          <Icone nom="actualiser" />
          {fr.app.reessayer}
        </button>
      )}
    </div>
  );
}

function Participation({ membres }: { membres: Membre[] }) {
  const p = participation(membres);
  return (
    <div className="bg-white border border-filet rounded-xl p-3" data-groupe-participation="">
      <p className="font-bold text-[0.9375rem] text-marine">{T.participation(p.votants, p.total, p.pct)}</p>
      <div
        className="mt-2 h-2.5 rounded-full bg-filet overflow-hidden"
        role="progressbar"
        aria-label={T.participation(p.votants, p.total, p.pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={p.pct}
      >
        <div className="h-full rounded-full bg-marine" style={{ width: `${p.pct}%` }} />
      </div>
    </div>
  );
}

function FiltresVote({ filtre, choisir }: { filtre: FiltreVote; choisir: (f: FiltreVote) => void }) {
  const options: FiltreVote[] = ['tous', 'aVote', 'pasEncore'];
  return (
    <div role="group" aria-label={T.filtreTitre} className="flex flex-wrap gap-1.5" data-groupe-filtre-vote="">
      {options.map((f) => (
        <button
          key={f}
          type="button"
          aria-pressed={filtre === f}
          onClick={() => choisir(f)}
          className={`pudi-focus min-h-[40px] px-3 rounded-full border-2 text-[0.875rem] font-bold ${
            filtre === f ? 'bg-marine border-marine text-white' : 'bg-white border-filet text-marine'
          }`}
        >
          {T.filtres[f]}
        </button>
      ))}
    </div>
  );
}

function BadgeVote({ aVote }: { aVote: boolean }) {
  return aVote ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-marine text-white text-[0.8125rem] font-bold px-2.5 py-0.5" data-vote="oui">
      <Icone nom="coche" className="w-3.5 h-3.5" />
      {T.aVote}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-gris/40 text-gris text-[0.8125rem] px-2.5 py-0.5" data-vote="non">
      <Icone nom="horloge" className="w-3.5 h-3.5" />
      {T.pasEncoreVote}
    </span>
  );
}

function AideGroupe() {
  return (
    <Aide titre={T.aideTitre}>
      {T.aide.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <p>{T.aideDetail}</p>
      <p data-aide-whatsapp="">{T.aideWhatsApp}</p>
    </Aide>
  );
}

function Formulaire({
  canal,
  membre,
  fokontanyListe,
  fermer,
  enregistre
}: {
  canal: string;
  membre: Membre | null;
  fokontanyListe: string[];
  fermer: () => void;
  enregistre: () => void;
}) {
  const fktInitial = membre?.fokontany ?? '';
  const connu = !fktInitial || fokontanyListe.includes(fktInitial);
  const [numeros, setNumeros] = useState<string[]>(membre ? membre.numeros.map(afficherNumero) : ['']);
  const [email, setEmail] = useState(membre?.email ?? '');
  const [etablissement, setEtablissement] = useState(membre?.etablissement ?? '');
  const [fkt, setFkt] = useState(connu ? fktInitial : AUTRE);
  const [fktAutre, setFktAutre] = useState(connu ? '' : fktInitial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cours, setCours] = useState(false);

  // Rule 11: the first faulty field of the line gets the cursor.
  const montrer = (formulaire: HTMLFormElement, er: unknown) => {
    setErreur(messageGroupe(er));
    const code = extraireCode(er) ?? '';
    const nom = /EMAIL/.test(code)
      ? 'email'
      : /NUMERO/.test(code)
        ? `numero${Math.max(1, numeros.findIndex((n) => !n.trim() || !normaliserTelephone(n)) + 1)}`
        : null;
    const el = nom ? formulaire.querySelector<HTMLElement>(`[name="${nom}"]`) : null;
    if (el) window.setTimeout(() => allerAuChamp(el), 30);
  };

  // PUDI-CC-14.4: network failure = form kept, « Réessayer », one automatic retry when back
  // online. A new line already written by the lost attempt comes back as « numéro déjà dans le
  // groupe »: it is then the same line, saved once, and the form closes.
  const formulaireRef = useRef<HTMLFormElement>(null);
  const echecReseau = useRef(false);
  const envoiLigne = useEnvoiFiable(
    async (s: SaisieMembre) => {
      setCours(true);
      try {
        await enregistrerMembre(canal, s);
      } catch (er) {
        if (estErreurReseau(er)) {
          echecReseau.current = true;
          throw er;
        }
        if (!(echecReseau.current && !s.id && extraireCode(er) === 'NUMERO_DEJA_DANS_LE_GROUPE')) throw er;
      } finally {
        setCours(false);
      }
      enregistre();
      fermer();
    },
    (er) => formulaireRef.current && montrer(formulaireRef.current, er)
  );

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    const formulaire = e.currentTarget as HTMLFormElement;
    const code = verifierSaisie(numeros, email);
    if (code) return montrer(formulaire, code);
    const s: SaisieMembre = {
      id: membre?.id ?? null,
      numeros,
      email,
      etablissement,
      fokontany: fkt === AUTRE ? fktAutre : fkt
    };
    setErreur(null);
    try {
      if (!(await envoiLigne.lancer(s))) setErreur(null);
    } catch (er) {
      montrer(formulaire, er);
    }
  };

  return (
    <form ref={formulaireRef} onSubmit={envoyer} className="bg-white border-2 border-marine rounded-xl p-3 space-y-3" aria-label={membre ? T.modifierTitre : T.nouveau} noValidate>
      <p className="font-bold text-marine text-[1rem]">{membre ? T.modifierTitre : T.nouveau}</p>
      <fieldset className="space-y-2">
        <legend className="block font-bold text-[0.875rem] mb-1">{T.numeros}</legend>
        {numeros.map((n, i) => (
          <div key={i} className="flex gap-2">
            <input
              className={`${champ} flex-1 min-w-0`}
              type="tel"
              inputMode="tel"
              autoComplete="off"
              aria-label={T.numero(i + 1)}
              value={n}
              maxLength={24}
              onChange={(e) => setNumeros(numeros.map((x, j) => (j === i ? e.target.value : x)))}
              name={`numero${i + 1}`}
            />
            {numeros.length > 1 && (
              <button type="button" className={petitBouton} aria-label={`${T.retirerNumero} ${i + 1}`} onClick={() => setNumeros(numeros.filter((_, j) => j !== i))}>
                <Icone nom="croix" className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        <p className="text-[0.8125rem] text-gris">{T.numeroAide}</p>
        {numeros.length < 3 && (
          <button type="button" className={petitBouton} onClick={() => setNumeros([...numeros, ''])}>
            <Icone nom="plus" className="w-4 h-4" />
            {T.ajouterNumero}
          </button>
        )}
      </fieldset>
      <label className="block">
        <span className="block font-bold text-[0.875rem] mb-1">{T.email}</span>
        <input className={champ} type="email" inputMode="email" autoComplete="off" value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} name="email" />
      </label>
      <label className="block">
        <span className="block font-bold text-[0.875rem] mb-1">{T.etablissement}</span>
        <input className={champ} value={etablissement} maxLength={120} onChange={(e) => setEtablissement(e.target.value)} name="etablissement" />
      </label>
      <label className="block">
        <span className="block font-bold text-[0.875rem] mb-1">{T.fokontany}</span>
        <select className={champ} value={fkt} onChange={(e) => setFkt(e.target.value)} name="fokontany">
          <option value="">{T.fokontanyAucun}</option>
          {fokontanyListe.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
          <option value={AUTRE}>{fr.resultats.autreFokontany}</option>
        </select>
        {fkt === AUTRE && (
          <input
            className={`${champ} mt-2`}
            aria-label={T.fokontanyAutre}
            placeholder={T.fokontanyAutre}
            value={fktAutre}
            maxLength={80}
            onChange={(e) => setFktAutre(e.target.value)}
            name="fokontanyAutre"
          />
        )}
      </label>
      {erreur && (
        <p role="alert" className="text-[0.875rem] font-bold text-[#9C3F21] flex gap-1.5 items-start">
          <Icone nom="alerte" className="w-4 h-4 mt-0.5 shrink-0" />
          {erreur}
        </p>
      )}
      {envoiLigne.enAttente && <BandeauReseau cours={cours} reessayer={() => void envoiLigne.reessayer().catch((er) => formulaireRef.current && montrer(formulaireRef.current, er))} />}
      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <button type="button" className={boutonSecondaire} onClick={fermer}>
          {T.annuler}
        </button>
        <button type="submit" className={boutonPrincipal} disabled={cours}>
          {cours ? T.enregistrement : T.enregistrer}
        </button>
      </div>
    </form>
  );
}

function ListeGroupes() {
  const { etat, apercu } = usePudi();
  const canalApercu = apercu?.role === 'responsable' ? apercu.canal : null;
  const { etat: ch0, charger } = useChargement(lireMesGroupes, 'groupes');
  const ch: typeof ch0 = ch0.t === 'ok' && canalApercu ? { t: 'ok', d: ch0.d.filter((g) => g.code === canalApercu) } : ch0;
  return (
    <Page titre={T.titre}>
      <AideGroupe />
      {ch.t === 'horsLigne' && <Message texte={T.horsLigne} reessayer={() => void charger()} />}
      {ch.t === 'erreur' && <Message texte={ch.message} icone="alerte" reessayer={() => void charger()} />}
      {ch.t === 'cours' && <p className="text-gris py-6 text-center">{fr.app.chargement}</p>}
      {ch.t === 'ok' &&
        (ch.d.length ? (
          <>
            <h2 className="font-bold text-[1.0625rem] text-marine mb-2">{T.mesGroupes}</h2>
            {etat?.est_admin && <p className="text-[0.875rem] text-gris mb-2">{T.tousLesGroupes}</p>}
            <ul className="space-y-2">
              {ch.d.map((g) => (
                <li key={g.code}>
                  <Link
                    to={`/groupe/${encodeURIComponent(g.code)}`}
                    className="pudi-focus bg-white border border-filet rounded-xl p-3 min-h-[56px] flex items-center gap-3"
                    data-groupe={g.code}
                  >
                    <span className="w-9 h-9 rounded-lg bg-vide text-marine flex items-center justify-center shrink-0">
                      <Icone nom="personnes" className="w-5 h-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-[0.9375rem] leading-snug break-words">{g.nom}</span>
                      <span className="block text-[0.8125rem] text-gris">
                        {T.membres(g.nb_membres)}
                        {g.nb_membres > 0 && ` · ${T.participation(g.nb_ayant_vote, g.nb_membres, Math.round((g.nb_ayant_vote * 100) / g.nb_membres))}`}
                      </span>
                    </span>
                    <Icone nom="droite" className="w-5 h-5 text-marine shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Message texte={T.aucunGroupe} icone="alerte" />
        ))}
    </Page>
  );
}

function Membres({ code }: { code: string }) {
  const { donnees } = useDonnees();
  const lecture = usePudi().apercu?.role === 'responsable';
  const { etat: ch, charger, horsLigne } = useChargement(async () => {
    const [groupes, membres] = await Promise.all([lireMesGroupes(), lireMembres(code)]);
    return { groupe: groupes.find((g) => g.code === code) ?? null, membres };
  }, `membres:${code}`);
  const [recherche, setRecherche] = useState('');
  const [filtre, setFiltre] = useState<FiltreVote>('tous');
  const [edition, setEdition] = useState<Membre | 'nouveau' | null>(null);
  const [demande, setDemande] = useState<DemandeConfirmation | null>(null);
  const [annonce, setAnnonce] = useState<string | null>(null);
  const fokontanyListe = useMemo(() => (donnees?.fokontany ?? []).filter((f) => f.ceni).map((f) => f.affichage), [donnees]);
  const membres = ch.t === 'ok' ? ch.d.membres : [];
  const visibles = useMemo(() => filtrerParVote(filtrerMembres(membres, recherche), filtre), [membres, recherche, filtre]);
  const groupe: GroupeServeur | null = ch.t === 'ok' ? ch.d.groupe : null;

  const recharger = async (message: string) => {
    await charger();
    setAnnonce(message);
    window.setTimeout(() => setAnnonce(null), 3000);
  };

  return (
    <Page titre={groupe?.nom ?? T.titre}>
      <Link to="/groupe" className="pudi-focus inline-flex items-center gap-1 min-h-[44px] text-marine font-bold text-[0.9375rem] mb-2">
        <Icone nom="gauche" className="w-4 h-4" />
        {T.retour}
      </Link>
      <AideGroupe />
      {/* PUDI-CC-14.4: offline, the list already shown and a line being typed stay under the message. */}
      {(ch.t === 'horsLigne' || (ch.t === 'ok' && horsLigne)) && <Message texte={T.horsLigne} reessayer={() => void charger()} />}
      {ch.t === 'erreur' && <Message texte={ch.message} icone="alerte" reessayer={() => void charger()} />}
      {ch.t === 'cours' && <p className="text-gris py-6 text-center">{fr.app.chargement}</p>}
      {ch.t === 'ok' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-[1rem]" data-groupe-compte="">
              {T.membres(membres.length)}
            </p>
            <button type="button" className={boutonPrincipal} onClick={() => setEdition('nouveau')} disabled={!!edition || lecture} title={lecture ? BLOQUE_APERCU : undefined}>
              <Icone nom="plus" />
              {T.ajouter}
            </button>
          </div>
          {annonce && (
            <p role="status" className="text-[0.875rem] font-bold text-marine flex gap-1.5 items-center">
              <Icone nom="coche" className="w-4 h-4" />
              {annonce}
            </p>
          )}
          {membres.length > 0 && <Participation membres={membres} />}
          {edition === 'nouveau' && (
            <Formulaire canal={code} membre={null} fokontanyListe={fokontanyListe} fermer={() => setEdition(null)} enregistre={() => void recharger(T.enregistre)} />
          )}
          {membres.length > 0 && (
            <label className="block">
              <span className="sr-only">{T.rechercher}</span>
              <span className="relative block">
                <Icone nom="recherche" className="w-5 h-5 text-gris absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="search" className={`${champ} pl-10`} placeholder={T.rechercher} value={recherche} onChange={(e) => setRecherche(e.target.value)} name="recherche" />
              </span>
              {recherche.trim() && <span className="block text-[0.8125rem] text-gris mt-1" data-groupe-filtre="">{T.resultats(visibles.length, membres.length)}</span>}
            </label>
          )}
          {membres.length > 0 && <FiltresVote filtre={filtre} choisir={setFiltre} />}
          {!membres.length && edition !== 'nouveau' && <p className="text-gris text-[0.9375rem]">{T.aucunMembre}</p>}
          {membres.length > 0 && !visibles.length && <p className="text-gris text-[0.9375rem]">{recherche.trim() ? T.aucunResultat : T.aucunFiltre}</p>}
          <ul className="space-y-2">
            {visibles.map((m) =>
              edition !== 'nouveau' && edition?.id === m.id ? (
                <li key={m.id}>
                  <Formulaire canal={code} membre={m} fokontanyListe={fokontanyListe} fermer={() => setEdition(null)} enregistre={() => void recharger(T.enregistre)} />
                </li>
              ) : (
                <li key={m.id} className="bg-white border border-filet rounded-xl p-3" data-membre={m.id}>
                  <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 mb-1">
                    {m.etablissement ? <p className="font-bold text-[0.9375rem] break-words min-w-0">{m.etablissement}</p> : <span />}
                    <BadgeVote aVote={m.a_vote} />
                  </div>
                  <ul className="text-[0.9375rem] font-mono space-y-0.5">
                    {m.numeros.map((n) => (
                      <li key={n} className="flex items-center gap-1.5">
                        <Icone nom="message" className="w-4 h-4 text-gris shrink-0" />
                        {afficherNumero(n)}
                      </li>
                    ))}
                  </ul>
                  {(m.email || m.fokontany) && (
                    <p className="mt-1 text-[0.875rem] text-gris break-all">{[m.email, m.fokontany ? `Fokontany ${m.fokontany}` : null].filter(Boolean).join(' · ')}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button type="button" className={petitBouton} onClick={() => setEdition(m)} disabled={!!edition || lecture} title={lecture ? BLOQUE_APERCU : undefined}>
                      <Icone nom="crayon" className="w-4 h-4" />
                      {T.modifier}
                    </button>
                    <button
                      type="button"
                      className={petitBouton}
                      disabled={lecture}
                      title={lecture ? BLOQUE_APERCU : undefined}
                      onClick={() =>
                        setDemande({
                          titre: T.supprimerTitre,
                          texte: T.supprimerTexte,
                          libelleOk: T.supprimer,
                          danger: true,
                          action: async () => {
                            await supprimerMembre(code, m.id);
                            await recharger(T.supprime);
                          }
                        })
                      }
                    >
                      <Icone nom="poubelle" className="w-4 h-4" />
                      {T.supprimer}
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        </div>
      )}
      <Dialogue demande={demande} fermer={() => setDemande(null)} />
    </Page>
  );
}

export default function Groupe() {
  const { code } = useParams();
  const session = useSessionLocale();
  const [connexion, setConnexion] = useState(false);
  const { apercu } = usePudi();
  // Preview: « Votant » has no group; « Responsable » sees only the chosen channel.
  if (session && apercu?.role === 'votant')
    return (
      <Page titre={T.titre}>
        <Message texte={T.aucunGroupe} icone="alerte" />
      </Page>
    );
  if (session && apercu?.role === 'responsable' && code && code !== apercu.canal) return <Navigate to={`/groupe/${encodeURIComponent(apercu.canal)}`} replace />;
  if (!session)
    return (
      <Page titre={T.titre}>
        <AideGroupe />
        <div className="bg-white border border-filet rounded-xl p-4 space-y-3">
          <p className="text-[1rem] flex gap-2 items-start">
            <Icone nom="cadenas" className="w-5 h-5 text-marine mt-0.5" />
            {T.connexion}
          </p>
          <button
            type="button"
            className={`${boutonPrincipal} w-full`}
            disabled={connexion}
            onClick={() => {
              setConnexion(true);
              connexionGoogle(code ? `/pudi/groupe/${encodeURIComponent(code)}` : '/pudi/groupe').catch(() => setConnexion(false));
            }}
          >
            <Icone nom="connexion" />
            {connexion ? fr.envoi.connexionEnCours : T.seConnecter}
          </button>
        </div>
      </Page>
    );
  return code ? <Membres key={code} code={code} /> : <ListeGroupes />;
}
