/**
 * Round floating mic button (56 px) on /dashboard and /transactions, above the
 * bottom nav, bottom-right, safe-area aware. Opens /dicter. The badge (sibling
 * link, never nested) shows the dictations still waiting and opens the list.
 * Kept tiny: it lives in the main bundle.
 */
import { Link } from 'react-router-dom'
import { Mic } from 'lucide-react'
import { usePendingDictations } from '../usePendingDictations'
import BadgeDictees from './BadgeDictees'

export default function BoutonMicFlottant() {
  const comptes = usePendingDictations()

  return (
    <div className="fixed right-4 z-40 h-14 w-14" style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      <Link
        to="/dicter"
        aria-label="Dicter une dépense"
        title="Dicter une dépense"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
      >
        <Mic className="h-6 w-6" aria-hidden="true" />
      </Link>
      <BadgeDictees comptes={comptes} className="absolute -right-1.5 -top-1.5" />
    </div>
  )
}
