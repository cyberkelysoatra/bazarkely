/**
 * Access guard of NAVY ay: every signed-in account may enter (AppLayout only renders
 * this tree once authenticated). Kept as a component so later phases can add
 * role-based checks (drivers, grocers) without touching AppLayout.
 */
import type { ReactNode } from 'react';

export default function NavyRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
