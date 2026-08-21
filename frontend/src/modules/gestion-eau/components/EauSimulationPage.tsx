/**
 * EauSimulationPage — page dédiée « Simulation de rôle » (module Gestion Eau, AHUVI).
 *
 * L'admin choisit ICI, au large, le rôle qu'il veut incarner (et, pour le Propriétaire,
 * la villa). Contrairement à l'ancien sélecteur du menu déroulant, les choix ne
 * s'appliquent PLUS au clic immédiat : ils vivent dans un BROUILLON local et ne sont
 * appliqués qu'au clic « ENREGISTRER ». « Annuler »/« Retour » repartent sans rien changer.
 *
 * On ne réimplémente AUCUNE logique de simulation : cette page se contente d'appeler
 * `setSimulation` / `clearSimulation` du contexte (rôles effectifs, scoping propriétaire,
 * marque header, persistance — tout est géré par le contexte, inchangé depuis les Phases 1-2).
 *
 * Garde : la page est réservée à l'ADMIN RÉEL (`realRoles.admin`), PAS aux rôles effectifs —
 * pendant une simulation, `roles.admin` est faux, mais l'admin doit pouvoir revenir ici pour
 * changer/sortir de la simulation. On redirige donc seulement sur un refus CONFIRMÉ.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Search,
  Home,
  Check,
  Save,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useGestionEau } from '../context/GestionEauContext';
import { listComptesClient } from '../services/eauCompteClientService';
import { listCompteurs } from '../services/eauCompteurService';
import { SIMULATION_ROLE_OPTIONS } from '../constants/simulationRoles';
import {
  useAideState,
  AideToggleButton,
  AidePanel,
} from './EauAide';
import { EauCard, EauEmptyState, EauIconButton } from './EauUi';
import type {
  EauRole,
  CompteClientLocal,
  CompteurLocal,
  EauSimulatedClient,
} from '../types/gestionEau';

/** Clé de choix du brouillon : `'admin'` = admin réel (aucune simulation). */
type DraftKey = 'admin' | EauRole;

interface RoleChoice {
  key: DraftKey;
  label: string;
  icon: LucideIcon;
  /** Sous-titre court (français simple) — non technique. */
  hint: string;
}

// Sous-titres courts par rôle (charte AHUVI, français simple). Les libellés/icônes des
// rôles simulables restent la SOURCE UNIQUE (`SIMULATION_ROLE_OPTIONS`).
const ROLE_HINTS: Record<DraftKey, string> = {
  admin: 'Ta vue normale, avec tous tes droits.',
  releveur: 'Comme la personne qui relève les compteurs.',
  promoteur: 'Vue de suivi : lecture seule (seuls les seuils sont modifiables).',
  client: 'Vue d’un propriétaire : uniquement les compteurs de sa villa.',
};

