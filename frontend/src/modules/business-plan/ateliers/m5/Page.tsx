// Module 5 "Les chiffres clés" (workbook pages 13 to 15): 5a to 5f, live results and alerts.
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { AtelierProps, Investissement, NiveauChiffres, Plan, Produit, Ressource } from '../../types';
import { ChampDecimal, ChampMontant, ChampNombre, ChampTexte } from '../../composants/Champs';
import { ListeLignes } from '../../composants/ListeLignes';
import { Carte, Resultat } from '../../composants/Carte';
import { Alerte } from '../../composants/Alerte';
import { Aide } from '../../composants/Aide';
import { Icone } from '../../composants/Icones';
import { alertes, calculer, phraseSeuil, phraseSeuilUnites, texteChiffres, type AlerteChiffres } from '../../utils/chiffres';
import { ariary, grouper, pluriel } from '../../utils/format';
import { partagerTexte } from '../../utils/partage';
import { useEtapesInternes, type EtatNavigation } from '../../composants/SuivantPrecedent';
import { AutreExemple } from '../../composants/AutreExemple';
import { useExempleDuPlan } from '../../etat/exempleChoisi';
import { investissementVide, produitVide, ressourceVide } from '../../etat/vide';
import { Calcul, ChoixNiveau, DEBUT, EcranBases, Gras, PIEGES, PIEGE_ALERTE, Piege, ecransBases, formules, suivante, type Partie, type Position } from './niveaux';
import { BoutonAjouter, CarteProduit, ListeInvestissements, ListeRessources } from './listes';

const SECTIONS = [
  { id: '5a', t: 'Produits' },
  { id: '5b', t: 'Charges' },
  { id: '5c', t: 'Départ' },
  { id: '5d', t: '3 ans' },
  { id: '5e', t: 'Hypothèses' },
  { id: '5f', t: 'Risques' }
] as const;

