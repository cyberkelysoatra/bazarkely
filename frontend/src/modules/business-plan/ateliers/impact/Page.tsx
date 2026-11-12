// "Impact et emplois" (fiche ETAPE-06, NEC-CC-12): hook, solved example TRANO KELY, 6a my jobs (comprehension
// loop A1, people paid in years 1 to 3, prefilled from module 4), 6b who benefits, rule checks, end of step.
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { AtelierProps, Impact, Plan, TempsEmploi } from '../../types';
import { ChampNombre, ChampTexte, Choix } from '../../composants/Champs';
import { Carte, Resultat } from '../../composants/Carte';
import { Alerte } from '../../composants/Alerte';
import { Icone } from '../../composants/Icones';
import { BoucleComprehension } from '../../composants/BoucleComprehension';
import { impactDe, impactVide, nouvelId } from '../../etat/vide';
import {
  BOUCLE_A1,
  PREMIERE_ANNEE,
  RAPPEL_BENEVOLE,
  clientsProposes,
  emploisDepuisEquipe,
  impactTermine,
  partenairesDepuisCanvas,
  phraseProposee,
  regles,
  reglesChiffres,
  totaux
} from './regles';

type Emploi = Impact['emplois'][number];

const STATUTS = [
  { v: 'moi' as const, t: "Moi, j'en vis" },
  { v: 'salarie' as const, t: 'Salarié' },
  { v: 'benevole' as const, t: 'Bénévole (non compté)' }
];
const TEMPS = [
  { v: 'plein' as const, t: 'Temps plein' },
  { v: 'partiel' as const, t: 'Temps partiel' }
];

const EXEMPLE_EMPLOIS: { role: string; annees: [string, string, string] }[] = [
  { role: "Moi, gérant, j'en vis", annees: ['1, temps plein', '1, temps plein', '1, temps plein'] },
  { role: 'Femme de ménage, salariée', annees: ['1, temps partiel', '1, temps plein', '1, temps plein'] },
  { role: 'Accueil du soir, salarié', annees: ['', '1, temps partiel', '1, temps partiel'] }
];

