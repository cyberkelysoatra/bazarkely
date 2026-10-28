/**
 * Client ids planned before any write (pure, tested). Once stored in the queue
 * record they are NEVER regenerated: a replay after a crash reuses them and the
 * upserts converge on the same rows.
 */
import type { DicteeItemType, DicteePlannedLine } from '../types'

export function planifierIdentifiants(
  types: DicteeItemType[],
  existant: DicteePlannedLine[] | undefined,
  nouvelId: () => string = () => crypto.randomUUID()
): DicteePlannedLine[] {
  return types.map((type, lineIndex) => {
    const deja = existant?.find((p) => p.lineIndex === lineIndex)
    const ligne: DicteePlannedLine = deja
      ? { ...deja }
      : { lineIndex, transactionId: nouvelId(), dictationRowId: nouvelId() }
    // A line edited into a transfer in the recap gets its extra ids once.
    if (type === 'transfer') {
      ligne.targetTransactionId ??= nouvelId()
      ligne.feeTransactionId ??= nouvelId()
      ligne.targetDictationRowId ??= nouvelId()
    }
    return ligne
  })
}
