// Step 3 of screen 10 « Contrôle » (H13, 6.7): the measured station may become an ephemeral target only
// when its rank allows it (rank 3 refused first) and it is green with an index of 2,0 or less.
import type { Reglages } from '../../calcul'
import { Bouton } from '../../composants/Bouton'
import { PastilleEtat } from '../../composants/Pastilles'
import type { BorneCalculee, StationCalculee } from '../../etat/releveCalcule'
import { Chiffres, MOT_COULEUR } from '../saisir/Chiffres'
import { i2 } from '../saisir/logique'
import { controlerStation } from './logique'

export interface PropsEtapeControle {
  station: StationCalculee
  reglages: Reglages
  bornes: BorneCalculee[]
  onContinuer: (rang: 1 | 2) => void
  onAutreEndroit: () => void
  onCompleter: () => void
}

export function EtapeControle({ station, reglages, bornes, onContinuer, onAutreEndroit, onCompleter }: PropsEtapeControle) {
  const c = controlerStation(station, reglages, bornes)
  const res = station.resultat
  const couleur = station.couleur
  return (
    <section className="flex flex-col gap-3" data-etape-controle data-controle={c.ok ? 'accepte' : 'refuse'}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="rt-etroite m-0 text-[26px] font-extrabold">Station {station.numero}</h3>
        {couleur ? <PastilleEtat couleur={couleur} mot={MOT_COULEUR[couleur]} /> : <PastilleEtat couleur="gris" mot="INCOMPLÈTE" />}
      </div>
      {c.ok ? (
        <div role="status" className="rounded-rt border-[3px] border-vertTexte bg-vertFond p-3 text-vertTexte">
          <p className="m-0 text-[20px] font-extrabold" data-message-controle>
            Accepté : station verte, indice {i2(res.indice)}.
          </p>
          <p className="m-0 mt-1 text-[17px] font-semibold" data-rang={c.rang}>
            Rang {c.rang} {c.rang === 1 ? '(depuis les bornes principales)' : '(depuis une borne éphémère de rang 1)'}.
          </p>
        </div>
      ) : (
        <div role="alert" className="rounded-rt border-[3px] border-rougeTexte bg-rougeFond p-3 text-rougeTexte">
          <p className="m-0 text-[20px] font-extrabold" data-message-controle>
            {c.raison}
          </p>
          {c.motif === 'fragile' && res.calculee ? (
            <p className="m-0 mt-1 text-[16px] font-semibold">
              Station {couleur ? MOT_COULEUR[couleur].toLowerCase() : ''}, indice {i2(res.indice)} (il faut une station verte et un indice de 2,0 ou moins).
            </p>
          ) : null}
        </div>
      )}
      {res.calculee ? <Chiffres resultat={station.retenu ?? res} couleurs={res.couleurs} bornes={bornes} /> : null}
      {c.ok ? (
        <Bouton data-continuer onClick={() => onContinuer(c.rang)}>
          Continuer : nommer la borne
        </Bouton>
      ) : c.motif === 'incomplete' ? (
        <Bouton onClick={onCompleter}>Compléter la mesure</Bouton>
      ) : (
        <Bouton data-autre-endroit onClick={onAutreEndroit}>
          Choisir un autre endroit
        </Bouton>
      )}
    </section>
  )
}
