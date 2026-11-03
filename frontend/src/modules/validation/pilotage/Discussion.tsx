// Screen 11 bis: Joël's side of the project thread (/pilotage/discussion/:client, VC-40). Same
// thread as the client; Joël's messages on the right, signed « Joël SOATRA, CyberKELY » by the
// server. The server notifies the people of the project of each of his messages.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Fil from '../composants/Fil';
import { BarreRetour, Corps } from '../composants/Mise';
import { ficheClient, type FicheClient } from './api';
import { EnTetePilotage } from './Commun';

export default function DiscussionPilotage() {
  const { client = '' } = useParams();
  const navigate = useNavigate();
  const [fiche, setFiche] = useState<FicheClient | null>(null);

  useEffect(() => {
    let vivant = true;
    setFiche(null);
    ficheClient(client)
      .then((f) => vivant && setFiche(f))
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, [client]);

  const actives = fiche ? fiche.personnes.filter((p) => !p.revoque_at).length : 0;
  const sousTitre = fiche ? `${fiche.client.entreprise}, ${actives} personne${actives > 1 ? 's' : ''}` : '';
  return (
    <>
      <EnTetePilotage titre="Pilotage : discussion du projet" sousTitre={sousTitre} />
      <Corps className="!gap-3.5" data-discussion-pilotage={client}>
        <BarreRetour vers={`/pilotage/client/${client}`} libelle="Détail du client" />
        <Fil
          client={client}
          auteur={{ nom: 'Joël SOATRA', fonction: 'CyberKELY' }}
          client_ecran={false}
          placeholder="Votre réponse"
          question={null}
          retirerQuestion={() => undefined}
          ouvrirQuestion={(id) => navigate(`/pilotage/client/${client}?question=${id}`)}
          note="Le client est prévenu de chaque réponse. L’assistant lit ce fil dans les résultats, sans pouvoir y écrire."
        />
      </Corps>
    </>
  );
}
