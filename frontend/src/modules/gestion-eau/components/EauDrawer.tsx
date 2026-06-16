import { ReactNode, useEffect, useState } from 'react';

/**
 * Conteneur accordéon : anime l'ouverture (0fr → 1fr) à l'aide d'une grille CSS.
 * Factorisé (v3.62.0) depuis EauBassinReleves et EauApportsReleves (markup/animation
 * strictement identiques).
 */
export default function EauDrawer({ children }: { children: ReactNode }) {
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-out ${
        grown ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      }`}
    >
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}
