// « PUDi p. 66, 67, 68 »: each printed page number opens the PDF at that page in a new tab.
import type { DocumentPudi } from '../data/types';
import { fr } from '../i18n/fr';
import { urlPagePudi } from '../utils/documents';

export function LiensPages({ doc, pages, className = '' }: { doc: DocumentPudi; pages: number[]; className?: string }) {
  if (!pages.length) return null;
  return (
    <span className={className}>
      PUDi p.{' '}
      {pages.map((n, i) => (
        <span key={n}>
          {i > 0 && ', '}
          <a
            href={urlPagePudi(doc, n)}
            target="_blank"
            rel="noopener"
            aria-label={fr.programme.pageOuvre(n)}
            className="font-bold text-marine underline underline-offset-2 decoration-[#9AA3BD] inline-block min-w-[24px] py-1 text-center"
          >
            {n}
          </a>
        </span>
      ))}
    </span>
  );
}
