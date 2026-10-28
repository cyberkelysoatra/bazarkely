/**
 * Badge « dictées en attente » (DICTEE-CC-02): a small link to /dicter/attente.
 * Neutral while dictations only wait, amber as soon as one is « à vérifier »
 * or failed. Hidden at zero. 24 px minimum target. Main bundle: kept tiny.
 */
import { Link } from 'react-router-dom'
import { libelleBadge, type ComptesDictees } from '../usePendingDictations'

interface Props {
  comptes: ComptesDictees
  className?: string
}

export default function BadgeDictees({ comptes, className = '' }: Props) {
  if (comptes.total <= 0) return null
  const ambre = comptes.aVerifier > 0
  return (
    <Link
      to="/dicter/attente"
      aria-label={libelleBadge(comptes)}
      title={libelleBadge(comptes)}
      data-testid="badge-dictees"
      data-ton={ambre ? 'ambre' : 'neutre'}
      className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums ring-2 focus:outline-none focus-visible:ring-4 ${
        ambre ? 'bg-amber-400 text-amber-950 ring-white focus-visible:ring-amber-600' : 'bg-white text-blue-700 ring-blue-600 focus-visible:ring-blue-300'
      } ${className}`}
    >
      {comptes.total}
    </Link>
  )
}
