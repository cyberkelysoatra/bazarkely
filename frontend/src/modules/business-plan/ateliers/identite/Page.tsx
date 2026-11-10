// Fiche d'identité (workbook pages 1 and 3).
import type { AtelierProps, Plan } from '../../types';
import { ChampTexte, Choix } from '../../composants/Champs';
import { Carte } from '../../composants/Carte';

const SECTEURS = [
  { v: 'agriculture', t: 'Agriculture' },
  { v: 'economie-bleue', t: 'Économie bleue' },
  { v: 'tourisme', t: 'Tourisme' },
  { v: 'energie', t: 'Énergie' },
  { v: 'numerique', t: 'Numérique' },
  { v: 'education', t: 'Éducation' },
  { v: 'autre', t: 'Autre' }
];

const AVANCEMENT: { v: Exclude<Plan['identite']['avancement'], ''>; t: string }[] = [
  { v: 'idee', t: "C'est une idée" },
  { v: 'essais', t: 'Premiers essais' },
  { v: 'clients', t: 'Déjà des clients' },
  { v: 'activite', t: 'Déjà une activité' }
];

const PRIVE = "Reste sur votre téléphone, n'est jamais envoyé";

export default function Page({ plan, modifier, lectureSeule }: AtelierProps) {
  const i = plan.identite;
  const champ = (cle: keyof Plan['identite']) => (v: string) =>
    modifier((p) => {
      (p.identite as Record<string, string>)[cle] = v;
    });
  return (
    <>
      <Carte titre="Vous">
        <ChampTexte label="Nom et prénom" ligne autoComplete="name" valeur={i.nomPrenom} onChange={champ('nomPrenom')} lectureSeule={lectureSeule} />
        <ChampTexte label="Téléphone" ligne type="tel" autoComplete="tel" mention={PRIVE} valeur={i.telephone} onChange={champ('telephone')} lectureSeule={lectureSeule} />
        <ChampTexte label="E-mail" ligne type="email" autoComplete="email" mention={PRIVE} valeur={i.email} onChange={champ('email')} lectureSeule={lectureSeule} />
      </Carte>
      <Carte titre="Votre projet">
        <ChampTexte label="Nom du projet" ligne valeur={i.nomProjet} onChange={champ('nomProjet')} lectureSeule={lectureSeule} />
        <Choix label="Secteur" options={SECTEURS} valeur={i.secteur} onChange={champ('secteur')} lectureSeule={lectureSeule} />
        {i.secteur === 'autre' ? (
          <ChampTexte label="Précisez le secteur" ligne valeur={i.secteurAutre} onChange={champ('secteurAutre')} lectureSeule={lectureSeule} />
        ) : null}
        <ChampTexte label="Lieu" ligne placeholder="Commune, quartier" valeur={i.lieu} onChange={champ('lieu')} lectureSeule={lectureSeule} />
        <ChampTexte label="Mon projet en une phrase" placeholder="Je vends quoi, à qui, pour régler quel problème ?" valeur={i.unePhrase} onChange={champ('unePhrase')} lectureSeule={lectureSeule} />
        <Choix label="Où en est le projet ?" options={AVANCEMENT} valeur={i.avancement} onChange={champ('avancement') as (v: string) => void} lectureSeule={lectureSeule} />
        <ChampTexte label="Porteurs du projet et rôles" placeholder="Qui fait quoi ?" valeur={i.porteurs} onChange={champ('porteurs')} lectureSeule={lectureSeule} />
        <ChampTexte label="Ce que j'attends de ces deux jours" valeur={i.attentes} onChange={champ('attentes')} lectureSeule={lectureSeule} />
      </Carte>
    </>
  );
}
