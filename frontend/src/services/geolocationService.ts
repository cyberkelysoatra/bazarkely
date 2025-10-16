/**
 * Geolocation Service for BazarKELY
 * Handles GPS permissions, location tracking, and validation for Madagascar regions
 */

import type { GPSLocation, GeolocationValidation, UserGeolocation } from '../types/certification';
import { MADAGASCAR_REGIONS } from '../types/certification';

/**
 * Request GPS permission from user
 * @returns Promise<boolean> - Whether permission was granted
 */
export const requestGPSPermission = async (): Promise<boolean> => {
  try {
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        (error) => {
          console.error('Geolocation permission denied:', error);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  } catch (error) {
    console.error('Error requesting GPS permission:', error);
    return false;
  }
};

/**
 * Get current GPS position
 * @returns Promise<GPSLocation> - Current GPS coordinates and metadata
 */
export const getCurrentPosition = async (): Promise<GPSLocation> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const gpsLocation: GPSLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: position.timestamp
        };
        resolve(gpsLocation);
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
};

/**
 * Validate location coherence between declared and GPS location
 * @param declaredLocation - User's declared location
 * @param gpsLocation - GPS coordinates
 * @returns GeolocationValidation result
 */
export const validateLocationCoherence = (
  declaredLocation: UserGeolocation,
  gpsLocation: GPSLocation
): GeolocationValidation => {
  try {
    // Check GPS accuracy threshold
    if (gpsLocation.accuracy > 100) {
      return {
        isCoherent: false,
        confidence: 0,
        suggestedRegion: undefined
      };
    }

    // Get region from GPS coordinates
    const detectedRegion = getRegionFromCoordinates(gpsLocation.latitude, gpsLocation.longitude);
    
    // Calculate confidence based on accuracy and region match
    let confidence = 100;
    
    // Reduce confidence based on GPS accuracy
    confidence -= Math.min(50, gpsLocation.accuracy / 2);
    
    // Check if declared region matches detected region
    const isRegionMatch = declaredLocation.region === detectedRegion;
    if (!isRegionMatch) {
      confidence -= 30;
    }

    return {
      isCoherent: confidence >= 50,
      confidence: Math.max(0, Math.min(100, confidence)),
      suggestedRegion: isRegionMatch ? declaredLocation.region : detectedRegion
    };
  } catch (error) {
    console.error('Error validating location coherence:', error);
    return {
      isCoherent: false,
      confidence: 0
    };
  }
};

/**
 * Get Madagascar region from GPS coordinates
 * @param latitude - GPS latitude
 * @param longitude - GPS longitude
 * @returns Closest Madagascar region name
 */
export const getRegionFromCoordinates = (latitude: number, longitude: number): string => {
  // Madagascar region coordinates (approximate centers)
  const regionCoordinates: Record<string, { lat: number; lng: number }> = {
    'Analamanga': { lat: -18.8792, lng: 47.5079 }, // Antananarivo
    'Vakinankaratra': { lat: -19.8333, lng: 47.0333 }, // Antsirabe
    'Itasy': { lat: -19.1167, lng: 46.8167 }, // Miarinarivo
    'Bongolava': { lat: -18.9167, lng: 46.2500 }, // Tsiroanomandidy
    'Vatovavy-Fitovinany': { lat: -21.2833, lng: 47.1333 }, // Manakara
    'Atsimo-Atsinanana': { lat: -22.1333, lng: 47.9833 }, // Farafangana
    'Ihorombe': { lat: -22.4000, lng: 46.1167 }, // Ihosy
    'Atsimo-Andrefana': { lat: -23.3500, lng: 43.6667 }, // Toliara
    'Androy': { lat: -25.1667, lng: 46.0833 }, // Ambovombe
    'Anosy': { lat: -24.7000, lng: 46.9500 }, // Taolagnaro
    'Atsinanana': { lat: -18.1500, lng: 49.4000 }, // Toamasina
    'Alaotra-Mangoro': { lat: -17.8333, lng: 48.4167 }, // Ambatondrazaka
    'Boeny': { lat: -15.7167, lng: 46.3167 }, // Mahajanga
    'Sofia': { lat: -14.8833, lng: 47.9833 }, // Antsohihy
    'Betsiboka': { lat: -16.1000, lng: 47.0333 }, // Maevatanana
    'Melaky': { lat: -16.9500, lng: 44.3000 }, // Maintirano
    'Diana': { lat: -12.2833, lng: 49.3000 }, // Antsiranana
    'Sava': { lat: -14.2667, lng: 50.1667 }, // Sambava
    'Menabe': { lat: -20.2833, lng: 44.2833 }, // Morondava
    'Amoron\'i Mania': { lat: -20.9167, lng: 47.1333 }, // Ambositra
    'Matsiatra Ambony': { lat: -21.4500, lng: 47.0833 } // Fianarantsoa
  };

  let closestRegion = 'Analamanga';
  let minDistance = Infinity;

  // Calculate distance to each region center
  for (const [region, coords] of Object.entries(regionCoordinates)) {
    const distance = calculateDistanceKm(latitude, longitude, coords.lat, coords.lng);
    if (distance < minDistance) {
      minDistance = distance;
      closestRegion = region;
    }
  }

  return closestRegion;
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 - First latitude
 * @param lng1 - First longitude
 * @param lat2 - Second latitude
 * @param lng2 - Second longitude
 * @returns Distance in kilometers
 */
export const calculateDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};

