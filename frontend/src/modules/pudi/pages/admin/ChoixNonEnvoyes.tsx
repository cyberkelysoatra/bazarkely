// PUDI-CC-16.2: « Choix faits sur un appareil mais jamais envoyés » card of the Suivi screen.
// Organisers only, figures only, never merged into the official results.
import { lireChoixNonEnvoyes } from '../../appels/admin';
import { usePropositions, propositionParId } from '../../appels/propositions';
import { programmeParId, type PudiDonnees } from '../../data';
import { Aide, Chiffre, Erreur, Titre2, useAppel } from './communs';

export const NON_VERIFIES = 'non vérifiés : ni compte, ni numéro, un appareil peut être partagé ou une personne en avoir plusieurs';

export default function ChoixNonEnvoyes({ donnees }: { donnees: PudiDonnees | null }) {
  const appel = useAppel(lireChoixNonEnvoyes);
  const { liste: propositions } = usePropositions();
  const c = appel.donnees;
  const nom = (id: string) => (donnees ? programmeParId(donnees, id)?.nom : undefined) ?? propositionParId(propositions, id)?.intitule ?? id;
  const total = c?.complets ?? 0;
  return (
    <section data-choix-non-envoyes="">
      <Titre2 aide={`Chiffres ${NON_VERIFIES}.`}>Choix faits sur un appareil mais jamais envoyés</Titre2>
      <Aide titre="Comment lire ces chiffres ?">
        <p>Quand quelqu'un coche des projets, son choix est gardé sur son téléphone. S'il ne se connecte pas avec Google, ce choix n'est jamais envoyé : beaucoup de personnes pensent pourtant avoir voté.</p>
        <p>Ces chiffres comptent les appareils qui ont un choix en cours sans vote envoyé depuis cet appareil. Ils ne sont liés à aucun compte ni numéro : un même appareil peut servir à plusieurs personnes, une personne peut utiliser plusieurs appareils.</p>
        <p>Ce ne sont <strong>jamais des votes</strong> : ils ne sont pas ajoutés aux résultats et ne sont pas publics. Ils servent à relancer les personnes qui n'ont pas terminé. Effacés le 28/01/2027.</p>
      </Aide>
      {appel.erreur && <Erreur texte={appel.erreur} reessayer={() => void appel.recharger()} />}
      {c && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Chiffre valeur={c.complets} libelle="Choix complet (3 priorités), non envoyé" icone="alerte" ton="alerte" />
            <Chiffre valeur={c.partiels} libelle="Choix commencé (1 ou 2 priorités)" icone="horloge" />
          </div>
          <p className="text-[0.8125rem] font-bold text-[#9C3F21]" data-non-verifies="">
            Chiffres {NON_VERIFIES}.
          </p>
          {c.classement.length > 0 && (
            <div className="bg-white border border-filet rounded-xl p-3">
              <p className="text-[0.875rem] font-bold mb-2">Priorités de ces {total} choix complets non envoyés</p>
              <ol className="space-y-1.5" data-classement-non-envoyes="">
                {c.classement.map((l) => (
                  <li key={l.id} className="flex items-baseline justify-between gap-2 text-[0.875rem]">
                    <span className="min-w-0">{nom(l.id)}</span>
                    <span className="shrink-0 font-bold">{l.n}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
