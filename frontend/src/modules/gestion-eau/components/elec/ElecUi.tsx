/**
 * Briques d'interface du domaine Électricité (charte RTB Énergie : `rtb-green`, `rtb-gold`).
 * Ambre, rose et émeraude gardent leur sens (alerte, à relever, fait). Zones tactiles ≥ 44 px.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Eye } from 'lucide-react';
import type { LucideIcon } from '../EauUi';
import { useGestionEau } from '../../context/GestionEauContext';
import { eauIsOnline } from '../../utils/online';
import { refreshElec, listClients, listCompteursElec, getReglages } from '../../services/eauElecService';
import { relevesElecParCompteur } from '../../services/eauElecReleveService';
import { droitsElec, type ElecDroits } from '../../utils/elecReleves';
import type {
  ElecClientLocal,
  ElecCompteurLocal,
  ElecReglagesLocal,
  ElecReleveLocal,
  ElecStatut,
} from '../../types/gestionEau';

export const STATUT_LIBELLE: Record<ElecStatut, string> = {
  actif: 'Actif',
  pause: 'En pause',
  arrete: 'Arrêté',
};

export function StatutPastille({ statut }: { statut: ElecStatut }) {
  const cls =
    statut === 'actif'
      ? 'bg-rtb-green/10 text-rtb-green'
      : statut === 'pause'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-gray-200 text-gray-600';
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {STATUT_LIBELLE[statut]}
    </span>
  );
}

export function Pastille({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'green' | 'neutral' }) {
  const cls =
    tone === 'green'
      ? 'bg-rtb-green/10 text-rtb-green'
      : tone === 'neutral'
      ? 'bg-gray-100 text-gray-600'
      : 'bg-rtb-gold/20 text-rtb-green';
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{children}</span>;
}

export function LectureSeule() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-rtb-gold/10 border border-rtb-gold/40 px-2 py-0.5 text-[11px] font-medium text-rtb-green"
      data-elec-lecture-seule
    >
      <Eye className="w-3 h-3" aria-hidden="true" />
      Lecture seule
    </span>
  );
}

type Variante = 'primaire' | 'secondaire' | 'danger';
export function ElecBouton({
  icon: Icon,
  variante = 'primaire',
  children,
  className = '',
  ...rest
}: { icon?: LucideIcon; variante?: Variante; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const v =
    variante === 'primaire'
      ? 'bg-rtb-green text-white hover:bg-rtb-green/90'
      : variante === 'danger'
      ? 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
      : 'bg-white text-rtb-green border border-rtb-gold/50 hover:bg-rtb-gold/10';
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-rtb-gold ${v} ${className}`}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function ElecVide({ icon: Icon, titre, texte, action }: { icon: LucideIcon; titre: string; texte?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-rtb-gold/50 bg-white px-4 py-8 text-center">
      <span className="inline-flex w-12 h-12 rounded-2xl items-center justify-center bg-rtb-gold/15 text-rtb-green">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </span>
      <p className="mt-3 font-semibold text-rtb-green">{titre}</p>
      {texte && <p className="mt-1 text-sm text-gray-600 max-w-sm mx-auto">{texte}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export const champCls =
  'w-full rounded-lg border-gray-300 focus:border-rtb-green focus:ring-rtb-gold disabled:bg-gray-100 disabled:text-gray-500 min-h-[44px]';

/** Accordéon : ouverture animée (grille 0fr → 1fr), comme le tiroir des compteurs d'eau. */
export function Tiroir({ children }: { children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOuvert(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${ouvert ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}

export interface DonneesElec {
  chargement: boolean;
  clients: ElecClientLocal[];
  compteurs: ElecCompteurLocal[];
  releves: Map<string, ElecReleveLocal[]>;
  reglages: ElecReglagesLocal | null;
  droits: ElecDroits;
  /** Relit Dexie (après une écriture locale). */
  relire: () => Promise<void>;
}

/**
 * Données du domaine : lecture Dexie immédiate (hors ligne), puis, en ligne, envoi de ce
 * qui attend et tirage serveur, puis relecture. Une table refusée par la RLS reste vide.
 */
export function useDonneesElec(): DonneesElec {
  const { roles } = useGestionEau();
  const [chargement, setChargement] = useState(true);
  const [clients, setClients] = useState<ElecClientLocal[]>([]);
  const [compteurs, setCompteurs] = useState<ElecCompteurLocal[]>([]);
  const [releves, setReleves] = useState<Map<string, ElecReleveLocal[]>>(new Map());
  const [reglages, setReglages] = useState<ElecReglagesLocal | null>(null);

  const relire = useCallback(async () => {
    const [cl, co, re, rg] = await Promise.all([
      listClients(),
      listCompteursElec(),
      relevesElecParCompteur(),
      getReglages(),
    ]);
    setClients(cl);
    setCompteurs(co);
    setReleves(re);
    setReglages(rg);
  }, []);

  useEffect(() => {
    let vivant = true;
    (async () => {
      await relire();
      if (vivant) setChargement(false);
      try {
        await refreshElec(eauIsOnline());
      } catch {
        /* best-effort : l'état local reste affiché */
      }
      if (vivant) await relire();
    })();
    return () => {
      vivant = false;
    };
  }, [relire]);

  return { chargement, clients, compteurs, releves, reglages, droits: droitsElec(roles), relire };
}
