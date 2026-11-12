// Module 4 "Stratégie commerciale, organisation et formalisation" (workbook pages 10 to 12):
// 4a the 4 P, 4b production and team, 4c calendar, 4d legal form and procedures.
import { useId, useState } from 'react';
import type { AtelierProps, Plan } from '../../types';
import { ChampTexte, Choix } from '../../composants/Champs';
import { Carte } from '../../composants/Carte';
import { Aide } from '../../composants/Aide';
import { Icone } from '../../composants/Icones';
import { nouvelId } from '../../etat/vide';
import { AutreExemple } from '../../composants/AutreExemple';
import { useExempleDuPlan } from '../../etat/exempleChoisi';
import type { ExempleSecteur } from '../../data/exemples';

type Membre = Plan['m4']['equipe'][number];
type CleP = 'produit' | 'prix' | 'place' | 'promotion';
type IdDemarche = Plan['m4']['demarches'][number]['id'];
type Periode = Plan['m4']['calendrier'][number]['periode'];

const QUATRE_P: { cle: CleP; titre: string; question: string }[] = [
  { cle: 'produit', titre: 'Produit', question: 'Que vendez-vous exactement ? Quelle gamme, quelle qualité, quel emballage ?' },
  { cle: 'prix', titre: 'Prix', question: 'À quel prix ? Comparé aux concurrents ? Couvre-t-il vos coûts ?' },
  { cle: 'place', titre: 'Place (distribution)', question: 'Où et comment le client achète-t-il et reçoit-il le produit ?' },
  { cle: 'promotion', titre: 'Promotion (et budget)', question: 'Comment le client vous connaît-il ? Avec quel budget ?' }
];

const TEMPS = [
  { v: 'plein' as const, t: 'Temps plein' },
  { v: 'partiel' as const, t: 'Temps partiel' },
  { v: 'benevole' as const, t: 'Bénévole' }
];

const PERIODES: { periode: Periode; titre: string }[] = [
  { periode: 't1', titre: 'Mois 1 à 3' },
  { periode: 't2', titre: 'Mois 4 à 6' },
  { periode: 't3', titre: 'Mois 7 à 9' },
  { periode: 't4', titre: 'Mois 10 à 12' }
];

const FORMES = ['Entreprise individuelle', 'SARL unipersonnelle (SARLU)', 'SARL', 'Coopérative ou association'].map((t) => ({ v: t, t }));

const TABLEAU_FORMES: { forme: string; pourQui: string; aRetenir: string }[] = [
  { forme: 'Entreprise individuelle', pourQui: 'Une personne seule qui démarre', aRetenir: "Simple ; vos biens personnels et ceux de l'entreprise ne sont pas séparés" },
  { forme: 'SARL unipersonnelle (SARLU)', pourQui: 'Une personne seule qui veut protéger ses biens', aRetenir: 'Société à un seul associé ; responsabilité limitée aux apports' },
  { forme: 'SARL', pourQui: 'De 2 associés ou plus', aRetenir: 'Forme la plus courante pour les petites sociétés' },
  { forme: 'Coopérative ou association', pourQui: 'Projet collectif (producteurs, pêcheurs) ou à but non lucratif', aRetenir: 'Gouvernance collective ; règles propres' }
];

