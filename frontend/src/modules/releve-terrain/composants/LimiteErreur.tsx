// Error boundary of the screens (RELEVE-CC-07): a render error or a code file that cannot be loaded never
// leaves a blank page on the field. The data stay on the phone; « Recharger » reloads the page.
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Bouton } from './Bouton'

interface Props {
  /** Changes with the address: a new screen gets a fresh try. */
  cle: string
  children: ReactNode
}

interface Etat {
  erreur: boolean
  cle: string
}

export class LimiteErreur extends Component<Props, Etat> {
  state: Etat = { erreur: false, cle: this.props.cle }

  static getDerivedStateFromError(): Partial<Etat> {
    return { erreur: true }
  }

  static getDerivedStateFromProps(props: Props, etat: Etat): Partial<Etat> | null {
    return props.cle !== etat.cle ? { erreur: false, cle: props.cle } : null
  }

  componentDidCatch(erreur: Error, info: ErrorInfo) {
    console.error('[releve] écran en erreur', erreur, info.componentStack)
  }

  render() {
    if (!this.state.erreur) return this.props.children
    return (
      <main className="rt-ecran flex flex-col gap-4 p-4" data-limite-erreur="">
        <section role="alert" className="flex flex-col gap-3 rounded-rt border-[3px] border-encre bg-surface p-4">
          <h1 className="rt-etroite m-0 text-[30px] font-extrabold leading-tight">Un problème est survenu</h1>
          <p className="m-0 text-[18px] leading-snug">Vos mesures restent enregistrées sur ce téléphone. Rechargez la page pour continuer.</p>
          <Bouton onClick={() => window.location.reload()}>Recharger</Bouton>
          <Bouton variante="secondaire" onClick={() => window.location.assign('/releve/')}>
            Mes terrains
          </Bouton>
        </section>
      </main>
    )
  }
}
