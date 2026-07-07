/**
 * HeaderEauActions — menu en haut à droite du module Gestion Eau (AHUVI).
 *
 * Porte les écrans SECONDAIRES / transversaux (filtrés par rôle), comme le
 * UserMenuDropdown de BazarKELY : Configuration, Utilisateurs & rôles, Demandes
 * d'accès (admin) ; Alertes / Annonces / Audit = Phase 3-4 (affichés « bientôt »).
 * Le client n'y voit que sa fiche/QR. Déconnexion + version pour tous.
 *
 * La navigation PRINCIPALE (thèmes) vit dans BottomNav (mobile) + nav desktop du
 * header ; ce menu ne duplique donc aucun bouton-thème.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Settings,
  Users,
  Inbox,
  Bell,
  Megaphone,
  ClipboardList,
  TrendingUp,
  FileText,
  Zap,
  IdCard,
  LogOut,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Drama,
  ShieldCheck,
  Check,
  Search,
  Home,
} from 'lucide-react';
import { useAppStore } from '../../../stores/appStore';
import { useGestionEau } from '../../../modules/gestion-eau/context';
import { countUnread } from '../../../modules/gestion-eau/services/eauAlerteService';
import { countDirty } from '../../../modules/gestion-eau/services/eauSync';
import { listComptesClient } from '../../../modules/gestion-eau/services/eauCompteClientService';
import { listCompteurs } from '../../../modules/gestion-eau/services/eauCompteurService';
import { EauEmptyState } from '../../../modules/gestion-eau/components/EauUi';
import { SIMULATION_ROLE_OPTIONS } from '../../../modules/gestion-eau/constants/simulationRoles';
import type {
  CompteClientLocal,
  CompteurLocal,
  EauSimulatedClient,
} from '../../../modules/gestion-eau/types/gestionEau';
import {
  useAideState,
  AideToggleButton,
  AidePanel,
} from '../../../modules/gestion-eau/components/EauAide';
import { APP_VERSION } from '../../../constants/appVersion';

interface MenuLink {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<'admin' | 'releveur' | 'client' | 'promoteur'>;
  /** Clé de badge dynamique (ex. alertes non lues). */
  badge?: 'alertes';
}

// Écrans secondaires fonctionnels, filtrés par rôle (cumulable).
// Le promoteur (Phase 2) voit toutes les entrées admin EN LECTURE SEULE (la garde
// d'écran masque ensuite les contrôles d'écriture) → on l'ajoute aux mêmes entrées.
const SECONDARY_LINKS: MenuLink[] = [
  // Pilotage (Phase 4)
  { label: 'Tendances', path: '/gestion-eau/tendances', icon: TrendingUp, roles: ['admin', 'releveur', 'promoteur'] },
  { label: 'Alertes', path: '/gestion-eau/alertes', icon: Bell, roles: ['admin', 'promoteur'], badge: 'alertes' },
  { label: 'Rapports', path: '/gestion-eau/rapports', icon: FileText, roles: ['admin', 'promoteur'] },
  { label: 'Annonces', path: '/gestion-eau/annonces', icon: Megaphone, roles: ['admin', 'promoteur'] },
  { label: 'Audit / Journaux', path: '/gestion-eau/audit', icon: ClipboardList, roles: ['admin', 'promoteur'] },
  // Paramétrage
  { label: 'Coûts électricité', path: '/gestion-eau/elec-couts', icon: Zap, roles: ['admin', 'releveur', 'promoteur'] },
  { label: 'Configuration', path: '/gestion-eau/config', icon: Settings, roles: ['admin', 'promoteur'] },
  { label: 'Utilisateurs & rôles', path: '/gestion-eau/utilisateurs', icon: Users, roles: ['admin', 'promoteur'] },
  { label: "Demandes d'accès", path: '/gestion-eau/demandes', icon: Inbox, roles: ['admin', 'promoteur'] },
  // Client : sa fiche / son QR (rattaché à l'espace client).
  { label: 'Ma fiche / Mon QR', path: '/gestion-eau/client', icon: IdCard, roles: ['client'] },
];

