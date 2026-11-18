// Deep merge of an imported entete (RELEVE-CC-07 security review): keys of the prototype chain are ignored.
import { describe, expect, it } from 'vitest'
import { fusionProfonde } from '../depot'

describe('fusionProfonde', () => {
  it('fusionne objet par objet et remplace le reste', () => {
    const r = fusionProfonde({ a: 1, b: { c: 2, d: 3 }, e: [1] }, { b: { c: 9 }, e: [2, 3] })
    expect(r).toEqual({ a: 1, b: { c: 9, d: 3 }, e: [2, 3] })
  })

  it('ignore __proto__, constructor et prototype venus d’un fichier', () => {
    const patch = JSON.parse('{"__proto__": {"pollue": true}, "constructor": {"x": 1}, "prototype": 2, "nom": "Relevé"}')
    const r = fusionProfonde<Record<string, unknown>>({ nom: 'Ancien' }, patch)
    expect(r.nom).toBe('Relevé')
    expect(Object.getPrototypeOf(r)).toBe(Object.prototype)
    expect((r as { pollue?: boolean }).pollue).toBeUndefined()
    expect(({} as { pollue?: boolean }).pollue).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(r, 'prototype')).toBe(false)
  })
})
