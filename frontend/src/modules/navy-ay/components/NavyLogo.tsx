/**
 * NAVY ay logos (files copied from JOEL's brand kit into /public/navy-ay/).
 * If a file is missing, a clean text fallback is rendered — never a broken image.
 */
import { useState } from 'react';

const SYMBOL_SRC = '/navy-ay/A_profil.svg';
const LONG_SRC = '/navy-ay/NAVYay_long_couleur.svg';

/** Square symbol (switcher, Header). Fallback: "N" on a yellow badge. */
export function NavySymbol({ className = 'w-full h-full', rounded = 'rounded-xl' }: { className?: string; rounded?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className={`${className} ${rounded} bg-navyay-yellow text-navyay-charcoal font-bold flex items-center justify-center leading-none`}
        aria-hidden="true"
      >
        N
      </span>
    );
  }
  return (
    <img
      src={SYMBOL_SRC}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`${className} ${rounded} object-cover bg-white`}
      onError={() => setFailed(true)}
    />
  );
}

/** Horizontal wordmark (public entry page). Fallback: "NAVY" charcoal + "ay" yellow. */
export function NavyWordmark({ className = 'h-16 w-auto' }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <NavyTitle className="text-4xl" />;
  }
  return (
    <img
      src={LONG_SRC}
      alt="NAVY ay"
      draggable={false}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

/** Text title "NAVY ay": NAVY charcoal, "ay" yellow (same as the wordmark). */
export function NavyTitle({ className = '' }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className="text-navyay-charcoal">NAVY</span>{' '}
      <span className="text-navyay-yellow">ay</span>
    </span>
  );
}
