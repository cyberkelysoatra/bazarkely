// /plan/formateur: live tracking of the participants of the training (NEC-CC-02). Not in the
// participant navigation. Refreshed every 15 s while the page is visible, and by pulling down.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Patience, RenvoiAccueil } from '../composants/GardeFormateur';
import { Mise } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import { RUBRIQUES } from '../rubriques/registre';
import { TEXTES_ALERTES, changerSession, listeParticipants, sessionOuverte, type Participant } from '../sync/formateur';
import { codeMemorise } from '../sync';

const RAFRAICHIR_MS = 15000;
const EN_LIGNE_MS = 2 * 60 * 1000;

type Etat = { statut: 'chargement' } | { statut: 'refuse' } | { statut: 'erreur' } | { statut: 'ok'; liste: Participant[] };

export function depuis(iso: string, maintenant = Date.now()): string {
  const min = Math.floor((maintenant - new Date(iso).getTime()) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export function pctGlobal(progression: Record<string, number>): number {
  const total = RUBRIQUES.reduce((t, r) => t + Math.max(0, Math.min(100, Number(progression?.[r.id]) || 0)), 0);
  return Math.round(total / RUBRIQUES.length);
}

function CarteParticipant({ p, maintenant }: { p: Participant; maintenant: number }) {
  const [voirAlertes, setVoirAlertes] = useState(false);
  const actif = maintenant - new Date(p.vu_at).getTime() < EN_LIGNE_MS;
  const pct = pctGlobal(p.progression);
  const alertes = Array.isArray(p.alertes) ? p.alertes : [];
  return (
    <li className="bp-participant rounded-2xl border border-filet bg-white" data-plan={p.plan_id}>
      <div className="flex items-start gap-2 p-3.5 pb-2">
        <Link to={`/formateur/${p.plan_id}`} className="min-w-0 flex-1 block">
          <span className="flex items-center gap-2">
            <span
              className={`shrink-0 w-2.5 h-2.5 rounded-full ${actif ? 'bg-[#1F9D55]' : 'bg-filet'}`}
              role="img"
              aria-label={actif ? 'Actif en ce moment' : 'Inactif'}
              title={actif ? 'Actif en ce moment' : 'Inactif'}
            />
            <span className="text-[17px] font-bold text-encre break-words">{p.prenom || 'Sans prénom'}</span>
          </span>
          <span className="block text-[14px] text-doux break-words">{p.nom_projet || 'Projet sans nom'}</span>
        </Link>
        <span className="shrink-0 text-[20px] font-bold text-violet tabular-nums">{pct}&nbsp;%</span>
      </div>
      <Link to={`/formateur/${p.plan_id}`} className="block px-3.5 pb-3">
        <span className="bp-barres grid grid-cols-11 gap-1" aria-label="Avancement par partie">
          {RUBRIQUES.map((r) => {
            const v = Math.max(0, Math.min(100, Number(p.progression?.[r.id]) || 0));
            return (
              <span key={r.id} className="block h-2 rounded-full bg-turquoiseClair overflow-hidden" title={`${r.titre} : ${v} %`}>
                <span className="block h-full bg-turquoise" style={{ width: `${v}%` }} />
              </span>
            );
          })}
        </span>
        <span className="mt-2 block text-[13px] text-doux">Dernière activité {depuis(p.maj_at, maintenant)}</span>
      </Link>
      {alertes.length ? (
        <div className="border-t border-filet px-3.5 py-2">
          <button
            type="button"
            onClick={() => setVoirAlertes((v) => !v)}
            className="bp-alertes min-h-[40px] flex items-center gap-1.5 text-alerte font-bold text-[14px]"
            aria-expanded={voirAlertes}
          >
            {alertes.map((a) => (
              <Icone key={a} nom="alerte" className="w-5 h-5" titre={TEXTES_ALERTES[a] ?? a} />
            ))}
            {alertes.length} alerte{alertes.length > 1 ? 's' : ''} du module 5
          </button>
          {voirAlertes ? (
            <ul className="pb-1 text-[14px] text-alerte space-y-1">
              {alertes.map((a) => (
                <li key={a}>{TEXTES_ALERTES[a] ?? a}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export default function Formateur() {
  const code = (codeMemorise() || 'NEC2026').toUpperCase();
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  const [ouverte, setOuverte] = useState<boolean | null>(null);
  const [majA, setMajA] = useState<number | null>(null);
  const [actualisations, setActualisations] = useState(0);
  const [confirmer, setConfirmer] = useState(false);
  const [tirage, setTirage] = useState(0);
  const depart = useRef<number | null>(null);
  const tire = useRef(0);
  const enCours = useRef(false);

  const charger = useCallback(async () => {
    if (enCours.current) return;
    enCours.current = true;
    try {
      const r = await listeParticipants(code);
      if (r.statut === 'ok') {
        setEtat({ statut: 'ok', liste: [...(r.valeur ?? [])].sort((a, b) => a.prenom.localeCompare(b.prenom, 'fr')) });
        setMajA(Date.now());
        setActualisations((n) => n + 1);
        void sessionOuverte(code).then(setOuverte);
      } else {
        setEtat((avant) => (r.statut === 'refuse' ? { statut: 'refuse' } : avant.statut === 'ok' ? avant : { statut: 'erreur' }));
      }
    } finally {
      enCours.current = false;
    }
  }, [code]);

  useEffect(() => {
    void charger();
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') void charger();
    }, RAFRAICHIR_MS);
    const visible = () => {
      if (document.visibilityState === 'visible') void charger();
    };
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [charger]);

  // Pull to refresh (touch, from the top of the page).
  useEffect(() => {
    const debut = (e: TouchEvent) => {
      depart.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
    };
    const bouge = (e: TouchEvent) => {
      if (depart.current === null) return;
      tire.current = Math.max(0, Math.min(120, e.touches[0].clientY - depart.current));
      setTirage(tire.current);
    };
    const fin = () => {
      if (tire.current > 70) void charger();
      tire.current = 0;
      setTirage(0);
      depart.current = null;
    };
    window.addEventListener('touchstart', debut, { passive: true });
    window.addEventListener('touchmove', bouge, { passive: true });
    window.addEventListener('touchend', fin);
    return () => {
      window.removeEventListener('touchstart', debut);
      window.removeEventListener('touchmove', bouge);
      window.removeEventListener('touchend', fin);
    };
  }, [charger]);

  const basculer = async () => {
    if (ouverte === null) return;
    const r = await changerSession(code, !ouverte);
    setConfirmer(false);
    if (r.statut === 'ok') setOuverte(!ouverte);
    void charger();
  };

  if (etat.statut === 'chargement') return <Patience />;
  // NON_AUTORISE or permission denied from the server: back to the home, no history entry.
  if (etat.statut === 'refuse') return <RenvoiAccueil />;
  if (etat.statut === 'erreur') {
    return (
      <Mise titre="Suivi formateur" retour={{ vers: '/', texte: 'Mes projets' }}>
        <p className="text-[16px] text-encre">Connexion impossible pour le moment. Nouvel essai automatique toutes les 15 secondes.</p>
        <button type="button" onClick={() => void charger()} className="mt-4 w-full min-h-[48px] rounded-xl bg-violet text-white font-bold">
          Réessayer
        </button>
      </Mise>
    );
  }

  const maintenant = Date.now();
  const liste = etat.liste;
  return (
    <Mise titre="Suivi formateur" sousTitre={`Session ${code} : ${liste.length} participant${liste.length > 1 ? 's' : ''}`} retour={{ vers: '/', texte: 'Mes projets' }}>
      <div className="bp-suivi" data-actualisations={actualisations} data-maj={majA ?? ''}>
        {tirage > 0 ? (
          <p className="text-center text-[14px] text-violet font-bold" style={{ height: tirage / 2 }}>
            {tirage > 70 ? 'Relâchez pour actualiser' : 'Tirez pour actualiser'}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[13px] text-doux">
            {majA ? `Mis à jour à ${new Date(majA).toLocaleTimeString('fr-FR')}` : ''} · toutes les 15 s
          </p>
          <button type="button" onClick={() => void charger()} className="min-h-[40px] px-3 rounded-xl border-2 border-filet text-violet font-bold text-[14px]">
            Actualiser
          </button>
        </div>
        {liste.length === 0 ? (
          <p className="text-doux mb-4">Aucun participant n'a encore rejoint la session.</p>
        ) : (
          <ul className="space-y-3 mb-4">
            {liste.map((p) => (
              <CarteParticipant key={p.plan_id} p={p} maintenant={maintenant} />
            ))}
          </ul>
        )}
        <div className="rounded-2xl bg-violetClair p-4">
          <p className="text-[15px] text-encre">
            Session <b>{code}</b> : {ouverte === null ? 'état inconnu' : ouverte ? 'ouverte, les participants peuvent envoyer' : 'fermée, plus aucun envoi accepté'}.
          </p>
          {confirmer ? (
            <div className="mt-3">
              <p className="text-[15px] font-bold text-encre">{ouverte ? 'Fermer la session ? Les participants ne pourront plus envoyer.' : 'Rouvrir la session ?'}</p>
              <div className="mt-2.5 flex gap-2.5">
                <button type="button" onClick={basculer} className="flex-1 min-h-[44px] rounded-xl bg-violet text-white font-bold">
                  Confirmer
                </button>
                <button type="button" onClick={() => setConfirmer(false)} className="flex-1 min-h-[44px] rounded-xl border-2 border-filet text-encre font-bold bg-white">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={ouverte === null}
              onClick={() => setConfirmer(true)}
              className="mt-3 w-full min-h-[44px] rounded-xl border-2 border-violet text-violet font-bold bg-white disabled:opacity-50"
            >
              {ouverte === false ? 'Rouvrir' : 'Fermer la session'}
            </button>
          )}
        </div>
      </div>
    </Mise>
  );
}