export default function EauSimulationPage() {
  const navigate = useNavigate();
  const {
    realRoles,
    isSimulating,
    simulatedRole,
    simulatedClient,
    setSimulation,
    clearSimulation,
    isLoading,
    rolesConfirmed,
  } = useGestionEau();

  // Aide dépliable (mémorisée par écran, clé propre à cette page).
  const aide = useAideState('sim-role-page');

  // ── Brouillon local (rien appliqué avant « ENREGISTRER ») ──
  // État initial = état de simulation ACTUELLEMENT appliqué (présélection).
  const [draft, setDraft] = useState<DraftKey>(isSimulating && simulatedRole ? simulatedRole : 'admin');
  const [draftClient, setDraftClient] = useState<EauSimulatedClient | null>(
    isSimulating && simulatedRole === 'client' ? simulatedClient : null
  );

  // ── Liste des villas (comptes client actifs) — lecture Dexie, aucun réseau ──
  const [comptes, setComptes] = useState<CompteClientLocal[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [comptesLoaded, setComptesLoaded] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    // Chargée seulement si le rôle Propriétaire est (ou devient) sélectionné.
    if (draft !== 'client' || comptesLoaded) return;
    let alive = true;
    (async () => {
      try {
        const [cptes, cpts] = await Promise.all([listComptesClient(), listCompteurs()]);
        if (!alive) return;
        setComptes(cptes.filter((c) => c.actif));
        setCompteurs(cpts);
        setComptesLoaded(true);
      } catch {
        /* best-effort : lecture Dexie */
      }
    })();
    return () => {
      alive = false;
    };
  }, [draft, comptesLoaded]);

  const compteurNom = (id: string) => compteurs.find((c) => c.id === id)?.nom ?? '';

  // Filtrage recherche : nom de villa / contact / nom d'un de ses compteurs.
  const q = clientSearch.trim().toLowerCase();
  const comptesFiltres = q
    ? comptes.filter((c) => {
        const hay = [c.nom, c.contact ?? '', ...(c.compteur_ids ?? []).map(compteurNom)]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
    : comptes;

  // Choix de rôles = Admin (réel) + rôles simulables (source unique = SIMULATION_ROLE_OPTIONS).
  const roleChoices: RoleChoice[] = useMemo(() => {
    const simulables: RoleChoice[] = SIMULATION_ROLE_OPTIONS.filter((o) => o.available).map((o) => ({
      key: o.role,
      label: o.label,
      icon: o.icon,
      hint: ROLE_HINTS[o.role] ?? '',
    }));
    return [
      { key: 'admin', label: 'Admin (réel)', icon: ShieldCheck, hint: ROLE_HINTS.admin },
      ...simulables,
    ];
  }, []);

  // État de simulation APPLIQUÉ (pour détecter si le brouillon change vraiment quelque chose).
  const appliedKey: DraftKey = isSimulating && simulatedRole ? simulatedRole : 'admin';
  const appliedClientId = isSimulating && simulatedRole === 'client' ? simulatedClient?.id ?? null : null;
  const draftClientId = draft === 'client' ? draftClient?.id ?? null : null;
  const unchanged = draft === appliedKey && draftClientId === appliedClientId;
  // Propriétaire sans villa choisie = brouillon incomplet.
  const incomplete = draft === 'client' && !draftClient;
  const canSave = !unchanged && !incomplete;

  const onSave = () => {
    if (!canSave) return;
    if (draft === 'admin') {
      clearSimulation();
    } else if (draft === 'client') {
      if (!draftClient) return;
      setSimulation('client', draftClient);
    } else {
      setSimulation(draft);
    }
    // Le dashboard : les gardes/rôles effectifs font le reste (ex. Propriétaire → /client).
    navigate('/gestion-eau');
  };

  // ── Garde : ADMIN RÉEL uniquement (pas les rôles effectifs) ──
  // Non résolu (démarrage à froid) → spinner, jamais de rebond. Refus confirmé → /gestion-eau.
  if (isLoading || !rolesConfirmed) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ahuvi-forest"></div>
      </div>
    );
  }
  if (!realRoles.admin) {
    return <Navigate to="/gestion-eau" replace />;
  }

  return (
    <div className="max-w-3xl mx-auto px-3">
      {/* En-tête : Retour (haut gauche) + titre + aide. */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ahuvi-forest hover:text-ahuvi-olive transition-colors font-ahuvi-body focus:outline-none focus-visible:ring-2 focus-visible:ring-ahuvi-300 rounded-lg px-1 py-1 -ml-1"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Retour
        </button>
        <div className="flex items-center gap-2 mt-1">
          <h2 className="text-lg font-semibold text-ahuvi-forest font-ahuvi-body">Simulation de rôle</h2>
          <AideToggleButton open={aide.open} onClick={aide.toggle} controls="eau-aide-panel-sim-role-page" />
        </div>
      </div>
      <AidePanel
        id="sim-role-page"
        open={aide.open}
        quoi={
          <>
            Tu regardes l’application comme si tu étais ce rôle : mêmes écrans, même menu,
            mêmes permissions que lui. Pratique pour vérifier ce que voit un releveur, un
            promoteur ou un propriétaire.
          </>
        }
        comment={
          <>
            Choisis un rôle ci-dessous, puis clique « Enregistrer » pour l’incarner (rien ne
            change tant que tu n’as pas enregistré). Pour un propriétaire, choisis d’abord sa
            villa. Les enregistrements que tu fais dans ce rôle s’appliquent pour de vrai.
            Reviens sur « Admin (réel) » puis « Enregistrer » (ou clique la marque dorée en
            haut) pour sortir de la simulation.
          </>
        }
      />

      {/* Choix du rôle — cartes cliquables aérées. */}
      <div className="space-y-2">
        {roleChoices.map((choice) => {
          const Icon = choice.icon;
          const selected = draft === choice.key;
          return (
            <EauCard
              key={choice.key}
              onClick={() => {
                setDraft(choice.key);
                // Quitter Propriétaire réinitialise la recherche (la villa reste mémorisée).
                if (choice.key !== 'client') setClientSearch('');
              }}
              className={
                selected
                  ? 'border-ahuvi-gold bg-ahuvi-gold/10 ring-2 ring-ahuvi-gold/40'
                  : 'hover:border-ahuvi-300'
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    selected ? 'bg-ahuvi-gold/20 text-ahuvi-gold-700' : 'bg-ahuvi-100 text-ahuvi-olive'
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div
                    className={`font-semibold font-ahuvi-body ${
                      selected ? 'text-ahuvi-gold-700' : 'text-ahuvi-forest'
                    }`}
                  >
                    {choice.label}
                    {/* Rappel de la villa choisie sous « Propriétaire ». */}
                    {choice.key === 'client' && selected && draftClient && (
                      <span className="block text-[12px] font-normal text-ahuvi-gold-700/80 truncate">
                        {draftClient.label}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{choice.hint}</div>
                </div>
                {selected && <Check className="w-5 h-5 text-ahuvi-gold-700 flex-shrink-0" aria-hidden="true" />}
              </div>
            </EauCard>
          );
        })}
      </div>

      {/* Sélecteur de villa — visible seulement quand Propriétaire est choisi. */}
      {draft === 'client' && (
        <div className="mt-3 rounded-xl border border-ahuvi-gold/30 bg-ahuvi-gold/5 p-3">
          <p className="text-sm text-ahuvi-olive mb-2 leading-snug">
            Choisis la villa à incarner. Tu verras l’application exactement comme ce
            propriétaire : uniquement les compteurs de sa villa.
          </p>

          {/* Recherche (nom de villa / contact / compteur). */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ahuvi-300" aria-hidden="true" />
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Rechercher une villa…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-ahuvi-200 bg-white text-ahuvi-800 placeholder-ahuvi-300 focus:outline-none focus:ring-2 focus:ring-ahuvi-gold/40 font-ahuvi-body"
            />
          </div>

          {!comptesLoaded ? (
            <div className="py-6 text-center text-sm text-ahuvi-300">Chargement…</div>
          ) : comptes.length === 0 ? (
            <EauEmptyState
              icon={Home}
              title="Aucun compte propriétaire actif"
              hint="Crée et active un compte client pour l’incarner."
              className="py-8"
            />
          ) : comptesFiltres.length === 0 ? (
            <div className="py-6 text-center text-sm text-ahuvi-300">Aucune villa ne correspond.</div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-1">
              {comptesFiltres.map((c) => {
                const villaActive = draftClient?.id === c.id;
                const nbCompteurs = c.compteur_ids?.length ?? 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() =>
                      setDraftClient({
                        id: c.id,
                        userId: c.user_id ?? null,
                        label: c.nom || 'Villa sans nom',
                        compteurIds: c.compteur_ids ?? [],
                      })
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors font-ahuvi-body border ${
                      villaActive
                        ? 'bg-ahuvi-gold/15 border-ahuvi-gold/40 text-ahuvi-gold-700 font-semibold'
                        : 'bg-white border-ahuvi-100 text-ahuvi-800 hover:bg-ahuvi-50'
                    }`}
                  >
                    <Home
                      className={`w-4 h-4 flex-shrink-0 ${
                        villaActive ? 'text-ahuvi-gold-700' : 'text-ahuvi-olive'
                      }`}
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-left min-w-0">
                      <span className="block truncate">{c.nom || 'Villa sans nom'}</span>
                      <span className="block text-[12px] font-normal text-ahuvi-400">
                        {nbCompteurs} compteur{nbCompteurs > 1 ? 's' : ''}
                        {c.contact ? ` · ${c.contact}` : ''}
                      </span>
                    </span>
                    {villaActive && <Check className="w-4 h-4 text-ahuvi-gold-700 flex-shrink-0" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bas de page : ANNULER (repart sans appliquer) + ENREGISTRER (applique le brouillon). */}
      <div className="mt-5 flex items-center gap-3">
        <EauIconButton
          icon={X}
          variant="secondary"
          onClick={() => navigate(-1)}
          className="flex-1 justify-center"
        >
          Annuler
        </EauIconButton>
        <EauIconButton
          icon={Save}
          variant="primary"
          onClick={onSave}
          disabled={!canSave}
          className="flex-1 justify-center"
        >
          Enregistrer
        </EauIconButton>
      </div>
    </div>
  );
}
