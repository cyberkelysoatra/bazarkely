// Minimal local typing for d3-delaunay (the package ships no types).
// Only the part used by courbes.ts is declared.
declare module 'd3-delaunay' {
  export class Delaunay {
    static from(points: ArrayLike<readonly [number, number]>): Delaunay
    readonly points: Float64Array
    readonly triangles: Uint32Array
    readonly halfedges: Int32Array
    readonly hull: Uint32Array
  }
}
