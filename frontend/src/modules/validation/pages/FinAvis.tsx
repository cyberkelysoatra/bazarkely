// End of a contributor's opinion (/merci/:questionnaire, PC2, VC-14): no confirmation screen ever,
// the validant sees the opinion and decides.
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { usePresence } from '../appels/presence';
import { CARTE, Corps, PRIMAIRE, useCouleurTheme } from '../composants/Mise';
import { Icone } from '../composants/Icones';
import { personneValidant, prenomDe } from '../utils/regles';
import { Attente, EnTeteClient, documentDe, useProjet } from './Cadre';

export default function FinAvis() {
  useCouleurTheme('#0369a1');
  const { questionnaire: qid = '' } = useParams();
  const navigate = useNavigate();
  const { statut, p, email, lent } = useProjet();
  const d = documentDe(p, qid);
  usePresence(p?.client_id, p ? { type: 'fin_avis', titre: d?.titre_client ?? 'Document' } : null);
  if (statut === 'sortie') return <Navigate to="/" replace />;
  if (statut === 'attente' || !p) {
    return (
      <>
        <EnTeteClient p={p} email={email} />
        <Attente lent={lent} />
      </>
    );
  }
  if (p.role !== 'contributeur') return <Navigate to="/" replace />;
  const v = personneValidant(p.validant);
  return (
    <>
      <EnTeteClient p={p} email={email} />
      <Corps data-fin-avis={qid}>
        <div className={`${CARTE} items-center text-center gap-3.5`}>
          <div className="w-[60px] h-[60px] rounded-full bg-[#dcfce7] text-[#166534] flex items-center justify-center">
            <Icone nom="coche" epaisseur={2.4} className="w-8 h-8" />
          </div>
          <p className="text-[16px] leading-[1.45] m-0" data-merci-avis="">
            Merci {prenomDe(p.nom)}, {v.nom || 'la personne qui décide'} voit votre avis. Vous pouvez encore le changer tant qu'{v.pronom} n'a pas confirmé.
          </p>
        </div>
        <button type="button" className={PRIMAIRE} onClick={() => navigate('/')} data-retour-accueil="">
          Retour à l'accueil
        </button>
      </Corps>
    </>
  );
}
