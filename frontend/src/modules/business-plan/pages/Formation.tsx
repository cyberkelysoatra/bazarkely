// /plan/p/:id/formation: join the NEC 2026 training with this plan (trainer live tracking, NEC-CC-02).
// Nothing is ever sent without the consent box ticked; "Travailler seul" sends nothing at all.
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usePlan } from '../etat/usePlan';
import { Mise } from '../composants/Mise';
import { ChampTexte } from '../composants/Champs';
import { Carte } from '../composants/Carte';
import { Icone } from '../composants/Icones';
import { codeMemorise, rejoindre, texteRaison, useLien } from '../sync';
import { Introuvable } from './Introuvable';
import { TexteEnvoi } from '../composants/Confidentialite';

export const TEXTE_ACCORD =
  "J'accepte d'envoyer au formateur mon prénom, le nom de mon projet et tout mon plan pendant la formation, pour qu'il m'aide. Mon téléphone et mon e-mail restent sur mon téléphone. Je peux arrêter quand je veux : mon projet est alors effacé du serveur.";

export default function Formation() {
  const { id } = useParams();
  const { etat } = usePlan(id);
  const lien = useLien(id);
  const naviguer = useNavigate();
  const [code, setCode] = useState(codeMemorise);
  const [prenom, setPrenom] = useState<string | null>(null);
  const [accord, setAccord] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState('');
  const [voirDetail, setVoirDetail] = useState(false);

  if (etat.statut === 'absent') return <Introuvable />;
  if (etat.statut === 'chargement' || lien === undefined) return <Mise titre="Rejoindre la formation">{null}</Mise>;
  const plan = etat.plan;
  if (plan.exemple) return <Introuvable />;
  const sommaire = `/p/${plan.id}`;
  const prenomAffiche = prenom ?? plan.identite.nomPrenom.trim().split(/\s+/).slice(-1)[0] ?? '';

  if (lien) {
    return (
      <Mise titre="Formation NEC 2026" sousTitre={plan.identite.nomProjet.trim() || 'Projet sans nom'} retour={{ vers: sommaire, texte: 'Sommaire' }}>
        <p className="text-[16px] text-encre">Ce projet suit déjà la formation (code {lien.code}).</p>
        <Link to={sommaire} className="mt-4 min-h-[52px] rounded-xl bg-violet text-white text-[17px] font-bold flex items-center justify-center">
          Aller au sommaire
        </Link>
      </Mise>
    );
  }

  const valider = async () => {
    setErreur('');
    if (!code.trim()) return setErreur('Écrivez le code donné par le formateur.');
    if (!prenomAffiche.trim()) return setErreur('Écrivez votre prénom.');
    if (!accord) return setErreur("Cochez la case d'accord pour rejoindre la formation.");
    setEnCours(true);
    try {
      const r = await rejoindre(plan.id, code, prenomAffiche);
      if (r.statut === 'refus') setErreur(`Impossible de rejoindre : ${texteRaison(r.raison)}.`);
      else naviguer(sommaire, { replace: true });
    } catch {
      setErreur("Enregistrement impossible sur ce téléphone. Réessayez.");
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Mise titre="Rejoindre la formation" sousTitre={plan.identite.nomProjet.trim() || 'Projet sans nom'} retour={{ vers: sommaire, texte: 'Sommaire' }}>
      <p className="text-[16px] text-encre leading-relaxed mb-4">
        Pendant la formation, le formateur peut suivre votre travail en direct pour vous aider. C'est vous qui décidez.
      </p>
      <Carte>
        <ChampTexte label="Code de la formation" ligne autoComplete="off" valeur={code} onChange={(v) => setCode(v.toUpperCase())} placeholder="Exemple : NEC2026" />
        <ChampTexte label="Votre prénom" ligne autoComplete="given-name" valeur={prenomAffiche} onChange={setPrenom} />
        <label className="bp-accord flex items-start gap-3 rounded-xl bg-violetClair p-3.5 cursor-pointer">
          <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} className="mt-0.5 w-6 h-6 shrink-0 accent-violet" />
          <span className="text-[15px] text-encre leading-snug">{TEXTE_ACCORD}</span>
        </label>
        {/* In-page explanation: a link to /a-propos would lose the code and first name typed here. */}
        <button
          type="button"
          onClick={() => setVoirDetail((v) => !v)}
          aria-expanded={voirDetail}
          aria-controls="bp-detail-envoi"
          className="bp-voir-envoi mt-1 min-h-[44px] w-full flex items-center gap-1.5 text-left text-[15px] font-bold text-violet underline"
        >
          <Icone nom="info" className="w-5 h-5 shrink-0" /> Ce qui est envoyé, et comment l'arrêter
        </button>
        {voirDetail ? (
          <div id="bp-detail-envoi" className="mt-1 rounded-xl border border-filet p-3.5 text-encre">
            <TexteEnvoi />
          </div>
        ) : null}
      </Carte>
      {erreur ? (
        <p role="alert" className="text-[15px] font-bold text-alerte mb-3 flex items-start gap-2">
          <Icone nom="alerte" className="w-5 h-5 shrink-0 mt-0.5" /> {erreur}
        </p>
      ) : null}
      <div className="grid gap-2.5">
        <button
          type="button"
          onClick={valider}
          disabled={enCours}
          className="min-h-[52px] rounded-xl bg-violet text-white text-[17px] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Icone nom="coche" /> Rejoindre
        </button>
        <Link to={sommaire} replace className="min-h-[52px] rounded-xl border-2 border-violet text-violet text-[17px] font-bold flex items-center justify-center">
          Travailler seul
        </Link>
      </div>
      <p className="text-[14px] text-doux mt-4 leading-snug">Sans réseau, votre demande est gardée et faite dès que le téléphone se connecte.</p>
    </Mise>
  );
}
