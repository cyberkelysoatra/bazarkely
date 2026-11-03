// Screen 3 bis « Mon équipe » (/equipe, VC-18, RM12), validant only: the people of the project
// (vc_equipe) and the form that invites a colleague (vc_equipe_inviter), then WhatsApp opens on the
// validant's own phone with the prefilled message. One gesture = one invitation (button disabled
// while the call runs); a network failure keeps the form filled with « Réessayer ». Without network:
// the last list kept on the device, form disabled.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { inviterEquipe, lireEquipe } from '../appels/api';
import { ecrireLocal, lireLocal } from '../appels/local';
import { usePresence } from '../appels/presence';
import { useEspace } from '../EspaceContexte';
import { BarreRetour, CARTE, Corps, PRIMAIRE, SECONDAIRE, useCouleurTheme } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import { useFile } from '../appels/file';
import { adresseWhatsApp } from '../pilotage/regles';
import { MESSAGES_CHAMP, TEXTES_EQUIPE, lienEquipe, messageEquipe, normaliserNumero } from '../utils/regles';
import type { Espace, MembreEquipe } from '../utils/types';
import { Attente, BandeauReseau, EnTeteClient, useProjet } from './Cadre';

const PASTILLE = 'inline-flex items-center text-[13px] font-semibold px-2.5 py-1 rounded-full flex-none';

export default function Equipe() {
  useCouleurTheme('#0369a1');
  const { statut, p, email, lent } = useProjet();
  usePresence(p?.client_id, p ? { type: 'equipe' } : null);
  if (statut === 'sortie') return <Navigate to="/" replace />;
  if (statut === 'attente' || !p) {
    return (
      <>
        <EnTeteClient p={p} email={email} />
        <Attente lent={lent} />
      </>
    );
  }
  if (p.role !== 'validant') return <Navigate to="/" replace />;
  return <PageEquipe p={p} email={email} />;
}

type Champ = 'nom' | 'whatsapp';

interface Invitation {
  pour: string;
  numero: string;
  jeton: string;
  message: string;
}

