import type { Module } from '../contexts/ModuleSwitcherContext';

/**
 * Réordonne une liste de modules selon un ordre sauvegardé d'identifiants.
 *
 * Règles :
 * - `savedOrder` absent ou vide → la liste d'origine est retournée telle quelle.
 * - Un id présent dans `savedOrder` mais disparu de `modules` est ignoré.
 * - Un module présent dans `modules` mais absent de `savedOrder` (nouveau module)
 *   est ajouté à la fin, dans l'ordre par défaut de `modules`.
 *
 * Fonction pure (aucun effet de bord), testable isolément.
 */
export function orderModules(modules: Module[], savedOrder?: string[]): Module[] {
  if (!savedOrder?.length) return modules;
  const byId = new Map(modules.map(m => [m.id, m]));
  const ordered: Module[] = [];
  for (const id of savedOrder) {
    const m = byId.get(id);
    if (m) {
      ordered.push(m);
      byId.delete(id);
    }
  }
  for (const m of modules) {
    if (byId.has(m.id)) ordered.push(m); // nouveaux modules → ajoutés à la fin
  }
  return ordered;
}
