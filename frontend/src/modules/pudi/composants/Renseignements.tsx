// PUDI-CC-19: « Modifier mes renseignements » of the summary of « Mon choix », the only place
// where fokontany, profile, phone and residence come back once the vote is saved automatically.
// Prefilled from the server vote; one explicit « Enregistrer ». An empty phone keeps the stored
// one. The votes sent with it are the current draft (the server vote when the draft has 0 vote).
import { useEffect, useState, type FormEvent } from 'react';
import { PROFIL_VALEURS, type PudiDonnees } from '../data';
import { fr } from '../i18n/fr';
import { frPages } from '../i18n/frPages';
import { usePudi } from '../PudiContexte';
import { lireMonVote, soumettreVote, type FormulaireVote, type MonVote } from '../appels/api';
import { noterDetailsAuto } from '../appels/autoEnregistrement';
import { lireBrouillon } from '../appels/brouillon';
import { lireCanal } from '../appels/provenance';
import { messageErreur, type ErreurAffichee } from '../utils/erreurs';
import { normaliserTelephone } from '../utils/regles';
import { boutonPrincipal, boutonSecondaire } from './Mise';
import { Icone } from './Icones';

const champ = 'w-full min-h-[48px] rounded-xl border border-filet bg-white px-3 text-[1rem]';

export function Renseignements({ donnees, fermer }: { donnees: PudiDonnees; fermer: (enregistre: boolean) => void }) {
  const { noterMonVote, rechargerMasquages } = usePudi();
  const [vote, setVote] = useState<MonVote | null>(null);
  const [form, setForm] = useState<FormulaireVote | null>(null);
  const [erreur, setErreur] = useState<ErreurAffichee | null>(null);
  const [envoi, setEnvoi] = useState(false);
  useEffect(() => {
    let actif = true;
    lireMonVote()
      .then((v) => {
        if (!actif || !v) return;
        setVote(v);
        setForm({ fokontany: v.fokontany, fokontanyAutre: v.fokontany_autre ?? '', profil: v.profil, telephone: '', resident: true });
      })
      .catch((e) => actif && setErreur(messageErreur(e)));
    return () => {
      actif = false;
    };
  }, []);

  const enregistrer = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!form || !vote) return;
    let local: ErreurAffichee | null = null;
    if (!form.fokontany || (form.fokontany === 'AUTRE' && !form.fokontanyAutre.trim())) local = messageErreur('PUDI_FOKONTANY');
    else if (!form.profil) local = messageErreur('PUDI_PROFIL');
    else if (form.telephone.trim() && !normaliserTelephone(form.telephone)) local = messageErreur('PUDI_NUMERO_INVALIDE');
    else if (!form.resident) local = messageErreur('PUDI_RESIDENCE');
    setErreur(local);
    if (local) return;
    const b = lireBrouillon();
    const votes = b.priorites.length ? b : { priorites: vote.priorites, manquant: vote.manquant ?? '' };
    setEnvoi(true);
    try {
      const v = await soumettreVote(votes, form, lireCanal());
      noterDetailsAuto(v);
      noterMonVote(v);
      fermer(true);
    } catch (e) {
      const er = messageErreur(e);
      if (er.code === 'VOTE_MASQUE') void rechargerMasquages();
      setErreur(er);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <form onSubmit={enregistrer} noValidate className="bg-white border-2 border-marine rounded-xl p-3 space-y-4" data-renseignements="">
      <h3 className="font-bold text-[1rem] text-marine">{frPages.auto.renseignementsTitre}</h3>
      {!form ? (
        erreur ? (
          <p role="alert" className="text-[0.875rem] font-bold text-[#9C3F21]">{erreur.message}</p>
        ) : (
          <p className="text-gris text-[0.9375rem]">{fr.app.chargement}</p>
        )
      ) : (
        <>
          <div>
            <label htmlFor="pudi-r-fkt" className="block font-bold text-[0.9375rem] mb-1.5">
              {fr.envoi.fokontany}
            </label>
            <select id="pudi-r-fkt" className={champ} value={form.fokontany} onChange={(e) => setForm({ ...form, fokontany: e.target.value })}>
              <option value="">{fr.envoi.fokontanyChoisir}</option>
              {donnees.fokontany.map((f) => (
                <option key={f.n} value={f.ceni ?? 'AUTRE'}>
                  {f.affichage}
                </option>
              ))}
            </select>
            {form.fokontany === 'AUTRE' && (
              <input
                aria-label={fr.envoi.fokontanyAutre}
                placeholder={fr.envoi.fokontanyAutre}
                className={`${champ} mt-2`}
                maxLength={80}
                value={form.fokontanyAutre}
                onChange={(e) => setForm({ ...form, fokontanyAutre: e.target.value })}
              />
            )}
          </div>
          <fieldset>
            <legend className="font-bold text-[0.9375rem] mb-1.5">{fr.envoi.profil}</legend>
            <div className="space-y-1.5">
              {PROFIL_VALEURS.map((p) => (
                <label key={p} className="flex items-center gap-3 min-h-[44px] bg-white border border-filet rounded-xl px-3">
                  <input
                    type="radio"
                    name="pudi-r-profil"
                    value={p}
                    checked={form.profil === p}
                    onChange={() => setForm({ ...form, profil: p })}
                    className="w-5 h-5 accent-[#0B2A8C]"
                  />
                  <span className="text-[1rem]">{fr.envoi.profils[p]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="pudi-r-tel" className="block font-bold text-[0.9375rem] mb-1.5">
              {fr.envoi.telephone}
            </label>
            <input
              id="pudi-r-tel"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className={champ}
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              aria-describedby="pudi-r-tel-aide"
            />
            <p id="pudi-r-tel-aide" className="mt-1 text-[0.8125rem] text-gris">
              {frPages.auto.renseignementsAide}
            </p>
          </div>
          <label className="flex items-center gap-3 min-h-[48px] bg-white border border-filet rounded-xl px-3">
            <input
              type="checkbox"
              checked={form.resident}
              onChange={(e) => setForm({ ...form, resident: e.target.checked })}
              className="w-5 h-5 accent-[#0B2A8C]"
            />
            <span className="text-[1rem]">{fr.envoi.resident}</span>
          </label>
          {erreur && (
            <p role="alert" className="flex gap-1.5 items-start text-[0.875rem] font-bold text-[#9C3F21]">
              <Icone nom="alerte" className="w-4 h-4 mt-0.5" />
              {erreur.message}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <button type="submit" className={`${boutonPrincipal} w-full`} disabled={envoi} data-renseignements-enregistrer="">
              <Icone nom="coche" />
              {envoi ? frPages.auto.enregistrementEnCours : frPages.auto.enregistrer}
            </button>
            <button type="button" className={`${boutonSecondaire} w-full`} onClick={() => fermer(false)}>
              {frPages.auto.annuler}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