/**
 * Convert degrees to radians
 * @param degrees - Degrees to convert
 * @returns Radians
 */
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

/**
 * Check if coordinates are within Madagascar bounds
 * @param latitude - GPS latitude
 * @param longitude - GPS longitude
 * @returns Whether coordinates are within Madagascar
 */
export const isWithinMadagascar = (latitude: number, longitude: number): boolean => {
  // Madagascar approximate bounds
  const bounds = {
    north: -11.5,
    south: -25.6,
    east: 50.5,
    west: 43.2
  };

  return latitude >= bounds.south && 
         latitude <= bounds.north && 
         longitude >= bounds.west && 
         longitude <= bounds.east;
};

/**
 * Get habitat type based on coordinates and region
 * @param latitude - GPS latitude
 * @param longitude - GPS longitude
 * @param region - Madagascar region
 * @returns Habitat type classification
 */
export const getHabitatType = (
  latitude: number,
  longitude: number,
  region: string
): 'urban' | 'periurban' | 'rural_town' | 'rural_village' | 'isolated' => {
  // Major urban centers
  const urbanCenters = [
    { name: 'Analamanga', lat: -18.8792, lng: 47.5079, radius: 50 }, // Antananarivo
    { name: 'Atsinanana', lat: -18.1500, lng: 49.4000, radius: 30 }, // Toamasina
    { name: 'Boeny', lat: -15.7167, lng: 46.3167, radius: 25 }, // Mahajanga
    { name: 'Atsimo-Andrefana', lat: -23.3500, lng: 43.6667, radius: 20 }, // Toliara
    { name: 'Diana', lat: -12.2833, lng: 49.3000, radius: 15 } // Antsiranana
  ];

  // Check if within urban center radius
  for (const center of urbanCenters) {
    const distance = calculateDistanceKm(latitude, longitude, center.lat, center.lng);
    if (distance <= center.radius) {
      return 'urban';
    }
  }

  // Check if within periurban area (50-100km from urban centers)
  for (const center of urbanCenters) {
    const distance = calculateDistanceKm(latitude, longitude, center.lat, center.lng);
    if (distance <= 100) {
      return 'periurban';
    }
  }

  // Regional capitals and towns
  const regionalTowns = [
    { lat: -19.8333, lng: 47.0333 }, // Antsirabe
    { lat: -21.4500, lng: 47.0833 }, // Fianarantsoa
    { lat: -20.9167, lng: 47.1333 }, // Ambositra
    { lat: -22.1333, lng: 47.9833 }, // Farafangana
    { lat: -21.2833, lng: 47.1333 } // Manakara
  ];

  for (const town of regionalTowns) {
    const distance = calculateDistanceKm(latitude, longitude, town.lat, town.lng);
    if (distance <= 20) {
      return 'rural_town';
    }
  }

  // Check if very isolated (far from any major center)
  let minDistanceToCenter = Infinity;
  for (const center of urbanCenters) {
    const distance = calculateDistanceKm(latitude, longitude, center.lat, center.lng);
    minDistanceToCenter = Math.min(minDistanceToCenter, distance);
  }

  if (minDistanceToCenter > 200) {
    return 'isolated';
  }

  return 'rural_village';
};