function aller(id: string) {
  document.getElementById('s' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Alertes({ liste, section, offre }: { liste: AlerteChiffres[]; section: string; offre?: (x: AlerteChiffres) => ReactNode }) {
  const a = liste.filter((x) => x.section === section);
  return a.length ? (
    <div className="mt-3">
      {a.map((x) => (
        <Fragment key={x.cle}>
          <Alerte texte={x.texte} />
          {offre?.(x)}
        </Fragment>
      ))}
    </div>
  ) : null;
}

const PARTIES: Partie[] = ['5a', '5b', '5c', '5d'];

const CHARGES: { cle: keyof Omit<Plan['m5']['chargesFixes'], 'lignes'>; label: string }[] = [
  { cle: 'loyer', label: 'Loyer' },
  { cle: 'salaires', label: 'Salaires et charges' },
  { cle: 'energie', label: 'Électricité et eau' },
  { cle: 'transport', label: 'Transport' },
  { cle: 'telephone', label: 'Téléphone et internet' },
  { cle: 'autres', label: 'Autres' }
];

/** NEC-CC-13: the key figures of the example of the sector of the plan, computed by the app itself
 * (NEC-CC-38: every product, break-even in turnover; never hard-coded). */
function ExempleChiffres({ plan }: { plan: Plan }) {
  const { exemple, choisir } = useExempleDuPlan(plan);
  const ex = exemple.plan();
  const c = calculer(ex);
  const res = c.annees.map((a) => (a ? ariary(a.resultat) : null));
  const produits = c.produits.map((p) => `${p.nom} (coût ${ariary(p.cout)}, prix ${ariary(p.prix ?? 0)}${p.tauxMarge !== null ? `, marge ${p.tauxMarge} %` : ''})`);
  return (
    <div className="bp-exemple-chiffres">
      <p className="mt-3 font-bold">Exemple {exemple.nom}</p>
      <p>
        {produits.length} produit{produits.length > 1 ? 's' : ''} : {produits.join(' ; ')}. Chiffre d'affaires {ariary(c.caMois)} par mois, marge {ariary(c.margeMois)}. Charges fixes{' '}
        {ariary(c.chargesFixes)} par mois
        {c.seuilCaMois !== null ? `, seuil ${ariary(c.seuilCaMois)} de chiffre d'affaires par mois${c.seuilCaJour !== null ? ` (${ariary(c.seuilCaJour)} par jour)` : ''}` : ''}. Besoins{' '}
        {ariary(c.besoins)} = ressources {ariary(c.ressources)}. Résultat avant amortissements et avant impôt : {res.map((r, i) => (r ? `${r} en année ${i + 1}` : null)).filter(Boolean).join(', ')}.
      </p>
      <AutreExemple actuel={exemple} choisir={choisir} />
    </div>
  );
}

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  const m5 = plan.m5;
  const c = useMemo(() => calculer(plan), [plan]);
  const liste = useMemo(() => alertes(plan, c), [plan, c]);
  const [annee, setAnnee] = useState(0);
  const [message, setMessage] = useState('');
  const set = (recette: (m: Plan['m5'], p: Plan) => void) => modifier((p) => recette(p.m5, p));
  const seuil = phraseSeuil(plan, c);
  const seuilUnites = phraseSeuilUnites(plan, c);

  // NEC-CC-38: one product card open at a time (a plan with one product opens it).
  const [ouvert, setOuvert] = useState<string | null>(() => (m5.produits.length === 1 ? m5.produits[0].id : null));
  const basculer = useCallback((id: string) => setOuvert((o) => (o === id ? null : id)), []);
  const changerProduit = useCallback(
    (id: string, recette: (p: Produit) => void) =>
      modifier((p) => {
        const x = p.m5.produits.find((y) => y.id === id);
        if (x) recette(x);
      }),
    [modifier]
  );
  // "Mettre en tête": the product becomes the produit principal (R8); its unit becomes the plan's one.
  const monter = useCallback(
    (id: string) =>
      modifier((p) => {
        const i = p.m5.produits.findIndex((y) => y.id === id);
        if (i <= 0) return;
        const ancien = p.m5.produits[0];
        if (!ancien.unite.trim() && p.uniteVente.trim()) ancien.unite = p.uniteVente;
        const [x] = p.m5.produits.splice(i, 1);
        p.m5.produits.unshift(x);
        if (x.unite.trim()) p.uniteVente = x.unite;
      }),
    [modifier]
  );
  const supprimerProduit = useCallback(
    (id: string) => {
      modifier((p) => {
        p.m5.produits = p.m5.produits.filter((y) => y.id !== id);
        // The last product deleted leaves one empty product.
        if (!p.m5.produits.length) p.m5.produits = [produitVide(p.uniteVente)];
      });
      setOuvert(null);
    },
    [modifier]
  );
  const ajouterProduit = () => {
    const nouveau = produitVide();
    modifier((p) => void p.m5.produits.push(nouveau));
    setOuvert(nouveau.id);
  };
  const changerInvest = (id: string, patch: Partial<Investissement>) =>
    set((m) => {
      const x = m.investissements.find((y) => y.id === id);
      if (x) Object.assign(x, patch);
    });
  const supprimerInvest = (id: string) =>
    set((m) => {
      m.investissements = m.investissements.filter((y) => y.id !== id);
      if (!m.investissements.length) m.investissements = [investissementVide()];
    });
  const changerRessource = (id: string, patch: Partial<Ressource>) =>
    set((m) => {
      const x = m.ressources.find((y) => y.id === id);
      if (x) Object.assign(x, patch);
    });
  const supprimerRessource = (id: string) =>
    set((m) => {
      m.ressources = m.ressources.filter((y) => y.id !== id);
      if (!m.ressources.length) m.ressources = [ressourceVide()];
    });

  // NEC-CC-15: learning level. Default Ciblé (plans created before this version). A read-only plan
  // (example, trainer) switches the display locally and saves nothing.
  const [niveauLocal, setNiveauLocal] = useState<NiveauChiffres | null>(null);
  const niveau: NiveauChiffres = niveauLocal ?? plan.niveauChiffres ?? 'cible';
  const choisirNiveau = (v: NiveauChiffres) => {
    setNiveauLocal(v);
    if (!ls)
      modifier((p) => {
        p.niveauChiffres = v;
      });
  };
  // Level Bases: position in the explanation screens of each part (null = finished, the part is shown).
  const [positions, setPositions] = useState<Record<Partie, Position | null>>({ '5a': DEBUT, '5b': DEBUT, '5c': DEBUT, '5d': DEBUT });
  const enExplication = (p: Partie) => niveau === 'bases' && positions[p] !== null;
  const continuer = useCallback((p: Partie) => setPositions((prev) => ({ ...prev, [p]: prev[p] ? suivante(ecransBases(p, plan, c), prev[p] as Position) : null })), [plan, c]);
  const passer = (p: Partie) => setPositions((prev) => ({ ...prev, [p]: null }));
  const revoir = (p: Partie) => setPositions((prev) => ({ ...prev, [p]: DEBUT }));
  // Level Rapide: an alert offers its targeted explanation once (absent = offered, then opened, then closed).
  const [offres, setOffres] = useState<Record<string, 'ouvert' | 'ferme'>>({});
  const offre = (x: AlerteChiffres) => {
    const code = PIEGE_ALERTE[x.cle];
    if (niveau !== 'rapide' || !code || offres[x.cle] === 'ferme') return null;
    if (offres[x.cle] !== 'ouvert') {
      return (
        <button
          type="button"
          onClick={() => setOffres((o) => ({ ...o, [x.cle]: 'ouvert' }))}
          className="bp-voir-explication -mt-1 mb-3 min-h-[44px] px-4 rounded-xl border-2 border-violet text-violet font-bold"
        >
          Voir l'explication
        </button>
      );
    }
    return (
      <div className="bp-piege rounded-xl border-2 border-violet bg-violetClair px-3.5 py-3 mb-3">
        <p className="text-[15px] leading-snug text-encre">
          <Gras texte={PIEGES[code]} />
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setOffres((o) => ({ ...o, [x.cle]: 'ferme' }));
              choisirNiveau('cible');
            }}
            className="min-h-[44px] px-4 rounded-xl bg-violet text-white font-bold"
          >
            Passer au niveau Ciblé
          </button>
          <button type="button" onClick={() => setOffres((o) => ({ ...o, [x.cle]: 'ferme' }))} className="min-h-[44px] px-3 font-bold text-turquoiseTexte underline">
            Fermer
          </button>
        </div>
      </div>
    );
  };

  // "Suivant / Précédent" walk 5a to 5f (NEC-CC-11): step 0 = top of the page, step k = section k.
  // Reached by "Précédent" from the next section: start on 5f.
  const depuisPrecedent = (useLocation().state as EtatNavigation | null)?.bpDepuis === 'precedent';
  // The current step follows the real scroll position (manual scrolling included): number of
  // sections whose top has reached the tab bar, all of them once the page bottom is reached.
  const [etape, setEtape] = useState(depuisPrecedent ? SECTIONS.length : 0);
  useEffect(() => {
    if (depuisPrecedent) document.getElementById('s' + SECTIONS[SECTIONS.length - 1].id)?.scrollIntoView({ block: 'start' });
    const lire = () => {
      const racine = document.documentElement;
      if (window.scrollY <= 0) return setEtape(0);
      if (window.scrollY + window.innerHeight >= racine.scrollHeight - 2) return setEtape(SECTIONS.length);
      // Bottom of the tab bar once stuck (its sticky top + its height), not its current position.
      const onglets = document.querySelector<HTMLElement>('.bp-onglets');
      const seuil = (onglets ? (parseFloat(getComputedStyle(onglets).top) || 0) + onglets.offsetHeight : 0) + 24;
      setEtape(SECTIONS.filter((s) => (document.getElementById('s' + s.id)?.getBoundingClientRect().top ?? Infinity) <= seuil).length);
    };
    lire();
    window.addEventListener('scroll', lire, { passive: true });
    return () => window.removeEventListener('scroll', lire);
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Tab bar: smooth scroll as before; Suivant / Précédent: instant jump (never stuck mid-animation).
  const allerEtape = useCallback((k: number, doux = false) => {
    setEtape(k);
    if (doux) aller(SECTIONS[k - 1].id);
    else if (k === 0) window.scrollTo(0, 0);
    else document.getElementById('s' + SECTIONS[k - 1].id)?.scrollIntoView({ block: 'start' });
  }, []);
  // Level Bases: "Suivant" first goes through the explanation screens of the current part.
  const partieCourante = etape >= 1 && etape <= PARTIES.length ? PARTIES[etape - 1] : null;
  const expliqueIci = partieCourante !== null && niveau === 'bases' && positions[partieCourante] !== null;
  const avancer = useCallback(
    () => (expliqueIci && partieCourante ? continuer(partieCourante) : allerEtape(etape + 1)),
    [allerEtape, etape, expliqueIci, partieCourante, continuer]
  );
  const reculer = useCallback(() => allerEtape(etape - 1), [allerEtape, etape]);
  useEtapesInternes({
    suivante: expliqueIci && partieCourante ? `${partieCourante}. Continuer` : etape < SECTIONS.length ? `${SECTIONS[etape].id}. ${SECTIONS[etape].t}` : null,
    precedente: etape > 0 ? 'haut' : null,
    avancer,
    reculer
  });

  const ouvrirAnnee = (i: number) => {
    setAnnee(i);
    // Years 2 and 3: fixed costs per month prefilled with year 1 (5b) when first opened.
    if (!ls && i > 0 && m5.annees[i].chargesFixesMois === null && c.chargesFixes > 0) {
      set((m) => {
        m.annees[i].chargesFixesMois = c.chargesFixes;
      });
    }
  };

  const partager = async () => {
    const r = await partagerTexte(texteChiffres(plan, c));
    setMessage(r === 'copie' ? 'Chiffres copiés : collez-les dans WhatsApp.' : r === 'echec' ? 'Partage impossible sur ce téléphone.' : '');
  };

  const a = c.annees[annee];
  const unites = (n: number) => pluriel(plan.uniteVente, n);
  const f = formules(plan, c, annee);
  /** Top of a part: Ciblé = trap box; Bases = explanation screens (then "Revoir l'explication"). */
  const tete = (p: Partie) => {
    if (niveau === 'cible') return <Piege partie={p} />;
    if (niveau !== 'bases') return null;
    const pos = positions[p];
    if (pos) return <EcranBases ecrans={ecransBases(p, plan, c)} position={pos} continuer={() => continuer(p)} passer={() => passer(p)} />;
    return (
      <button type="button" onClick={() => revoir(p)} className="bp-revoir -mt-1 mb-2 min-h-[40px] text-[14px] font-bold text-turquoiseTexte underline">
        Revoir l'explication
      </button>
    );
  };

  return (
    <>
      <Carte ton="violet" ecouter titre="Les chiffres clés">
        <p className="text-[16px] leading-relaxed text-encre">
          Les chiffres répondent à trois questions : combien faut-il pour démarrer ? combien je gagne sur chaque vente ? à partir de combien de ventes je ne perds plus d'argent ?
          Tous les montants sont en ariary. Utilisez les prix réels relevés hier soir.
        </p>
      </Carte>

      <Aide titre="Les mots à connaître">
        <ul className="space-y-1.5">
          <li>
            <span className="font-bold">Investissements :</span> ce que l'on achète une fois et qui dure (matériel, travaux, véhicule).
          </li>
          <li>
            <span className="font-bold">Fonds de roulement :</span> l'argent pour payer les dépenses courantes avant que les ventes ne rentrent. Règle simple : 3 mois de charges
            fixes plus le stock de départ.
          </li>
          <li>
            <span className="font-bold">Coût de revient d'une unité :</span> ce que coûte une unité vendue (matières, emballage, énergie liée à la production), calculé à partir de sa recette.
          </li>
        </ul>
      </Aide>

      <Aide titre="À retenir">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Le total des ressources doit être égal au total des besoins.</li>
          <li>Un apport personnel, même modeste, rassure le bailleur : il montre que vous prenez une part du risque.</li>
          <li>Soyez prudent sur les ventes de l'année 1 et réaliste sur les charges : un jury repère tout de suite un chiffre trop beau.</li>
        </ul>
        <ExempleChiffres plan={plan} />
      </Aide>

      <ChoixNiveau niveau={niveau} choisi={!!(niveauLocal ?? plan.niveauChiffres)} choisir={choisirNiveau} />

      {liste.length ? (
        <Carte titre="À corriger" sousTitre="Vos chiffres montrent un problème :">
          {liste.map((x) => (
            <Alerte key={x.cle} texte={x.texte} />
          ))}
        </Carte>
      ) : null}

      <nav
        className="bp-onglets sticky top-[calc(var(--bp-haut,106px)+var(--bp-retour,0px))] z-10 -mx-4 px-2 py-1.5 bg-white border-b border-filet flex"
        aria-label="Parties du module 5"
      >
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => allerEtape(i + 1, true)}
            className="flex-1 min-w-0 min-h-[48px] rounded-lg flex flex-col items-center justify-center active:bg-violetClair"
          >
            <span className="text-[15px] font-bold text-violet leading-none">{s.id}</span>
            <span className="text-[11px] text-doux leading-tight mt-0.5 truncate max-w-full">{s.t}</span>
          </button>
        ))}
      </nav>

      <div className="h-3" />

      <Carte id="s5a" titre="5a. Mes produits et leur recette" sousTitre="Tout ce que vous vendrez : le premier de la liste est votre produit principal." className="bp-section">
        {tete('5a')}
        {enExplication('5a') ? null : (
          <>
            <ul className="bp-produits space-y-2.5" aria-label="Mes produits">
              {m5.produits.map((p, i) => (
                <CarteProduit
                  key={p.id}
                  produit={p}
                  cp={c.produits[i]}
                  rang={i}
                  ouvert={ouvert === p.id}
                  lectureSeule={ls}
                  niveau={niveau}
                  uniteDefaut={plan.uniteVente}
                  basculer={basculer}
                  changer={changerProduit}
                  monter={monter}
                  supprimer={supprimerProduit}
                />
              ))}
            </ul>
            {!ls ? <BoutonAjouter texte="Ajouter un produit" onClick={ajouterProduit} className="mb-4" /> : <div className="h-3" />}
            <div className="bp-totaux-produits rounded-xl bg-turquoiseClair px-3 py-1">
              <p className="pt-1.5 text-[14px] font-bold text-doux">Tous mes produits, par mois (année 1)</p>
              <Resultat label="Chiffre d'affaires" valeur={<span className="bp-ca-mois">{ariary(c.caMois)}</span>} />
              <Calcul niveau={niveau} texte={f.caMois} />
              <Resultat label="Coûts variables" valeur={<span className="bp-cv-mois">{ariary(c.cvMois)}</span>} />
              <Calcul niveau={niveau} texte={f.cvMois} />
              <Resultat label="Marge totale" valeur={<span className="bp-marge-mois">{ariary(c.margeMois)}</span>} fort />
              <Calcul niveau={niveau} texte={f.margeMois} />
              {c.tauxMoyen !== null ? <Resultat label="Taux de marge moyen" valeur={`${String(Math.round(c.tauxMoyen * 10000) / 100).replace('.', ',')} %`} /> : null}
              <Calcul niveau={niveau} texte={f.tauxMoyen} />
            </div>
            <Alertes liste={liste} section="5a" offre={offre} />
          </>
        )}
      </Carte>

      <Carte id="s5b" titre="5b. Mes charges fixes par mois" sousTitre="Ce que vous payez chaque mois, même sans rien vendre." className="bp-section">
        {tete('5b')}
        {enExplication('5b') ? null : (
          <>
            {CHARGES.map((ch) => (
              <ChampMontant
                key={ch.cle}
                label={ch.label}
                valeur={m5.chargesFixes[ch.cle]}
                onChange={(v) =>
                  set((m) => {
                    m.chargesFixes[ch.cle] = v;
                  })
                }
                lectureSeule={ls}
              />
            ))}
            <p className="text-[15px] font-bold text-encre mb-1.5">Autres charges fixes</p>
            <ListeLignes
              titre="Autres charges fixes"
              lignes={m5.chargesFixes.lignes}
              onChange={(l) =>
                set((m) => {
                  m.chargesFixes.lignes = l;
                })
              }
              lectureSeule={ls}
              ajouter="Ajouter une charge"
            />
            <div className="rounded-xl bg-turquoiseClair px-3 py-1 mb-4">
              <Resultat label="Total des charges fixes (C)" valeur={ariary(c.chargesFixes)} fort />
              <Calcul niveau={niveau} texte={f.charges} />
            </div>
            <ChampNombre
              label="Jours de travail par mois"
              valeur={m5.joursParMois}
              onChange={(v) =>
                set((m) => {
                  m.joursParMois = v ?? 0;
                })
              }
              suffixe="jours"
              lectureSeule={ls}
            />
            <div className="bp-resultats rounded-xl border-2 border-violetClair bg-white px-3 py-2">
              <p className="text-[16px] font-bold text-violet">Mes résultats</p>
              <Resultat label="Chiffre d'affaires par mois" valeur={ariary(c.caMois)} />
              <Resultat label="Marge totale par mois" valeur={ariary(c.margeMois)} />
              <Resultat label="Charges fixes par mois" valeur={ariary(c.chargesFixes)} />
              <Resultat label="Seuil de rentabilité par mois" valeur={<span className="bp-seuil-mois">{c.seuilCaMois === null ? 'non calculé' : ariary(c.seuilCaMois)}</span>} fort />
              <Resultat label="Seuil par jour de travail" valeur={<span className="bp-seuil-jour">{c.seuilCaJour === null ? 'non calculé' : ariary(c.seuilCaJour)}</span>} />
              <Resultat label="Besoins de démarrage" valeur={ariary(c.besoins)} />
              <Resultat label="Ressources" valeur={ariary(c.ressources)} />
              <Resultat label="Écart (ressources moins besoins)" valeur={<span className="bp-ecart-resultats">{c.ecart === 0 ? '0 Ar : équilibré' : ariary(c.ecart)}</span>} />
            </div>
            {seuil ? <p className="bp-seuil mt-3 rounded-xl bg-violetClair px-3.5 py-3 text-[17px] font-bold text-violet leading-snug">{seuil}</p> : null}
            {seuilUnites ? <p className="bp-seuil-unites mt-2 rounded-xl bg-violetClair px-3.5 py-2.5 text-[15px] font-bold text-violet leading-snug">{seuilUnites}</p> : null}
            {seuil ? (
              <div className="mt-2">
                <Calcul niveau={niveau} texte={f.seuil} />
              </div>
            ) : null}
          </>
        )}
      </Carte>

      <Carte id="s5c" titre="5c. Mon démarrage" sousTitre="Ce qu'il faut avant la première vente, et qui le finance." className="bp-section">
        {tete('5c')}
        {enExplication('5c') ? null : (
          <>
            <p className="text-[15px] font-bold text-encre mb-1.5">Investissements</p>
            <ListeInvestissements
              lignes={m5.investissements}
              apportes={m5.ressources.filter((r) => r.nature === 'materiel')}
              lectureSeule={ls}
              changer={changerInvest}
              supprimer={supprimerInvest}
              ajouter={() => set((m) => void m.investissements.push(investissementVide()))}
            />
            <div className="rounded-xl bg-turquoiseClair px-3 py-1 mb-4">
              <Resultat label="Investissements achetés" valeur={<span className="bp-investissements">{ariary(c.investissements)}</span>} fort />
              <Calcul niveau={niveau} texte={f.investissements} />
              {c.apporte ? <Resultat label="Matériel apporté" valeur={ariary(c.apporte)} /> : null}
            </div>
            <ChampMontant
              label="Stock de départ"
              valeur={m5.stockDepart}
              onChange={(v) =>
                set((m) => {
                  m.stockDepart = v;
                })
              }
              lectureSeule={ls}
            />
            <ChampMontant
              label="Fonds de roulement"
              aide={
                niveau === 'rapide' ? (
                  <Calcul niveau={niveau} texte={f.fonds} />
                ) : (
                  <p className="text-[14px] text-doux mt-1 leading-snug">
                    Calcul proposé : 3 mois de charges fixes ({ariary(3 * c.chargesFixes)}) + stock de départ ({ariary(c.stock)}) = {ariary(c.fondsPropose)}
                  </p>
                )
              }
              valeur={m5.fondsRoulementSaisi ?? c.fondsPropose}
              onChange={(v) =>
                set((m) => {
                  m.fondsRoulementSaisi = v;
                })
              }
              lectureSeule={ls}
            />
            {!ls && m5.fondsRoulementSaisi !== null && m5.fondsRoulementSaisi !== c.fondsPropose ? (
              <button
                type="button"
                onClick={() =>
                  set((m) => {
                    m.fondsRoulementSaisi = null;
                  })
                }
                className="-mt-2 mb-4 min-h-[44px] px-4 rounded-xl border-2 border-turquoise text-turquoiseTexte font-bold"
              >
                Utiliser le calcul ({ariary(c.fondsPropose)})
              </button>
            ) : null}

            <p className="text-[15px] font-bold text-encre mb-1 mt-2">Mes ressources</p>
            <p className="text-[14px] text-doux mb-2 leading-snug">
              Argent du porteur ou des associés, matériel apporté, subvention, prêt : une ligne par ressource. Le matériel que vous apportez se saisit ici, une seule fois : l'app
              l'ajoute à vos besoins.
            </p>
            <ListeRessources
              lignes={m5.ressources}
              lectureSeule={ls}
              changer={changerRessource}
              supprimer={supprimerRessource}
              ajouter={() => set((m) => void m.ressources.push(ressourceVide()))}
            />

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl bg-violetClair p-3 min-w-0">
                <p className="text-[13px] text-doux">Besoins</p>
                <p className="bp-besoins text-[17px] font-bold text-violet tabular-nums break-words">{ariary(c.besoins)}</p>
                <p className="text-[12px] text-doux mt-0.5">Investissements achetés + matériel apporté + fonds de roulement</p>
              </div>
              <div className="rounded-xl bg-turquoiseClair p-3 min-w-0">
                <p className="text-[13px] text-doux">Ressources</p>
                <p className="bp-ressources text-[17px] font-bold text-turquoiseTexte tabular-nums break-words">{ariary(c.ressources)}</p>
              </div>
            </div>
            <div className="mt-2">
              <Calcul niveau={niveau} texte={f.besoins} />
              <Calcul niveau={niveau} texte={f.ressources} />
            </div>
            <div className="mt-2.5 rounded-xl border border-filet px-3 py-1">
              <Resultat label="Écart (ressources moins besoins)" valeur={c.ecart === 0 ? '0 Ar : équilibré' : ariary(c.ecart)} fort />
              <Calcul niveau={niveau} texte={f.ecart} />
            </div>
            <Alertes liste={liste} section="5c" offre={offre} />
          </>
        )}
      </Carte>

      <Carte id="s5d" titre="5d. Mes résultats sur 3 ans" sousTitre="L'année 1 est obligatoire, les années 2 et 3 sont facultatives." className="bp-section">
        {tete('5d')}
        {enExplication('5d') ? null : (
          <>
            <div className="flex gap-1.5 mb-3 rounded-xl bg-violetClair p-1" role="tablist" aria-label="Année">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={annee === i}
                  onClick={() => ouvrirAnnee(i)}
                  className={`flex-1 min-h-[44px] rounded-lg font-bold text-[15px] ${annee === i ? 'bg-violet text-white' : 'text-violet'}`}
                >
                  Année {i + 1}
                </button>
              ))}
            </div>
            <div role="tabpanel" aria-label={`Année ${annee + 1}`} className="bp-annee">
              {annee === 0 ? (
                <>
                  <p className="text-[14px] text-doux mb-2 leading-snug">Les ventes par mois de l'année 1 se saisissent produit par produit, en 5a.</p>
                  <div className="rounded-xl border border-filet px-3 py-1 mb-4">
                    <Resultat label="Charges fixes par mois (reprises de 5b)" valeur={ariary(c.chargesFixes)} />
                  </div>
                </>
              ) : (
                <>
                  <ChampDecimal
                    key={`h${annee}`}
                    label="Hausse des ventes (%)"
                    aide={
                      <p className="text-[14px] text-doux mt-1 leading-snug">
                        Par rapport à l'année {annee}, pour tous vos produits. 0 = ventes stables ; un nombre négatif = une baisse. Laissez vide si vous ne savez pas : l'année
                        reste vide.
                      </p>
                    }
                    valeur={m5.hausses[annee - 1]}
                    onChange={(v) =>
                      set((m) => {
                        m.hausses[annee - 1] = v;
                      })
                    }
                    suffixe="%"
                    negatif
                    refuse={(v) => (v <= -100 ? 'Une baisse de 100 % ou plus voudrait dire ne plus rien vendre : indiquez une baisse plus petite.' : null)}
                    lectureSeule={ls}
                  />
                  <ChampMontant
                    label="Charges fixes par mois"
                    valeur={m5.annees[annee].chargesFixesMois}
                    onChange={(v) =>
                      set((m) => {
                        m.annees[annee].chargesFixesMois = v;
                      })
                    }
                    lectureSeule={ls}
                  />
                </>
              )}
              {a ? (
                <div className="rounded-xl bg-turquoiseClair px-3 py-1">
                  {c.produits.length === 1 ? <Resultat label="Quantités vendues dans l'année" valeur={`${grouper(a.quantites)} ${unites(a.quantites)}`} /> : null}
                  {c.produits.length === 1 ? <Calcul key={`q${annee}`} niveau={niveau} texte={f.quantites} /> : null}
                  <Resultat label="Chiffre d'affaires" valeur={<span className="bp-annee-ca">{ariary(a.ca)}</span>} />
                  <Calcul key={`ca${annee}`} niveau={niveau} texte={f.ca} />
                  <Resultat label="Coûts variables" valeur={ariary(a.cv)} />
                  <Calcul key={`cv${annee}`} niveau={niveau} texte={f.cv} />
                  <Resultat label="Marge totale" valeur={ariary(a.marge)} />
                  <Calcul key={`m${annee}`} niveau={niveau} texte={f.margeTotale} />
                  <Resultat label="Charges fixes de l'année" valeur={ariary(a.chargesAnnee)} />
                  <Calcul key={`cf${annee}`} niveau={niveau} texte={f.chargesAnnee} />
                  <Resultat label="Résultat avant amortissements et avant impôt" valeur={<span className="bp-annee-resultat">{ariary(a.resultat)}</span>} fort />
                  <Calcul key={`r${annee}`} niveau={niveau} texte={f.resultat} />
                  {a.impot !== null ? <Resultat label="Impôt" valeur={ariary(a.impot)} /> : null}
                  {a.net !== null ? <Resultat label="Résultat net" valeur={ariary(a.net)} fort /> : null}
                </div>
              ) : (
                <p className="bp-annee-vide text-doux italic">
                  {annee === 0
                    ? 'Indiquez le prix et les ventes par mois de vos produits (5a) pour voir les résultats de cette année.'
                    : annee === 2 && !c.annees[1]
                      ? "Remplissez d'abord la hausse des ventes de l'année 2."
                      : 'Indiquez la hausse des ventes pour voir les résultats de cette année.'}
                </p>
              )}
            </div>
            <div className="mt-4">
              <ChampNombre
                label="Taux d'impôt (à confirmer au centre fiscal)"
                mention="Facultatif"
                valeur={m5.tauxImpot}
                onChange={(v) =>
                  set((m) => {
                    m.tauxImpot = v === null ? null : Math.min(v, 100);
                  })
                }
                suffixe="%"
                lectureSeule={ls}
              />
            </div>
            <Alertes liste={liste} section="5d" offre={offre} />
          </>
        )}
      </Carte>

      <Carte id="s5e" titre="5e. Mes hypothèses" className="bp-section">
        <ChampTexte
          label="Mes hypothèses"
          aide={
            <p className="text-[14px] text-doux mt-1 leading-snug">
              D'où viennent vos chiffres ? Combien de clients, à quel prix, vus où, quand ? Écrivez ce que vous avez vérifié et ce qui reste à vérifier.
            </p>
          }
          valeur={m5.hypotheses}
          onChange={(v) =>
            set((m) => {
              m.hypotheses = v;
            })
          }
          lectureSeule={ls}
        />
      </Carte>

      <Carte id="s5f" titre="5f. Mes risques" sousTitre="Trois choses qui peuvent mal tourner, et votre réponse." className="bp-section">
        {m5.risques.map((r, i) => (
          <div key={r.id} className="rounded-xl border border-filet p-3 mb-3">
            <ChampTexte label={`Risque ${i + 1}`} valeur={r.risque} onChange={(v) => set((m) => void (m.risques[i].risque = v))} lectureSeule={ls} />
            <ChampTexte label="Ce que je ferai" valeur={r.reponse} onChange={(v) => set((m) => void (m.risques[i].reponse = v))} lectureSeule={ls} />
          </div>
        ))}
      </Carte>

      <button
        type="button"
        onClick={partager}
        className="w-full min-h-[52px] rounded-xl bg-turquoiseTexte text-white text-[17px] font-bold flex items-center justify-center gap-2 active:opacity-90"
      >
        <Icone nom="partager" /> Partager mes chiffres
      </button>
      {message ? (
        <p role="status" className="mt-2 text-[15px] text-encre">
          {message}
        </p>
      ) : null}
    </>
  );
}
