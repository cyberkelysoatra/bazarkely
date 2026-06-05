/**
 * Carte des compteurs (admin) — onglet « Carte » du thème Compteurs.
 * Leaflet + tuiles OSM, cache HORS-LIGNE de la zone configurée (centre/rayon/zoom).
 * Repli automatique sur la LISTE des compteurs si hors-ligne sans tuiles en cache.
 */
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { listCompteurs } from '../services/eauCompteurService';
import { getConfig } from '../services/eauConfigService';
import {
  offlineTileLayer,
  boundsFromCenter,
  downloadZoneTiles,
  countZoneTiles,
  type ZoneSpec,
} from './map/offlineTiles';
import { countTiles } from '../db/eauTiles';
import EauAide from './EauAide';
import { AIDE } from './eauAideTextes';
import type { CompteurLocal, ConfigLocal } from '../types/gestionEau';

function zoneFromConfig(cfg: ConfigLocal | null): ZoneSpec | null {
  if (!cfg || cfg.map_centre_lat == null || cfg.map_centre_lng == null) return null;
  return {
    lat: cfg.map_centre_lat,
    lng: cfg.map_centre_lng,
    radiusKm: cfg.map_rayon_km ?? 2,
    zoomMin: cfg.map_zoom_min ?? 13,
    zoomMax: cfg.map_zoom_max ?? 17,
  };
}

export default function EauCartePage() {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [compteurs, setCompteurs] = useState<CompteurLocal[]>([]);
  const [zone, setZone] = useState<ZoneSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [tilesCount, setTilesCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [fallbackList, setFallbackList] = useState(false);
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;

  // Chargement initial (données + décision carte/repli).
  useEffect(() => {
    (async () => {
      const cfg = await getConfig();
      const z = zoneFromConfig(cfg);
      const cs = await listCompteurs();
      const tc = await countTiles();
      setZone(z);
      setCompteurs(cs);
      setTilesCount(tc);
      // Repli liste si hors-ligne ET aucune tuile en cache (carte inaffichable).
      if (!online && tc === 0) setFallbackList(true);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-téléchargement au premier lancement EN LIGNE si la zone est configurée et le cache vide.
  useEffect(() => {
    if (loading || fallbackList) return;
    if (online && zone && tilesCount === 0 && !downloading) {
      void runDownload(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, online, zone, tilesCount, fallbackList]);

  // Initialise la carte Leaflet (une seule fois) quand on n'est pas en repli liste.
  useEffect(() => {
    if (loading || fallbackList || !mapElRef.current || mapRef.current) return;

    const center: L.LatLngExpression = zone ? [zone.lat, zone.lng] : [-13.41, 48.27]; // Nosy Be par défaut
    const map = L.map(mapElRef.current, { zoomControl: true }).setView(center, zone?.zoomMin ?? 13);
    mapRef.current = map;

    const layer = offlineTileLayer();
    layer.addTo(map);

    // Repli liste si trop de tuiles manquent hors-ligne après chargement initial.
    layer.on('tileerror', () => {
      if (!online && layer.missingOffline > 4) setFallbackList(true);
    });

    if (zone) {
      map.fitBounds(boundsFromCenter(zone.lat, zone.lng, zone.radiusKm));
    }

    // Marqueurs des compteurs géolocalisés (icône CSS → pas d'asset, 100% hors-ligne).
    for (const c of compteurs) {
      if (c.lat == null || c.lng == null) continue;
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:#364E30;color:#fff;border:2px solid #fff;border-radius:9999px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 1px 3px rgba(0,0,0,.4)">💧</div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      L.marker([c.lat, c.lng], { icon })
        .addTo(map)
        .bindPopup(`<strong>${c.nom}</strong><br/>${c.zone ?? 'Sans zone'} · ${c.type}`);
    }

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, fallbackList, compteurs, zone]);

  const runDownload = async (silent = false) => {
    if (!zone) {
      if (!silent) toast.error('Zone carte non configurée (Configuration → Zone carte).');
      return;
    }
    setDownloading(true);
    setProgress({ done: 0, total: countZoneTiles(zone) });
    try {
      const res = await downloadZoneTiles(zone, (p) => setProgress(p));
      const tc = await countTiles();
      setTilesCount(tc);
      if (!silent) {
        toast.success(
          `Carte téléchargée (${res.saved} tuiles${res.capped ? `, plafonné à ${res.total}` : ''}). Disponible hors-ligne.`
        );
      }
    } catch {
      if (!silent) toast.error('Échec du téléchargement de la carte.');
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  };

  const geolocalises = compteurs.filter((c) => c.lat != null && c.lng != null);

  if (loading) {
    return <div className="max-w-3xl mx-auto px-3 text-gray-400 text-sm py-8 text-center">Chargement…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-3 space-y-3">
      <EauAide id={AIDE.carte.id} quoi={AIDE.carte.quoi} comment={AIDE.carte.comment} />
      {/* Barre d'action : téléchargement de la zone hors-ligne. */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm text-gray-600">
          {tilesCount > 0 ? (
            <span className="text-emerald-700">🗺️ Carte hors-ligne prête ({tilesCount} tuiles)</span>
          ) : (
            <span className="text-gray-500">Carte non encore téléchargée</span>
          )}
        </div>
        <button
          onClick={() => runDownload(false)}
          disabled={downloading || !zone || !online}
          className="bg-ahuvi-forest hover:bg-ahuvi-olive disabled:opacity-50 text-white text-sm font-medium px-3 py-2 rounded-lg"
          title={!online ? 'Nécessite une connexion' : !zone ? 'Configurez la zone carte' : ''}
        >
          {downloading
            ? `Téléchargement… ${progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0}%`
            : '⬇️ Télécharger la carte de la zone'}
        </button>
      </div>

      {!zone && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Zone carte non configurée. Renseignez le centre et le rayon dans <strong>Configuration → Zone carte</strong> pour activer le téléchargement hors-ligne.
        </div>
      )}

      {fallbackList ? (
        <div>
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 mb-2">
            Carte indisponible hors-ligne (tuiles non téléchargées). Affichage de la liste des compteurs.
          </div>
          <div className="space-y-1">
            {compteurs.map((c) => (
              <div key={c.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                <div className="font-medium text-gray-900">{c.nom}</div>
                <div className="text-xs text-gray-500">
                  {c.type} · {c.zone ?? 'sans zone'}
                  {c.lat != null && c.lng != null ? ` · ${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}` : ' · non géolocalisé'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div ref={mapElRef} className="w-full h-[60vh] rounded-xl overflow-hidden border border-gray-200" />
          <div className="text-xs text-gray-500">
            {geolocalises.length}/{compteurs.length} compteur(s) géolocalisé(s). Renseignez lat/lng dans la fiche compteur (onglet Liste).
          </div>
        </>
      )}
    </div>
  );
}
