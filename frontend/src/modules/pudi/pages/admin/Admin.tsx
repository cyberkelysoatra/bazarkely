// Administration of the PUDi consultation (lazy chunk). Guard: pudi_etat().est_admin read with
// the session; a spinner while unknown, never a redirect on an unconfirmed state.
import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { Icone, type NomIcone } from '../../composants/Icones';
import { Page, boutonPrincipal } from '../../composants/Mise';
import { usePudi } from '../../PudiContexte';
import { lireEtatConnecte } from '../../appels/api';
import { connexionGoogle, sessionLocale, useSessionLocale } from '../../appels/session';
import { getSupabase, withTimeout } from '../../appels/supabaseClient';
import { DATE_PURGE, RAPPEL_PURGE_DES } from '../../appels/admin';
import { dateClotureLongue } from '../../utils/format';
import { Erreur } from './communs';
import Suivi from './Suivi';
import Votes from './Votes';
import Refus from './Refus';
import Canaux from './Canaux';
import Parametres from './Parametres';
import Journal from './Journal';

// Phase 3: proposals tab in its own chunk (loaded when the tab opens).
const Propositions = lazy(() => import('./Propositions'));

type Acces = { t: 'verif' } | { t: 'deconnecte' } | { t: 'refuse' } | { t: 'erreur' } | { t: 'ok'; email: string };

const ONGLETS: { to: string; libelle: string; icone: NomIcone }[] = [
  { to: '/admin', libelle: 'Suivi', icone: 'activite' },
  { to: '/admin/votes', libelle: 'Votes', icone: 'liste' },
  { to: '/admin/refus', libelle: 'Refus', icone: 'refus' },
  { to: '/admin/canaux', libelle: 'Canaux', icone: 'diffusion' },
  { to: '/admin/parametres', libelle: 'Paramètres', icone: 'reglages' },
  { to: '/admin/journal', libelle: 'Journal', icone: 'journal' },
  { to: '/admin/propositions', libelle: 'Propositions', icone: 'ampoule' }
];

export default function Admin() {
  const { definirEtat } = usePudi();
  const [acces, setAcces] = useState<Acces>({ t: 'verif' });
  const [connexion, setConnexion] = useState(false);
  const session = useSessionLocale();
  // Back from Google: the code is still being exchanged, the session is not stored yet.
  const retourConnexion = /[?&]code=/.test(window.location.search) || /access_token=/.test(window.location.hash);

  const verifier = useCallback(async () => {
    if (!sessionLocale()) {
      if (retourConnexion) return;
      setAcces({ t: 'deconnecte' });
      return;
    }
    setAcces({ t: 'verif' });
    try {
      const sb = await withTimeout(getSupabase());
      const { data } = await withTimeout(sb.auth.getSession());
      if (!data.session) {
        setAcces({ t: 'deconnecte' });
        return;
      }
      const e = await lireEtatConnecte();
      definirEtat(e);
      setAcces(e.est_admin ? { t: 'ok', email: data.session.user.email ?? '' } : { t: 'refuse' });
    } catch {
      setAcces({ t: 'erreur' });
    }
  }, [definirEtat, retourConnexion]);

  useEffect(() => {
    void verifier();
  }, [verifier, session?.email]);

  if (acces.t === 'verif')
    return (
      <Page titre="Administration" large>
        <p className="py-10 flex items-center justify-center gap-2 text-gris" role="status">
          <span className="w-5 h-5 rounded-full border-2 border-marine border-t-transparent animate-spin" aria-hidden="true" />
          Vérification de vos droits…
        </p>
      </Page>
    );
  if (acces.t === 'erreur')
    return (
      <Page titre="Administration" large>
        <Erreur texte="Le réseau ne répond pas. Réessayez." reessayer={() => void verifier()} />
      </Page>
    );
  if (acces.t !== 'ok')
    return (
      <Page titre="Administration" large>
        <div className="bg-white border border-filet rounded-xl p-4 space-y-3">
          <p className="text-[16px] flex gap-2 items-start">
            <Icone nom="cadenas" className="w-5 h-5 text-marine mt-0.5" />
            Espace réservé aux organisateurs.
          </p>
          {acces.t === 'deconnecte' && (
            <button
              type="button"
              className={`${boutonPrincipal} w-full`}
              disabled={connexion}
              onClick={() => {
                setConnexion(true);
                connexionGoogle('/pudi/admin').catch(() => setConnexion(false));
              }}
            >
              <Icone nom="connexion" />
              {connexion ? 'Connexion en cours…' : 'Se connecter avec Google'}
            </button>
          )}
        </div>
      </Page>
    );

  const rappelPurge = Date.now() >= Date.parse(RAPPEL_PURGE_DES);
  return (
    <Page titre="Administration" large>
      {/* Wrapped rows (3 per row on phones): every tab stays visible, no horizontal scroll. */}
      <nav aria-label="Écrans d'administration" className="mb-4">
        <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {ONGLETS.map((o) => (
            <li key={o.to} className="min-w-0">
              <NavLink
                to={o.to}
                end
                className={({ isActive }) =>
                  `min-h-[52px] h-full px-1.5 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[13px] leading-tight font-bold text-center border ${
                    isActive ? 'bg-marine text-white border-marine' : 'bg-white text-marine border-filet'
                  }`
                }
              >
                <Icone nom={o.icone} className="w-4 h-4" />
                {o.libelle}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {rappelPurge && (
        <div role="status" className="mb-4 border-l-4 border-[#B85317] bg-white rounded-r-lg px-3 py-2.5 flex gap-2.5 items-start shadow-sm">
          <Icone nom="alerte" className="w-5 h-5 mt-0.5 text-[#B85317]" />
          <p className="text-[15px]">
            Rappel : les données personnelles de la consultation doivent être supprimées le {dateClotureLongue(DATE_PURGE)}. Voir Paramètres, Données personnelles.
          </p>
        </div>
      )}
      <Routes>
        <Route index element={<Suivi />} />
        <Route path="votes" element={<Votes />} />
        <Route path="refus" element={<Refus />} />
        <Route path="canaux" element={<Canaux />} />
        <Route path="parametres" element={<Parametres email={acces.email} />} />
        <Route path="journal" element={<Journal />} />
        <Route
          path="propositions"
          element={
            <Suspense fallback={<p className="text-gris py-6 text-center">Chargement…</p>}>
              <Propositions />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </Page>
  );
}
