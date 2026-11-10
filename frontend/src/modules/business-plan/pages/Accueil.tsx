// Home /plan/: my projects on this phone, new project, the JUS'NOSY example, airplane-mode status.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Plan } from '../types';
import { creerPlan, listerPlans, supprimerPlan } from '../db/plans';
import { progressionGlobale } from '../rubriques/registre';
import { ID_EXEMPLE } from '../data/exemple';
import { dateFr } from '../utils/format';
import { Mise } from '../composants/Mise';
import { Carte } from '../composants/Carte';
import { Progression } from '../composants/Progression';
import { Icone } from '../composants/Icones';
import { lancerInstallation, useInstallationDisponible, usePretModeAvion } from '../etat/pwa';

export default function Accueil() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  const naviguer = useNavigate();
  const pret = usePretModeAvion();
  const installable = useInstallationDisponible();

  const charger = () => {
    listerPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  };
  useEffect(charger, []);

  const nouveau = async () => {
    const plan = await creerPlan();
    naviguer(`/p/${plan.id}`);
  };

  const supprimer = async (id: string) => {
    await supprimerPlan(id);
    setASupprimer(null);
    charger();
  };

  return (
    <Mise titre="Mon business plan" sousTitre="NEC 2026, Nosy Be" surTitre={null}>
      <p className={`bp-avion flex items-center gap-2 text-[15px] font-bold mb-4 ${pret ? 'text-turquoiseTexte' : 'text-doux'}`} role="status">
        <Icone nom="avion" />
        {pret ? 'Prêt pour le mode avion ✓' : 'Préparation du mode avion : restez connecté une minute'}
      </p>

      <h2 className="text-[19px] font-bold text-violet mb-2.5">Mes projets</h2>
      {plans === null ? (
        <p className="text-doux mb-4">Chargement...</p>
      ) : plans.length === 0 ? (
        <p className="text-doux mb-4">Aucun projet sur ce téléphone pour le moment.</p>
      ) : (
        <ul className="space-y-3 mb-4">
          {plans.map((p) => (
            <li key={p.id} className="bp-projet rounded-2xl border border-filet bg-white">
              {aSupprimer === p.id ? (
                <div className="p-4">
                  <p className="text-[16px] text-encre font-bold leading-snug">Supprimer ce projet de ce téléphone ? Cette action est définitive.</p>
                  <div className="mt-3 flex gap-2.5">
                    <button type="button" onClick={() => supprimer(p.id)} className="flex-1 min-h-[44px] rounded-xl bg-alerte text-white font-bold">
                      Supprimer
                    </button>
                    <button type="button" onClick={() => setASupprimer(null)} className="flex-1 min-h-[44px] rounded-xl border-2 border-filet text-encre font-bold">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-stretch">
                  <Link to={`/p/${p.id}`} className="flex-1 min-w-0 p-4 block">
                    <p className="text-[17px] font-bold text-encre break-words">{p.identite.nomProjet.trim() || 'Projet sans nom'}</p>
                    {p.identite.nomPrenom.trim() ? <p className="text-[14px] text-doux break-words">{p.identite.nomPrenom}</p> : null}
                    <div className="mt-2">
                      <Progression pct={progressionGlobale(p)} compact label="Rempli" />
                    </div>
                    <p className="text-[13px] text-doux mt-1.5">Modifié le {dateFr(p.modifieLe)}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setASupprimer(p.id)}
                    className="shrink-0 w-12 flex items-center justify-center text-doux border-l border-filet active:bg-violetClair rounded-r-2xl"
                    aria-label={`Supprimer ${p.identite.nomProjet.trim() || 'Projet sans nom'}`}
                  >
                    <Icone nom="poubelle" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={nouveau} className="w-full min-h-[52px] rounded-xl bg-violet text-white text-[17px] font-bold flex items-center justify-center gap-2 active:opacity-90">
        <Icone nom="plus" /> Nouveau projet
      </button>

      <Carte ton="violet" className="mt-4">
        <p className="text-[16px] font-bold text-violet">Voir l'exemple JUS'NOSY</p>
        <p className="text-[15px] text-encre mt-1">Le projet fictif du cahier, avec tous ses chiffres.</p>
        <Link to={`/p/${ID_EXEMPLE}`} className="mt-3 min-h-[44px] rounded-xl border-2 border-violet text-violet font-bold flex items-center justify-center gap-2">
          <Icone nom="livre" /> Voir l'exemple JUS'NOSY
        </Link>
      </Carte>

      <div className="grid gap-2.5">
        {installable ? (
          <button type="button" onClick={() => void lancerInstallation()} className="min-h-[48px] rounded-xl border-2 border-turquoise text-turquoiseTexte font-bold flex items-center justify-center gap-2">
            <Icone nom="installer" /> Installer sur mon téléphone
          </button>
        ) : null}
        <Link to="/inviter" className="min-h-[48px] rounded-xl border-2 border-turquoise text-turquoiseTexte font-bold flex items-center justify-center gap-2">
          <Icone nom="qr" /> Inviter un participant
        </Link>
        <Link to="/a-propos" className="min-h-[44px] flex items-center justify-center text-[15px] text-doux underline">
          À propos et confidentialité
        </Link>
      </div>
    </Mise>
  );
}
