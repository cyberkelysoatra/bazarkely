// PRD section 8: values out of range refused with a message.
import { describe, expect, it } from 'vitest'
import { MESSAGES, validerCap, validerDistance, validerPente, validerVisee } from '../index'

describe('Valeurs hors bornes (section 8)', () => {
  it.each([0, -1, -0.01, 1000.01, 5000, NaN])('distance %d refusée', (d) => {
    expect(validerDistance(d)).toEqual({ ok: false, message: MESSAGES.distanceHorsBornes })
  })
  it.each([0.01, 1, 53.64, 1000])('distance %d acceptée', (d) => {
    expect(validerDistance(d)).toEqual({ ok: true })
  })
  it.each([-90.01, 90.01, -180, 180, NaN])('pente %d refusée', (p) => {
    expect(validerPente(p)).toEqual({ ok: false, message: MESSAGES.penteHorsBornes })
  })
  it.each([-90, -12.1, 0, 13.6, 90])('pente %d acceptée', (p) => {
    expect(validerPente(p)).toEqual({ ok: true })
  })
  it.each([-0.01, -10, 360.01, 720, NaN])('cap %d refusé', (c) => {
    expect(validerCap(c)).toEqual({ ok: false, message: MESSAGES.capHorsBornes })
  })
  it.each([0, 74.4, 254.4, 360])('cap %d accepté', (c) => {
    expect(validerCap(c)).toEqual({ ok: true })
  })
  it('visée : distance contrôlée avant la pente', () => {
    expect(validerVisee(0, 120)).toEqual({ ok: false, message: MESSAGES.distanceHorsBornes })
    expect(validerVisee(20, 120)).toEqual({ ok: false, message: MESSAGES.penteHorsBornes })
    expect(validerVisee(20.57, 13.6)).toEqual({ ok: true })
  })
})
