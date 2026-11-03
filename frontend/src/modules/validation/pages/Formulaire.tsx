// Registration (screen 2, VC-16) and « Mes infos » (screen 3 ter): same form, saved by
// vc_mes_infos; errors under the field (red border), focus on the first wrong field.
import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { enregistrerMesInfos } from '../appels/api';
import { useEspace } from '../EspaceContexte';
import { usePresence } from '../appels/presence';
import EnTete from '../composants/EnTete';
import { BarreRetour, CARTE, Corps, PRIMAIRE, Squelette, useCouleurTheme } from '../composants/Mise';
import {
  champDuCode,
  choisirProjet,
  erreursFormulaire,
  initiales,
  lignePour,
  normaliserNumero,
  premierChampFautif,
  type Champ,
  type Formulaire as Valeurs
} from '../utils/regles';
import type { Espace } from '../utils/types';

export default function Formulaire({ mode }: { mode: 'inscription' | 'infos' }) {
  useCouleurTheme('#0369a1');
  const { session, etat, liste, lent } = useEspace();
  if (etat === 'deconnecte') return <Navigate to="/" replace />;
  const choix = etat === 'pret' ? choisirProjet(liste) : null;
  if (choix && choix.type !== 'projet') return <Navigate to="/" replace />;
  if (!choix || choix.type !== 'projet') {
    return (
      <>
        <EnTete variante="neutre" />
        <Corps>
          <Squelette lent={lent} />
        </Corps>
      </>
    );
  }
  const p = choix.espace;
  return <Champs key={p.personne_id} mode={mode} p={p} email={session?.email ?? ''} nomGoogle={session?.nomGoogle ?? ''} google={session?.fournisseur === 'google'} />;
}

const LIBELLES: Record<Champ, string> = {
  entreprise: 'Entreprise',
  fonction: 'Fonction',
  whatsapp: 'Numéro WhatsApp',
  emailPro: 'E-mail professionnel (facultatif)'
};

