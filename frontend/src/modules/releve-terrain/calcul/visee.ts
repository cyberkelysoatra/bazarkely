// PRD 6.1: one sight, and the input checks of section 8.
import { MESSAGES } from './seuils'
import type { Validation } from './types'

const RAD = Math.PI / 180

export function enRadians(deg: number): number {
  return deg * RAD
}

export function enDegres(rad: number): number {
  return rad / RAD
}

/** Horizontal distance H = D x cos(theta). */
export function horizontale(distance: number, penteDeg: number): number {
  return distance * Math.cos(penteDeg * RAD)
}

/** Elevation of the line of sight V = D x sin(theta). */
export function deniveleVisee(distance: number, penteDeg: number): number {
  return distance * Math.sin(penteDeg * RAD)
}

/** Ground altitude under the station deduced from a target: Zs = ZB + ht - hi - V. */
export function altitudeDepuis(zBorne: number, distance: number, penteDeg: number, hi: number, ht: number): number {
  return zBorne + ht - hi - deniveleVisee(distance, penteDeg)
}

/** Section 8: distance <= 0 or > 1000 m refused. */
export function validerDistance(distance: number): Validation {
  if (!Number.isFinite(distance) || distance <= 0 || distance > 1000) return { ok: false, message: MESSAGES.distanceHorsBornes }
  return { ok: true }
}

/** Section 8: slope outside -90 to +90 degrees refused. */
export function validerPente(pente: number): Validation {
  if (!Number.isFinite(pente) || pente < -90 || pente > 90) return { ok: false, message: MESSAGES.penteHorsBornes }
  return { ok: true }
}

/** Section 8: heading outside 0 to 360 degrees refused. */
export function validerCap(cap: number): Validation {
  if (!Number.isFinite(cap) || cap < 0 || cap > 360) return { ok: false, message: MESSAGES.capHorsBornes }
  return { ok: true }
}

/** Distance then slope check of one sight. */
export function validerVisee(distance: number, pente: number): Validation {
  const d = validerDistance(distance)
  if (!d.ok) return d
  return validerPente(pente)
}