export default function HeaderEauActions() {
  const navigate = useNavigate();
  const { logout, user } = useAppStore();
  const {
    roles,
    realRoles,
    simulatedRole,
    simulatedClient,
    isSimulating,
    setSimulation,
    clearSimulation,
  } = useGestionEau();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [dirty, setDirty] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  // Aide dépliable de la section « Simulation de rôle » (mémorisée par écran).
  const simAide = useAideState('sim-role');

  // ── Sélecteur de villa (simulation « Propriétaire ») ──
  // Sous-liste des comptes client ACTIFS, dépliée sous l'option Propriétaire, avec
  // recherche. Chargée en mémoire (Dexie) à la première ouverture — aucune requête réseau.
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [comptes, setComptes] = useState<CompteClientLocal[]>([]);
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [comptesLoaded, setComptesLoaded] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    if (!clientPickerOpen || comptesLoaded) return;
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
  }, [clientPickerOpen, comptesLoaded]);

  // Nom lisible d'un compteur (pour l'affichage du nombre + la recherche par compteur).
  const compteurNom = (id: string) => compteurs.find((c) => c.id === id)?.nom ?? '';

  // Filtrage recherche : nom de la villa, contact, ou nom d'un de ses compteurs.
  const q = clientSearch.trim().toLowerCase();
  const comptesFiltres = q
    ? comptes.filter((c) => {
        const hay = [
          c.nom,
          c.contact ?? '',
          ...(c.compteur_ids ?? []).map(compteurNom),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
    : comptes;

  const selectVilla = (c: CompteClientLocal) => {
    const client: EauSimulatedClient = {
      id: c.id,
      userId: c.user_id ?? null,
      label: c.nom || 'Villa sans nom',
      compteurIds: c.compteur_ids ?? [],
    };
    setSimulation('client', client);
    setClientPickerOpen(false);
    setClientSearch('');
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Compteurs (alertes non lues + file en attente de sync) — rafraîchis à l'ouverture du menu.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [u, d] = await Promise.all([
          roles?.admin || roles?.promoteur ? countUnread() : Promise.resolve(0),
          countDirty(),
        ]);
        if (alive) {
          setUnread(u);
          setDirty(d);
        }
      } catch {
        /* best-effort */
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, roles?.admin, roles?.promoteur]);

  const has = (r: Array<'admin' | 'releveur' | 'client' | 'promoteur'>) => r.some((x) => roles?.[x]);
  const links = SECONDARY_LINKS.filter((l) => has(l.roles));

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const badgeCount = unread + dirty;

  return (
    <div className="relative ml-auto" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/25 shadow-lg hover:bg-white/25 transition-all duration-200"
        aria-label="Menu Gestion Eau"
      >
        <span className="relative w-9 h-9 bg-white/30 rounded-full flex items-center justify-center border border-white/40">
          <User className="w-5 h-5 text-white" />
          {badgeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-ahuvi-gold text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white/60">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </span>
        <span className="hidden sm:block text-white font-medium text-sm font-ahuvi-body max-w-28 truncate">
          {user?.username || user?.email || 'Compte'}
        </span>
        <span className="text-white/70 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl border border-ahuvi-100 shadow-2xl z-50 min-w-[240px] overflow-hidden">
          {/* Badge file d'attente de synchronisation (terrain à réseau instable). */}
          {dirty > 0 && (
            <div className="px-4 py-2 bg-ahuvi-50 border-b border-ahuvi-100 flex items-center gap-2 text-xs text-ahuvi-800">
              <RefreshCw className="w-3.5 h-3.5 text-ahuvi-olive" />
              {dirty} en attente de synchronisation
            </div>
          )}
          {/* 🎭 Simulation de rôle — ADMIN RÉEL uniquement. Reste TOUJOURS visible
              (gate sur realRoles.admin, pas sur les rôles effectifs) pour que l'admin
              puisse sortir de la simulation quel que soit le rôle incarné. */}
          {realRoles?.admin && (
            <div className="border-b border-ahuvi-100 bg-ahuvi-gold/5">
              <div className="flex items-center gap-2 px-4 pt-2.5 pb-1">
                <Drama className="w-4 h-4 text-ahuvi-gold-700" />
                <span className="text-xs font-bold uppercase tracking-wide text-ahuvi-forest font-ahuvi-body">
                  Simulation de rôle
                </span>
                <span className="ml-auto">
                  <AideToggleButton
                    open={simAide.open}
                    onClick={simAide.toggle}
                    controls="eau-aide-panel-sim-role"
                  />
                </span>
              </div>
              <div className="px-3">
                <AidePanel
                  id="sim-role"
                  open={simAide.open}
                  quoi={
                    <>
                      Tu regardes l’app comme si tu étais ce rôle, avec exactement le même
                      affichage que lui. Les chiffres restent les tiens (admin) tant que la
                      Phase 2 n’est pas là.
                    </>
                  }
                  comment={
                    <>
                      Choisis un rôle pour voir ses écrans et son menu. Les enregistrements
                      s’appliquent pour de vrai. Clique « Revenir à Admin » pour sortir.
                    </>
                  }
                />
              </div>
              <div className="py-1">
                {/* Revenir à Admin (réel) — actif quand aucune simulation. */}
                <button
                  onClick={() => {
                    clearSimulation();
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors font-ahuvi-body ${
                    !isSimulating
                      ? 'bg-ahuvi-forest/10 text-ahuvi-forest font-semibold'
                      : 'text-ahuvi-800 hover:bg-ahuvi-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-ahuvi-forest" />
                  <span className="flex-1 text-left">Revenir à Admin (réel)</span>
                  {!isSimulating && <Check className="w-4 h-4 text-ahuvi-forest" />}
                </button>

                {SIMULATION_ROLE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = isSimulating && simulatedRole === opt.role;
                  if (!opt.available) {
                    // Réservé à une phase ultérieure : visible mais inactif.
                    return (
                      <div
                        key={opt.role}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ahuvi-300 cursor-not-allowed font-ahuvi-body"
                        aria-disabled="true"
                        title="Bientôt disponible"
                      >
                        <Icon className="w-4 h-4 text-ahuvi-200" />
                        <span className="flex-1 text-left">{opt.label}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-ahuvi-100 text-ahuvi-olive">
                          {opt.soon ?? 'Bientôt'}
                        </span>
                      </div>
                    );
                  }

                  // Propriétaire : le choix exige une VILLA → sous-liste dépliable (recherche).
                  if (opt.role === 'client') {
                    return (
                      <div key={opt.role}>
                        <button
                          onClick={() => setClientPickerOpen((v) => !v)}
                          aria-expanded={clientPickerOpen}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors font-ahuvi-body ${
                            active
                              ? 'bg-ahuvi-gold/15 text-ahuvi-gold-700 font-semibold'
                              : 'text-ahuvi-800 hover:bg-ahuvi-50'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${active ? 'text-ahuvi-gold-700' : 'text-ahuvi-olive'}`} />
                          <span className="flex-1 text-left">
                            {opt.label}
                            {active && simulatedClient && (
                              <span className="block text-[11px] font-normal text-ahuvi-gold-700/80 truncate max-w-[150px]">
                                {simulatedClient.label}
                              </span>
                            )}
                          </span>
                          {active && <Check className="w-4 h-4 text-ahuvi-gold-700 flex-shrink-0" />}
                          <ChevronDown
                            className={`w-4 h-4 text-ahuvi-300 flex-shrink-0 transition-transform ${
                              clientPickerOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {clientPickerOpen && (
                          <div className="px-3 pb-2 bg-ahuvi-gold/5">
                            <p className="text-[11px] text-ahuvi-olive italic px-1 pb-1.5 leading-snug">
                              Tu vois l’application exactement comme ce propriétaire : seulement
                              les compteurs de sa villa.
                            </p>
                            {/* Recherche (nom de villa / contact / compteur). */}
                            <div className="relative mb-1.5">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ahuvi-300" />
                              <input
                                type="text"
                                value={clientSearch}
                                onChange={(e) => setClientSearch(e.target.value)}
                                placeholder="Rechercher une villa…"
                                className="w-full pl-8 pr-2 py-1.5 text-sm rounded-lg border border-ahuvi-200 bg-white text-ahuvi-800 placeholder-ahuvi-300 focus:outline-none focus:ring-2 focus:ring-ahuvi-gold/40 font-ahuvi-body"
                              />
                            </div>

                            {!comptesLoaded ? (
                              <div className="py-4 text-center text-xs text-ahuvi-300">Chargement…</div>
                            ) : comptes.length === 0 ? (
                              <EauEmptyState
                                icon={Home}
                                title="Aucun compte propriétaire actif"
                                hint="Crée et active un compte client pour l’incarner."
                                className="py-6"
                              />
                            ) : comptesFiltres.length === 0 ? (
                              <div className="py-4 text-center text-xs text-ahuvi-300">
                                Aucune villa ne correspond.
                              </div>
                            ) : (
                              <div className="max-h-56 overflow-y-auto space-y-0.5">
                                {comptesFiltres.map((c) => {
                                  const villaActive = active && simulatedClient?.id === c.id;
                                  const nbCompteurs = c.compteur_ids?.length ?? 0;
                                  return (
                                    <button
                                      key={c.id}
                                      onClick={() => selectVilla(c)}
                                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors font-ahuvi-body ${
                                        villaActive
                                          ? 'bg-ahuvi-gold/15 text-ahuvi-gold-700 font-semibold'
                                          : 'text-ahuvi-800 hover:bg-white'
                                      }`}
                                    >
                                      <Home
                                        className={`w-4 h-4 flex-shrink-0 ${
                                          villaActive ? 'text-ahuvi-gold-700' : 'text-ahuvi-olive'
                                        }`}
                                      />
                                      <span className="flex-1 text-left min-w-0">
                                        <span className="block truncate">{c.nom || 'Villa sans nom'}</span>
                                        <span className="block text-[11px] font-normal text-ahuvi-400">
                                          {nbCompteurs} compteur{nbCompteurs > 1 ? 's' : ''}
                                          {c.contact ? ` · ${c.contact}` : ''}
                                        </span>
                                      </span>
                                      {villaActive && (
                                        <Check className="w-4 h-4 text-ahuvi-gold-700 flex-shrink-0" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={opt.role}
                      onClick={() => {
                        setSimulation(opt.role);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors font-ahuvi-body ${
                        active
                          ? 'bg-ahuvi-gold/15 text-ahuvi-gold-700 font-semibold'
                          : 'text-ahuvi-800 hover:bg-ahuvi-50'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-ahuvi-gold-700' : 'text-ahuvi-olive'}`} />
                      <span className="flex-1 text-left">{opt.label}</span>
                      {active && <Check className="w-4 h-4 text-ahuvi-gold-700" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {links.length > 0 && (
            <div className="py-1">
              {links.map((l) => {
                const Icon = l.icon;
                const showBadge = l.badge === 'alertes' && unread > 0;
                return (
                  <button
                    key={l.path}
                    onClick={() => go(l.path)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ahuvi-800 hover:bg-ahuvi-50 transition-colors font-ahuvi-body"
                  >
                    <Icon className="w-4 h-4 text-ahuvi-olive" />
                    <span className="flex-1 text-left">{l.label}</span>
                    {showBadge && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-ahuvi-300" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="py-1 border-t border-ahuvi-100">
            <button
              onClick={() => go('/gestion-eau/version')}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-ahuvi-800 hover:bg-ahuvi-50 transition-colors font-ahuvi-body"
            >
              <span className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-ahuvi-olive" />
                Mise à jour
              </span>
              <span className="text-xs text-gray-400">v{APP_VERSION}</span>
            </button>
            <button
              onClick={async () => {
                setOpen(false);
                await logout();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-ahuvi-body"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
