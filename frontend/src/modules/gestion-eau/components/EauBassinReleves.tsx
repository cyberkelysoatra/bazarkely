/**
 * Onglet « Bassin » de la page Relevés v2 (façon Transactions).
 *
 * Métaphore comptable : le niveau du bassin = stock d'eau (eau restante).
 *  - Carte « Stock d'eau du bassin » (unique carte de tête) : niveau réel mesuré
 *    (+ % remplissage réf. flotteur), solde attendu (dernier bilan) et écart mesuré − attendu
 *    (ton d'alerte si anomalie) ; tiroir « Comprendre cette situation » au clic sur le corps ;
 *    rangée relevé (dernier niveau cm → m³ + date) cliquable → tiroir « Historique »
 *    (6 derniers niveaux + mini-courbe) ; crayon → tiroir « Saisir hauteur »
 *    (conversion live cm → m³, Enregistrer → addReleveBassin qui déclenche un bilan).
 *  - Section repliable « Tests de débit » : débit courant mis en avant + liste + nouveau test.
 *  - Section repliable « Arrêts de pompe » : saisie période/durée + liste.
 *  - Section repliable admin/releveur « Relevés récents » : édition/suppression + recalcul
 *    des bilans (feature v3.41.0 conservée — additif, ne pas régresser).
 *
 * Transpose EauSaisieBassinPage SANS toucher au calcul des bilans (utils/bilan.ts, Phase 3).
 * Offline-first ; deep-link `?bt=niveau|debit` piloté par le parent (openIntent).
 *
 * Découpé (v3.62.0) : ce composant n'orchestre plus que les refs, le défilement sous le
 * Header, le deep-link et l'agencement. Les données + actions vivent dans `useBassinReleves`,
 * les écrans dans `bassin/*` (carte Stock, saisie, tests de débit, arrêts, historique admin).
 */
import { ReactNode, useEffect, useRef } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { useBassinReleves } from './bassin/useBassinReleves';
import BassinStockCard, { type ExplainInfo } from './bassin/BassinStockCard';
import TestsDebit from './bassin/TestsDebit';
import ArretsPompe from './bassin/ArretsPompe';
import BassinHistoriqueAdmin from './bassin/BassinHistoriqueAdmin';
import { getEauCalageOffset, scrollElementUnderHeader } from '../utils/scrollUnderHeader';

