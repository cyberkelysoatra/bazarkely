// Channels: links, WhatsApp sharing, QR codes, import of the partners' phone lists.
// Privacy: the numbers of a list live only in this component state until they are sent, then
// the state is cleared. Never stored on the device, never logged, never displayed back.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Icone, type NomIcone } from '../../composants/Icones';
import { boutonPrincipal, boutonSecondaire } from '../../composants/Mise';
import { fr } from '../../i18n/fr';
import { frPages } from '../../i18n/frPages';
import {
  enregistrerCanal,
  importerListe,
  lireCanaux,
  lireListes,
  lireMultiCanaux,
  supprimerListe,
  type Canal,
  type ResultatImport,
  type TypeCanal
} from '../../appels/admin';
import { genererQrPng, lienCanal, nomFichierQr } from '../../appels/qr';
import { ajouterResponsable, lireResponsables, retirerResponsable, type Responsable } from '../../appels/groupe';
import { EMAIL_VALIDE, afficherNumero } from '../../utils/groupe';
import { apercuNumeros, lireCollage, lireCsvNumeros, suggererCode } from '../../utils/listes';
import { dateHeureMada, telechargerFichier } from '../../utils/exports';
import { codeCanalValide, normaliserTelephone } from '../../utils/regles';
import { Aide, Dialogue, Erreur, Titre2, champ, messageAdmin, petitBouton, useAppel, type DemandeConfirmation } from './communs';

const TYPES: { v: TypeCanal; l: string; icone: NomIcone }[] = [
  { v: 'groupe_whatsapp', l: 'Groupe WhatsApp', icone: 'message' },
  { v: 'reunion', l: 'Réunion', icone: 'calendrier' },
  { v: 'affiche', l: 'Affiche', icone: 'porteVoix' },
  { v: 'autre', l: 'Autre', icone: 'diffusion' }
];
const SOURCES = ['PIC', 'Préfecture', 'Ministère', 'ORT', 'GIHTNB', 'Autre'];
const typeDe = (t: string) => TYPES.find((x) => x.v === t) ?? TYPES[3];
const messageWhatsApp = (c: Canal) =>
  `Priorisation du PUDi de Nosy Be 2026-2040 : donnez votre avis sur les projets les plus urgents. ${lienCanal(c.code)}`;

type Formulaire = Omit<Canal, 'nb_numeros' | 'nb_votes' | 'nb_votes_hors_liste'>;
const VIDE: Formulaire = { code: '', nom: '', type: 'groupe_whatsapp', liste_membres: true, responsable: '', remarque: '', actif: true };

