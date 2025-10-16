/**
 * Geolocation Setup Component for BazarKELY
 * Reusable component for collecting region, district, commune, and habitat type
 * Progressive collection with dynamic filtering based on selections
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Home, Building, TreePine, Mountain, Wifi } from 'lucide-react';
import { MADAGASCAR_REGIONS } from '../../types/certification';
import type { UserGeolocation } from '../../types/certification';
import Input from '../UI/Input';
import Card from '../UI/Card';

interface GeolocationSetupComponentProps {
  geolocation: UserGeolocation;
  onGeolocationChange: (geolocation: UserGeolocation) => void;
  errors?: Record<string, string>;
  displayMode?: boolean;
  detectedData?: {
    region: string;
    district: string;
    commune: string;
    confidence: number;
    accuracy: number;
  };
}

// Mock data for districts and communes - in real app, this would come from an API
const REGION_DISTRICTS: Record<string, string[]> = {
  'Analamanga': ['Antananarivo I', 'Antananarivo II', 'Antananarivo III', 'Antananarivo IV', 'Antananarivo V', 'Antananarivo VI', 'Ambohidratrimo', 'Andramasina', 'Anjozorobe', 'Ankazobe', 'Antananarivo-Atsimondrano', 'Antananarivo-Avaradrano', 'Antananarivo-Renivohitra', 'Manjakandriana', 'Soavinandriana'],
  'Vakinankaratra': ['Antsirabe I', 'Antsirabe II', 'Betafo', 'Faratsiho', 'Mandoto', 'Antanifotsy', 'Ambatolampy', 'Antsirabe', 'Betafo', 'Faratsiho', 'Mandoto'],
  'Itasy': ['Miarinarivo', 'Arivonimamo', 'Soavinandriana', 'Ampefy', 'Manazary'],
  'Bongolava': ['Tsiroanomandidy', 'Fenoarivo', 'Maintirano', 'Morafenobe'],
  'Vatovavy-Fitovinany': ['Manakara', 'Vohipeno', 'Nosy Varika', 'Ifanadiana', 'Ikongo'],
  'Atsimo-Atsinanana': ['Farafangana', 'Vangaindrano', 'Midongy', 'Vondrozo'],
  'Ihorombe': ['Ihosy', 'Iakora', 'Ivohibe'],
  'Atsimo-Andrefana': ['Toliara I', 'Toliara II', 'Toliara III', 'Ankazoabo', 'Benenitra', 'Beroroha', 'Betioky', 'Morombe', 'Sakaraha', 'Toliara'],
  'Androy': ['Ambovombe', 'Bekily', 'Beloha', 'Tsihombe'],
  'Anosy': ['Taolagnaro', 'Amboasary', 'Betroka', 'Tranovaho'],
  'Atsinanana': ['Toamasina I', 'Toamasina II', 'Brickaville', 'Mahanoro', 'Marolambo', 'Maroantsetra', 'Sainte Marie', 'Vatomandry', 'Toamasina'],
  'Alaotra-Mangoro': ['Ambatondrazaka', 'Amparafaravola', 'Andilamena', 'Anosibe An\'ala', 'Moramanga'],
  'Boeny': ['Mahajanga I', 'Mahajanga II', 'Ambato Boeny', 'Mitsinjo', 'Soalala', 'Marovoay', 'Mahajanga'],
  'Sofia': ['Antsohihy', 'Bealanana', 'Befandriana', 'Mampikony', 'Mandritsara', 'Port-Bergé'],
  'Betsiboka': ['Maevatanana', 'Tsaratanana', 'Kandreho', 'Maevatanana'],
  'Melaky': ['Maintirano', 'Antsalova', 'Belo sur Tsiribihina', 'Morafenobe'],
  'Diana': ['Antsiranana I', 'Antsiranana II', 'Ambanja', 'Ambilobe', 'Antsiranana'],
  'Sava': ['Sambava', 'Andapa', 'Antalaha', 'Vohemar'],
  'Menabe': ['Morondava', 'Belo sur Tsiribihina', 'Mahabo', 'Miandrivazo'],
  'Amoron\'i Mania': ['Ambositra', 'Fandriana', 'Manandriana'],
  'Matsiatra Ambony': ['Fianarantsoa I', 'Fianarantsoa II', 'Ambalavao', 'Ambohimahasoa', 'Fianarantsoa', 'Ikalamavony', 'Isandra', 'Lalangina', 'Vohibato']
};

const DISTRICT_COMMUNES: Record<string, string[]> = {
  'Antananarivo I': ['Analakely', 'Andravoahangy', 'Ankadifotsy', 'Ankadivato', 'Ankadivato', 'Ankatso', 'Antaninarenina', 'Besarety', 'Faravohitra', 'Isoraka', 'Mahamasina', 'Tsaralalana'],
  'Antsirabe I': ['Antsirabe', 'Andranomanalina', 'Antanetibe', 'Antsahadinta', 'Firaisana', 'Manandona', 'Sahanivotry'],
  'Toamasina I': ['Toamasina', 'Ambohipo', 'Ampasina', 'Ankirihiry', 'Antsahampano', 'Foulpointe', 'Mahavelona', 'Sainte Marie'],
  'Mahajanga I': ['Mahajanga', 'Amborondra', 'Ankijabe', 'Antsahampano', 'Betsiboka', 'Boeny', 'Marovoay'],
  'Toliara I': ['Toliara', 'Ampanihy', 'Ankililoaka', 'Ankilizato', 'Beheloka', 'Bekily', 'Bekitro', 'Beloha', 'Betsinjaka', 'Fianarantsoa', 'Ifaty', 'Mangily', 'Miary', 'Nosy Ve', 'Sakaraha', 'Toliara']
};

const HABITAT_TYPES = [
  {
    value: 'urban',
    label: 'Urbain',
    description: 'Centre-ville avec services complets',
    icon: Building,
    color: 'text-blue-600'
  },
  {
    value: 'periurban',
    label: 'Périurbain',
    description: 'Banlieue proche des centres urbains',
    icon: Home,
    color: 'text-green-600'
  },
  {
    value: 'rural_town',
    label: 'Bourg rural',
    description: 'Petite ville rurale avec services de base',
    icon: TreePine,
    color: 'text-yellow-600'
  },
  {
    value: 'rural_village',
    label: 'Village rural',
    description: 'Village agricole traditionnel',
    icon: Mountain,
    color: 'text-orange-600'
  },
  {
    value: 'isolated',
    label: 'Zone isolée',
    description: 'Zone très éloignée des services',
    icon: Wifi,
    color: 'text-red-600'
  }
];

const GeolocationSetupComponent: React.FC<GeolocationSetupComponentProps> = ({
  geolocation,
  onGeolocationChange,
  errors = {},
  displayMode = false,
  detectedData
}) => {
  const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
  const [availableCommunes, setAvailableCommunes] = useState<string[]>([]);

  // Update available districts when region changes
  useEffect(() => {
    if (geolocation.region) {
      const districts = REGION_DISTRICTS[geolocation.region] || [];
      setAvailableDistricts(districts);
      
      // Reset district and commune when region changes
      if (geolocation.district && !districts.includes(geolocation.district)) {
        onGeolocationChange({
          ...geolocation,
          district: '',
          commune: ''
        });
      }
    } else {
      setAvailableDistricts([]);
    }
  }, [geolocation.region, onGeolocationChange]);

  // Update available communes when district changes
  useEffect(() => {
    if (geolocation.district) {
      const communes = DISTRICT_COMMUNES[geolocation.district] || [];
      setAvailableCommunes(communes);
      
      // Reset commune when district changes
      if (geolocation.commune && !communes.includes(geolocation.commune)) {
        onGeolocationChange({
          ...geolocation,
          commune: ''
        });
      }
    } else {
      setAvailableCommunes([]);
    }
  }, [geolocation.district, onGeolocationChange]);

  const handleRegionChange = (region: string) => {
    onGeolocationChange({
      ...geolocation,
      region,
      district: '',
      commune: ''
    });
  };

  const handleDistrictChange = (district: string) => {
    onGeolocationChange({
      ...geolocation,
      district,
      commune: ''
    });
  };

  const handleCommuneChange = (commune: string) => {
    onGeolocationChange({
      ...geolocation,
      commune
    });
  };

  const handleHabitatTypeChange = (habitatType: UserGeolocation['habitatType']) => {
    onGeolocationChange({
      ...geolocation,
      habitatType
    });
  };

  const getRegionFlag = (region: string): string => {
    // Simple flag emoji mapping for Madagascar regions
    const flags: Record<string, string> = {
      'Analamanga': '🏛️',
      'Vakinankaratra': '🌋',
      'Itasy': '🏔️',
      'Bongolava': '🌾',
      'Vatovavy-Fitovinany': '🌊',
      'Atsimo-Atsinanana': '🌴',
      'Ihorombe': '🏔️',
      'Atsimo-Andrefana': '🏖️',
      'Androy': '🌵',
      'Anosy': '🌊',
      'Atsinanana': '🚢',
      'Alaotra-Mangoro': '🌾',
      'Boeny': '🐟',
      'Sofia': '🌿',
      'Betsiboka': '🌊',
      'Melaky': '🌊',
      'Diana': '🌴',
      'Sava': '🌴',
      'Menabe': '🌊',
      'Amoron\'i Mania': '🏔️',
      'Matsiatra Ambony': '🏔️'
    };
    return flags[region] || '🇲🇬';
  };

  // Display mode - show detected location data
  if (displayMode && detectedData) {
    return (
      <div className="space-y-6">
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-start">
            <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Position détectée automatiquement
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">Région :</span>
                    <p className="text-sm text-gray-600">
                      {getRegionFlag(detectedData.region)} {detectedData.region}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">District :</span>
                    <p className="text-sm text-gray-600">{detectedData.district}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Commune :</span>
                    <p className="text-sm text-gray-600">{detectedData.commune}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Confiance :</span>
                    <p className="text-sm text-gray-600">
                      {detectedData.confidence}% 
                      <span className="ml-1 text-xs text-gray-500">
                        (précision: {Math.round(detectedData.accuracy)}m)
                      </span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Note :</span> 
                    Cette localisation a été détectée automatiquement via GPS. 
                    Vous pouvez la confirmer ou la corriger manuellement si nécessaire.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Habitat Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type d'habitat *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HABITAT_TYPES.map((habitat) => {
              const IconComponent = habitat.icon;
              return (
                <label
                  key={habitat.value}
                  className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    geolocation.habitatType === habitat.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="habitatType"
                    value={habitat.value}
                    checked={geolocation.habitatType === habitat.value}
                    onChange={(e) => handleHabitatTypeChange(e.target.value as UserGeolocation['habitatType'])}
                    className="sr-only"
                  />
                  <div className="flex items-center mb-2">
                    <IconComponent className={`w-6 h-6 mr-2 ${habitat.color}`} />
                    <span className="font-medium text-gray-900">{habitat.label}</span>
                  </div>
                  <p className="text-sm text-gray-600">{habitat.description}</p>
                  {geolocation.habitatType === habitat.value && (
                    <div className="absolute top-2 right-2">
                      <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>
                  )}
                </label>
              );
            })}
          </div>
          {errors.habitatType && <p className="text-red-500 text-sm mt-1">{errors.habitatType}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Region Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Région *
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={geolocation.region}
            onChange={(e) => handleRegionChange(e.target.value)}
            className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
              errors.region ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Sélectionnez votre région</option>
            {MADAGASCAR_REGIONS.map((region) => (
              <option key={region} value={region}>
                {getRegionFlag(region)} {region}
              </option>
            ))}
          </select>
        </div>
        {errors.region && <p className="text-red-500 text-sm mt-1">{errors.region}</p>}
        {geolocation.region && (
          <p className="text-sm text-gray-500 mt-1">
            Région sélectionnée : {getRegionFlag(geolocation.region)} {geolocation.region}
          </p>
        )}
      </div>

      {/* District Selection */}
      {geolocation.region && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            District
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={geolocation.district || ''}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Sélectionnez votre district</option>
              {availableDistricts.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
          {geolocation.district && (
            <p className="text-sm text-gray-500 mt-1">
              District sélectionné : {geolocation.district}
            </p>
          )}
        </div>
      )}

      {/* Commune Selection */}
      {geolocation.district && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Commune
          </label>
          <div className="relative">
            <Home className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={geolocation.commune || ''}
              onChange={(e) => handleCommuneChange(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">Sélectionnez votre commune</option>
              {availableCommunes.map((commune) => (
                <option key={commune} value={commune}>
                  {commune}
                </option>
              ))}
            </select>
          </div>
          {geolocation.commune && (
            <p className="text-sm text-gray-500 mt-1">
              Commune sélectionnée : {geolocation.commune}
            </p>
          )}
        </div>
      )}

      {/* Habitat Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type d'habitat *
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {HABITAT_TYPES.map((habitat) => {
            const IconComponent = habitat.icon;
            return (
              <label
                key={habitat.value}
                className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  geolocation.habitatType === habitat.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <input
                  type="radio"
                  name="habitatType"
                  value={habitat.value}
                  checked={geolocation.habitatType === habitat.value}
                  onChange={(e) => handleHabitatTypeChange(e.target.value as UserGeolocation['habitatType'])}
                  className="sr-only"
                />
                <div className="flex items-center mb-2">
                  <IconComponent className={`w-6 h-6 mr-2 ${habitat.color}`} />
                  <span className="font-medium text-gray-900">{habitat.label}</span>
                </div>
                <p className="text-sm text-gray-600">{habitat.description}</p>
                {geolocation.habitatType === habitat.value && (
                  <div className="absolute top-2 right-2">
                    <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                )}
              </label>
            );
          })}
        </div>
        {errors.habitatType && <p className="text-red-500 text-sm mt-1">{errors.habitatType}</p>}
      </div>

      {/* Summary Card */}
      {(geolocation.region || geolocation.habitatType) && (
        <Card className="p-4 bg-purple-50 border-purple-200">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
            <MapPin className="w-5 h-5 text-purple-600 mr-2" />
            Résumé de votre localisation
          </h3>
          <div className="space-y-1 text-sm text-gray-700">
            {geolocation.region && (
              <p>
                <span className="font-medium">Région :</span> {getRegionFlag(geolocation.region)} {geolocation.region}
              </p>
            )}
            {geolocation.district && (
              <p>
                <span className="font-medium">District :</span> {geolocation.district}
              </p>
            )}
            {geolocation.commune && (
              <p>
                <span className="font-medium">Commune :</span> {geolocation.commune}
              </p>
            )}
            {geolocation.habitatType && (
              <p>
                <span className="font-medium">Type d'habitat :</span> {
                  HABITAT_TYPES.find(h => h.value === geolocation.habitatType)?.label
                }
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default GeolocationSetupComponent;
