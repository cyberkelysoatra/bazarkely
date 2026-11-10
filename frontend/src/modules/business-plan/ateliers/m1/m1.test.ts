import { describe, expect, it } from 'vitest';
import { planVide } from '../../etat/vide';
import { planExemple } from '../../data/exemple';
import { contracter, textePhrase } from './phrase';
import { champsM1, progression } from './progression';

describe('module 1', () => {
  it('builds the value proposition sentence with the project name', () => {
    expect(textePhrase(planExemple())).toBe(
      "Pour les hôtels et restaurants de Nosy Be qui veulent servir des jus frais et locaux à leurs clients, JUS'NOSY propose des jus de fruits frais de l'île livrés deux fois par semaine qui valorisent l'image locale de l'établissement à un prix connu d'avance, contrairement aux jus importés ou industriels qu'ils servent aujourd'hui."
    );
  });

  it('shows the placeholders of an empty sentence', () => {
    expect(textePhrase(planVide())).toBe(
      "Pour [client] qui [problème ou besoin], [nom du projet] propose [solution] qui [bénéfice principal], contrairement à [ce qu'il utilise aujourd'hui]."
    );
  });

  it('contracts "à les" and "à le"', () => {
    expect(contracter('les jus')).toEqual(['aux ', 'jus']);
    expect(contracter('le marché')).toEqual(['au ', 'marché']);
    expect(contracter('la vente')).toEqual(['à ', 'la vente']);
  });

  it('counts its 15 text fields', () => {
    const p = planVide();
    expect(champsM1(p)).toHaveLength(15);
    expect(progression(p)).toBe(0);
    p.m1.probleme = 'x';
    p.m1.pv.pour = 'y';
    p.m1.client.qui = '   ';
    expect(progression(p)).toBe(13);
    expect(progression(planExemple())).toBe(100);
  });

  it('example texts have no dash nor middle dot', () => {
    expect(JSON.stringify(planExemple().m1)).not.toMatch(/[\u2014\u2013\u00b7]/);
  });
});
