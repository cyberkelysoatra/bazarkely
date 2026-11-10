// Lines { libelle, montant } with add and delete (costs of one unit, investments, other fixed costs).
import type { Ligne } from '../types';
import { ligneVide } from '../etat/vide';
import { grouper } from '../utils/format';
import { SaisieMontant } from './Champs';
import { Icone } from './Icones';

export function ListeLignes({
  lignes,
  onChange,
  lectureSeule,
  placeholder = 'Libellé',
  ajouter = 'Ajouter une ligne',
  titre
}: {
  lignes: Ligne[];
  onChange: (lignes: Ligne[]) => void;
  lectureSeule?: boolean;
  placeholder?: string;
  ajouter?: string;
  /** Accessible name of the list (e.g. "Coûts d'une unité"). */
  titre: string;
}) {
  if (lectureSeule) {
    const pleines = lignes.filter((l) => l.libelle.trim() || l.montant !== null);
    if (!pleines.length) return <p className="text-doux italic mb-3">Aucune ligne</p>;
    return (
      <ul className="mb-3 divide-y divide-filet rounded-xl border border-filet bg-white" aria-label={titre}>
        {pleines.map((l) => (
          <li key={l.id} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <span className="text-encre break-words min-w-0">{l.libelle || 'Sans libellé'}</span>
            <span className="font-bold tabular-nums whitespace-nowrap">{l.montant === null ? '' : `${grouper(l.montant)} Ar`}</span>
          </li>
        ))}
      </ul>
    );
  }
  const changer = (id: string, patch: Partial<Ligne>) => onChange(lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  return (
    <div className="mb-3" role="group" aria-label={titre}>
      <ul className="space-y-2.5">
        {lignes.map((l, i) => (
          <li key={l.id} className="rounded-xl border border-filet bg-white p-2.5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="bp-champ min-w-0 flex-1"
                value={l.libelle}
                placeholder={placeholder}
                aria-label={`${titre}, ligne ${i + 1}, libellé`}
                onChange={(e) => changer(l.id, { libelle: e.target.value })}
              />
              <button
                type="button"
                onClick={() => onChange(lignes.filter((x) => x.id !== l.id))}
                className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center text-doux active:bg-violetClair"
                aria-label={`Supprimer la ligne ${i + 1}`}
              >
                <Icone nom="poubelle" />
              </button>
            </div>
            <SaisieMontant valeur={l.montant} onChange={(m) => changer(l.id, { montant: m })} label={`${titre}, ligne ${i + 1}, montant`} />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...lignes, ligneVide()])}
        className="mt-2.5 min-h-[44px] w-full rounded-xl border-2 border-dashed border-turquoise text-turquoiseTexte font-bold flex items-center justify-center gap-2 active:bg-turquoiseClair"
      >
        <Icone nom="plus" /> {ajouter}
      </button>
    </div>
  );
}
