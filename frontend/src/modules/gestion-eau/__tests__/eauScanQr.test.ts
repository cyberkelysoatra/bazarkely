import { describe, it, expect } from 'vitest';
import {
  buildScanUrl,
  buildInternalScanPath,
  parseScanText,
  parseScanQuery,
} from '../utils/scanUrl';
import { decideOutcome } from '../services/eauScanService';
import { boundsFromCenter, countZoneTiles } from '../components/map/offlineTiles';
import type { EauRoles } from '../types/gestionEau';

const ADMIN: EauRoles = { admin: true, releveur: false, client: false };
const RELEVEUR: EauRoles = { admin: false, releveur: true, client: false };
const CLIENT: EauRoles = { admin: false, releveur: false, client: true };
const NONE: EauRoles = { admin: false, releveur: false, client: false };

describe('scanUrl — encodage / décodage des liens QR', () => {
  it('encode un QR compteur (t=c) et le re-décode à l’identique', () => {
    const url = buildScanUrl('compteur', 'CPT-AB12-CD34');
    expect(url).toContain('/gestion-eau/scan?t=c&k=CPT-AB12-CD34');
    expect(parseScanText(url)).toEqual({ type: 'compteur', code: 'CPT-AB12-CD34' });
  });

  it('encode un QR client (t=cl) et le re-décode à l’identique', () => {
    const url = buildScanUrl('client', 'CLT-WX99-YZ88');
    expect(url).toContain('/gestion-eau/scan?t=cl&k=CLT-WX99-YZ88');
    expect(parseScanText(url)).toEqual({ type: 'client', code: 'CLT-WX99-YZ88' });
  });

  it('décode aussi un chemin interne relatif', () => {
    const path = buildInternalScanPath('compteur', 'CPT-1234-5678');
    expect(path.startsWith('/gestion-eau/scan?')).toBe(true);
    expect(parseScanText(path)).toEqual({ type: 'compteur', code: 'CPT-1234-5678' });
  });

  it('rejette un texte non conforme', () => {
    expect(parseScanText('https://example.com/autre')).toBeNull();
    expect(parseScanText('')).toBeNull();
    expect(parseScanQuery('x', 'CODE')).toBeNull();
    expect(parseScanQuery('c', null)).toBeNull();
  });
});

describe('decideOutcome — matrice de résolution selon le rôle', () => {
  const qr = { id: 'q1', compteur_id: 'cpt1', emplacement: 'Entrée' };
  const compteMien = { id: 'cl1', nom: 'Rakoto', user_id: 'u1' };
  const compteAutre = { id: 'cl2', nom: 'Rasoa', user_id: 'u2' };

  it('non connecté → page mission', () => {
    expect(decideOutcome({ type: 'compteur', roles: NONE, userId: null, qr }).kind).toBe('mission');
  });

  it('sans rôle eau (connecté) → page mission', () => {
    expect(decideOutcome({ type: 'compteur', roles: NONE, userId: 'u1', qr }).kind).toBe('mission');
  });

  it('releveur + QR compteur → saisie directe du bon compteur', () => {
    const o = decideOutcome({ type: 'compteur', roles: RELEVEUR, userId: 'u1', qr });
    expect(o.kind).toBe('saisie-compteur');
    if (o.kind === 'saisie-compteur') expect(o.compteurId).toBe('cpt1');
  });

  it('admin + QR compteur → saisie directe', () => {
    expect(decideOutcome({ type: 'compteur', roles: ADMIN, userId: 'a1', qr }).kind).toBe('saisie-compteur');
  });

  it('client + QR compteur → refus (non destiné)', () => {
    expect(decideOutcome({ type: 'compteur', roles: CLIENT, userId: 'u1', qr }).kind).toBe('refus');
  });

  it('QR compteur inconnu → introuvable', () => {
    expect(decideOutcome({ type: 'compteur', roles: ADMIN, userId: 'a1', qr: null }).kind).toBe('introuvable');
  });

  it('releveur + QR client → fiche conso de ce client', () => {
    const o = decideOutcome({ type: 'client', roles: RELEVEUR, userId: 'r1', compte: compteAutre });
    expect(o.kind).toBe('fiche-client');
    if (o.kind === 'fiche-client') expect(o.clientId).toBe('cl2');
  });

  it('client + SON QR → son espace', () => {
    const o = decideOutcome({ type: 'client', roles: CLIENT, userId: 'u1', compte: compteMien });
    expect(o.kind).toBe('mon-espace');
  });

  it('client + QR d’un AUTRE client → refus', () => {
    expect(decideOutcome({ type: 'client', roles: CLIENT, userId: 'u1', compte: compteAutre }).kind).toBe('refus');
  });

  it('QR client inconnu → introuvable', () => {
    expect(decideOutcome({ type: 'client', roles: RELEVEUR, userId: 'r1', compte: null }).kind).toBe('introuvable');
  });
});

describe('offlineTiles — maths du cache de tuiles de zone', () => {
  it('borne une zone autour du centre (rayon strictement positif)', () => {
    const b = boundsFromCenter(-13.41, 48.27, 2);
    expect(b.getNorth()).toBeGreaterThan(b.getSouth());
    expect(b.getEast()).toBeGreaterThan(b.getWest());
  });

  it('compte un nombre positif de tuiles, croissant avec le zoom max', () => {
    const zone = { lat: -13.41, lng: 48.27, radiusKm: 2 };
    const petit = countZoneTiles({ ...zone, zoomMin: 13, zoomMax: 14 });
    const grand = countZoneTiles({ ...zone, zoomMin: 13, zoomMax: 17 });
    expect(petit).toBeGreaterThan(0);
    expect(grand).toBeGreaterThan(petit);
  });
});
