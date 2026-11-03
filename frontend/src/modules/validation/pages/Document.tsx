// « Lire le document » (/document/:id, VC-07, D2): the exact version of the document, Markdown
// from vc_document rendered for a phone and sanitized, kept on the device for offline reading.
// Own lazy chunk (marked + DOMPurify are loaded only here).
import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { BarreRetour, CARTE, Corps, useCouleurTheme } from '../composants/Mise';
import { lireDocument } from '../appels/api';
import { ecrireLocal, lireLocal } from '../appels/local';
import { nomCycle } from '../utils/regles';
import type { DocumentTexte } from '../utils/types';
import { Attente, BandeauReseau, CarteInfo, EnTeteClient, useProjet } from './Cadre';
import { usePresence } from '../appels/presence';

/** Markdown → safe HTML; every table wrapped in a box that scrolls on its own. */
export function rendreMarkdown(md: string): string {
  const brut = marked.parse(md ?? '', { async: false, gfm: true, breaks: false }) as string;
  const propre = DOMPurify.sanitize(brut, { USE_PROFILES: { html: true } });
  return propre.replace(/<table>/g, '<div class="vc-tableau"><table>').replace(/<\/table>/g, '</table></div>');
}

export default function Document() {
  useCouleurTheme('#0369a1');
  const { id = '' } = useParams();
  const { state } = useLocation();
  const retour = (state as { retour?: string } | null)?.retour;
  const { statut, p, email, lent } = useProjet();
  const [doc, setDoc] = useState<DocumentTexte | null>(null);
  const [etat, setEtat] = useState<'chargement' | 'pret' | 'erreur' | 'refuse'>('chargement');
  usePresence(p?.client_id, p && doc ? { type: 'document', titre: doc.titre_client } : null);

  useEffect(() => {
    let vivant = true;
    void (async () => {
      const local = await lireLocal<DocumentTexte>(`d:${id}`);
      if (!vivant) return;
      if (local?.id) {
        setDoc(local);
        setEtat('pret');
      }
      if (!navigator.onLine) {
        if (!local?.id) setEtat('erreur');
        return;
      }
      try {
        const d = await lireDocument(id);
        if (!vivant) return;
        setDoc(d);
        setEtat('pret');
        void ecrireLocal(`d:${id}`, d);
      } catch (e) {
        if (!vivant) return;
        const m = e instanceof Error ? e.message : '';
        if (/VC_ACCES_REFUSE/.test(m)) setEtat('refuse');
        else if (!local?.id) setEtat('erreur');
      }
    })();
    return () => {
      vivant = false;
    };
  }, [id]);

  const html = useMemo(() => (doc ? rendreMarkdown(doc.contenu_md) : ''), [doc]);

  if (statut === 'sortie' || etat === 'refuse') return <Navigate to="/" replace />;
  const barre = <BarreRetour vers={retour ?? '/'} libelle={retour?.startsWith('/q/') ? 'Retour à la question' : 'Retour'} />;
  return (
    <>
      <EnTeteClient p={p} email={email} />
      {!navigator.onLine && doc && <BandeauReseau texte="Pas de réseau : vous lisez la copie gardée sur ce téléphone." />}
      {statut === 'attente' || (etat === 'chargement' && !doc) ? (
        <Attente lent={lent} />
      ) : (
        <Corps data-document={doc?.id ?? ''}>
          {barre}
          {doc ? (
            <>
              <p className="text-[13px] text-doux m-0" data-version-document="">
                {doc.titre_client} · {nomCycle(doc.type, doc.version)}
              </p>
              <article className={`${CARTE} vc-doc`} dangerouslySetInnerHTML={{ __html: html }} data-markdown="" />
            </>
          ) : (
            <CarteInfo texte="Pas de réseau : ce document n’a pas encore été ouvert sur ce téléphone." data-document-absent="" />
          )}
        </Corps>
      )}
    </>
  );
}
