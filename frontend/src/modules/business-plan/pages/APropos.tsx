// /plan/a-propos: what the app does with the data, version.
import { Mise } from '../composants/Mise';
import { Carte } from '../composants/Carte';
import { VERSION_PLAN } from '../version';

export default function APropos() {
  return (
    <Mise titre="À propos" retour={{ vers: '/', texte: 'Mes projets' }}>
      <Carte titre="Vos données restent sur votre téléphone">
        <p className="text-[16px] leading-relaxed">
          Ce que vous écrivez est enregistré sur ce téléphone seulement, au fil de la saisie. Rien n'est envoyé sur internet. Aucun compte n'est nécessaire.
        </p>
        <p className="text-[16px] leading-relaxed mt-2">
          Après une première ouverture avec connexion, l'application marche aussi en mode avion. Si vous effacez les données du navigateur ou changez de téléphone, vos projets
          sont perdus : partagez vos chiffres pour en garder une copie.
        </p>
      </Carte>
      <Carte titre="Mon business plan">
        <p className="text-[16px] leading-relaxed">Le cahier du participant du Nosy Be Entrepreneurship Camp 2026, sur votre téléphone.</p>
        <p className="bp-version text-[14px] text-doux mt-2">Version {VERSION_PLAN}</p>
      </Carte>
    </Mise>
  );
}
