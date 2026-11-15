// VALIDCLIENT-CC-13 gaps 3 and 4: « Disponible » only after a real server publication; the follow-up
// message is built only after a success; a failure changes nothing on the client side.
import { describe, expect, it, vi } from 'vitest';
import { publierPuisSuite } from './publication';
import { etapeSuivi } from './regles';
import type { QuestionnaireClient } from './api';

type Ligne = Pick<QuestionnaireClient, 'id' | 'etat' | 'etape_suivi' | 'confirme_at'>;

/** Fake server: vc_admin_publier publishes the draft and sets the previous confirmed version to « Disponible ». */
function serveur(reponse: 'ok' | 'refus' | 'reseau') {
  const lignes: Ligne[] = [
    { id: 'v19', etat: 'confirme', etape_suivi: 'analyse', confirme_at: '2026-11-03T04:31:00Z' },
    { id: 'v110', etat: 'brouillon', etape_suivi: null, confirme_at: null }
  ];
  const publier = vi.fn(async (id: string) => {
    if (reponse === 'reseau') throw new Error('timeout');
    if (reponse === 'refus') return { ok: false, code: 'SANS_VALIDANT' };
    lignes.find((l) => l.id === id)!.etat = 'ouvert';
    const ancien = lignes.find((l) => l.id === 'v19')!;
    ancien.etat = 'remplace';
    ancien.etape_suivi = 'disponible';
    return { ok: true };
  });
  return { lignes, publier };
}

const destinataire = { nomCourt: 'Essai Validation', civilite: 'Monsieur', nom: 'Joël SOATRA', numero: '+261 32 11 066 18', type: 'note_cadrage' };

describe('publication then follow-up (VALIDCLIENT-CC-13)', () => {
  it('gap 3: « Disponible » appears only after the server published the next version', async () => {
    const s = serveur('ok');
    let vue = s.lignes.map((l) => ({ ...l }));
    const relire = vi.fn(() => {
      vue = s.lignes.map((l) => ({ ...l }));
    });
    expect(etapeSuivi(vue[0])).toBe('analyse');
    const issue = await publierPuisSuite({ id: 'v110', publier: s.publier, relire, destinataire });
    expect(s.publier).toHaveBeenCalledWith('v110');
    expect(relire).toHaveBeenCalledTimes(1);
    expect(issue.ok).toBe(true);
    expect(etapeSuivi(vue[0])).toBe('disponible');
    expect(vue[1].etat).toBe('ouvert');
  });

  it.each(['refus', 'reseau'] as const)('gap 3: when the publication fails (%s), nothing changes on the client side', async (cas) => {
    const s = serveur(cas);
    const vue = s.lignes.map((l) => ({ ...l }));
    const relire = vi.fn();
    const issue = await publierPuisSuite({ id: 'v110', publier: s.publier, relire, destinataire });
    expect(issue).toEqual(cas === 'refus' ? { ok: false, code: 'SANS_VALIDANT', reseau: false } : { ok: false, code: null, reseau: true });
    expect(relire).not.toHaveBeenCalled();
    expect(etapeSuivi(vue[0])).toBe('analyse');
    expect(vue[1].etat).toBe('brouillon');
    expect(s.lignes[0].etape_suivi).toBe('analyse');
  });

  it('gap 4: after a success, the follow-up message goes to WhatsApp, or is given to copy without a number', async () => {
    const avec = await publierPuisSuite({ id: 'v110', publier: serveur('ok').publier, destinataire });
    expect(avec.ok && avec.adresse?.startsWith('https://wa.me/261321106618?text=')).toBe(true);
    if (!avec.ok || !avec.adresse) throw new Error('adresse attendue');
    expect(decodeURIComponent(avec.adresse.split('?text=')[1])).toBe(avec.message);
    expect(avec.message).toContain('la suite de votre projet est prête : la 1re étape, le résumé de votre projet (note de cadrage), vous attend');

    const sans = await publierPuisSuite({ id: 'v110', publier: serveur('ok').publier, destinataire: { ...destinataire, numero: null } });
    expect(sans).toEqual({ ok: true, adresse: null, message: avec.message });

    const premiere = await publierPuisSuite({ id: 'v110', publier: serveur('ok').publier, destinataire: null });
    expect(premiere).toEqual({ ok: true, adresse: null, message: null });
  });
});