function FormCanal({ initial, nouveau, fermer, enregistre }: { initial: Formulaire; nouveau: boolean; fermer: () => void; enregistre: () => void }) {
  const [f, setF] = useState<Formulaire>(initial);
  const [codeTouche, setCodeTouche] = useState(!nouveau);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cours, setCours] = useState(false);
  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.nom.trim()) return setErreur('Indiquez le nom du canal.');
    if (!codeCanalValide(f.code)) return setErreur(messageAdmin('PUDI_CODE_CANAL'));
    setCours(true);
    setErreur(null);
    try {
      await enregistrerCanal(f);
      enregistre();
      fermer();
    } catch (er) {
      setErreur(messageAdmin(er));
    } finally {
      setCours(false);
    }
  };
  return (
    <form onSubmit={envoyer} className="bg-white border-2 border-marine rounded-xl p-3 space-y-3" aria-label={nouveau ? 'Nouveau canal' : `Modifier ${initial.nom}`}>
      <p className="font-bold text-marine text-[1rem]">{nouveau ? 'Nouveau canal' : 'Modifier le canal'}</p>
      <label className="block">
        <span className="block font-bold text-[0.875rem] mb-1">Nom</span>
        <input
          className={champ}
          value={f.nom}
          maxLength={120}
          onChange={(e) => setF({ ...f, nom: e.target.value, code: nouveau && !codeTouche ? suggererCode(e.target.value) : f.code })}
          name="nom"
        />
      </label>
      <label className="block">
        <span className="block font-bold text-[0.875rem] mb-1">Code du lien {nouveau ? '(proposé à partir du nom)' : '(ne change plus)'}</span>
        <input
          className={`${champ} font-mono ${nouveau ? '' : 'bg-vide text-gris'}`}
          value={f.code}
          readOnly={!nouveau}
          maxLength={24}
          onChange={(e) => {
            setCodeTouche(true);
            setF({ ...f, code: e.target.value.toLowerCase() });
          }}
          name="code"
        />
        <span className="block text-[0.8125rem] text-gris mt-1 break-all">{lienCanal(f.code || 'code')}</span>
      </label>
      <label className="block">
        <span className="block font-bold text-[0.875rem] mb-1">Type</span>
        <select className={champ} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as TypeCanal })} name="type">
          {TYPES.map((t) => (
            <option key={t.v} value={t.v}>
              {t.l}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-3 min-h-[44px]">
        <input type="checkbox" className="w-5 h-5 accent-[#0B2A8C]" checked={f.liste_membres} onChange={(e) => setF({ ...f, liste_membres: e.target.checked })} />
        <span className="text-[0.9375rem]">Le groupe a une liste de membres (permet de repérer un lien utilisé hors du groupe)</span>
      </label>
      <label className="block">
        <span className="block font-bold text-[0.875rem] mb-1">Responsable</span>
        <input className={champ} value={f.responsable ?? ''} maxLength={120} onChange={(e) => setF({ ...f, responsable: e.target.value })} name="responsable" />
      </label>
      <label className="block">
        <span className="block font-bold text-[0.875rem] mb-1">Remarque</span>
        <input className={champ} value={f.remarque ?? ''} maxLength={300} onChange={(e) => setF({ ...f, remarque: e.target.value })} name="remarque" />
      </label>
      <label className="flex items-center gap-3 min-h-[44px]">
        <input type="checkbox" className="w-5 h-5 accent-[#0B2A8C]" checked={f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} name="actif" />
        <span className="text-[0.9375rem]">Canal actif</span>
      </label>
      {erreur && (
        <p role="alert" className="text-[0.875rem] font-bold text-[#9C3F21]">
          {erreur}
        </p>
      )}
      <div className="flex flex-col-reverse sm:flex-row gap-2">
        <button type="button" className={boutonSecondaire} onClick={fermer}>
          Annuler
        </button>
        <button type="submit" className={boutonPrincipal} disabled={cours}>
          {cours ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

/**
 * Group managers of one channel (PUDI-CC-07): Google e-mails allowed to keep the channel's member
 * list in « Mon groupe ». A channel may have several managers; a manager may manage several channels.
 * PUDI-CC-09: a WhatsApp number is required (shown only to the persons whose vote was masked because
 * of a line this manager wrote). A manager designated before has a warning and can be completed.
 */
function Responsables({ canal, demander }: { canal: Canal; demander: (d: DemandeConfirmation) => void }) {
  const [liste, setListe] = useState<Responsable[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cours, setCours] = useState(false);
  const charger = useCallback(async () => {
    try {
      setListe(await lireResponsables(canal.code));
      setErreur(null);
    } catch (e) {
      setErreur(messageAdmin(e));
    }
  }, [canal.code]);
  useEffect(() => {
    void charger();
  }, [charger]);
  const ajouter = async (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!EMAIL_VALIDE.test(v)) return setErreur(messageAdmin('PUDI_EMAIL_INVALIDE'));
    if (!normaliserTelephone(whatsapp.trim())) return setErreur(messageAdmin('PUDI_NUMERO_INVALIDE'));
    setCours(true);
    setErreur(null);
    try {
      await ajouterResponsable(canal.code, v, whatsapp);
      setEmail('');
      setWhatsapp('');
      await charger();
    } catch (er) {
      setErreur(messageAdmin(er));
    } finally {
      setCours(false);
    }
  };
  return (
    <div className="mt-3 border-t border-filet pt-2" data-responsables={canal.code}>
      <p className="font-bold text-[0.875rem] text-marine flex items-center gap-1.5">
        <Icone nom="personnes" className="w-4 h-4" />
        Responsables
      </p>
      {liste === null && !erreur ? (
        <p className="text-[0.8125rem] text-gris">{fr.app.chargement}</p>
      ) : liste && !liste.length ? (
        <p className="text-[0.8125rem] text-gris">Aucun responsable désigné.</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {(liste ?? []).map((r) => (
            <li key={r.email} className="flex flex-wrap items-center gap-2 text-[0.875rem]" data-responsable={r.email}>
              <span className="min-w-0 flex-1">
                <span className="block break-all">{r.email}</span>
                {r.whatsapp ? (
                  <span className="block text-[0.8125rem] text-gris" data-whatsapp="">
                    WhatsApp : {afficherNumero(r.whatsapp)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[0.8125rem] font-bold text-[#9C3F21]" data-whatsapp-manquant="">
                    <Icone nom="alerte" className="w-3.5 h-3.5" />
                    Numéro WhatsApp manquant
                  </span>
                )}
              </span>
              <button
                type="button"
                className={petitBouton}
                aria-label={`Modifier le numéro WhatsApp de ${r.email}`}
                onClick={() => {
                  setEmail(r.email);
                  setWhatsapp(r.whatsapp ? afficherNumero(r.whatsapp) : '');
                  setErreur(null);
                }}
              >
                <Icone nom="crayon" className="w-4 h-4" />
                Modifier
              </button>
              <button
                type="button"
                className={petitBouton}
                aria-label={`Retirer ${r.email} des responsables de ${canal.nom}`}
                onClick={() =>
                  demander({
                    titre: 'Retirer ce responsable ?',
                    texte: `${r.email} ne verra plus la liste des membres de « ${canal.nom} ». La liste reste en place.`,
                    libelleOk: 'Retirer',
                    danger: true,
                    action: async () => {
                      await retirerResponsable(canal.code, r.email);
                      await charger();
                    }
                  })
                }
              >
                <Icone nom="croix" className="w-4 h-4" />
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={ajouter} className="mt-2 flex flex-wrap gap-1.5" aria-label={`Ajouter un responsable à ${canal.nom}`} noValidate>
        <input
          className={`${champ} flex-1 min-w-[12rem]`}
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="adresse@gmail.com"
          aria-label={`E-mail Gmail du responsable de ${canal.nom}`}
          value={email}
          maxLength={120}
          onChange={(e) => setEmail(e.target.value)}
          name="responsable_email"
        />
        <input
          className={`${champ} flex-1 min-w-[9rem]`}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="WhatsApp : 034 12 345 67"
          aria-label={`Numéro WhatsApp du responsable de ${canal.nom}`}
          value={whatsapp}
          maxLength={24}
          onChange={(e) => setWhatsapp(e.target.value)}
          name="responsable_whatsapp"
        />
        <button type="submit" className={petitBouton} disabled={cours || !email.trim() || !whatsapp.trim()}>
          <Icone nom="plus" className="w-4 h-4" />
          {cours ? '…' : 'Enregistrer'}
        </button>
      </form>
      <p className="mt-1 text-[0.8125rem] text-gris" data-avis-whatsapp="">
        {frPages.groupe.aideWhatsApp}
      </p>
      {erreur && (
        <p role="alert" className="mt-1 text-[0.875rem] font-bold text-[#9C3F21]">
          {erreur}
        </p>
      )}
    </div>
  );
}

function Import({ canal, fermer, termine }: { canal: Canal; fermer: () => void; termine: () => void }) {
  const [source, setSource] = useState('');
  const [date, setDate] = useState('');
  const [mode, setMode] = useState<'fichier' | 'collage'>('collage');
  const [collage, setCollage] = useState('');
  const [numeros, setNumeros] = useState<string[]>([]);
  const [nomFichier, setNomFichier] = useState('');
  const [resultat, setResultat] = useState<ResultatImport | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cours, setCours] = useState(false);
  const entree = useRef<HTMLInputElement>(null);
  const apercu = apercuNumeros(numeros);

  const lireFichier = (fichier: File | undefined) => {
    if (!fichier) return;
    setNomFichier(fichier.name);
    const lecteur = new FileReader();
    lecteur.onload = () => setNumeros(lireCsvNumeros(String(lecteur.result ?? '')));
    lecteur.onerror = () => setErreur('Le fichier ne peut pas être lu.');
    lecteur.readAsText(fichier, 'utf-8');
  };

  const vider = () => {
    setNumeros([]);
    setCollage('');
    setNomFichier('');
    if (entree.current) entree.current.value = '';
  };

  const envoyer = async () => {
    if (!source.trim()) return setErreur(messageAdmin('PUDI_SOURCE_REQUISE'));
    if (!numeros.length) return setErreur('Aucun numéro à envoyer.');
    setCours(true);
    setErreur(null);
    try {
      const r = await importerListe(canal.code, source.trim(), date || null, numeros);
      vider();
      setResultat(r);
      termine();
    } catch (e) {
      setErreur(messageAdmin(e));
    } finally {
      setCours(false);
    }
  };

  return (
    <div className="bg-white border-2 border-marine rounded-xl p-3 space-y-3" aria-label={`Importer une liste pour ${canal.nom}`} role="region">
      <p className="font-bold text-marine text-[1rem]">Importer une liste : {canal.nom}</p>
      <p className="text-[0.875rem] bg-vide rounded-lg p-2.5 flex gap-2">
        <Icone nom="cadenas" className="w-4 h-4 mt-0.5 text-marine" />
        Les numéros sont envoyés de façon chiffrée au serveur, transformés en empreintes et jamais enregistrés en clair. Ne mettez aucun nom dans le fichier.
      </p>
      {resultat ? (
        <div className="space-y-2" role="status">
          <p className="font-bold text-[0.9375rem]">Liste enregistrée</p>
          <ul className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            {(
              [
                ['Reçus', resultat.recus],
                ['Enregistrés', resultat.enregistres],
                ['Invalides', resultat.invalides],
                ['Doublons dans le fichier', resultat.doublons_dans_le_fichier],
                ['Déjà dans un autre canal', resultat.deja_dans_un_autre_canal]
              ] as const
            ).map(([l, n]) => (
              <li key={l} className="bg-vide rounded-lg p-2">
                <span className="block font-titre text-[1.375rem] text-marine">{n}</span>
                <span className="block text-[0.75rem] text-gris">{l}</span>
              </li>
            ))}
          </ul>
          <button type="button" className={boutonSecondaire} onClick={fermer}>
            Fermer
          </button>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="block">
              <span className="block font-bold text-[0.875rem] mb-1">Source (obligatoire)</span>
              <input className={champ} list="pudi-sources" value={source} onChange={(e) => setSource(e.target.value)} maxLength={80} name="source" />
              <datalist id="pudi-sources">
                {SOURCES.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="block font-bold text-[0.875rem] mb-1">Date de la liste</span>
              <input type="date" className={champ} value={date} onChange={(e) => setDate(e.target.value)} name="date" />
            </label>
          </div>
          <div className="flex gap-2" role="radiogroup" aria-label="Façon d'importer">
            {(['collage', 'fichier'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => {
                  setMode(m);
                  vider();
                }}
                className={`flex-1 min-h-[44px] rounded-xl border font-bold text-[0.875rem] ${mode === m ? 'bg-marine text-white border-marine' : 'bg-white text-marine border-filet'}`}
              >
                {m === 'collage' ? 'Coller une colonne' : 'Fichier CSV'}
              </button>
            ))}
          </div>
          {mode === 'collage' ? (
            <label className="block">
              <span className="block text-[0.8125rem] text-gris mb-1">Un numéro par ligne (une colonne d'Excel peut être copiée puis collée ici).</span>
              <textarea
                rows={6}
                className="w-full rounded-xl border border-filet px-3 py-2 text-[1rem] font-mono"
                value={collage}
                autoComplete="off"
                spellCheck={false}
                onChange={(e) => {
                  setCollage(e.target.value);
                  setNumeros(lireCollage(e.target.value));
                }}
                name="numeros"
              />
            </label>
          ) : (
            <label className="block">
              <span className="block text-[0.8125rem] text-gris mb-1">
                Colonne « numero » (ou la première colonne s'il n'y a pas d'en-tête), séparateur virgule ou point-virgule. Les autres colonnes sont ignorées et ne sont jamais envoyées.
              </span>
              <input ref={entree} type="file" accept=".csv,.txt,text/csv,text/plain" className="block w-full text-[0.875rem]" onChange={(e) => lireFichier(e.target.files?.[0])} />
              {nomFichier && <span className="block text-[0.8125rem] text-gris mt-1">{nomFichier}</span>}
            </label>
          )}
          {numeros.length > 0 && (
            <p className="text-[0.875rem] bg-vide rounded-lg p-2.5" role="status">
              Aperçu : <span className="font-bold">{apercu.total}</span> ligne{apercu.total > 1 ? 's' : ''}, dont{' '}
              <span className="font-bold">{apercu.invalides}</span> invalide{apercu.invalides > 1 ? 's' : ''} (numéro malgache 03x ou international avec +).
            </p>
          )}
          {erreur && (
            <p role="alert" className="text-[0.875rem] font-bold text-[#9C3F21]">
              {erreur}
            </p>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              className={boutonSecondaire}
              onClick={() => {
                vider();
                fermer();
              }}
            >
              Annuler
            </button>
            <button type="button" className={boutonPrincipal} onClick={() => void envoyer()} disabled={cours || !numeros.length}>
              <Icone nom="importer" />
              {cours ? 'Envoi…' : numeros.length ? `Envoyer ${numeros.length} numéro${numeros.length > 1 ? 's' : ''}` : 'Envoyer les numéros'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Canaux() {
  const appel = useAppel(async () => {
    const [canaux, listes, multi] = await Promise.all([lireCanaux(), lireListes(), lireMultiCanaux()]);
    return { canaux, listes, multi };
  });
  const [edition, setEdition] = useState<{ f: Formulaire; nouveau: boolean } | null>(null);
  const [import_, setImport] = useState<string | null>(null);
  const [copie, setCopie] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [demande, setDemande] = useState<DemandeConfirmation | null>(null);
  const [erreurQr, setErreurQr] = useState<string | null>(null);
  const d = appel.donnees;
  const nomCanal = (code: string) => d?.canaux.find((c) => c.code === code)?.nom ?? code;

  const copier = async (c: Canal) => {
    try {
      await navigator.clipboard.writeText(lienCanal(c.code));
      setCopie(c.code);
      window.setTimeout(() => setCopie(null), 2500);
    } catch {
      setCopie(null);
    }
  };

  const telechargerQr = async (c: Canal) => {
    setQr(c.code);
    setErreurQr(null);
    try {
      telechargerFichier(await genererQrPng(c.code, c.nom, c.type), nomFichierQr(c.code), 'image/png');
    } catch {
      setErreurQr(c.code);
    } finally {
      setQr(null);
    }
  };

  return (
    <div>
      <Aide titre="Canaux et listes">
        <p>Un canal = un groupe WhatsApp, une réunion, une affiche… Chaque canal a son lien et son QR code : les votes arrivés par ce lien sont comptés pour le canal.</p>
        <p>« Importer une liste » : les numéros de téléphone des membres d'un groupe, fournis par un partenaire. Ils servent à mesurer la portée des réseaux et à repérer un lien utilisé hors de son groupe.</p>
        <p>« Responsables » : les adresses Gmail des personnes qui tiennent la liste des membres du groupe (menu en haut à droite, « Mon groupe »). Les numéros qu'elles saisissent sont reconnus comme pour une liste importée. Chaque responsable a aussi un numéro WhatsApp (obligatoire) : il n'est montré qu'aux personnes dont le vote a été masqué à cause d'une ligne qu'il a créée ou modifiée, pour réclamer.</p>
        <p>Le code d'un canal ne change plus après sa création (il est dans les liens et les QR codes déjà diffusés). Pour arrêter un canal, décochez « Canal actif ».</p>
      </Aide>
      {appel.erreur && <Erreur texte={appel.erreur} reessayer={() => void appel.recharger()} />}

      <div className="flex flex-wrap gap-2 justify-between mb-3">
        <button type="button" className={boutonPrincipal} onClick={() => setEdition({ f: VIDE, nouveau: true })} disabled={!!edition}>
          <Icone nom="plus" />
          Nouveau canal
        </button>
        <button type="button" className={petitBouton} onClick={() => void appel.recharger()} disabled={appel.charge}>
          <Icone nom="actualiser" className="w-4 h-4" />
          Actualiser
        </button>
      </div>
      {edition?.nouveau && <FormCanal initial={edition.f} nouveau fermer={() => setEdition(null)} enregistre={() => void appel.recharger()} />}

      {appel.charge && !d ? (
        <p className="text-gris py-6 text-center">{fr.app.chargement}</p>
      ) : (
        <ul className="mt-3 grid lg:grid-cols-2 gap-2">
          {(d?.canaux ?? []).map((c) => {
            const t = typeDe(c.type);
            if (edition && !edition.nouveau && edition.f.code === c.code)
              return (
                <li key={c.code} className="lg:col-span-2">
                  <FormCanal initial={edition.f} nouveau={false} fermer={() => setEdition(null)} enregistre={() => void appel.recharger()} />
                </li>
              );
            return (
              <li key={c.code} className={`bg-white border rounded-xl p-3 ${c.actif ? 'border-filet' : 'border-dashed border-gris/40'}`} data-canal={c.code}>
                <div className="flex items-start gap-2">
                  <span className="w-9 h-9 rounded-lg bg-vide text-marine flex items-center justify-center shrink-0" title={t.l}>
                    <Icone nom={t.icone} className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[0.9375rem] leading-snug break-words">{c.nom}</p>
                    <p className="text-[0.8125rem] text-gris">
                      {t.l} · <span className="font-mono">{c.code}</span> · {c.actif ? 'actif' : 'inactif'}
                      {c.responsable ? ` · ${c.responsable}` : ''}
                    </p>
                  </div>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-1 text-center">
                  <div className="bg-vide rounded-lg py-1.5">
                    <dt className="text-[0.75rem] text-gris">Numéros</dt>
                    <dd className="font-bold">{c.nb_numeros}</dd>
                  </div>
                  <div className="bg-vide rounded-lg py-1.5">
                    <dt className="text-[0.75rem] text-gris">Votes</dt>
                    <dd className="font-bold">{c.nb_votes}</dd>
                  </div>
                  <div className="bg-vide rounded-lg py-1.5">
                    <dt className="text-[0.75rem] text-gris">Hors liste</dt>
                    <dd className="font-bold">{c.nb_votes_hors_liste}</dd>
                  </div>
                </dl>
                <p className="mt-2 text-[0.8125rem] break-all font-mono text-texte">{lienCanal(c.code)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" className={petitBouton} onClick={() => void copier(c)} aria-label={`Copier le lien de ${c.nom}`}>
                    <Icone nom="copier" className="w-4 h-4" />
                    {copie === c.code ? 'Copié' : 'Copier'}
                  </button>
                  <a
                    className={petitBouton}
                    href={`https://wa.me/?text=${encodeURIComponent(messageWhatsApp(c))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Partager sur WhatsApp le lien de ${c.nom}`}
                  >
                    <Icone nom="message" className="w-4 h-4" />
                    WhatsApp
                  </a>
                  <button type="button" className={petitBouton} onClick={() => void telechargerQr(c)} disabled={qr === c.code} aria-label={`QR code de ${c.nom}`}>
                    <Icone nom="qr" className="w-4 h-4" />
                    {qr === c.code ? 'QR…' : 'QR code'}
                  </button>
                  <button type="button" className={petitBouton} onClick={() => setImport(import_ === c.code ? null : c.code)} aria-label={`Importer une liste pour ${c.nom}`}>
                    <Icone nom="importer" className="w-4 h-4" />
                    Importer une liste
                  </button>
                  <button
                    type="button"
                    className={petitBouton}
                    onClick={() =>
                      setEdition({
                        f: { code: c.code, nom: c.nom, type: c.type, liste_membres: c.liste_membres, responsable: c.responsable ?? '', remarque: c.remarque ?? '', actif: c.actif },
                        nouveau: false
                      })
                    }
                    aria-label={`Modifier ${c.nom}`}
                  >
                    <Icone nom="crayon" className="w-4 h-4" />
                    Modifier
                  </button>
                </div>
                {erreurQr === c.code && (
                  <p role="alert" className="mt-1 text-[0.875rem] font-bold text-[#9C3F21]">
                    Le QR code n'a pas pu être créé. Réessayez.
                  </p>
                )}
                <Responsables canal={c} demander={setDemande} />
                {import_ === c.code && (
                  <div className="mt-3">
                    <Import canal={c} fermer={() => setImport(null)} termine={() => void appel.recharger()} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Titre2 aide="Chaque import est gardé avec sa source. Supprimer une liste retire ses numéros codés (action inscrite au journal).">Listes importées</Titre2>
      {d && !d.listes.length ? (
        <p className="text-gris text-[0.9375rem]">Aucune liste importée.</p>
      ) : (
        <ul className="space-y-2">
          {(d?.listes ?? []).map((l) => (
            <li key={l.id} className="bg-white border border-filet rounded-xl p-3 flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1 text-[0.875rem]">
                <p className="font-bold break-words">{nomCanal(l.canal_code)}</p>
                <p className="text-gris">
                  Source : {l.source}
                  {l.date_source ? ` · liste du ${l.date_source.split('-').reverse().join('/')}` : ''} · importée le {dateHeureMada(l.importe_at)} ·{' '}
                  <span className="font-bold text-texte">{l.nb_numeros}</span> numéro{l.nb_numeros > 1 ? 's' : ''}
                </p>
              </div>
              <button
                type="button"
                className={petitBouton}
                onClick={() =>
                  setDemande({
                    titre: 'Supprimer cette liste ?',
                    texte: `Les ${l.nb_numeros} numéros codés de la liste « ${l.source} » (${nomCanal(l.canal_code)}) seront retirés. Les votes ne sont pas touchés.`,
                    libelleOk: 'Supprimer la liste',
                    danger: true,
                    action: async () => {
                      await supprimerListe(l.id);
                      await appel.recharger();
                    }
                  })
                }
                aria-label={`Supprimer la liste ${l.source} de ${nomCanal(l.canal_code)}`}
              >
                <Icone nom="poubelle" className="w-4 h-4" />
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}

      <Titre2 aide="Un même numéro peut figurer dans les listes de plusieurs canaux.">Numéros présents dans plusieurs canaux</Titre2>
      {d && (
        <div className="bg-white border border-filet rounded-xl p-3 text-[0.875rem] space-y-2">
          <p>
            <span className="font-bold">{d.multi.numeros_multi_canaux}</span> numéro{d.multi.numeros_multi_canaux > 1 ? 's' : ''} sur{' '}
            <span className="font-bold">{d.multi.numeros_total}</span> figurent dans plusieurs canaux.
          </p>
          {d.multi.combinaisons.length > 0 && (
            <ul className="space-y-1">
              {d.multi.combinaisons.map((k) => (
                <li key={k.canaux.join('+')} className="break-words">
                  {k.canaux.map(nomCanal).join(' + ')} : <span className="font-bold">{k.n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <Dialogue demande={demande} fermer={() => setDemande(null)} />
    </div>
  );
}
