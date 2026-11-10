// /plan/a-propos: what the app does with the data, version, and at the very bottom the discreet
// trainer sign-in link (NEC-CC-07): the plan has no login of its own, the trainer signs in on the host.
import { Mise } from '../composants/Mise';
import { useEmailSession } from '../etat/session';
import { Carte } from '../composants/Carte';
import { VERSION_PLAN } from '../version';

export default function APropos() {
  const email = useEmailSession();
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
      <div className="bp-connexion mt-6 text-center">
        {email ? (
          <p className="bp-connecte text-[14px] text-doux break-words">Connecté : {email}</p>
        ) : (
          <>
            <a href="https://1sakely.org/" className="bp-lien-connexion inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-3 text-[14px] text-doux underline">
              Connexion formateur
            </a>
            <p className="text-[13px] text-doux leading-snug">Connectez-vous avec Google, puis revenez sur Mon Business Plan par le sélecteur de modules.</p>
          </>
        )}
      </div>
    </Mise>
  );
}
