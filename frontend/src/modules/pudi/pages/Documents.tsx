// Public PUDi documents: two cards, « Ouvrir » (new tab) and « Télécharger ». Free access,
// no sign-in. The PDFs are never stored offline (network only, see /pudi/sw.js).
import { useEffect, useState } from 'react';
import { Icone } from '../composants/Icones';
import { Page, boutonPrincipal, boutonSecondaire } from '../composants/Mise';
import { fr } from '../i18n/fr';
import { useDonnees, usePudi } from '../PudiContexte';
import { documentsPudi, urlDocument } from '../utils/documents';

function useEnLigne(): boolean {
  const { horsLigne } = usePudi();
  const [enLigne, setEnLigne] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine !== false);
    window.addEventListener('online', maj);
    window.addEventListener('offline', maj);
    return () => {
      window.removeEventListener('online', maj);
      window.removeEventListener('offline', maj);
    };
  }, []);
  return enLigne && !horsLigne;
}

export default function Documents() {
  const { donnees } = useDonnees();
  const enLigne = useEnLigne();
  const docs = documentsPudi(donnees);
  return (
    <Page titre={fr.documents.titre}>
      <p className="text-[0.9375rem] text-gris mb-3">{fr.documents.intro}</p>
      <div role="note" className="mb-4 border-l-4 border-[#926407] bg-[#FFF6E0] rounded-r-lg px-3 py-2.5 flex gap-2.5 items-start">
        <Icone nom="alerte" className="w-5 h-5 mt-0.5" />
        <p className="text-[0.9375rem] leading-snug">{fr.documents.lourds}</p>
      </div>
      {!enLigne && (
        <div role="status" className="mb-4 border-l-4 border-[#B85317] bg-white rounded-r-lg px-3 py-2.5 flex gap-2.5 items-start shadow-sm">
          <Icone nom="horsLigne" className="w-5 h-5 mt-0.5" />
          <p className="text-[0.9375rem] leading-snug">{fr.documents.horsLigne}</p>
        </div>
      )}
      <ul className="space-y-3">
        {docs.map((d) => {
          const url = urlDocument(d);
          const details = [fr.documents.pdf, d.taille, d.pages ? fr.documents.pages(d.pages) : null].filter(Boolean).join(' · ');
          return (
            <li key={d.id} className="bg-white border border-filet rounded-xl p-4">
              <div className="flex gap-3 items-start">
                <span className="shrink-0 w-11 h-11 rounded-xl bg-vide text-marine flex items-center justify-center" aria-hidden="true">
                  <Icone nom="document" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-bold text-[1rem] leading-snug text-marine break-words">{d.titre}</h2>
                  <p className="text-[0.8125rem] text-gris mt-0.5">{details}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {enLigne ? (
                  <>
                    <a href={url} target="_blank" rel="noopener" className={`${boutonPrincipal} px-3`}>
                      <Icone nom="oeil" />
                      {fr.documents.ouvrir}
                    </a>
                    <a href={url} download={d.fichier} className={`${boutonSecondaire} px-3`}>
                      <Icone nom="telecharger" />
                      {fr.documents.telecharger}
                    </a>
                  </>
                ) : (
                  <>
                    <button type="button" disabled className={`${boutonPrincipal} px-3`} aria-describedby={`pudi-doc-${d.id}`}>
                      <Icone nom="oeil" />
                      {fr.documents.ouvrir}
                    </button>
                    <button type="button" disabled className={`${boutonSecondaire} px-3`} aria-describedby={`pudi-doc-${d.id}`}>
                      <Icone nom="telecharger" />
                      {fr.documents.telecharger}
                    </button>
                    <p id={`pudi-doc-${d.id}`} className="col-span-2 text-[0.8125rem] text-gris">
                      {fr.documents.horsLigne}
                    </p>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
