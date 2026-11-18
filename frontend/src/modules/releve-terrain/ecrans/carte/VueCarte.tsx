// Hand-made SVG map in local metres (D7): weak geometry zones, 5 m grid, contour lines, stations,
// bornes, scale bar, north arrow. Pinch zoom and pan with pointer events (two fingers), one-finger pan,
// double tap to zoom, mouse wheel on a computer. Geometry paths are written once in metres and moved by
// a transform; markers and labels are placed in screen pixels (constant size).
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type PointerEvent as PE } from 'react'
import type { Courbe } from '../../calcul'
import type { ReleveCalcule } from '../../etat/releveCalcule'
import {
  TEINTES,
  bornesPlacees,
  cadreContenu,
  cheminSegments,
  cheminZones,
  libelleBorne,
  lignesQuadrillage,
  longueurEchelle,
  pointEtiquette,
  positionStation,
  teinteStation,
  versEcran,
  vueAjustee,
  zoomer,
  type Rectangle,
  type Vue,
} from './modele'

export interface PoigneeCarte {
  recentrer: () => void
  vue: () => Vue
}

export interface PropsVueCarte {
  calcule: ReleveCalcule
  courbes: Courbe[]
  zones: Rectangle[]
  hauteur: number
  /** Tap on a station. */
  onStation: (id: string) => void
  /** Tap on a borne (its place name is shown). */
  onBorne: (id: string | null) => void
  borneChoisie: string | null
}

const GRILLE = '#D6DBD1'
const COURBE = '#8A5A2B'
const COURBE_TEXTE = '#5B3A1A'
const ZONE = '#9CA3AF'

interface Doigt {
  x: number
  y: number
}

const virgule = (v: number) => String(Math.round(v * 10) / 10).replace('.', ',')

