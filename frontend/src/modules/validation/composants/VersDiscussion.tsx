// Everything that leads to the project thread shares one look (VC-39): water green, bubble icon
// before the text, distinct from every answering button.
import { Link, useLocation } from 'react-router-dom';
import { Icone } from './Icones';
import { BOUTON } from './Mise';
import type { QuestionJointe } from './Fil';

export const DISCUSSION = `${BOUTON} bg-discussion text-white`;

/** State given to /discussion: where « Retour » goes, and the question to attach (pill of a question). */
export interface EtatDiscussion {
  retour?: string;
  question?: QuestionJointe;
}

/** « Échanger avec CyberKELY » with the unread pill (home, confirmed home, receipt). */
export function BoutonDiscussion({ nonLus = 0, texte = 'Échanger avec CyberKELY', className = '' }: { nonLus?: number; texte?: string; className?: string }) {
  const { pathname } = useLocation();
  return (
    <Link to="/discussion" state={{ retour: pathname } satisfies EtatDiscussion} className={`${DISCUSSION} ${className}`} data-vers-discussion="">
      <Icone nom="bulle" />
      {texte}
      {nonLus > 0 && (
        <span className="bg-white text-discussion text-[12px] font-bold rounded-full px-2 py-px" aria-label={`${nonLus} non lu${nonLus > 1 ? 's' : ''}`} data-non-lus={nonLus}>
          {nonLus}
        </span>
      )}
    </Link>
  );
}

/** Small pill « Une question sur ce point ? » of a question card (26 px, bubble 13 px, text 12,5 px). */
export function PastilleQuestion({ question }: { question: QuestionJointe }) {
  const { pathname } = useLocation();
  return (
    <Link
      to="/discussion"
      state={{ retour: pathname, question } satisfies EtatDiscussion}
      className="inline-flex items-center gap-[5px] self-start h-[26px] pl-2 pr-2.5 rounded-full bg-discussion text-white text-[12.5px] font-semibold no-underline tracking-[0.01em] relative after:absolute after:-inset-y-[9px] after:inset-x-0 after:content-['']"
      data-pastille-question={question.id}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
        <path d="M4 5h16v11H9l-5 4z" />
      </svg>
      Une question sur ce point ?
    </Link>
  );
}
