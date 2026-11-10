// Module 3 "Marché et concurrence" (workbook pages 8 and 9): 3a market size, 3b competitors, 3c SWOT.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AtelierProps, Plan } from '../../types';
import { ChampMontant, ChampNombre, ChampTexte, Choix } from '../../composants/Champs';
import { Carte, Resultat } from '../../composants/Carte';
import { Aide } from '../../composants/Aide';
import { Icone } from '../../composants/Icones';
import { nouvelId } from '../../etat/vide';
import { ariary, grouper, pluriel } from '../../utils/format';
import { calculerMarche } from './calculs';

type Concurrent = Plan['m3']['concurrents'][number];
type CleSwot = keyof Plan['m3']['swot'];

const SWOT: { cle: CleSwot; titre: string; sens: string; fond: string; texte: string; consigne: string }[] = [
  { cle: 'forces', titre: 'FORCES', sens: 'internes, positives', fond: 'bg-turquoiseClair border-turquoiseClair', texte: 'text-turquoiseTexte', consigne: 'Ce que vous faites bien, ce que vous avez de plus que les autres.' },
  { cle: 'faiblesses', titre: 'FAIBLESSES', sens: 'internes, négatives', fond: 'bg-violetClair border-violetClair', texte: 'text-violet', consigne: 'Ce qui vous manque, et ce que vous ferez pour le réduire.' },
  { cle: 'opportunites', titre: 'OPPORTUNITÉS', sens: 'externes, positives', fond: 'bg-white border-turquoise', texte: 'text-turquoiseTexte', consigne: 'Ce qui, autour de vous, peut vous aider.' },
  { cle: 'menaces', titre: 'MENACES', sens: 'externes, négatives', fond: 'bg-white border-violet', texte: 'text-violet', consigne: 'Ce qui, autour de vous, peut vous gêner, et votre réponse.' }
];

const TYPES = [
  { v: 'direct' as const, t: 'Direct' },
  { v: 'indirect' as const, t: 'Indirect' }
];

function ConcurrentVide(): Concurrent {
  return { id: nouvelId(), nom: '', type: '', prix: '', forts: '', faibles: '', mieux: '' };
}