export const VueCarte = forwardRef<PoigneeCarte, PropsVueCarte>(function VueCarte({ calcule, courbes, zones, hauteur, onStation, onBorne, borneChoisie }, ref) {
  const boite = useRef<HTMLDivElement>(null)
  const [largeur, setLargeur] = useState(380)
  const [vue, setVue] = useState<Vue | null>(null)
  const vueRef = useRef<Vue | null>(null)
  vueRef.current = vue

  // Width of the column (ResizeObserver), the height is given.
  useEffect(() => {
    const el = boite.current
    if (!el) return
    const lire = () => setLargeur(Math.max(200, Math.round(el.getBoundingClientRect().width)))
    lire()
    if (typeof ResizeObserver === 'undefined') return
    const o = new ResizeObserver(lire)
    o.observe(el)
    return () => o.disconnect()
  }, [])

  const cadre = useMemo(() => cadreContenu(calcule), [calcule])
  const recentrer = useCallback(() => setVue(vueAjustee(cadre, largeur, hauteur)), [cadre, largeur, hauteur])
  // First frame: whole relevé.
  useEffect(() => {
    if (!vueRef.current) recentrer()
  }, [recentrer])
  useImperativeHandle(
    ref,
    () => ({
      recentrer,
      vue: () => vueRef.current ?? vueAjustee(cadre, largeur, hauteur),
    }),
    [recentrer, cadre, largeur, hauteur],
  )

  // ---------------------------------------------------------------- gestures
  const doigts = useRef(new Map<number, Doigt>())
  const pince = useRef<{ d0: number; m0: Doigt; v0: Vue } | null>(null)
  const glisse = useRef<{
    p0: Doigt
    v0: Vue
    bouge: boolean
    cible: Element | null
    t0: number
  } | null>(null)
  const dernierTap = useRef<{ t: number; x: number; y: number } | null>(null)

  const local = (e: { clientX: number; clientY: number }): Doigt => {
    const r = boite.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const departPince = () => {
    const [a, b] = [...doigts.current.values()]
    const v = vueRef.current
    if (!a || !b || !v) return
    pince.current = {
      d0: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)),
      m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      v0: v,
    }
    glisse.current = null
  }

  const onDown = (e: PE<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Synthetic pointer (bench): no capture, the events still come to the map.
    }
    doigts.current.set(e.pointerId, local(e))
    if (doigts.current.size === 2) departPince()
    else if (doigts.current.size === 1 && vueRef.current)
      glisse.current = {
        p0: local(e),
        v0: vueRef.current,
        bouge: false,
        cible: e.target as Element,
        t0: performance.now(),
      }
  }

  const onMove = (e: PE<SVGSVGElement>) => {
    if (!doigts.current.has(e.pointerId)) return
    doigts.current.set(e.pointerId, local(e))
    const p = pince.current
    if (p && doigts.current.size >= 2) {
      const [a, b] = [...doigts.current.values()]
      const d = Math.max(10, Math.hypot(a.x - b.x, a.y - b.y))
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      // Scale around the first middle point, then follow the fingers.
      const z = zoomer(p.v0, largeur, hauteur, p.m0.x, p.m0.y, d / p.d0)
      setVue({
        s: z.s,
        cx: z.cx - (m.x - p.m0.x) / z.s,
        cy: z.cy + (m.y - p.m0.y) / z.s,
      })
      return
    }
    const g = glisse.current
    if (g) {
      const q = local(e)
      const dx = q.x - g.p0.x
      const dy = q.y - g.p0.y
      if (!g.bouge && Math.hypot(dx, dy) < 8) return
      g.bouge = true
      setVue({
        s: g.v0.s,
        cx: g.v0.cx - dx / g.v0.s,
        cy: g.v0.cy + dy / g.v0.s,
      })
    }
  }

  const finTap = (q: Doigt, cible: Element | null) => {
    const station = cible?.closest('[data-station]')?.getAttribute('data-station')
    if (station) {
      onStation(station)
      return
    }
    const borne = cible?.closest('[data-borne]')?.getAttribute('data-borne')
    if (borne) {
      onBorne(borne === borneChoisie ? null : borne)
      return
    }
    const t = performance.now()
    const avant = dernierTap.current
    if (avant && t - avant.t < 320 && Math.hypot(q.x - avant.x, q.y - avant.y) < 30) {
      dernierTap.current = null
      setVue((v) => (v ? zoomer(v, largeur, hauteur, q.x, q.y, 2) : v))
      return
    }
    dernierTap.current = { t, x: q.x, y: q.y }
    if (borneChoisie) onBorne(null)
  }

  const onUp = (e: PE<SVGSVGElement>) => {
    if (!doigts.current.has(e.pointerId)) return
    const g = glisse.current
    doigts.current.delete(e.pointerId)
    if (pince.current) {
      if (doigts.current.size < 2) pince.current = null
      // One finger left after a pinch: it pans from where it is.
      if (doigts.current.size === 1 && vueRef.current) {
        const [reste] = [...doigts.current.values()]
        glisse.current = {
          p0: reste,
          v0: vueRef.current,
          bouge: true,
          cible: null,
          t0: 0,
        }
      }
      return
    }
    glisse.current = null
    if (g && !g.bouge && e.type === 'pointerup') finTap(local(e), g.cible)
  }

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const r = boite.current!.getBoundingClientRect()
      const k = Math.exp(-e.deltaY / 400)
      setVue((v) => (v ? zoomer(v, largeur, hauteur, e.clientX - r.left, e.clientY - r.top, k) : v))
    },
    [largeur, hauteur],
  )
  useEffect(() => {
    const el = boite.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  // ---------------------------------------------------------------- geometry in metres (memoised)
  const cheminZ = useMemo(() => cheminZones(zones), [zones])
  const chemins = useMemo(
    () =>
      courbes.map((c) => ({
        altitude: c.altitude,
        majeure: c.majeure,
        d: cheminSegments(c),
        etiquette: c.majeure ? pointEtiquette(c) : null,
      })),
    [courbes],
  )

  const v = vue ?? vueAjustee(cadre, largeur, hauteur)
  const l = largeur
  const h = hauteur
  const ecran = (x: number, y: number) => versEcran(v, l, h, x, y)
  const transformation = `translate(${l / 2 - v.cx * v.s} ${h / 2 + v.cy * v.s}) scale(${v.s})`
  const origine = calcule.principales.a?.position ?? bornesPlacees(calcule)[0]?.position ?? { x: 0, y: 0 }
  const grille = lignesQuadrillage(v, l, h, origine)
  const echelle = longueurEchelle(v.s)
  const fleche = calcule.orientation === 'plan' || calcule.orientation === 'nord_approximatif'
  const bornes = bornesPlacees(calcule)
  const stations = calcule.stations.flatMap((s) => {
    const p = positionStation(s)
    return p ? [{ s, p }] : []
  })
  // Numbers only when they can be read: few stations, or zoomed in enough (about 22 px between points).
  const numeros = stations.length <= 30 || v.s >= 7
  const nbEph = bornes.filter((b) => b.donnees.type === 'ephemere').length
  const resume = `Carte du relevé : ${bornes.length - nbEph} bornes, ${nbEph} borne${nbEph > 1 ? 's' : ''} éphémère${nbEph > 1 ? 's' : ''}, ${stations.length} station${stations.length > 1 ? 's' : ''}${courbes.length ? ' et courbes de niveau' : ''}`

  return (
    <div ref={boite} className="relative w-full overflow-hidden rounded-rt border-[3px] border-encre bg-surface" style={{ height: hauteur + 6 }}>
      <svg
        width={l}
        height={h}
        viewBox={`0 0 ${l} ${h}`}
        role="img"
        aria-label={resume}
        data-echelle={v.s.toFixed(4)}
        className="block select-none"
        style={{ touchAction: 'none', width: '100%', height: h }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <rect x={0} y={0} width={l} height={h} fill="#FFFFFF" />
        {/* weak geometry zones, behind everything */}
        <g transform={transformation}>
          <path d={cheminZ} fill={ZONE} fillOpacity={0.45} />
        </g>
        {/* 5 m grid */}
        <g stroke={GRILLE} strokeWidth={1}>
          {grille.xs.map((x) => {
            const [px] = ecran(x, 0)
            return <line key={`x${x}`} x1={px} y1={0} x2={px} y2={h} />
          })}
          {grille.ys.map((y) => {
            const [, py] = ecran(0, y)
            return <line key={`y${y}`} x1={0} y1={py} x2={l} y2={py} />
          })}
        </g>
        {/* contour lines (covered zone only) */}
        <g transform={transformation} fill="none" stroke={COURBE} strokeLinecap="round">
          {chemins.map((c) => (
            <path key={c.altitude} d={c.d} strokeWidth={c.majeure ? 2.6 : 1.2} vectorEffect="non-scaling-stroke" data-altitude={c.altitude} />
          ))}
        </g>
        {chemins.map((c) => {
          if (!c.etiquette) return null
          const [x, y] = ecran(c.etiquette[0], c.etiquette[1])
          if (x < -20 || y < -20 || x > l + 20 || y > h + 20) return null
          return (
            <text
              key={`t${c.altitude}`}
              x={x}
              y={y + 4}
              textAnchor="middle"
              fontSize={12}
              fontWeight={800}
              fill={COURBE_TEXTE}
              stroke="#FFFFFF"
              strokeWidth={3}
              paintOrder="stroke"
              className="rt-etroite"
            >
              {virgule(c.altitude)}
            </text>
          )
        })}
        {/* stations: dot of their colour and number; set aside in grey */}
        {stations.map(({ s, p }) => {
          const [x, y] = ecran(p.x, p.y)
          if (x < -30 || y < -30 || x > l + 30 || y > h + 30) return null
          return (
            <g key={s.id} data-station={s.id} style={{ cursor: 'pointer' }} role="link" aria-label={`Station ${s.numero}`}>
              <circle cx={x} cy={y} r={16} fill="transparent" />
              {/* Phase 3b (6.10): yellow ring around a station arrived after the take-over */}
              {s.apresReprise ? <circle data-apres-reprise cx={x} cy={y} r={11} fill="none" stroke="#FACC15" strokeWidth={4} /> : null}
              <circle cx={x} cy={y} r={7} fill={TEINTES[teinteStation(s)]} stroke="#FFFFFF" strokeWidth={2} />
              {numeros ? (
                <text x={x + 9} y={y - 6} fontSize={12} fontWeight={700} fill={s.donnees.etat === 'ecartee' ? '#3F3F3A' : '#000000'} stroke="#FFFFFF" strokeWidth={3} paintOrder="stroke">
                  {s.numero}
                </text>
              ) : null}
            </g>
          )
        })}
        {/* bornes: filled triangle (principal), hollow (ephemeral, letter and rank), grey when withdrawn */}
        {bornes.map((b) => {
          const [x, y] = ecran(b.position.x, b.position.y)
          if (x < -40 || y < -40 || x > l + 40 || y > h + 40) return null
          const principale = b.donnees.type === 'principale'
          const couleur = b.active ? '#000000' : '#8A8A82'
          const choisie = borneChoisie === b.id
          const lg = principale ? 20 : 34
          return (
            <g key={b.id} data-borne={b.id} style={{ cursor: 'pointer' }} role="button" aria-label={`Borne ${libelleBorne(b.donnees)}, ${b.donnees.nom}${b.active ? '' : ', retirée'}`}>
              <circle cx={x} cy={y} r={18} fill="transparent" />
              <path
                d={`M${x},${y - 10} L${x + 9},${y + 7} L${x - 9},${y + 7} Z`}
                fill={principale ? couleur : '#FFFFFF'}
                stroke={couleur}
                strokeWidth={principale ? 1.5 : 2.5}
                strokeLinejoin="round"
              />
              <rect x={x + 10} y={y - 11} width={lg} height={20} rx={4} fill={b.active ? '#FACC15' : '#E9EAE6'} stroke={couleur} strokeWidth={choisie ? 3 : 2} />
              <text x={x + 10 + lg / 2} y={y + 4} textAnchor="middle" fontSize={14} fontWeight={800} fill="#000000" className="rt-etroite">
                {b.donnees.lettre}
                {principale ? null : (
                  <tspan fontSize={11} fontWeight={700} dx={2}>
                    {`rang ${b.donnees.rang}`.replace('rang ', 'r')}
                  </tspan>
                )}
              </text>
              {choisie ? (
                <text x={x + 12 + lg} y={y + 4} fontSize={13} fontWeight={700} fill="#000000" stroke="#FFFFFF" strokeWidth={3} paintOrder="stroke">
                  {b.donnees.nom}
                  {b.active ? '' : ', retirée'}
                </text>
              ) : null}
            </g>
          )
        })}
        {/* scale bar */}
        <g>
          <rect x={10} y={h - 34} width={echelle * v.s + 16} height={26} fill="#FFFFFF" fillOpacity={0.85} />
          <line x1={18} y1={h - 14} x2={18 + echelle * v.s} y2={h - 14} stroke="#000000" strokeWidth={3} />
          <line x1={18} y1={h - 19} x2={18} y2={h - 10} stroke="#000000" strokeWidth={2} />
          <line x1={18 + echelle * v.s} y1={h - 19} x2={18 + echelle * v.s} y2={h - 10} stroke="#000000" strokeWidth={2} />
          <text x={18} y={h - 20} fontSize={12} fontWeight={700} fill="#000000">
            {`${String(echelle).replace('.', ',')} m`}
          </text>
        </g>
        {/* north arrow (Y towards the north), never with « orientation libre » */}
        {fleche ? (
          <g aria-label={calcule.orientation === 'nord_approximatif' ? 'Nord approximatif' : 'Nord'}>
            <rect x={l - 40} y={6} width={32} height={46} fill="#FFFFFF" fillOpacity={0.85} />
            <path d={`M${l - 24},12 l8,18 l-8,-5 l-8,5 Z`} fill="#000000" />
            <text x={l - 24} y={46} textAnchor="middle" fontSize={13} fontWeight={800} fill="#000000">
              N
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  )
})