/**
 * Validate GPS location quality
 * @param gpsLocation - GPS location data
 * @returns Validation result with quality score
 */
export const validateGPSQuality = (gpsLocation: GPSLocation): {
  isValid: boolean;
  qualityScore: number;
  issues: string[];
} => {
  const issues: string[] = [];
  let qualityScore = 100;

  // Check accuracy
  if (gpsLocation.accuracy > 100) {
    issues.push('GPS accuracy too low (>100m)');
    qualityScore -= 30;
  } else if (gpsLocation.accuracy > 50) {
    issues.push('GPS accuracy moderate (50-100m)');
    qualityScore -= 15;
  }

  // Check if within Madagascar
  if (!isWithinMadagascar(gpsLocation.latitude, gpsLocation.longitude)) {
    issues.push('Location outside Madagascar');
    qualityScore -= 50;
  }

  // Check altitude (if available)
  if (gpsLocation.altitude !== undefined) {
    if (gpsLocation.altitude < -100 || gpsLocation.altitude > 3000) {
      issues.push('Unrealistic altitude');
      qualityScore -= 20;
    }
  }

  return {
    isValid: qualityScore >= 50,
    qualityScore: Math.max(0, qualityScore),
    issues
  };
};

/**
 * Major Madagascar cities with coordinates for reverse geocoding
 */
