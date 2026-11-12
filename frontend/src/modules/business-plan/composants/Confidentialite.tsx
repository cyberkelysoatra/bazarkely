// NEC-CC-10: exact text of what is sent to the trainer, and how to stop it. Shared by the
// "À propos" card and the expandable explanation of the join screen (same words in both places).

/** purge_le of the NEC2026 session (bp_sessions), the date the server erases what is left. */
export const DATE_PURGE = '31/12/2026';

export function TexteEnvoi() {
  return (
    <div className="bp-texte-envoi space-y-2 text-[16px] leading-relaxed">
      <p>
        <b>Quand.</b> Seulement si vous écrivez le code donné par le formateur et cochez la case d'accord. Ensuite, l'envoi se fait tout seul, quelques secondes après
        chaque modification, dès que le téléphone a du réseau.
      </p>
      <p>
        <b>Quoi.</b> Votre prénom, le nom de votre projet et tout votre plan (toutes les fiches), avec votre avancement en pourcentage, les alertes du module 5 et l'heure
        de votre dernière activité. Votre numéro de téléphone et votre e-mail ne partent jamais.
      </p>
      <p>
        <b>À qui.</b> Au formateur de la session seulement, qui s'en sert pour vous aider. Les données sont gardées sur le serveur de 1sakely.org, fermé à toute autre
        personne.
      </p>
      <p>
        <b>Comment arrêter.</b> Touchez « Arrêter l'envoi » sur la page de votre projet : il est effacé du serveur (tout de suite, ou dès le retour du réseau) et reste sur
        votre téléphone. Le formateur peut aussi retirer votre projet ou effacer toute la session. Quand il ferme la session, plus rien n'est envoyé. Le {DATE_PURGE} au plus
        tard, tout ce qui reste sur le serveur est effacé automatiquement.
      </p>
      <p>Partager vos chiffres par WhatsApp, exporter le PDF ou faire une sauvegarde ne se fait que si vous le décidez, vers qui vous choisissez.</p>
    </div>
  );
}