/** Soft reminder (not an error): violet, no red. */
function Rappel({ texte }: { texte: string }) {
  return (
    <div className="bp-rappel flex items-start gap-2.5 rounded-xl bg-violetClair px-3 py-2.5 mb-3">
      <span className="text-violet shrink-0 mt-0.5">
        <Icone nom="info" />
      </span>
      <p className="text-[15px] leading-snug text-encre">{texte}</p>
    </div>
  );
}

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  const m3 = plan.m3;
  const r = useMemo(() => calculerMarche(m3), [m3]);
  const [repris, setRepris] = useState(false);
  const set = (recette: (m: Plan['m3']) => void) => modifier((p) => recette(p.m3));
  const unites = (n: number) => pluriel(plan.uniteVente, n);
  const prix5 = plan.m5.prixVente;
  const ventes5 = plan.m5.annees[0]?.ventesParMois ?? null;

  const changerConcurrent = (id: string, patch: Partial<Concurrent>) =>
    set((m) => {
      const c = m.concurrents.find((x) => x.id === id);
      if (c) Object.assign(c, patch);
    });

  const concurrents = ls ? m3.concurrents.filter((c) => c.nom.trim() || c.forts.trim() || c.faibles.trim()) : m3.concurrents;

  return (
    <>
      <Aide titre="À retenir">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Un jury ne vous demande pas un chiffre exact, il veut voir que vous savez raisonner.</li>
          <li>
            Dire « je n'ai pas de concurrent » est l'erreur la plus fréquente devant un jury : il y a toujours une autre solution, au moins « ne rien acheter ».
          </li>
        </ul>
        <p className="mt-3 font-bold">À RETENIR</p>
        <p>Allez relever les prix des concurrents vous-même, au marché ou en magasin. Pour chaque faiblesse et chaque menace, notez ce que vous ferez pour la réduire.</p>
      </Aide>

      <Carte id="s3a" titre="3a. La taille de mon marché" sousTitre="Combien de clients possibles, combien ils achètent, combien vous visez.">
        <ChampTexte
          label="Mon unité de vente"
          mention="La même qu'au module 5"
          placeholder="une bouteille, une nuitée, un repas"
          ligne
          valeur={plan.uniteVente}
          onChange={(v) =>
            modifier((p) => {
              p.uniteVente = v;
            })
          }
          lectureSeule={ls}
        />

        <div className="rounded-xl border border-filet p-3 mb-3">
          <ChampNombre label="Nombre de clients possibles" valeur={m3.nbClients} onChange={(v) => set((m) => void (m.nbClients = v))} suffixe="clients" lectureSeule={ls} />
          <ChampTexte label="D'où vient ce chiffre ?" placeholder="Ex. : liste des hôtels de l'office du tourisme" valeur={m3.nbClientsSource} onChange={(v) => set((m) => void (m.nbClientsSource = v))} lectureSeule={ls} />
        </div>
        <div className="rounded-xl border border-filet p-3 mb-3">
          <ChampNombre
            label={`Quantité par achat${plan.uniteVente.trim() ? ` (${unites(2)})` : ''}`}
            valeur={m3.qteParAchat}
            onChange={(v) => set((m) => void (m.qteParAchat = v))}
            lectureSeule={ls}
          />
          <ChampTexte label="D'où vient ce chiffre ?" placeholder="Ex. : demandé à 5 clients" valeur={m3.qteSource} onChange={(v) => set((m) => void (m.qteSource = v))} lectureSeule={ls} />
        </div>
        <div className="rounded-xl border border-filet p-3 mb-4">
          <ChampNombre label="Achats par mois" valeur={m3.achatsParMois} onChange={(v) => set((m) => void (m.achatsParMois = v))} suffixe="fois" lectureSeule={ls} />
          <ChampTexte label="D'où vient ce chiffre ?" placeholder="Ex. : un achat par semaine" valeur={m3.achatsSource} onChange={(v) => set((m) => void (m.achatsSource = v))} lectureSeule={ls} />
        </div>

        <div className="rounded-xl bg-turquoiseClair px-3 py-1 mb-4">
          <Resultat
            label="Marché potentiel par mois"
            valeur={<span className="bp-potentiel">{r.potentielMois === null ? '' : `${grouper(r.potentielMois)} ${unites(r.potentielMois)}`}</span>}
            fort
          />
          {r.potentielMois === null ? <p className="text-[14px] text-doux pb-1.5">Clients × quantité × achats par mois.</p> : null}
        </div>

        <ChampMontant label="Prix de vente unitaire prévu" valeur={m3.prixPrevu} onChange={(v) => set((m) => void (m.prixPrevu = v))} lectureSeule={ls} />
        {!ls && m3.prixPrevu === null && prix5 !== null ? (
          <button
            type="button"
            onClick={() => set((m) => void (m.prixPrevu = prix5))}
            className="bp-reprendre-prix -mt-2 mb-4 min-h-[44px] w-full px-4 rounded-xl border-2 border-turquoise text-turquoiseTexte font-bold"
          >
            Reprendre le prix du module 5 : {ariary(prix5)}
          </button>
        ) : null}
        {r.potentielAr !== null ? (
          <div className="rounded-xl bg-turquoiseClair px-3 py-1 mb-4">
            <Resultat label="Marché potentiel en Ar, par mois" valeur={<span className="bp-potentiel-ar">{ariary(r.potentielAr)}</span>} fort />
          </div>
        ) : null}

        <ChampNombre
          label="Part visée en année 1"
          aide={<p className="text-[14px] text-doux mt-1 leading-snug">Souvent de 5 à 20 % du marché potentiel.</p>}
          valeur={m3.partVisee}
          onChange={(v) => set((m) => void (m.partVisee = v === null ? null : Math.min(v, 100)))}
          suffixe="%"
          lectureSeule={ls}
        />

        {r.ventesMois !== null ? (
          <div className="rounded-xl bg-violetClair px-3 py-1">
            <Resultat label="Ventes visées par mois" valeur={<span className="bp-ventes-mois">{`${grouper(r.ventesMois)} ${unites(r.ventesMois)}`}</span>} fort />
            <Resultat label="Ventes visées par an" valeur={<span className="bp-ventes-an">{`${grouper(r.ventesAn ?? 0)} ${unites(r.ventesAn ?? 0)}`}</span>} />
            {r.ventesAnAr !== null ? <Resultat label="Ventes visées par an, en Ar" valeur={<span className="bp-ventes-ar">{ariary(r.ventesAnAr)}</span>} fort /> : null}
          </div>
        ) : null}

        {!ls && r.ventesMois !== null && r.ventesMois > 0 && ventes5 === null ? (
          <button
            type="button"
            onClick={() => {
              const v = r.ventesMois;
              modifier((p) => {
                p.m5.annees[0].ventesParMois = v;
              });
              setRepris(true);
            }}
            className="bp-utiliser-ventes mt-3 min-h-[48px] w-full px-4 rounded-xl bg-turquoiseTexte text-white font-bold"
          >
            Utiliser ces ventes dans mes chiffres (module 5)
          </button>
        ) : null}
        {repris ? (
          <p role="status" className="mt-3 text-[15px] text-turquoiseTexte font-bold flex items-center gap-1.5">
            <Icone nom="coche" /> Ventes de l'année 1 reprises dans le module 5.
          </p>
        ) : null}
      </Carte>

      <Carte id="s3b" titre="3b. Mes concurrents" sousTitre="Tous ceux à qui votre client peut acheter à la place, même une autre solution.">
        {!m3.concurrents.some((c) => c.nom.trim()) ? (
          <Rappel texte="Citez au moins un concurrent, même indirect : un jury repère tout de suite « je n'ai pas de concurrent »." />
        ) : null}
        {ls && !concurrents.length ? <p className="text-doux italic mb-3">Aucun concurrent</p> : null}
        <ul className="space-y-3">
          {concurrents.map((c, i) => (
            <li key={c.id} className="bp-concurrent rounded-xl border border-filet p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <ChampTexte label={`Concurrent ${i + 1}`} placeholder="Nom" ligne valeur={c.nom} onChange={(v) => changerConcurrent(c.id, { nom: v })} lectureSeule={ls} />
                </div>
                {!ls ? (
                  <button
                    type="button"
                    onClick={() => set((m) => void (m.concurrents = m.concurrents.filter((x) => x.id !== c.id)))}
                    className="shrink-0 mt-6 w-11 h-11 rounded-lg flex items-center justify-center text-doux active:bg-violetClair"
                    aria-label={`Supprimer le concurrent ${i + 1}`}
                  >
                    <Icone nom="poubelle" />
                  </button>
                ) : null}
              </div>
              <Choix label="Direct ou indirect ?" options={TYPES} valeur={c.type} onChange={(v) => changerConcurrent(c.id, { type: v })} lectureSeule={ls} />
              <ChampTexte label="Son prix" placeholder="Ex. : 5 000 Ar le litre" ligne valeur={c.prix} onChange={(v) => changerConcurrent(c.id, { prix: v })} lectureSeule={ls} />
              <ChampTexte label="Ses points forts" valeur={c.forts} onChange={(v) => changerConcurrent(c.id, { forts: v })} lectureSeule={ls} />
              <ChampTexte label="Ses points faibles" valeur={c.faibles} onChange={(v) => changerConcurrent(c.id, { faibles: v })} lectureSeule={ls} />
              <ChampTexte label="Ce que je fais mieux" valeur={c.mieux} onChange={(v) => changerConcurrent(c.id, { mieux: v })} lectureSeule={ls} />
            </li>
          ))}
        </ul>
        {!ls ? (
          <button
            type="button"
            onClick={() => set((m) => void m.concurrents.push(ConcurrentVide()))}
            className="mt-3 min-h-[44px] w-full rounded-xl border-2 border-dashed border-turquoise text-turquoiseTexte font-bold flex items-center justify-center gap-2 active:bg-turquoiseClair"
          >
            <Icone nom="plus" /> Ajouter un concurrent
          </button>
        ) : null}
      </Carte>

      <Carte id="s3c" titre="3c. Ma SWOT" sousTitre="Dedans : vous et votre projet. Dehors : le marché, la saison, les règles.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SWOT.map((s) => (
            <div key={s.cle} className={`bp-swot rounded-xl border-2 ${s.fond} p-3 min-w-0`}>
              <p className={`text-[17px] font-bold leading-none ${s.texte}`}>{s.titre}</p>
              <p className="text-[13px] text-doux mt-1 mb-2">{s.sens}</p>
              <ChampTexte label={s.consigne} valeur={m3.swot[s.cle]} onChange={(v) => set((m) => void (m.swot[s.cle] = v))} lectureSeule={ls} />
            </div>
          ))}
        </div>
      </Carte>

      <Carte ton="violet" titre="À FAIRE CE SOIR">
        <ul className="list-disc pl-5 space-y-1.5 text-[15px] leading-relaxed text-encre">
          <li>Relevez les prix d'au moins 3 concurrents, au marché ou en magasin.</li>
          <li>Relevez aussi le prix de ce que vous achèterez : matières, emballages, transport.</li>
          <li>Demandez à 3 clients possibles combien ils achètent, et à quelle fréquence.</li>
          <li>Notez chaque prix avec le lieu et la personne qui vous l'a donné.</li>
        </ul>
        <Link
          to={`/p/${plan.id}/prix`}
          className="mt-3 min-h-[48px] rounded-xl bg-violet text-white font-bold flex items-center justify-center gap-2 active:opacity-90"
        >
          Mes prix relevés <Icone nom="chevron" />
        </Link>
      </Carte>
    </>
  );
}