export default function EauBassinReleves({
  openIntent,
  onConsumeIntent,
  creditsSlot,
}: {
  /**
   * Deep-link / raccourci :
   *   - 'niveau'     ouvre le tiroir « Saisir hauteur »,
   *   - 'debit'      ouvre la section Tests et la centre (icône carte « Pompes » → saisie débit),
   *   - 'debitFocus' ouvre la section Tests puis CALE le bloc « Débit mesuré (m³/h) » sous la barre
   *                  d'onglets (clic sur le CORPS de la carte « Pompes en marche »).
   */
  openIntent: 'niveau' | 'debit' | 'debitFocus' | null;
  onConsumeIntent: () => void;
  /** Contenu « crédits » (entrées d'eau) inséré entre la carte Bassin et la section Tests de débit. */
  creditsSlot?: ReactNode;
}) {
  const b = useBassinReleves();

  const releveRowRef = useRef<HTMLDivElement | null>(null);
  const debitRef = useRef<HTMLDivElement | null>(null);

  const { openDrawer, setOpenDrawer, setDebitOpen, loading, bilan } = b;

  // Amène le HAUT de la LIGNE DU RELEVÉ (la zone cliquée : relevé + crayon) juste SOUS la
  // barre d'onglets collante (= Header + onglets), pour que le tiroir qui se déploie dessous
  // soit en pleine vue (le bloc Stock / Attendu / Écart passe au-dessus). Le calage vise le
  // BAS de `[data-eau-sticky-tabs]` si présent (sinon le bas du Header) via getEauCalageOffset
  // — sinon la carte se retrouverait masquée derrière les onglets (v3.64.0).
  const scrollReleveRowUnderHeader = () => {
    const target = releveRowRef.current;
    if (!target) return;
    const offset = getEauCalageOffset(8);
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  // Dès qu'un tiroir de la carte Bassin s'ouvre (crayon « Saisir » ou clic « Historique »,
  // peu importe la cause), faire remonter la LIGNE DU RELEVÉ sous le Header. Pas de défilement
  // à la fermeture (openDrawer null). rAF pour que la position soit déjà à jour ; ré-assertion
  // différée (~360 ms) pour absorber un éventuel décalage tardif de mise en page au chargement
  // initial via deep-link (bandeau d'annonce du Header chargé après coup).
  useEffect(() => {
    if (!openDrawer) return;
    const raf = requestAnimationFrame(() => scrollReleveRowUnderHeader());
    const t = setTimeout(() => scrollReleveRowUnderHeader(), 360);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDrawer]);

  // Deep-link / raccourci : ouvre le bon tiroir/section et défile jusqu'à lui.
  useEffect(() => {
    if (!openIntent || loading) return;
    if (openIntent === 'niveau') {
      // Le défilement « haut sous le Header » est géré par l'effet sur openDrawer ci-dessus.
      setOpenDrawer('saisir');
    } else if (openIntent === 'debit') {
      setDebitOpen(true);
      requestAnimationFrame(() => debitRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    } else if (openIntent === 'debitFocus') {
      // Révéler la section Tests de débit puis caler le HAUT de la SECTION ENTIÈRE (debitRef = la
      // carte « Tests de débit ») juste sous la barre d'onglets collante → son titre reste visible
      // en tête (retour JOEL S98 : viser la section, pas le bloc « Débit mesuré » interne, sinon le
      // titre passe au-dessus). rAF pour position à jour + ré-assertion différée (~360 ms) pour
      // absorber un décalage tardif de mise en page (montage Recharts de la carte Stock, bandeau
      // d'annonce du Header).
      setDebitOpen(true);
      const focusDebit = () => {
        if (debitRef.current) scrollElementUnderHeader(debitRef.current);
      };
      requestAnimationFrame(focusDebit);
      setTimeout(focusDebit, 360);
    }
    onConsumeIntent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIntent, loading]);

  if (loading) {
    return <div className="text-gray-400 text-sm py-8 text-center">Chargement…</div>;
  }

  // « Comprendre cette situation » : un seul cas (A→F) selon bilan null / anomalie / signe
  // de l'écart. Textes français validés (à reprendre tels quels) ; ton = couleur + icône.
  const EPS = 0.05; // m³ — marge « pile poil »
  const explain: ExplainInfo = (() => {
    if (bilan === null) {
      return {
        tone: 'text-gray-700',
        Icon: Info,
        title: 'Votre point de départ',
        text: "C'est le premier relevé : il sert de référence, il n'y a encore rien à comparer. Dès le prochain relevé de niveau, l'app saura dire si le bassin tient ses comptes.",
        advice: 'Refaites un relevé de niveau au prochain passage pour lancer le suivi.',
      };
    }
    const ecart = bilan.ecart_m3 ?? 0;
    if (bilan.anomalie) {
      return ecart < 0
        ? {
            tone: 'text-rose-700',
            Icon: AlertTriangle,
            title: "Il manque de l'eau",
            text: "Il manque nettement plus d'eau que ce que la consommation explique. C'est typiquement le signe d'une fuite sur le réseau, d'une vanne restée ouverte… ou d'un relevé erroné.",
            advice: "Vérifiez d'abord le relevé, puis inspectez le réseau (fuite, vanne) sans tarder.",
          }
        : {
            tone: 'text-amber-700',
            Icon: AlertTriangle,
            title: "Beaucoup plus d'eau que prévu",
            text: "Il reste bien plus d'eau qu'attendu. Le plus souvent, un apport n'a pas été enregistré (remplissage, pluie, pompe) ou un relevé est faux.",
            advice: "Vérifiez les relevés récents et notez tout remplissage qui n'aurait pas été saisi.",
          };
    }
    if (Math.abs(ecart) <= EPS) {
      return {
        tone: 'text-emerald-700',
        Icon: Info,
        title: 'Tout colle',
        text: "Le niveau réel tombe juste sur ce qui était attendu. Ce qui est entré par la pompe, moins ce qui a été consommé, correspond pile au niveau mesuré : le bassin tient parfaitement ses comptes.",
        advice: 'Rien à faire — continuez vos relevés au rythme habituel.',
      };
    }
    if (ecart > EPS) {
      return {
        tone: 'text-emerald-700',
        Icon: Info,
        title: 'Un peu plus que prévu',
        text: "Il reste un peu plus d'eau que ce qu'on attendait. Bonne nouvelle : soit on a consommé moins, soit la pompe a rempli un peu plus généreusement. L'écart reste petit, rien d'inquiétant.",
        advice: "Profitez-en, mais gardez un œil sur les prochains relevés au cas où l'écart se creuse.",
      };
    }
    // ecart < -EPS
    return {
      tone: 'text-amber-700',
      Icon: AlertTriangle,
      title: 'Un peu moins que prévu',
      text: "Il reste un peu moins d'eau que prévu, mais l'écart est encore dans la marge normale. Ça arrive : petite surconsommation, évaporation, ou un relevé un brin imprécis. Pas d'alerte pour l'instant.",
      advice: "Surveillez le prochain relevé : si l'écart grandit, c'est le moment de chercher une fuite.",
    };
  })();

  return (
    <div className="space-y-4">
      {/* Carte « Stock d'eau du bassin » : seule carte de tête de l'onglet Source. */}
      <BassinStockCard
        dash={b.dash}
        bilan={b.bilan}
        anomalie={b.anomalie}
        explain={explain}
        explainOpen={b.explainOpen}
        setExplainOpen={b.setExplainOpen}
        openDrawer={b.openDrawer}
        setOpenDrawer={b.setOpenDrawer}
        releveRowRef={releveRowRef}
        dernierReleve={b.dernierReleve}
        niveauChart={b.niveauChart}
        relevesList={b.relevesList}
        isReadOnly={b.isReadOnly}
        dim={b.dim}
        busy={b.busy}
        onSubmitNiveau={b.submitNiveau}
      />

      {/* Section repliable « Tests de débit » (juste sous la carte Stock, avant les Apports). */}
      <TestsDebit
        surface={b.surface}
        isReadOnly={b.isReadOnly}
        busy={b.busy}
        debitOpen={b.debitOpen}
        setDebitOpen={b.setDebitOpen}
        debitRef={debitRef}
        tests={b.tests}
        debitChartData={b.debitChartData}
        debitCourantM3h={b.dash?.debitCourantM3h}
        flotteurCm={b.flotteurCm}
        onSubmit={b.submitDebit}
      />

      {/* Section repliable « Arrêts de pompe ». */}
      <ArretsPompe
        isReadOnly={b.isReadOnly}
        busy={b.busy}
        arretOpen={b.arretOpen}
        setArretOpen={b.setArretOpen}
        arrets={b.arrets}
        onSubmit={b.submitArret}
        onRemove={b.removeArret}
      />

      {/* Crédits (entrées d'eau) injectés par le parent : carte Apports après les Tests de débit. */}
      {creditsSlot}

      {/* Section admin/releveur : édition / suppression d'un relevé + recalcul des bilans. */}
      {(b.roles.admin || b.roles.releveur) && (
        <BassinHistoriqueAdmin
          roles={b.roles}
          isReleveurOnly={b.isReleveurOnly}
          isReadOnly={b.isReadOnly}
          isOnline={b.isOnline}
          busy={b.busy}
          recomputing={b.recomputing}
          visibleReleves={b.visibleReleves}
          editing={b.editing}
          setEditing={b.setEditing}
          saveEdit={b.saveEdit}
          removeReleve={b.removeReleve}
          recomputeAll={b.recomputeAll}
        />
      )}
    </div>
  );
}