const MADAGASCAR_CITIES = [
  // Antananarivo region
  { name: 'Antananarivo', region: 'Analamanga', district: 'Antananarivo I', latitude: -18.8792, longitude: 47.5079 },
  { name: 'Antananarivo', region: 'Analamanga', district: 'Antananarivo II', latitude: -18.8792, longitude: 47.5079 },
  { name: 'Antananarivo', region: 'Analamanga', district: 'Antananarivo III', latitude: -18.8792, longitude: 47.5079 },
  { name: 'Antananarivo', region: 'Analamanga', district: 'Antananarivo IV', latitude: -18.8792, longitude: 47.5079 },
  { name: 'Antananarivo', region: 'Analamanga', district: 'Antananarivo V', latitude: -18.8792, longitude: 47.5079 },
  { name: 'Antananarivo', region: 'Analamanga', district: 'Antananarivo VI', latitude: -18.8792, longitude: 47.5079 },
  { name: 'Ambohidratrimo', region: 'Analamanga', district: 'Ambohidratrimo', latitude: -18.9167, longitude: 47.4500 },
  { name: 'Andramasina', region: 'Analamanga', district: 'Andramasina', latitude: -19.0167, longitude: 47.5167 },
  { name: 'Anjozorobe', region: 'Analamanga', district: 'Anjozorobe', latitude: -18.4000, longitude: 47.8667 },
  { name: 'Ankazobe', region: 'Analamanga', district: 'Ankazobe', latitude: -18.3167, longitude: 47.1167 },
  { name: 'Manjakandriana', region: 'Analamanga', district: 'Manjakandriana', latitude: -19.0167, longitude: 47.8000 },
  { name: 'Soavinandriana', region: 'Analamanga', district: 'Soavinandriana', latitude: -18.7000, longitude: 47.4333 },

  // Vakinankaratra region
  { name: 'Antsirabe', region: 'Vakinankaratra', district: 'Antsirabe I', latitude: -19.8633, longitude: 47.0367 },
  { name: 'Antsirabe', region: 'Vakinankaratra', district: 'Antsirabe II', latitude: -19.8633, longitude: 47.0367 },
  { name: 'Betafo', region: 'Vakinankaratra', district: 'Betafo', latitude: -19.8333, longitude: 46.8500 },
  { name: 'Faratsiho', region: 'Vakinankaratra', district: 'Faratsiho', latitude: -19.4000, longitude: 46.9500 },
  { name: 'Mandoto', region: 'Vakinankaratra', district: 'Mandoto', latitude: -19.5000, longitude: 46.7500 },
  { name: 'Antanifotsy', region: 'Vakinankaratra', district: 'Antanifotsy', latitude: -19.6500, longitude: 47.3167 },
  { name: 'Ambatolampy', region: 'Vakinankaratra', district: 'Ambatolampy', latitude: -19.3833, longitude: 47.4167 },

  // Itasy region
  { name: 'Miarinarivo', region: 'Itasy', district: 'Miarinarivo', latitude: -18.9500, longitude: 46.9000 },
  { name: 'Arivonimamo', region: 'Itasy', district: 'Arivonimamo', latitude: -19.0167, longitude: 47.1833 },
  { name: 'Soavinandriana', region: 'Itasy', district: 'Soavinandriana', latitude: -18.7000, longitude: 47.4333 },
  { name: 'Ampefy', region: 'Itasy', district: 'Ampefy', latitude: -19.1000, longitude: 46.7500 },
  { name: 'Manazary', region: 'Itasy', district: 'Manazary', latitude: -18.8000, longitude: 47.0000 },

  // Atsinanana region (Toamasina)
  { name: 'Toamasina', region: 'Atsinanana', district: 'Toamasina I', latitude: -18.1443, longitude: 49.3957 },
  { name: 'Toamasina', region: 'Atsinanana', district: 'Toamasina II', latitude: -18.1443, longitude: 49.3957 },
  { name: 'Brickaville', region: 'Atsinanana', district: 'Brickaville', latitude: -18.8000, longitude: 49.0500 },
  { name: 'Mahanoro', region: 'Atsinanana', district: 'Mahanoro', latitude: -19.9000, longitude: 48.8000 },
  { name: 'Marolambo', region: 'Atsinanana', district: 'Marolambo', latitude: -20.0500, longitude: 48.1167 },
  { name: 'Maroantsetra', region: 'Atsinanana', district: 'Maroantsetra', latitude: -15.4333, longitude: 49.7333 },
  { name: 'Sainte Marie', region: 'Atsinanana', district: 'Sainte Marie', latitude: -16.8333, longitude: 49.9167 },
  { name: 'Vatomandry', region: 'Atsinanana', district: 'Vatomandry', latitude: -19.3333, longitude: 48.9667 },

  // Boeny region (Mahajanga)
  { name: 'Mahajanga', region: 'Boeny', district: 'Mahajanga I', latitude: -15.7167, longitude: 46.3167 },
  { name: 'Mahajanga', region: 'Boeny', district: 'Mahajanga II', latitude: -15.7167, longitude: 46.3167 },
  { name: 'Ambato Boeny', region: 'Boeny', district: 'Ambato Boeny', latitude: -16.4667, longitude: 46.7167 },
  { name: 'Mitsinjo', region: 'Boeny', district: 'Mitsinjo', latitude: -16.2167, longitude: 46.2167 },
  { name: 'Soalala', region: 'Boeny', district: 'Soalala', latitude: -16.3333, longitude: 45.3333 },
  { name: 'Marovoay', region: 'Boeny', district: 'Marovoay', latitude: -16.1000, longitude: 46.6500 },

  // Atsimo-Andrefana region (Toliara)
  { name: 'Toliara', region: 'Atsimo-Andrefana', district: 'Toliara I', latitude: -23.3500, longitude: 43.6833 },
  { name: 'Toliara', region: 'Atsimo-Andrefana', district: 'Toliara II', latitude: -23.3500, longitude: 43.6833 },
  { name: 'Toliara', region: 'Atsimo-Andrefana', district: 'Toliara III', latitude: -23.3500, longitude: 43.6833 },
  { name: 'Ankazoabo', region: 'Atsimo-Andrefana', district: 'Ankazoabo', latitude: -22.3000, longitude: 44.5167 },
  { name: 'Benenitra', region: 'Atsimo-Andrefana', district: 'Benenitra', latitude: -23.2000, longitude: 44.4000 },
  { name: 'Beroroha', region: 'Atsimo-Andrefana', district: 'Beroroha', latitude: -21.6667, longitude: 45.1667 },
  { name: 'Betioky', region: 'Atsimo-Andrefana', district: 'Betioky', latitude: -23.7167, longitude: 44.3833 },
  { name: 'Morombe', region: 'Atsimo-Andrefana', district: 'Morombe', latitude: -21.7500, longitude: 43.3667 },
  { name: 'Sakaraha', region: 'Atsimo-Andrefana', district: 'Sakaraha', latitude: -22.9167, longitude: 44.5333 },

  // Diana region (Antsiranana)
  { name: 'Antsiranana', region: 'Diana', district: 'Antsiranana I', latitude: -12.2787, longitude: 49.2917 },
  { name: 'Antsiranana', region: 'Diana', district: 'Antsiranana II', latitude: -12.2787, longitude: 49.2917 },
  { name: 'Ambanja', region: 'Diana', district: 'Ambanja', latitude: -13.6833, longitude: 48.4500 },
  { name: 'Ambilobe', region: 'Diana', district: 'Ambilobe', latitude: -13.2000, longitude: 49.0500 },
  { name: 'Nosy-Be', region: 'Diana', district: 'Nosy-Be', latitude: -13.3117, longitude: 48.2589 },

  // Sava region
  { name: 'Sambava', region: 'Sava', district: 'Sambava', latitude: -14.2667, longitude: 50.1667 },
  { name: 'Andapa', region: 'Sava', district: 'Andapa', latitude: -14.6500, longitude: 49.6500 },
  { name: 'Antalaha', region: 'Sava', district: 'Antalaha', latitude: -14.8833, longitude: 50.2667 },
  { name: 'Vohemar', region: 'Sava', district: 'Vohemar', latitude: -13.3667, longitude: 50.0167 },

  // Matsiatra Ambony region (Fianarantsoa)
  { name: 'Fianarantsoa', region: 'Matsiatra Ambony', district: 'Fianarantsoa I', latitude: -21.4500, longitude: 47.0833 },
  { name: 'Fianarantsoa', region: 'Matsiatra Ambony', district: 'Fianarantsoa II', latitude: -21.4500, longitude: 47.0833 },
  { name: 'Ambalavao', region: 'Matsiatra Ambony', district: 'Ambalavao', latitude: -21.8333, longitude: 46.9333 },
  { name: 'Ambohimahasoa', region: 'Matsiatra Ambony', district: 'Ambohimahasoa', latitude: -21.3500, longitude: 47.4167 },
  { name: 'Ikalamavony', region: 'Matsiatra Ambony', district: 'Ikalamavony', latitude: -21.1500, longitude: 46.5833 },
  { name: 'Isandra', region: 'Matsiatra Ambony', district: 'Isandra', latitude: -21.6667, longitude: 47.2500 },
  { name: 'Lalangina', region: 'Matsiatra Ambony', district: 'Lalangina', latitude: -21.5000, longitude: 47.3333 },
  { name: 'Vohibato', region: 'Matsiatra Ambony', district: 'Vohibato', latitude: -21.4000, longitude: 47.2000 },

  // Vatovavy-Fitovinany region
  { name: 'Manakara', region: 'Vatovavy-Fitovinany', district: 'Manakara', latitude: -22.1333, longitude: 48.0167 },
  { name: 'Vohipeno', region: 'Vatovavy-Fitovinany', district: 'Vohipeno', latitude: -22.3500, longitude: 47.8500 },
  { name: 'Nosy Varika', region: 'Vatovavy-Fitovinany', district: 'Nosy Varika', latitude: -20.5833, longitude: 48.5333 },
  { name: 'Ifanadiana', region: 'Vatovavy-Fitovinany', district: 'Ifanadiana', latitude: -21.3000, longitude: 47.6333 },
  { name: 'Ikongo', region: 'Vatovavy-Fitovinany', district: 'Ikongo', latitude: -22.0667, longitude: 47.4333 },

  // Atsimo-Atsinanana region
  { name: 'Farafangana', region: 'Atsimo-Atsinanana', district: 'Farafangana', latitude: -22.8167, longitude: 47.8167 },
  { name: 'Vangaindrano', region: 'Atsimo-Atsinanana', district: 'Vangaindrano', latitude: -23.3500, longitude: 47.6000 },
  { name: 'Midongy', region: 'Atsimo-Atsinanana', district: 'Midongy', latitude: -23.5167, longitude: 47.0167 },
  { name: 'Vondrozo', region: 'Atsimo-Atsinanana', district: 'Vondrozo', latitude: -22.8167, longitude: 47.2833 },

  // Ihorombe region
  { name: 'Ihosy', region: 'Ihorombe', district: 'Ihosy', latitude: -22.4000, longitude: 46.1167 },
  { name: 'Iakora', region: 'Ihorombe', district: 'Iakora', latitude: -22.1833, longitude: 46.1500 },
  { name: 'Ivohibe', region: 'Ihorombe', district: 'Ivohibe', latitude: -22.4667, longitude: 46.2167 },

  // Androy region
  { name: 'Ambovombe', region: 'Androy', district: 'Ambovombe', latitude: -25.1667, longitude: 46.0833 },
  { name: 'Bekily', region: 'Androy', district: 'Bekily', latitude: -24.2167, longitude: 45.3333 },
  { name: 'Beloha', region: 'Androy', district: 'Beloha', latitude: -25.1667, longitude: 45.0500 },
  { name: 'Tsihombe', region: 'Androy', district: 'Tsihombe', latitude: -25.3333, longitude: 45.4833 },

  // Anosy region
  { name: 'Taolagnaro', region: 'Anosy', district: 'Taolagnaro', latitude: -25.0333, longitude: 46.9833 },
  { name: 'Amboasary', region: 'Anosy', district: 'Amboasary', latitude: -25.0333, longitude: 46.3833 },
  { name: 'Betroka', region: 'Anosy', district: 'Betroka', latitude: -23.2833, longitude: 46.1000 },
  { name: 'Tranovaho', region: 'Anosy', district: 'Tranovaho', latitude: -24.5000, longitude: 46.8000 },

  // Alaotra-Mangoro region
  { name: 'Ambatondrazaka', region: 'Alaotra-Mangoro', district: 'Ambatondrazaka', latitude: -17.8333, longitude: 48.4167 },
  { name: 'Amparafaravola', region: 'Alaotra-Mangoro', district: 'Amparafaravola', latitude: -17.5833, longitude: 48.2167 },
  { name: 'Andilamena', region: 'Alaotra-Mangoro', district: 'Andilamena', latitude: -17.0167, longitude: 48.5833 },
  { name: 'Anosibe An\'ala', region: 'Alaotra-Mangoro', district: 'Anosibe An\'ala', latitude: -18.4000, longitude: 48.8000 },
  { name: 'Moramanga', region: 'Alaotra-Mangoro', district: 'Moramanga', latitude: -18.9500, longitude: 48.2167 },

  // Sofia region
  { name: 'Antsohihy', region: 'Sofia', district: 'Antsohihy', latitude: -14.8833, longitude: 47.9833 },
  { name: 'Bealanana', region: 'Sofia', district: 'Bealanana', latitude: -14.5500, longitude: 48.7333 },
  { name: 'Befandriana', region: 'Sofia', district: 'Befandriana', latitude: -15.6667, longitude: 48.5500 },
  { name: 'Mampikony', region: 'Sofia', district: 'Mampikony', latitude: -16.1000, longitude: 47.6333 },
  { name: 'Mandritsara', region: 'Sofia', district: 'Mandritsara', latitude: -15.8333, longitude: 48.8167 },
  { name: 'Port-Bergé', region: 'Sofia', district: 'Port-Bergé', latitude: -15.5667, longitude: 47.6167 },

  // Betsiboka region
  { name: 'Maevatanana', region: 'Betsiboka', district: 'Maevatanana', latitude: -16.9500, longitude: 46.8333 },
  { name: 'Tsaratanana', region: 'Betsiboka', district: 'Tsaratanana', latitude: -16.7833, longitude: 47.6500 },
  { name: 'Kandreho', region: 'Betsiboka', district: 'Kandreho', latitude: -16.4333, longitude: 47.2000 },

  // Melaky region
  { name: 'Maintirano', region: 'Melaky', district: 'Maintirano', latitude: -18.0667, longitude: 44.0167 },
  { name: 'Antsalova', region: 'Melaky', district: 'Antsalova', latitude: -18.7000, longitude: 44.6167 },
  { name: 'Belo sur Tsiribihina', region: 'Melaky', district: 'Belo sur Tsiribihina', latitude: -19.7000, longitude: 44.5500 },
  { name: 'Morafenobe', region: 'Melaky', district: 'Morafenobe', latitude: -17.8500, longitude: 44.2667 },

  // Menabe region
  { name: 'Morondava', region: 'Menabe', district: 'Morondava', latitude: -20.2833, longitude: 44.3167 },
  { name: 'Mahabo', region: 'Menabe', district: 'Mahabo', latitude: -20.5167, longitude: 44.5167 },
  { name: 'Miandrivazo', region: 'Menabe', district: 'Miandrivazo', latitude: -19.5167, longitude: 45.4667 },

  // Amoron'i Mania region
  { name: 'Ambositra', region: 'Amoron\'i Mania', district: 'Ambositra', latitude: -20.5167, longitude: 47.2500 },
  { name: 'Fandriana', region: 'Amoron\'i Mania', district: 'Fandriana', latitude: -20.2333, longitude: 47.3833 },
  { name: 'Manandriana', region: 'Amoron\'i Mania', district: 'Manandriana', latitude: -20.3500, longitude: 47.3167 },

  // Bongolava region
  { name: 'Tsiroanomandidy', region: 'Bongolava', district: 'Tsiroanomandidy', latitude: -18.7667, longitude: 46.0500 },
  { name: 'Fenoarivo', region: 'Bongolava', district: 'Fenoarivo', latitude: -18.4333, longitude: 46.5667 },
  { name: 'Maintirano', region: 'Bongolava', district: 'Maintirano', latitude: -18.0667, longitude: 44.0167 },
  { name: 'Morafenobe', region: 'Bongolava', district: 'Morafenobe', latitude: -17.8500, longitude: 44.2667 }
];

