/**
 * ÉVO 3 — mapping pur du répertoire téléphone (Contact Picker) vers lignes d'invitation.
 * On vérifie : retenue des contacts avec numéro, écart (compté) de ceux sans numéro,
 * extraction nom/email, tolérance aux entrées vides / null (annulation).
 */
import { describe, it, expect } from 'vitest';
import { mapImportedContacts } from '../utils/contactImport';

describe('mapImportedContacts — mapping & filtrage des contacts', () => {
  it('retient les contacts avec numéro, écarte (et compte) ceux sans numéro', () => {
    const res = mapImportedContacts([
      { name: ['A'], tel: ['032 89 95 681'] },
      { name: ['B'], tel: [] },
    ]);
    expect(res.contacts).toHaveLength(1);
    expect(res.contacts[0].nom).toBe('A');
    expect(res.contacts[0].phone).toBe('032 89 95 681');
    expect(res.ignored).toBe(1);
  });

  it('extrait nom + premier téléphone + premier email (sinon null)', () => {
    const res = mapImportedContacts([
      { name: ['Rakoto'], tel: ['0341234567'], email: ['rakoto@gmail.com'] },
      { name: ['Sans email'], tel: ['0327654321'] },
    ]);
    expect(res.contacts[0]).toEqual({ nom: 'Rakoto', phone: '0341234567', email: 'rakoto@gmail.com' });
    expect(res.contacts[1]).toEqual({ nom: 'Sans email', phone: '0327654321', email: null });
    expect(res.ignored).toBe(0);
  });

  it('écarte un contact dont le numéro ne contient aucun chiffre', () => {
    const res = mapImportedContacts([{ name: ['X'], tel: ['—'] }]);
    expect(res.contacts).toHaveLength(0);
    expect(res.ignored).toBe(1);
  });

  it('tolère null / undefined / tableau vide (annulation) → lot vide, 0 ignoré', () => {
    expect(mapImportedContacts(null)).toEqual({ contacts: [], ignored: 0 });
    expect(mapImportedContacts(undefined)).toEqual({ contacts: [], ignored: 0 });
    expect(mapImportedContacts([])).toEqual({ contacts: [], ignored: 0 });
  });

  it('contact sans nom mais avec numéro est retenu (nom vide)', () => {
    const res = mapImportedContacts([{ tel: ['0331122334'] }]);
    expect(res.contacts).toHaveLength(1);
    expect(res.contacts[0].nom).toBe('');
    expect(res.contacts[0].phone).toBe('0331122334');
  });
});
