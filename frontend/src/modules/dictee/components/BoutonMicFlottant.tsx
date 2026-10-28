/**
 * Round floating mic button (56 px) on /dashboard and /transactions, above the
 * bottom nav, bottom-right, safe-area aware. Opens /dicter. Shows the number of
 * dictations still waiting. Kept tiny: it lives in the main bundle.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mic } from 'lucide-react'
import { useAppStore } from '../../../stores/appStore'
import { compterDicteesEnAttente, EVENEMENT_DICTEE_LEGER } from '../demarrage'

export default function BoutonMicFlottant() {
  const userId = useAppStore((s) => s.user?.id)
  const [attente, setAttente] = useState(0)

  useEffect(() => {
    if (!userId) return
    let actif = true
    const lire = () => void compterDicteesEnAttente(userId).then((n) => actif && setAttente(n))
    lire()
    window.addEventListener(EVENEMENT_DICTEE_LEGER, lire)
    return () => {
      actif = false
      window.removeEventListener(EVENEMENT_DICTEE_LEGER, lire)
    }
  }, [userId])

  return (
    <Link
      to="/dicter"
      aria-label="Dicter une dépense"
      aria-description={attente > 0 ? `${attente} en attente` : undefined}
      title="Dicter une dépense"
      className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
      style={{ bottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
    >
      <Mic className="h-6 w-6" aria-hidden="true" />
      {attente > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-blue-700 ring-2 ring-blue-600"
          aria-hidden="true"
        >
          {attente}
        </span>
      )}
    </Link>
  )
}