function Champs({ mode, p, email, nomGoogle, google }: { mode: 'inscription' | 'infos'; p: Espace; email: string; nomGoogle: string; google: boolean }) {
  const navigate = useNavigate();
  const { recharger } = useEspace();
  const [v, setV] = useState<Valeurs>({
    civilite: p.civilite ?? null,
    entreprise: p.entreprise ?? '',
    fonction: p.fonction ?? '',
    whatsapp: p.whatsapp ?? '',
    emailPro: p.email_pro ?? ''
  });
  const [erreurs, setErreurs] = useState<Partial<Record<Champ, string>>>({});
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState(false);
  const refs = useRef<Partial<Record<Champ, HTMLInputElement | null>>>({});
  const nom = nomGoogle || p.nom || '';
  const madame = v.civilite === 'Madame';
  usePresence(p.client_id, { type: mode === 'infos' ? 'infos' : 'inscription' });

  const montrer = (e: Partial<Record<Champ, string>>) => {
    setErreurs(e);
    const c = premierChampFautif(e);
    if (c) refs.current[c]?.focus();
  };

  const soumettre = async (ev: FormEvent) => {
    ev.preventDefault();
    setEchec(false);
    const locales = erreursFormulaire(v);
    if (premierChampFautif(locales)) return montrer(locales);
    setErreurs({});
    setEnvoi(true);
    try {
      const r = await enregistrerMesInfos({
        personne: p.personne_id ?? '',
        civilite: v.civilite,
        entreprise: v.entreprise.trim(),
        fonction: v.fonction.trim(),
        whatsapp: normaliserNumero(v.whatsapp),
        emailPro: v.emailPro.trim()
      });
      if (!r.ok) {
        const e = champDuCode(r.code, v);
        if (premierChampFautif(e)) montrer(e);
        else setEchec(true);
        return;
      }
      await recharger();
      navigate('/', { replace: true });
    } catch {
      setEchec(true);
    } finally {
      setEnvoi(false);
    }
  };

  const champ = (c: Champ, type: string, autoComplete: string) => (
    <div className="flex flex-col gap-1" key={c}>
      <label htmlFor={`vc-${c}`} className="text-[14px] font-semibold">
        {LIBELLES[c]}
      </label>
      <input
        id={`vc-${c}`}
        ref={(el) => {
          refs.current[c] = el;
        }}
        type={type}
        inputMode={c === 'whatsapp' ? 'tel' : undefined}
        autoComplete={autoComplete}
        value={v[c] ?? ''}
        onChange={(e) => {
          setV({ ...v, [c]: e.target.value });
          if (erreurs[c]) setErreurs({ ...erreurs, [c]: undefined });
        }}
        aria-invalid={!!erreurs[c]}
        aria-describedby={erreurs[c] ? `vc-${c}-err` : undefined}
        className={`h-[46px] rounded-[10px] px-3 text-[15px] w-full bg-white border ${erreurs[c] ? 'border-2 border-danger' : 'border-[#94a3b8]'}`}
        data-champ={c}
      />
      {erreurs[c] && (
        <p id={`vc-${c}-err`} className="text-[13px] text-danger m-0" data-erreur={c}>
          {erreurs[c]}
        </p>
      )}
    </div>
  );

  return (
    <>
      <EnTete
        variante="client"
        titre={p.nom_court ?? ''}
        sousTitre={mode === 'inscription' ? (p.entreprise ? `pour ${p.entreprise}` : '') : lignePour(p)}
        nom={p.nom ?? nom}
        email={email}
      />
      <Corps className="gap-2.5">
        {mode === 'infos' && <BarreRetour />}
        <h2 className="text-[17px] font-bold m-0">{mode === 'inscription' ? 'Complétez votre profil' : 'Mes informations'}</h2>
        <div className={`${CARTE} !flex-row items-center gap-3 !p-3`}>
          <div className="w-10 h-10 rounded-full bg-ciel text-white flex items-center justify-center font-bold flex-none">{initiales(nom)}</div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-[15px] font-semibold m-0">{nom}</p>
            <p className="text-[13px] text-doux m-0 break-words">
              {mode === 'inscription'
                ? google
                  ? `${madame ? 'Connectée' : 'Connecté'} avec Google : ${email}`
                  : `Compte 1saKELY : ${email}`
                : `${google ? 'Compte Google' : 'Compte 1saKELY'} : ${email}`}
            </p>
            {mode === 'infos' && <p className="text-[13px] text-doux m-0">{p.role === 'validant' ? "Décide pour l'équipe" : 'Donne son avis'}</p>}
          </div>
        </div>
        <form className="flex flex-col gap-2.5" onSubmit={soumettre} noValidate data-formulaire={mode}>
          <fieldset className="flex flex-col gap-1 border-0 p-0 m-0">
            <legend className="text-[14px] font-semibold mb-1">Civilité</legend>
            <div className="grid grid-cols-2 gap-2.5">
              {['Madame', 'Monsieur'].map((c) => (
                <label
                  key={c}
                  className={`flex items-center gap-3 min-h-[52px] rounded-xl px-3.5 bg-white text-[15px] cursor-pointer ${v.civilite === c ? 'border-2 border-ciel bg-fond' : 'border border-[#cbd5e1]'}`}
                >
                  <input type="radio" name="civilite" value={c} checked={v.civilite === c} onChange={() => setV({ ...v, civilite: c })} className="sr-only" />
                  <span className={`w-5 h-5 rounded-full flex-none ${v.civilite === c ? 'border-[6px] border-ciel' : 'border-2 border-[#64748b]'}`} aria-hidden="true" />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>
          {champ('entreprise', 'text', 'organization')}
          {champ('fonction', 'text', 'organization-title')}
          {champ('whatsapp', 'tel', 'tel')}
          {champ('emailPro', 'email', 'email')}
          {mode === 'inscription' ? (
            <>
              <p className="text-[13px] text-nuit m-0">Vous créez votre compte 1saKELY. Joël voit quand vous êtes en ligne et sur quelle page.</p>
              {p.role === 'validant' && <p className="text-[13px] text-doux m-0">Vous pourrez inviter votre équipe depuis l'accueil.</p>}
            </>
          ) : (
            <p className="text-[13px] text-doux m-0">Vos corrections apparaissent tout de suite dans l'en-tête. Chacune est datée et Joël en est informé.</p>
          )}
          {echec && (
            <p className="text-[14px] text-danger m-0" role="alert">
              Vos informations ne sont pas enregistrées. Vérifiez le réseau, puis réessayez.
            </p>
          )}
          <button type="submit" className={PRIMAIRE} disabled={envoi} data-enregistrer="">
            {mode === 'inscription' ? 'Enregistrer et commencer' : 'Enregistrer'}
          </button>
        </form>
      </Corps>
    </>
  );
}
