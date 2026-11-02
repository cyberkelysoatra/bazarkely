// /validation/q/:questionnaire/:numero: temporary page until the question screens (phase 4).
import { Navigate } from 'react-router-dom';
import { useEspace } from '../EspaceContexte';
import EnTete from '../composants/EnTete';
import { BarreRetour, CARTE, Corps, Squelette, useCouleurTheme } from '../composants/Mise';
import { choisirProjet, lignePour } from '../utils/regles';

export default function Bientot() {
  useCouleurTheme('#0369a1');
  const { session, etat, liste, lent } = useEspace();
  if (etat === 'deconnecte') return <Navigate to="/" replace />;
  const choix = etat === 'pret' ? choisirProjet(liste) : null;
  if (choix && choix.type !== 'projet') return <Navigate to="/" replace />;
  const p = choix?.type === 'projet' ? choix.espace : null;
  return (
    <>
      {p ? <EnTete variante="client" titre={p.nom_court ?? ''} sousTitre={lignePour(p)} nom={p.nom ?? ''} email={session?.email ?? ''} /> : <EnTete variante="neutre" />}
      <Corps>
        <BarreRetour />
        {p ? (
          <div className={CARTE} data-bientot="">
            <p className="text-[15px] m-0">Les questions arrivent bientôt.</p>
          </div>
        ) : (
          <Squelette lent={lent} />
        )}
      </Corps>
    </>
  );
}
