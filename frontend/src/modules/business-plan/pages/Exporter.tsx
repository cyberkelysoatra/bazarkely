// /plan/p/:id/exporter: the PDF "Mon business plan" (share or download), the WhatsApp text and the
// backup file of the plan. Works offline (the PDF code is precached) and on the read-only example.
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { usePlan } from '../etat/usePlan';
import { Mise } from '../composants/Mise';
import { Carte } from '../composants/Carte';
import { Icone } from '../composants/Icones';
import { Introuvable } from './Introuvable';
import { copierTexte, partagerTexte } from '../utils/partage';
import { texteWhatsApp } from '../export/texte';
import { nomSauvegarde, texteSauvegarde } from '../export/sauvegarde';
import { partagerFichier, telecharger } from '../export/fichiers';

type EtatPdf = { statut: 'repos' } | { statut: 'creation' } | { statut: 'pret'; fichier: File } | { statut: 'erreur' };

export default function Exporter() {
  const { id } = useParams();
  const { etat } = usePlan(id);
  const [coordonnees, setCoordonnees] = useState(false);
  const [pdf, setPdf] = useState<EtatPdf>({ statut: 'repos' });
  const [message, setMessage] = useState('');

  if (etat.statut === 'chargement') return <Mise titre="Exporter">{null}</Mise>;
  if (etat.statut === 'absent') return <Introuvable />;
  const plan = etat.plan;
  const nom = plan.identite.nomProjet.trim() || 'Projet sans nom';

  const annoncer = (t: string) => {
    setMessage(t);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const fabriquer = async (): Promise<File | null> => {
    setPdf({ statut: 'creation' });
    try {
      const { creerPdf } = await import('../export/pdf');
      const fichier = await creerPdf(plan, { coordonnees });
      setPdf({ statut: 'pret', fichier });
      return fichier;
    } catch {
      setPdf({ statut: 'erreur' });
      return null;
    }
  };

  const partagerPdf = async () => {
    const f = pdf.statut === 'pret' ? pdf.fichier : await fabriquer();
    if (!f) return;
    const r = await partagerFichier(f, `Mon business plan : ${nom}`);
    if (r === 'telechargement') annoncer(`PDF enregistré : ${f.name}`);
  };

  const telechargerPdf = async () => {
    const f = pdf.statut === 'pret' ? pdf.fichier : await fabriquer();
    if (!f) return;
    telecharger(f, f.name);
    annoncer(`PDF enregistré : ${f.name}`);
  };

  const partagerWhatsApp = async () => {
    const r = await partagerTexte(texteWhatsApp(plan));
    if (r === 'copie') annoncer('Texte copié : collez-le dans WhatsApp.');
    if (r === 'echec') annoncer('Partage impossible sur ce téléphone.');
  };

  const copierWhatsApp = async () => {
    annoncer((await copierTexte(texteWhatsApp(plan))) ? 'Texte copié : collez-le dans WhatsApp.' : 'Copie impossible sur ce téléphone.');
  };

  const sauvegarder = () => {
    const nomFichier = nomSauvegarde(plan);
    telecharger(new Blob([texteSauvegarde(plan)], { type: 'application/json' }), nomFichier);
    annoncer(`Sauvegarde enregistrée : ${nomFichier}`);
  };

  return (
    <Mise titre="Exporter" sousTitre={nom} retour={{ vers: `/p/${plan.id}`, texte: 'Sommaire' }} plan={plan}>
      <Carte titre="Mon business plan en PDF" sousTitre="La page de garde, la synthèse, puis tout le cahier dans l'ordre. Les réponses vides sont notées « (non rempli) ».">
        <label className="bp-coordonnees mb-3 flex items-start gap-3 rounded-xl border border-filet px-3.5 py-3 min-h-[48px]">
          <input
            type="checkbox"
            className="mt-0.5 w-6 h-6 shrink-0 accent-violet"
            checked={coordonnees}
            onChange={(e) => {
              setCoordonnees(e.target.checked);
              setPdf({ statut: 'repos' });
            }}
          />
          <span className="text-[15px] text-encre leading-snug">
            <span className="font-bold">Ajouter mes coordonnées</span>
            <span className="block text-[14px] text-doux">Téléphone et e-mail sur la page de garde. Sans cette case, ils ne sont jamais dans le PDF.</span>
          </span>
        </label>
        <button
          type="button"
          onClick={partagerPdf}
          disabled={pdf.statut === 'creation'}
          className="bp-partager-pdf w-full min-h-[52px] rounded-xl bg-violet text-white text-[17px] font-bold flex items-center justify-center gap-2 active:opacity-90 disabled:opacity-60"
        >
          <Icone nom="partager" /> {pdf.statut === 'creation' ? 'Création du PDF...' : 'Partager le PDF'}
        </button>
        <button
          type="button"
          onClick={telechargerPdf}
          disabled={pdf.statut === 'creation'}
          className="bp-telecharger-pdf mt-2.5 w-full min-h-[48px] rounded-xl border-2 border-violet text-violet font-bold flex items-center justify-center gap-2 active:bg-violetClair disabled:opacity-60"
        >
          <Icone nom="installer" /> Télécharger le PDF
        </button>
        {pdf.statut === 'pret' ? (
          <p className="bp-pdf-pret mt-2 text-[14px] text-doux break-words">
            {pdf.fichier.name}, {Math.max(1, Math.round(pdf.fichier.size / 1024))} ko
          </p>
        ) : null}
        {pdf.statut === 'erreur' ? <p className="mt-2 text-[15px] text-alerte font-bold">Le PDF n'a pas pu être créé. Réessayez.</p> : null}
      </Carte>

      <Carte titre="Texte pour WhatsApp" sousTitre="Votre synthèse et vos chiffres clés, en texte simple.">
        <button
          type="button"
          onClick={partagerWhatsApp}
          className="bp-texte-whatsapp w-full min-h-[48px] rounded-xl bg-turquoiseTexte text-white font-bold flex items-center justify-center gap-2 active:opacity-90"
        >
          <Icone nom="whatsapp" /> Partager le texte
        </button>
        <button type="button" onClick={copierWhatsApp} className="mt-2.5 w-full min-h-[44px] rounded-xl border-2 border-turquoise text-turquoiseTexte font-bold flex items-center justify-center gap-2">
          <Icone nom="copier" /> Copier le texte
        </button>
      </Carte>

      <Carte titre="Sauvegarde" sousTitre="Votre projet ne vit que sur ce téléphone. Gardez une copie du fichier, par exemple en vous l'envoyant sur WhatsApp.">
        <button
          type="button"
          onClick={sauvegarder}
          className="bp-sauvegarder w-full min-h-[48px] rounded-xl border-2 border-violet text-violet font-bold flex items-center justify-center gap-2 active:bg-violetClair"
        >
          <Icone nom="installer" /> Enregistrer une sauvegarde
        </button>
        <p className="mt-2 text-[14px] text-doux leading-snug">Pour la remettre, touchez « Restaurer une sauvegarde » sur l'écran Mes projets.</p>
      </Carte>

      {message ? (
        <p role="status" className="bp-message-export fixed left-1/2 -translate-x-1/2 bottom-[76px] z-30 w-[calc(100%-32px)] max-w-[448px] rounded-xl bg-encre text-white px-4 py-3 text-[15px] break-words">
          {message}
        </p>
      ) : null}
    </Mise>
  );
}