/**
 * Get commune information from GPS coordinates using reverse geocoding
 * @param latitude - GPS latitude
 * @param longitude - GPS longitude
 * @returns Promise with detected location data
 */
export const getCommuneFromCoordinates = async (
  latitude: number, 
  longitude: number
): Promise<{
  region: string;
  district: string;
  commune: string;
  confidence: number;
  accuracy: number;
  distance: number;
}> => {
  return new Promise((resolve) => {
    try {
      // Check if coordinates are within Madagascar bounds
      if (!isWithinMadagascar(latitude, longitude)) {
        resolve({
          region: '',
          district: '',
          commune: '',
          confidence: 0,
          accuracy: 0,
          distance: Infinity
        });
        return;
      }

      let closestCity = MADAGASCAR_CITIES[0];
      let minDistance = calculateDistanceKm(
        latitude, 
        longitude, 
        closestCity.latitude, 
        closestCity.longitude
      );

      // Find the closest city
      for (const city of MADAGASCAR_CITIES) {
        const distance = calculateDistanceKm(
          latitude, 
          longitude, 
          city.latitude, 
          city.longitude
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestCity = city;
        }
      }

      // Calculate confidence based on distance
      let confidence = 95;
      if (minDistance > 5) confidence = 85;
      if (minDistance > 10) confidence = 70;
      if (minDistance > 25) confidence = 50;
      if (minDistance > 50) confidence = 30;
      if (minDistance > 100) confidence = 10;

      resolve({
        region: closestCity.region,
        district: closestCity.district,
        commune: closestCity.name,
        confidence: Math.max(10, confidence),
        accuracy: minDistance * 1000, // Convert to meters
        distance: minDistance
      });
    } catch (error) {
      console.error('Error in getCommuneFromCoordinates:', error);
      resolve({
        region: '',
        district: '',
        commune: '',
        confidence: 0,
        accuracy: 0,
        distance: Infinity
      });
    }
  });
};