function ExempleTranoKely() {
  return (
    <Carte titre="Exemple résolu : TRANO KELY" sousTitre="Projet fictif, suite des modules précédents.">
      <p className="text-[15px] font-bold text-encre mb-2">Emplois</p>
      <ul className="space-y-2 mb-2">
        {EXEMPLE_EMPLOIS.map((e) => (
          <li key={e.role} className="rounded-lg border border-filet px-3 py-2 text-[15px] leading-snug">
            <p className="font-bold text-encre">{e.role}</p>
            <p className="text-doux">{e.annees.map((a, k) => `Année ${k + 1} : ${a || 'non'}`).join(' ; ')}</p>
          </li>
        ))}
      </ul>
      <Resultat label="Total des personnes payées" valeur="2, puis 3, puis 3" fort />
      <p className="text-[15px] text-doux leading-snug mt-1 mb-3">Bénévole (non compté) : ma mère, petit-déjeuner, en année 1.</p>
      <p className="text-[15px] text-encre leading-relaxed mb-3">
        Pourquoi l'année 2 : plus de nuits vendues (module 5), la femme de ménage passe à temps plein et un accueil du soir est ajouté.
      </p>
      <p className="text-[15px] font-bold text-encre mb-1">Qui en profite</p>
      <ul className="list-disc pl-5 text-[15px] text-encre leading-relaxed space-y-1">
        <li>Clients servis : environ 13 voyageurs par mois en année 1 (54 nuits, 4 nuits par séjour).</li>
        <li>Fournisseurs et partenaires locaux payés : la blanchisserie, un taxi, des guides d'excursion (repris du bloc 8 du canvas).</li>
        <li>Mon projet et l'environnement : bouteilles d'eau en plastique des clients, déchets des chambres ; fontaine d'eau filtrée et gourdes, tri des déchets.</li>
        <li>
          Phrase d'impact : « TRANO KELY fait vivre 2 personnes dès la première année, 3 en 2028, et fait travailler une blanchisserie, un taxi et des guides de Nosy Be. »
        </li>
      </ul>
    </Carte>
  );
}

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  const impact = impactDe(plan);
  const set = (recette: (i: Impact, p: Plan) => void) =>
    modifier((p) => {
      p.impact ??= impactVide();
      recette(p.impact, p);
    });

  // Year 1 prefilled once with the team of module 4, suppliers with block 8 of the canvas.
  useEffect(() => {
    if (ls || impact.prerempli) return;
    set((i, p) => {
      if (!i.emplois.length) i.emplois = emploisDepuisEquipe(p);
      if (!i.partenaires.length) i.partenaires = partenairesDepuisCanvas(p);
      i.clientsMois ??= clientsProposes(p);
      i.prerempli = true;
    });
    // Once, at the first opening of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changer = (id: string, patch: Partial<Emploi>) =>
    set((i) => {
      const e = i.emplois.find((x) => x.id === id);
      if (e) Object.assign(e, patch);
    });
  const changerAnnee = (e: Emploi, k: number, t: TempsEmploi) => {
    const annees = [...e.annees] as Emploi['annees'];
    annees[k] = t;
    changer(e.id, { annees });
  };
  const ajouter = () => set((i) => void i.emplois.push({ id: nouvelId(), role: '', statut: 'salarie', annees: ['', '', ''] }));

  const [n1, n2, n3] = totaux(impact);
  const payes = impact.emplois.filter((e) => e.statut !== 'benevole');
  const benevoles = impact.emplois.filter((e) => e.statut === 'benevole');
  const visibles = (l: Emploi[]) => (ls ? l.filter((e) => e.role.trim()) : l);
  const controles = [...regles(plan), ...reglesChiffres(plan)];
  const propose = clientsProposes(plan);
  const phrase = phraseProposee(plan);

  const ligne = (e: Emploi, i: number) => (
    <li key={e.id} className="bp-emploi rounded-xl border border-filet p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <ChampTexte label={`Personne ${i + 1} : son rôle`} placeholder="Ex. : livreur" ligne valeur={e.role} onChange={(v) => changer(e.id, { role: v })} lectureSeule={ls} />
        </div>
        {!ls ? (
          <button
            type="button"
            onClick={() => set((im) => void (im.emplois = im.emplois.filter((x) => x.id !== e.id)))}
            className="shrink-0 mt-6 w-11 h-11 rounded-lg flex items-center justify-center text-doux active:bg-violetClair"
            aria-label={`Supprimer la personne ${i + 1}`}
          >
            <Icone nom="poubelle" />
          </button>
        ) : null}
      </div>
      <Choix label="Statut" options={STATUTS} valeur={e.statut} onChange={(v) => changer(e.id, { statut: v })} lectureSeule={ls} />
      {e.statut !== 'benevole'
        ? [0, 1, 2].map((k) => (
            <Choix
              key={k}
              label={`Année ${k + 1} (${PREMIERE_ANNEE + k})`}
              options={TEMPS}
              valeur={e.annees[k]}
              onChange={(v) => changerAnnee(e, k, v)}
              lectureSeule={ls}
            />
          ))
        : null}
    </li>
  );

  return (
    <>
      <Carte ton="violet" ecouter>
        <p className="text-[19px] font-bold text-violet leading-tight mb-2">Ton projet ne fait pas vivre que toi.</p>
        <p className="text-[15px] text-encre leading-relaxed">
          Combien de personnes seront payées grâce à lui ? Qui en profite autour de toi ? Le jury d'un concours et ceux qui donnent une subvention posent toujours cette question.
        </p>
      </Carte>

      <ExempleTranoKely />

      <Carte id="s6a" titre="6a. Mes emplois" sousTitre="Les personnes payées par ton projet en années 1, 2 et 3.">
        <BoucleComprehension donnees={BOUCLE_A1} etat={impact.boucle} onChange={(b) => set((i) => void (i.boucle = b))} lectureSeule={ls} />

        <p className="text-[15px] text-encre leading-relaxed mb-1">L'année 1 est reprise de ton équipe du module 4. Corrige si besoin.</p>
        <p className="text-[15px] text-doux leading-relaxed mb-3">
          Années 2 et 3 : si tes ventes grandissent, qui embaucheras-tu, et pour faire quoi ? Ne pas créer d'emploi la 2e année n'est pas une faute, l'inventer en est une.
        </p>
        {ls && !visibles(payes).length ? <p className="text-doux italic mb-3">Aucune personne</p> : null}
        <ul className="space-y-3">{visibles(payes).map(ligne)}</ul>
        {!ls ? (
          <button
            type="button"
            onClick={ajouter}
            className="mt-3 mb-4 min-h-[44px] w-full rounded-xl border-2 border-dashed border-turquoise text-turquoiseTexte font-bold flex items-center justify-center gap-2 active:bg-turquoiseClair"
          >
            <Icone nom="plus" /> Ajouter une personne payée
          </button>
        ) : (
          <div className="h-4" />
        )}

        <div className="rounded-xl bg-violetClair px-3.5 py-2.5 mb-4">
          {[n1, n2, n3].map((n, k) => (
            <Resultat key={k} label={`Total des personnes payées, année ${k + 1}`} valeur={n} fort={k === 0} />
          ))}
        </div>

        {benevoles.length ? (
          <div className="bp-benevoles rounded-xl border border-filet p-3 mb-4">
            <p className="text-[15px] font-bold text-encre mb-1">Bénévoles (non comptés)</p>
            <p className="text-[14px] text-doux leading-snug mb-3">{RAPPEL_BENEVOLE}</p>
            <ul className="space-y-3">{visibles(benevoles).map(ligne)}</ul>
          </div>
        ) : null}

        <p className="text-[15px] font-bold text-encre mb-2">Facultatif (des nombres seulement, aucun nom)</p>
        <ChampNombre label="Dont femmes, en année 1" valeur={impact.femmes} onChange={(v) => set((i) => void (i.femmes = v))} lectureSeule={ls} />
        <ChampNombre label="Dont jeunes de moins de 35 ans, en année 1" valeur={impact.jeunes} onChange={(v) => set((i) => void (i.jeunes = v))} lectureSeule={ls} />
      </Carte>

      <Carte id="s6b" titre="6b. Qui en profite" sousTitre="Tes clients, tes fournisseurs, et ta phrase pour le jury.">
        <ChampNombre
          label="Clients servis par mois en année 1"
          aide={
            <p className="text-[14px] text-doux mt-1 leading-snug">
              {propose !== null && !ls ? `Proposé : ${propose}, d'après tes ventes visées du module 3. ` : ''}Est-ce juste ? Corrige si un client achète plusieurs fois par mois.
            </p>
          }
          valeur={impact.clientsMois ?? (ls ? null : propose)}
          onChange={(v) => set((i) => void (i.clientsMois = v))}
          lectureSeule={ls}
        />

        <p className="text-[15px] font-bold text-encre leading-snug">Fournisseurs et partenaires locaux payés</p>
        <p className="text-[14px] text-doux mt-1 mb-2 leading-snug">Repris du bloc 8 du canvas. Lesquels sont de Nosy Be ou de la région ? Coche-les.</p>
        {ls && !impact.partenaires.length ? <p className="text-doux italic mb-3">Aucun partenaire</p> : null}
        <ul className="space-y-2 mb-3">
          {impact.partenaires.map((pa, i) => (
            <li key={pa.id} className="bp-partenaire flex items-center gap-2 rounded-lg border border-filet px-2.5 py-1.5">
              <input
                type="checkbox"
                className="shrink-0 w-5 h-5 accent-violet"
                checked={pa.local}
                disabled={ls}
                aria-label={`${pa.nom || `Partenaire ${i + 1}`} est de Nosy Be ou de la région`}
                onChange={(e) => set((im) => void (im.partenaires[i].local = e.target.checked))}
              />
              {ls ? (
                <span className="flex-1 min-w-0 py-2 text-[15px] text-encre break-words">
                  {pa.nom}
                  {pa.local ? <span className="text-doux"> (local)</span> : null}
                </span>
              ) : (
                <>
                  <input
                    className="bp-champ min-w-0 flex-1"
                    value={pa.nom}
                    placeholder="Ex. : la coopérative"
                    aria-label={`Partenaire ${i + 1}`}
                    onChange={(e) => set((im) => void (im.partenaires[i].nom = e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => set((im) => void (im.partenaires = im.partenaires.filter((x) => x.id !== pa.id)))}
                    className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center text-doux active:bg-violetClair"
                    aria-label={`Supprimer le partenaire ${i + 1}`}
                  >
                    <Icone nom="poubelle" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
        {!ls ? (
          <button
            type="button"
            onClick={() => set((i) => void i.partenaires.push({ id: nouvelId(), nom: '', local: false }))}
            className="mb-4 min-h-[44px] w-full rounded-xl border-2 border-dashed border-turquoise text-turquoiseTexte font-bold flex items-center justify-center gap-2 active:bg-turquoiseClair"
          >
            <Icone nom="plus" /> Ajouter un partenaire
          </button>
        ) : null}

        <ChampTexte
          label="Autre effet positif (facultatif, une ligne)"
          aide={<p className="text-[14px] text-doux mt-1 leading-snug">Ton projet fait-il du bien autrement : moins de déchets, des produits locaux, un service qui manquait ?</p>}
          ligne
          valeur={impact.autreEffet}
          onChange={(v) => set((i) => void (i.autreEffet = v))}
          lectureSeule={ls}
        />

        {/* NEC-CC-17: two optional lines for every plan (ETAPE-06 v0.2, part 4). */}
        <div className="bp-environnement rounded-xl border border-filet p-3 mb-4">
          <p className="text-[15px] font-bold text-encre mb-2">Mon projet et l'environnement</p>
          <ChampTexte
            label="Ce qu'il abîme (une ou deux lignes)"
            aide={
              <p className="text-[14px] text-doux mt-1 leading-snug">
                Tout projet laisse une trace : un déchet, un emballage, du carburant, du bruit, de l'eau gaspillée. Quelle est la trace du tien ?
              </p>
            }
            valeur={impact.envTrace ?? ''}
            onChange={(v) => set((i) => void (i.envTrace = v))}
            lectureSeule={ls}
          />
          <ChampTexte
            label="Ce que je fais pour la réduire (une ou deux lignes)"
            aide={<p className="text-[14px] text-doux mt-1 leading-snug">Que fais-tu pour la réduire : réutiliser, trier, donner à quelqu'un qui s'en sert, consommer moins ?</p>}
            valeur={impact.envReduction ?? ''}
            onChange={(v) => set((i) => void (i.envReduction = v))}
            lectureSeule={ls}
          />
        </div>

        {!ls ? (
          <div className="rounded-xl bg-turquoiseClair px-3.5 py-3 mb-3">
            <p className="text-[14px] font-bold text-turquoiseTexte mb-1">Phrase proposée avec tes chiffres</p>
            <p className="bp-phrase-proposee text-[15px] text-encre leading-relaxed mb-2">{phrase}</p>
            <button
              type="button"
              onClick={() => set((i) => void (i.phrase = phrase))}
              className="min-h-[44px] w-full rounded-xl border-2 border-turquoiseTexte text-turquoiseTexte font-bold bg-white active:bg-turquoiseClair"
            >
              Garder cette phrase
            </button>
          </div>
        ) : null}
        <ChampTexte
          label="Ma phrase d'impact"
          aide={<p className="text-[14px] text-doux mt-1 leading-snug">Garde-la, corrige-la ou réécris-la.</p>}
          valeur={impact.phrase}
          onChange={(v) => set((i) => void (i.phrase = v))}
          lectureSeule={ls}
        />
      </Carte>

      {controles.length && !ls ? (
        <Carte titre="Mes vérifications" sousTitre="Des conseils, rien ne t'empêche d'avancer.">
          {controles.map((c) => (
            <Alerte key={c.cle} texte={c.texte} />
          ))}
        </Carte>
      ) : null}

      {impactTermine(plan) ? (
        <Carte ton="turquoise">
          <p className="bp-fin-etape text-[17px] font-bold text-encre leading-snug mb-1">
            Étape 6 terminée. Ton projet fait vivre {n1} personne{n1 > 1 ? 's' : ''} dès la première année.
          </p>
          <p className="text-[15px] text-encre leading-relaxed mb-3">Bon appétit : à 12 h 50, on prépare la mission de terrain.</p>
          <Link to={`/p/${plan.id}/mission`} className="min-h-[48px] rounded-xl bg-violet text-white font-bold flex items-center justify-center gap-2">
            Préparer ma mission <Icone nom="chevron" />
          </Link>
        </Carte>
      ) : null}
    </>
  );
}
