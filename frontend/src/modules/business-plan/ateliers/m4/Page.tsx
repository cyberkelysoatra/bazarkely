// Module 4 "Stratégie commerciale, organisation et formalisation" (workbook pages 10 to 12):
// 4a the 4 P, 4b production and team, 4c calendar, 4d legal form and procedures.
import { useId, useState } from 'react';
import type { AtelierProps, Plan } from '../../types';
import { ChampTexte, Choix } from '../../composants/Champs';
import { Carte } from '../../composants/Carte';
import { Aide } from '../../composants/Aide';
import { Icone } from '../../composants/Icones';
import { nouvelId } from '../../etat/vide';
import { m4 as exemple } from '../../data/exemple/m4';

type Membre = Plan['m4']['equipe'][number];
type CleP = 'produit' | 'prix' | 'place' | 'promotion';
type IdDemarche = Plan['m4']['demarches'][number]['id'];
type Periode = Plan['m4']['calendrier'][number]['periode'];

const QUATRE_P: { cle: CleP; titre: string; question: string }[] = [
  { cle: 'produit', titre: 'Produit', question: 'Que vendez-vous exactement ? Qualité, présentation, gamme : ce qui le rend différent.' },
  { cle: 'prix', titre: 'Prix', question: "À quel prix, et comment l'avez-vous fixé (vos coûts, les concurrents, ce que le client accepte) ? Comment le client paie-t-il ?" },
  { cle: 'place', titre: 'Place', question: 'Où et comment le client achète-t-il ? Point de vente, livraison, intermédiaires.' },
  { cle: 'promotion', titre: 'Promotion et budget', question: 'Comment les clients vont-ils vous connaître ? Quels moyens, et combien cela coûte ?' }
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

const TABLEAU_FORMES: { forme: string; pourQui: string; risque: string }[] = [
  { forme: 'Entreprise individuelle', pourQui: 'Une personne seule, pour démarrer simplement.', risque: 'Vos biens personnels répondent des dettes.' },
  { forme: 'SARL unipersonnelle (SARLU)', pourQui: 'Une personne seule qui crée une société.', risque: 'Vous ne risquez que votre apport.' },
  { forme: 'SARL', pourQui: 'Deux associés ou plus.', risque: 'Chacun ne risque que son apport.' },
  { forme: 'Coopérative ou association', pourQui: 'Un groupe (producteurs, habitants) qui met ses moyens en commun.', risque: 'Règles fixées par les statuts du groupe.' }
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

function VoirExemple({ texte }: { texte: string }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  return (
    <div className="-mt-2 mb-4">
      <button type="button" aria-expanded={ouvert} aria-controls={id} onClick={() => setOuvert((o) => !o)} className="min-h-[44px] -ml-1 px-1 flex items-center gap-1.5 text-turquoiseTexte font-bold text-[15px]">
        <Icone nom="livre" /> {ouvert ? "Masquer l'exemple" : "Voir l'exemple"}
      </button>
      {ouvert ? (
        <p id={id} className="rounded-xl bg-turquoiseClair px-3.5 py-3 text-[15px] leading-relaxed text-encre">
          <span className="font-bold">JUS'NOSY : </span>
          {texte}
        </p>
      ) : null}
    </div>
  );
}

export default function Page({ plan, modifier, lectureSeule: ls }: AtelierProps) {
  const m4 = plan.m4;
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
            {!ls && exemple[q.cle] ? <VoirExemple texte={exemple[q.cle] as string} /> : null}
          </div>
        ))}
      </Carte>

      <Carte id="s4b" titre="4b. Mon organisation" sousTitre="Comment vous produisez, avec qui, et grâce à qui.">
        <ChampTexte
          label="Étapes de production ou de service"
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
          label="Fournisseurs et partenaires"
          aide={<p className="text-[14px] text-doux mt-1 leading-snug">Qui vous vend vos matières, qui peut vous aider à vendre ou à produire.</p>}
          valeur={m4.fournisseurs}
          onChange={(v) => set((m) => void (m.fournisseurs = v))}
          lectureSeule={ls}
        />
      </Carte>

      <Carte id="s4c" titre="4c. Mon calendrier de la première année" sousTitre="Une étape ou un objectif par trimestre, et qui s'en occupe.">
        <Aide titre="Un objectif SMART">
          <p>
            Un objectif SMART est <span className="font-bold">S</span>pécifique, <span className="font-bold">M</span>esurable, <span className="font-bold">A</span>tteignable,{' '}
            <span className="font-bold">R</span>éaliste et <span className="font-bold">T</span>emporel (avec une date).
          </p>
          <p className="mt-2">« Livrer 10 hôtels chaque semaine d'ici juin 2027 » est SMART. « Devenir le leader du jus » ne l'est pas.</p>
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

      <Carte id="s4d" titre="4d. Ma forme juridique et mes démarches">
        <Aide titre="Choisir sa forme juridique">
          <ul className="space-y-2.5">
            {TABLEAU_FORMES.map((f) => (
              <li key={f.forme} className="rounded-lg bg-white px-3 py-2">
                <p className="font-bold text-violet">{f.forme}</p>
                <p>{f.pourQui}</p>
                <p className="text-doux">{f.risque}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3">
            Les démarches suivent un ordre : les statuts d'abord, puis le NIF (numéro d'identification fiscale), la carte STAT, le registre du commerce et la carte fiscale. Sous
            400 millions d'ariary de chiffre d'affaires par an, une petite entreprise paie en général l'impôt synthétique, un impôt simple calculé sur le chiffre d'affaires. Faites
            confirmer votre situation par le centre fiscal.
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
