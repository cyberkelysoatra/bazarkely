// Switcher mode of the PUDi bottom bar: the other 1sakely.org modules of the account, opened by
// a full page navigation. Loaded on the first tap on the logo (lazy chunk, with supabase-js).
import { useCallback, useEffect, useRef, useState } from 'react';
import { BarreCommutateur, boutonPrincipal, boutonSecondaire } from './Mise';
import { Icone } from './Icones';
import { fermerCommutateur, oublierCommutateur } from '../appels/commutateur';
import { connexionGoogle, sessionLocale } from '../appels/session';
import { getSupabase, withTimeout } from '../appels/supabaseClient';
import { lireSessionNative } from '../appels/pontNavy';
import { modulesDuCompte, type IdModule, type ModuleHote, type CompteModules } from '../utils/modulesCompte';

type Etat = { t: 'chargement' } | { t: 'deconnecte' } | { t: 'erreur' } | { t: 'pret'; modules: ModuleHote[] };

/** Simple coloured tiles in each module colour (never the host components). */
function Tuile({ id }: { id: IdModule }) {
  const base = 'w-11 h-11 rounded-xl flex items-center justify-center shadow-sm';
  if (id === 'bazarkely') return <span className={`${base} bg-[#7C3AED] text-white font-titre text-[1.25rem]`}>B</span>;
  if (id === 'construction')
    return (
      <span className={`${base} bg-[#C2410C] text-white`}>
        <Icone nom="casque" className="w-6 h-6" />
      </span>
    );
  if (id === 'gestion-eau')
    return (
      <span className={`${base} bg-[#0F766E] text-white`}>
        <Icone nom="goutte" className="w-6 h-6" />
      </span>
    );
  return <span className={`${base} bg-[#FACC15] text-[#1F2937] font-titre text-[1.25rem]`}>N</span>;
}

export default function Commutateur() {
  const [etat, setEtat] = useState<Etat>({ t: 'chargement' });
  const [redirection, setRedirection] = useState(false);
  const nav = useRef<HTMLElement>(null);

  const charger = useCallback(async () => {
    // NAVY ay app: the app's session first (no-op on the web).
    if (!sessionLocale()) await lireSessionNative();
    if (!sessionLocale()) {
      setEtat({ t: 'deconnecte' });
      return;
    }
    setEtat({ t: 'chargement' });
    try {
      const sb = await withTimeout(getSupabase());
      const { data } = await withTimeout(sb.auth.getSession());
      const uid = data.session?.user?.id;
      if (!uid) {
        setEtat({ t: 'deconnecte' });
        return;
      }
      const { data: ligne, error } = await withTimeout(sb.from('users').select('role, preferences').eq('id', uid).maybeSingle());
      if (error) throw error;
      const modules = modulesDuCompte((ligne as CompteModules | null) ?? { role: null, preferences: null });
      if (!modules) throw new Error('inconnu');
      setEtat({ t: 'pret', modules });
    } catch {
      // Network, timeout or unknown row: never a refusal.
      setEtat({ t: 'erreur' });
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Escape and a tap outside the bar (except on the logo, which toggles) close the switcher.
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermerCommutateur();
    };
    const dehors = (e: Event) => {
      const t = e.target as Element | null;
      if (!t || nav.current?.contains(t) || t.closest?.('[data-pudi-logo]')) return;
      fermerCommutateur();
    };
    document.addEventListener('keydown', touche);
    const id = window.setTimeout(() => {
      document.addEventListener('mousedown', dehors);
      document.addEventListener('touchstart', dehors);
    }, 100);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', touche);
      document.removeEventListener('mousedown', dehors);
      document.removeEventListener('touchstart', dehors);
    };
  }, []);

  let contenu;
  if (etat.t === 'chargement')
    contenu = (
      <p className="py-4 flex items-center justify-center gap-2 text-[0.875rem] text-gris" role="status">
        <span className="w-4 h-4 rounded-full border-2 border-marine border-t-transparent animate-spin" aria-hidden="true" />
        Chargement de vos modules…
      </p>
    );
  else if (etat.t === 'deconnecte')
    contenu = (
      <div className="px-4 py-3 space-y-2 text-center" role="status">
        <p className="text-[0.875rem] text-texte">Connectez-vous avec Google pour retrouver vos autres modules de 1sakely.org</p>
        <button
          type="button"
          className={`${boutonPrincipal} w-full`}
          disabled={redirection}
          onClick={() => {
            setRedirection(true);
            connexionGoogle().catch(() => setRedirection(false));
          }}
        >
          <Icone nom="connexion" />
          {redirection ? 'Connexion en cours…' : 'Se connecter'}
        </button>
      </div>
    );
  else if (etat.t === 'erreur')
    contenu = (
      <div className="px-4 py-3 flex items-center justify-between gap-3" role="status">
        <p className="text-[0.875rem] text-texte">Réseau indisponible, réessayez</p>
        <button type="button" className={`${boutonSecondaire} min-h-[44px] px-3`} onClick={() => void charger()}>
          <Icone nom="actualiser" />
          Réessayer
        </button>
      </div>
    );
  else if (!etat.modules.length)
    contenu = (
      <p className="px-4 py-4 text-center text-[0.875rem] font-bold text-gris" role="status">
        PUDi est votre seul module pour l’instant
      </p>
    );
  else
    contenu = (
      <div className="flex items-center justify-around flex-nowrap overflow-x-auto py-1.5">
        {etat.modules.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              oublierCommutateur();
              window.location.assign(m.adresse);
            }}
            className="flex-shrink-0 min-w-[72px] flex flex-col items-center px-1 select-none"
            aria-label={`Ouvrir ${m.nom}`}
          >
            <span className="p-1.5 rounded-xl">
              <Tuile id={m.id} />
            </span>
            <span className="text-xs font-bold mt-0.5 text-texte whitespace-nowrap">{m.nom}</span>
          </button>
        ))}
      </div>
    );

  return <BarreCommutateur refNav={nav}>{contenu}</BarreCommutateur>;
}