function PageEquipe({ p, email }: { p: Espace; email: string }) {
  const { recharger } = useEspace();
  const { enLigne } = useFile();
  const cle = `equipe:${p.client_id}`;
  const [liste, setListe] = useState<MembreEquipe[] | null>(null);
  const [lecture, setLecture] = useState<'chargement' | 'pret' | 'erreur'>('chargement');
  const [civilite, setCivilite] = useState<string | null>(null);
  const [nom, setNom] = useState('');
  const [fonction, setFonction] = useState('');
  const [whatsapp, setWhatsapp] = useState('+261');
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({});
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);
  const [reseau, setReseau] = useState(false);
  const [faite, setFaite] = useState<Invitation | null>(null);
  const [copie, setCopie] = useState<string | null>(null);
  const refs = useRef<Partial<Record<Champ, HTMLInputElement | null>>>({});

  async function charger() {
    const garde = await lireLocal<MembreEquipe[]>(cle);
    if (Array.isArray(garde)) {
      setListe((l) => l ?? garde);
      setLecture('pret');
    }
    if (!navigator.onLine) {
      if (!Array.isArray(garde)) setLecture('erreur');
      return;
    }
    try {
      const l = await lireEquipe(p.client_id);
      const propre = Array.isArray(l) ? l : [];
      setListe(propre);
      setLecture('pret');
      void ecrireLocal(cle, propre);
    } catch {
      if (!Array.isArray(garde)) setLecture('erreur');
    }
  }

  useEffect(() => {
    void charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.client_id]);

  async function inviter(ev: FormEvent | null, ouvrir: boolean) {
    ev?.preventDefault();
    if (envoi || !enLigne) return;
    setEchec(null);
    setReseau(false);
    setCopie(null);
    const numero = normaliserNumero(whatsapp);
    const e: Partial<Record<Champ, string>> = {};
    if (!nom.trim()) e.nom = MESSAGES_CHAMP.obligatoire;
    if (!numero || numero === '+261') e.whatsapp = MESSAGES_CHAMP.obligatoire;
    else if (!/^\+[0-9]{8,15}$/.test(numero)) e.whatsapp = MESSAGES_CHAMP.numero;
    setErreurs(e);
    const premier = (['nom', 'whatsapp'] as Champ[]).find((c) => e[c]);
    if (premier) {
      refs.current[premier]?.focus();
      return;
    }
    // Window opened during the gesture (popup blockers), filled once the token is known.
    const fenetre = ouvrir ? window.open('', '_blank') : null;
    setEnvoi(true);
    try {
      const r = await inviterEquipe({ client: p.client_id, civilite, nom: nom.trim(), fonction: fonction.trim(), whatsapp: numero });
      if (!r?.ok || !r.jeton) {
        fenetre?.close();
        if (r?.code === 'NUMERO_INVALIDE') {
          setErreurs({ whatsapp: TEXTES_EQUIPE.NUMERO_INVALIDE });
          refs.current.whatsapp?.focus();
        } else if (r?.code === 'CHAMP_OBLIGATOIRE') {
          setErreurs({ nom: TEXTES_EQUIPE.CHAMP_OBLIGATOIRE });
          refs.current.nom?.focus();
        } else setEchec(TEXTES_EQUIPE[r?.code ?? ''] ?? 'L’invitation n’est pas partie. Réessayez ou écrivez à Joël.');
        return;
      }
      const pour = [civilite, nom.trim()].filter(Boolean).join(' ');
      const message = messageEquipe({
        nomCourt: p.nom_court ?? '',
        entreprise: p.entreprise ?? '',
        civilite,
        nom: nom.trim(),
        civiliteValidant: p.civilite ?? null,
        nomValidant: p.nom ?? '',
        lien: lienEquipe(r.jeton)
      });
      const inv = { pour, numero, jeton: r.jeton, message };
      setFaite(inv);
      setCivilite(null);
      setNom('');
      setFonction('');
      setWhatsapp('+261');
      if (ouvrir) {
        const adresse = adresseWhatsApp(numero, message);
        if (fenetre) fenetre.location.href = adresse;
        else window.location.href = adresse;
      } else await copier(inv);
      void charger();
      void recharger();
    } catch (err) {
      fenetre?.close();
      const m = err instanceof Error ? err.message : '';
      if (/VC_ACCES_REFUSE/.test(m)) setEchec(TEXTES_EQUIPE.VC_ACCES_REFUSE);
      else setReseau(true);
    } finally {
      setEnvoi(false);
    }
  }

  async function copier(inv: Invitation) {
    const lien = lienEquipe(inv.jeton);
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(`Lien copié : ${lien}`);
    } catch {
      setCopie(`Copiez ce lien : ${lien}`);
    }
  }

  const champ = (c: Champ | 'fonction', libelle: string, valeur: string, changer: (v: string) => void, type = 'text', autre?: object) => {
    const err = c === 'fonction' ? undefined : erreurs[c];
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={`eq-${c}`} className="text-[14px] font-semibold">
          {libelle}
        </label>
        <input
          id={`eq-${c}`}
          ref={(el) => {
            if (c !== 'fonction') refs.current[c] = el;
          }}
          type={type}
          value={valeur}
          disabled={!enLigne}
          onChange={(ev) => {
            changer(ev.target.value);
            if (c !== 'fonction' && erreurs[c]) setErreurs({ ...erreurs, [c]: undefined });
          }}
          aria-invalid={!!err}
          aria-describedby={err ? `eq-${c}-err` : undefined}
          className={`h-[46px] rounded-[10px] px-3 text-[15px] w-full bg-white disabled:bg-[#f1f5f9] ${err ? 'border-2 border-danger' : 'border border-[#94a3b8]'}`}
          data-champ-equipe={c}
          {...autre}
        />
        {err && (
          <p id={`eq-${c}-err`} className="text-[13px] text-danger m-0" data-erreur-equipe={c}>
            {err}
          </p>
        )}
      </div>
    );
  };

  return (
    <>
      <EnTeteClient p={p} email={email} />
      {!enLigne && <BandeauReseau texte="Pas de réseau : voici la dernière liste gardée sur ce téléphone." />}
      <Corps data-equipe-page="">
        <BarreRetour />
        <h2 className="text-[17px] font-bold m-0">Mon équipe</h2>
        {lecture === 'chargement' && !liste ? (
          <div className={`${CARTE} animate-pulse`} data-squelette="">
            <div className="h-5 w-3/4 rounded bg-[#e2ecf3]" />
            <div className="h-5 w-1/2 rounded bg-[#e2ecf3]" />
          </div>
        ) : lecture === 'erreur' && !liste ? (
          <div className={CARTE} data-equipe-erreur="">
            <p className="text-[14px] m-0">La liste de votre équipe n’est pas encore sur ce téléphone.</p>
            {enLigne && (
              <button type="button" className={SECONDAIRE} onClick={() => void charger()}>
                Réessayer
              </button>
            )}
          </div>
        ) : (
          <div className={`${CARTE} !gap-0 !py-1`} data-liste-equipe="">
            {(liste ?? []).map((m, i) => (
              <div key={`${m.nom}-${i}`} className="flex justify-between items-center gap-2.5 py-2.5 border-b border-[#e2e8f0] last:border-b-0" data-membre={m.role} data-invitation={m.invitation}>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <strong className="text-[15px] break-words">{m.nom}</strong>
                  <span className="text-[13px] text-doux break-words">
                    {m.role === 'validant'
                      ? m.fonction ?? ''
                      : [m.fonction, m.invitation === 'acceptee' ? 'invitation acceptée' : 'invitation en attente'].filter(Boolean).join(', ')}
                  </span>
                </div>
                <span className={`${PASTILLE} ${m.role === 'validant' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-clair text-[#075985]'}`}>{m.role === 'validant' ? 'Décide' : 'Donne son avis'}</span>
              </div>
            ))}
          </div>
        )}

        {faite && (
          <div className="flex flex-col gap-2 bg-[#dcfce7] border border-[#86efac] rounded-[10px] px-3 py-2.5" role="status" data-invitation-faite="">
            <p className="text-[14px] font-semibold text-[#166534] m-0">
              Invitation créée pour {faite.pour} : envoyez le message WhatsApp qui s’ouvre.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a className={`${SECONDAIRE} !min-h-11 !text-[14px]`} href={adresseWhatsApp(faite.numero, faite.message)} target="_blank" rel="noopener noreferrer" data-rouvrir-whatsapp="">
                Rouvrir WhatsApp
              </a>
              <button type="button" className={`${SECONDAIRE} !min-h-11 !text-[14px]`} onClick={() => void copier(faite)} data-copier-faite="">
                Copier le lien
              </button>
            </div>
            {copie && (
              <p className="text-[13px] text-[#166534] m-0 break-all" data-copie="">
                {copie}
              </p>
            )}
          </div>
        )}

        <h2 className="text-[17px] font-bold m-0 mt-1">Inviter une personne</h2>
        <p className="text-[13px] text-doux m-0">Elle (ou il) donnera son avis sur chaque question ; la validation reste entre vos mains.</p>
        <form className="flex flex-col gap-2.5" onSubmit={(ev) => void inviter(ev, true)} noValidate data-formulaire-equipe="">
          <fieldset className="flex flex-col gap-1 border-0 p-0 m-0" disabled={!enLigne}>
            <legend className="text-[14px] font-semibold mb-1">Civilité</legend>
            <div className="grid grid-cols-2 gap-2">
              {['Madame', 'Monsieur'].map((c) => (
                <label
                  key={c}
                  className={`flex items-center justify-center gap-3 min-h-11 rounded-xl px-3.5 bg-white text-[15px] cursor-pointer ${civilite === c ? 'border-2 border-ciel bg-fond' : 'border border-[#cbd5e1]'}`}
                >
                  <input type="radio" name="civilite-equipe" value={c} checked={civilite === c} onChange={() => setCivilite(c)} className="sr-only" data-civilite-equipe={c} />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>
          {champ('nom', 'Nom', nom, setNom, 'text', { autoComplete: 'name' })}
          {champ('fonction', 'Fonction', fonction, setFonction, 'text', { autoComplete: 'organization-title' })}
          {champ('whatsapp', 'Numéro WhatsApp', whatsapp, setWhatsapp, 'tel', { autoComplete: 'tel', inputMode: 'tel' })}
          {echec && (
            <p className="text-[14px] font-semibold text-danger m-0" role="alert" data-echec-equipe="">
              {echec}
            </p>
          )}
          {reseau && (
            <div className="flex flex-col gap-2 bg-[#fee2e2] border border-[#fecaca] rounded-[10px] px-3 py-2.5" role="alert" data-reseau-equipe="">
              <p className="text-[14px] font-semibold text-[#991b1b] m-0">Le réseau ne répond pas : l’invitation n’est pas partie. Vos saisies sont gardées.</p>
              <button type="button" className={`${SECONDAIRE} !min-h-11 !text-[15px]`} onClick={() => void inviter(null, true)} disabled={envoi} data-reessayer-equipe="">
                Réessayer
              </button>
            </div>
          )}
          {!enLigne && (
            <p className="text-[13px] text-doux text-center m-0" data-raison-equipe="reseau">
              L'invitation demande du réseau.
            </p>
          )}
          <button type="submit" className={PRIMAIRE} disabled={envoi || !enLigne} data-inviter-whatsapp="">
            <Icone nom="whatsapp" />
            {envoi ? 'Invitation…' : 'Inviter sur WhatsApp'}
          </button>
          <button type="button" className={SECONDAIRE} disabled={envoi || !enLigne} onClick={() => void inviter(null, false)} data-copier-lien="">
            <Icone nom="copier" />
            Copier le lien
          </button>
        </form>
      </Corps>
    </>
  );
}
