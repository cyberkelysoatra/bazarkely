/**
 * "Je suis : Client / Épicier / Chauffeur / Opératrice" (phase 1A), shown in the
 * NAVY header in place of the subtitle line — same height, so the 89 px header is
 * unchanged. Hidden when the account only holds "Client" (the caller then keeps the
 * subtitle). The menu is rendered in a portal: the title block has overflow-hidden
 * (truncation) and must never clip a menu.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Headset, ShoppingBag, Store, Truck } from 'lucide-react';
import { useNavyRoles } from '../context/useNavyRoles';
import type { NavyRole } from '../types/partner';
import { homePathForRole, ROLE_LABELS } from '../utils/partnerRules';

const ROLE_ICONS: Record<NavyRole, typeof Store> = {
  client: ShoppingBag,
  epicier: Store,
  chauffeur: Truck,
  operatrice: Headset,
};

export default function NavyRoleSwitcher() {
  const { held, activeRole, setActiveRole } = useNavyRoles();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = 224;
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    const onResize = () => setOpen(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (held.length <= 1) return null;
  const ActiveIcon = ROLE_ICONS[activeRole];

  const choose = (role: NavyRole) => {
    setOpen(false);
    if (role !== activeRole) setActiveRole(role);
    navigate(homePathForRole(role));
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="inline-flex max-w-full items-center gap-1 rounded-md text-sm font-medium leading-5 text-navyay-charcoal/80 hover:text-navyay-charcoal focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow"
      >
        {/* Narrow phones: the prefix stays for screen readers only, the role never truncates. */}
        <span className="sr-only min-[400px]:not-sr-only min-[400px]:truncate">Je suis :</span>
        <ActiveIcon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="font-semibold text-navyay-charcoal whitespace-nowrap">{ROLE_LABELS[activeRole]}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Je suis"
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-[70] w-56 rounded-2xl border border-navyay-charcoal/15 bg-white p-1.5 shadow-xl text-navyay-charcoal"
          >
            {held.map((role) => {
              const Icon = ROLE_ICONS[role];
              const active = role === activeRole;
              return (
                <button
                  key={role}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => choose(role)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
                    active ? 'bg-navyay-charcoal text-navyay-yellow' : 'hover:bg-navyay-yellow/15'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0">{ROLE_LABELS[role]}</span>
                  {active && <Check className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