const DEMARCHES: { id: IdDemarche; titre: string }[] = [
  { id: 'statuts', titre: 'Statuts' },
  { id: 'nif', titre: 'NIF' },
  { id: 'stat', titre: 'STAT' },
  { id: 'rcs', titre: 'Registre du commerce' },
  { id: 'carteFiscale', titre: 'Carte fiscale' },
  { id: 'compte', titre: 'Compte bancaire ou mobile money professionnel' },
  { id: 'cnaps', titre: 'CNaPS (si salariés)' }
];

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
/** "2027-01-10" -> "10 janvier 2027" (the date typed, never shifted by the time zone). */
function jourFr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])} ${MOIS[Number(m[2]) - 1]} ${m[1]}` : iso;
}

function VoirExemple({ texte, exemple, choisir }: { texte: string; exemple: ExempleSecteur; choisir: (secteur: string) => void }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  return (
    <div className="-mt-2 mb-4">
      <button type="button" aria-expanded={ouvert} aria-controls={id} onClick={() => setOuvert((o) => !o)} className="min-h-[44px] -ml-1 px-1 flex items-center gap-1.5 text-turquoiseTexte font-bold text-[15px]">
        <Icone nom="livre" /> {ouvert ? "Masquer l'exemple" : "Voir l'exemple"}
      </button>
      {ouvert ? (
        <div id={id} className="rounded-xl bg-turquoiseClair px-3.5 py-3 text-[15px] leading-relaxed text-encre">
          <p>
            <span className="font-bold">{exemple.nom} : </span>
            {texte}
          </p>
          <AutreExemple actuel={exemple} choisir={choisir} />
        </div>
      ) : null}
    </div>
  );
}

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  const m4 = plan.m4;
  // The 4 P of the example of the sector of the plan (NEC-CC-13).
  const { exemple: exempleSecteur, choisir } = useExempleDuPlan(plan);
  const exemple = exempleSecteur.plan().m4;
  const set = (recette: (m: Plan['m4']) => void) => modifier((p) => recette(p.m4));

  const changerMembre = (id: string, patch: Partial<Membre>) =>
    set((m) => {
      const e = m.equipe.find((x) => x.id === id);
      if (e) Object.assign(e, patch);
    });
  const changerPeriode = (periode: Periode, patch: { objectif?: string; responsable?: string }) =>
    set((m) => {
      let c = m.calendrier.find((x) => x.periode === periode);
      if (!c) {
        c = { periode, objectif: '', responsable: '' };
        m.calendrier.push(c);
      }
      Object.assign(c, patch);
    });
  const changerDemarche = (id: IdDemarche, patch: { fait?: boolean; datePrevue?: string }) =>
    set((m) => {
      let d = m.demarches.find((x) => x.id === id);
      if (!d) {
        d = { id, fait: false, datePrevue: '' };
        m.demarches.push(d);
      }
      Object.assign(d, patch);
    });

  const equipe = ls ? m4.equipe.filter((e) => e.personne.trim() || e.role.trim()) : m4.equipe;

  return (
    <>
      <Carte id="s4a" titre="4a. Mes 4 P" sousTitre="Ce que vous vendez, à quel prix, où, et comment on vous connaît.">
        {QUATRE_P.map((q) => (
          <div key={q.cle} className="bp-p">
            <ChampTexte
              label={q.titre}
              aide={<p className="text-[14px] text-doux mt-1 leading-snug">{q.question}</p>}
              valeur={m4[q.cle]}
              onChange={(v) => set((m) => void (m[q.cle] = v))}
              lectureSeule={ls}
            />
            {!ls && exemple[q.cle] ? <VoirExemple texte={exemple[q.cle] as string} exemple={exempleSecteur} choisir={choisir} /> : null}
          </div>
        ))}
      </Carte>

      <Carte id="s4b" titre="4b. Mes moyens et mon équipe" sousTitre="Comment vous produisez, avec qui, et grâce à qui.">
        <ChampTexte
          label="Étapes de ma production ou de mon service, de l'achat à la livraison"
          aide={<p className="text-[14px] text-doux mt-1 leading-snug">De l'achat des matières jusqu'au client, dans l'ordre.</p>}
          valeur={m4.etapes}
          onChange={(v) => set((m) => void (m.etapes = v))}
          lectureSeule={ls}
        />

        <p className="text-[15px] font-bold text-encre mb-2">Mon équipe</p>
        {ls && !equipe.length ? <p className="text-doux italic mb-3">Aucune personne</p> : null}
        <ul className="space-y-3">
          {equipe.map((e, i) => (
            <li key={e.id} className="bp-membre rounded-xl border border-filet p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <ChampTexte label={`Personne ${i + 1}`} placeholder="Nom ou fonction" ligne valeur={e.personne} onChange={(v) => changerMembre(e.id, { personne: v })} lectureSeule={ls} />
                </div>
                {!ls ? (
                  <button
                    type="button"
                    onClick={() => set((m) => void (m.equipe = m.equipe.filter((x) => x.id !== e.id)))}
                    className="shrink-0 mt-6 w-11 h-11 rounded-lg flex items-center justify-center text-doux active:bg-violetClair"
                    aria-label={`Supprimer la personne ${i + 1}`}
                  >
                    <Icone nom="poubelle" />
                  </button>
                ) : null}
              </div>
              <ChampTexte label="Rôle" ligne valeur={e.role} onChange={(v) => changerMembre(e.id, { role: v })} lectureSeule={ls} />
              <ChampTexte label="Compétences" valeur={e.competences} onChange={(v) => changerMembre(e.id, { competences: v })} lectureSeule={ls} />
              <Choix label="Temps de travail" options={TEMPS} valeur={e.temps} onChange={(v) => changerMembre(e.id, { temps: v })} lectureSeule={ls} />
            </li>
          ))}
        </ul>
        {!ls ? (
          <button
            type="button"
            onClick={() => set((m) => void m.equipe.push({ id: nouvelId(), personne: '', role: '', competences: '', temps: '' }))}
            className="mt-3 mb-4 min-h-[44px] w-full rounded-xl border-2 border-dashed border-turquoise text-turquoiseTexte font-bold flex items-center justify-center gap-2 active:bg-turquoiseClair"
          >
            <Icone nom="plus" /> Ajouter une personne
          </button>
        ) : (
          <div className="h-4" />
        )}

        <ChampTexte
          label="Mes fournisseurs et partenaires principaux"
          aide={<p className="text-[14px] text-doux mt-1 leading-snug">Qui vous vend vos matières, qui peut vous aider à vendre ou à produire.</p>}
          valeur={m4.fournisseurs}
          onChange={(v) => set((m) => void (m.fournisseurs = v))}
          lectureSeule={ls}
        />
      </Carte>

      <Carte id="s4c" titre="4c. Mon calendrier des 12 premiers mois" sousTitre="Une étape ou un objectif par trimestre, et qui s'en occupe.">
        <Aide titre="Un objectif SMART">
          <p>
            Décrivez les étapes de production ou de service, les moyens nécessaires, qui fait quoi, et les grandes étapes des 12 premiers mois. Un objectif doit être SMART :
            spécifique, mesurable, atteignable, réaliste et daté.
          </p>
          <p className="mt-2">Exemple fil rouge, JUS'NOSY (projet fictif) : « Livrer 10 hôtels chaque semaine d'ici juin 2027 » est SMART. « Devenir le leader du jus » ne l'est pas.</p>
        </Aide>
        {PERIODES.map((pr) => {
          const c = m4.calendrier.find((x) => x.periode === pr.periode) ?? { objectif: '', responsable: '' };
          return (
            <div key={pr.periode} className="bp-periode rounded-xl border border-filet p-3 mb-3">
              <p className="text-[17px] font-bold text-violet mb-2">{pr.titre}</p>
              <ChampTexte label="Étape ou objectif SMART" valeur={c.objectif} onChange={(v) => changerPeriode(pr.periode, { objectif: v })} lectureSeule={ls} />
              <ChampTexte label="Responsable" ligne valeur={c.responsable} onChange={(v) => changerPeriode(pr.periode, { responsable: v })} lectureSeule={ls} />
            </div>
          );
        })}
      </Carte>

      <Carte id="s4d" titre="4d. Ma formalisation">
        <Aide titre="Choisir sa forme juridique">
          <p className="mb-3">
            L'objectif de la promotion NEC 2026 est que chaque projet soit créé ou formalisé en 2027. Exister légalement permet de facturer les hôtels et les entreprises, d'ouvrir un
            compte bancaire, de recevoir une subvention et d'embaucher.
          </p>
          <ul className="space-y-2.5">
            {TABLEAU_FORMES.map((f) => (
              <li key={f.forme} className="rounded-lg bg-white px-3 py-2">
                <p className="font-bold text-violet">{f.forme}</p>
                <p>
                  <span className="font-bold">Pour qui ? </span>
                  {f.pourQui}
                </p>
                <p>
                  <span className="font-bold">À retenir : </span>
                  {f.aRetenir}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            Démarches principales : statuts (pour une société), NIF (numéro d'identification fiscale), carte statistique (STAT), inscription au registre du commerce, carte fiscale,
            et affiliation à la CNaPS dès le premier salarié. Les petites entreprises dont le chiffre d'affaires annuel est inférieur à 400 millions d'ariary relèvent en général de
            l'impôt synthétique : faites confirmer votre situation par le centre fiscal.
          </p>
        </Aide>
        <Choix label="Forme juridique choisie" options={FORMES} valeur={m4.forme} onChange={(v) => set((m) => void (m.forme = v))} lectureSeule={ls} />
        <ChampTexte label="Pourquoi ce choix ?" valeur={m4.formePourquoi} onChange={(v) => set((m) => void (m.formePourquoi = v))} lectureSeule={ls} />

        <p className="text-[15px] font-bold text-encre mb-2">Mes démarches</p>
        <ul className="space-y-2.5">
          {DEMARCHES.map((dm) => {
            const d = m4.demarches.find((x) => x.id === dm.id) ?? { fait: false, datePrevue: '' };
            return (
              <li key={dm.id} className="bp-demarche rounded-xl border border-filet p-3">
                <p className="text-[15px] font-bold text-encre leading-snug">{dm.titre}</p>
                {ls ? (
                  <p className={`mt-1 ${d.fait || d.datePrevue ? 'text-encre' : 'text-doux italic'}`}>
                    {d.fait ? 'Déjà fait' : d.datePrevue ? `Prévu le ${jourFr(d.datePrevue)}` : 'Non rempli'}
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      aria-pressed={d.fait}
                      onClick={() => changerDemarche(dm.id, { fait: !d.fait })}
                      className={`min-h-[44px] px-4 rounded-full border-2 text-[15px] font-bold flex items-center gap-1.5 ${
                        d.fait ? 'bg-turquoiseTexte border-turquoiseTexte text-white' : 'bg-white border-filet text-encre active:bg-violetClair'
                      }`}
                    >
                      {d.fait ? <Icone nom="coche" /> : null} Déjà fait
                    </button>
                    {!d.fait ? (
                      <label className="flex-1 min-w-[10rem] flex items-center gap-2">
                        <span className="text-[14px] text-doux shrink-0">Date prévue</span>
                        <input
                          type="date"
                          className="bp-champ min-w-0 flex-1"
                          value={d.datePrevue}
                          aria-label={`${dm.titre}, date prévue`}
                          onChange={(e) => changerDemarche(dm.id, { datePrevue: e.target.value })}
                        />
                      </label>
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Carte>
    </>
  );
}
