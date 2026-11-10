// A plan that is not on this phone (deleted, or a link from another phone).
import { Link } from 'react-router-dom';
import { Mise } from '../composants/Mise';

export function Introuvable() {
  return (
    <Mise titre="Projet introuvable" retour={{ vers: '/', texte: 'Mes projets' }}>
      <p className="text-[16px] text-encre">Ce projet n'est pas sur ce téléphone. Les projets restent sur le téléphone où ils ont été créés.</p>
      <Link to="/" className="mt-4 min-h-[48px] rounded-xl bg-violet text-white font-bold flex items-center justify-center">
        Voir mes projets
      </Link>
    </Mise>
  );
}
