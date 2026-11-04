import { describe, expect, it } from 'vitest';
import { ETAPES, etapeDuType, etatsEtapes, ligneEtape, majuscule, ordinal, phraseDefinition, phraseEtape, type DocEtape } from './etapes';

const doc = (type: string, etat: string, publie_at: string | null, porte_franchie_at: string | null = null): DocEtape => ({ type, etat, publie_at, porte_franchie_at });
const etats = (docs: DocEtape[]) => etatsEtapes(docs)?.map((x) => x.etat);

describe('project steps (VC-46)', () => {
  it('maps the five document types to the five steps, in order', () => {
    expect(ETAPES.map((e) => `${e.n}:${e.type}`)).toEqual(['1:note_cadrage', '2:cahier_charges', '3:prd', '4:maquette', '5:recette']);
    expect(etapeDuType('prd')?.terme).toBe('spécifications fonctionnelles');
    expect(etapeDuType('maquette')?.nom).toBe('l’aperçu à essayer sur votre téléphone');
  });

  it('has no step for an avenant, a découverte or an unknown type', () => {
    expect(etapeDuType('avenant')).toBeNull();
    expect(etapeDuType('decouverte')).toBeNull();
    expect(etapeDuType('autre')).toBeNull();
    expect(etapeDuType(undefined)).toBeNull();
  });

  it('writes ordinals, capitals, the definition and the sentences', () => {
    expect([1, 2, 3, 4, 5].map(ordinal)).toEqual(['1re', '2e', '3e', '4e', '5e']);
    expect(majuscule('le résumé de votre projet')).toBe('Le résumé de votre projet');
    expect(phraseDefinition(ETAPES[0])).toBe(
      'La note de cadrage, c’est le document qui fixe le projet avant de le construire : le besoin, l’objectif, le budget et les délais.'
    );
    expect(phraseDefinition(ETAPES[1])).toBe('Le cahier des charges, c’est la liste de tout ce que l’application doit faire, que nous nous engageons à livrer.');
    expect(phraseDefinition(ETAPES[2]).startsWith('Les spécifications fonctionnelles, c’est la description')).toBe(true);
    expect(phraseEtape(ETAPES[0])).toBe('la 1re étape, le résumé de votre projet (note de cadrage)');
    expect(phraseEtape(ETAPES[1])).toBe('la 2e étape, le détail de votre application (cahier des charges)');
    expect(ligneEtape(ETAPES[3])).toBe('Étape 4 sur 5 : L’aperçu à essayer sur votre téléphone (maquette)');
  });

  it('shows no steps without a publication of the five types', () => {
    expect(etatsEtapes([])).toBeNull();
    expect(etatsEtapes(undefined)).toBeNull();
    expect(etatsEtapes([doc('note_cadrage', 'brouillon', null), doc('avenant', 'ouvert', '2026-11-01T10:00:00Z')])).toBeNull();
  });

  it('step 1 open: 1st « en cours », the others « à venir »', () => {
    expect(etats([doc('note_cadrage', 'ouvert', '2026-11-01T10:00:00Z')])).toEqual(['en_cours', 'a_venir', 'a_venir', 'a_venir', 'a_venir']);
  });

  it('franchie, en cours, en vérification', () => {
    const franchie = doc('note_cadrage', 'confirme', '2026-11-01T10:00:00Z', '2026-11-03T10:00:00Z');
    const cahier = doc('cahier_charges', 'ouvert', '2026-11-04T10:00:00Z');
    expect(etats([cahier, franchie])).toEqual(['franchie', 'en_cours', 'a_venir', 'a_venir', 'a_venir']);
    // Confirmed but not marked by Joël: « En vérification chez CyberKELY ».
    expect(etats([cahier, doc('note_cadrage', 'confirme', '2026-11-01T10:00:00Z')])).toEqual(['verification', 'en_cours', 'a_venir', 'a_venir', 'a_venir']);
    // The current step marked too shows franchie.
    expect(etats([doc('note_cadrage', 'confirme', '2026-11-01T10:00:00Z', '2026-11-02T10:00:00Z')])).toEqual(['franchie', 'a_venir', 'a_venir', 'a_venir', 'a_venir']);
    // One franchie version of the type is enough (older replaced version marked).
    expect(etats([doc('note_cadrage', 'ouvert', '2026-11-05T10:00:00Z'), doc('note_cadrage', 'remplace', '2026-11-01T10:00:00Z', '2026-11-02T10:00:00Z')])?.[0]).toBe('franchie');
  });

  it('a step before the current one without publication stays « à venir »', () => {
    expect(etats([doc('prd', 'ouvert', '2026-11-04T10:00:00Z'), doc('note_cadrage', 'confirme', '2026-11-01T10:00:00Z')])).toEqual([
      'verification',
      'a_venir',
      'en_cours',
      'a_venir',
      'a_venir'
    ]);
  });

  it('the latest publication wins, drafts and avenants ignored', () => {
    const docs = [
      doc('cahier_charges', 'confirme', '2026-11-02T10:00:00Z'),
      doc('note_cadrage', 'ouvert', '2026-11-04T10:00:00Z'),
      doc('maquette', 'brouillon', null),
      doc('avenant', 'ouvert', '2026-11-06T10:00:00Z')
    ];
    expect(etats(docs)).toEqual(['en_cours', 'a_venir', 'a_venir', 'a_venir', 'a_venir']);
    // Copy kept from an older version (no date): the list order (latest first) decides.
    expect(etats([doc('cahier_charges', 'ouvert', null), doc('note_cadrage', 'confirme', null)])).toEqual(['verification', 'en_cours', 'a_venir', 'a_venir', 'a_venir']);
  });
});
