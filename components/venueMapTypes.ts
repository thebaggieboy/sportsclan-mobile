export interface VenueCoordinates {
  latitude: number;
  longitude: number;
}

export interface VenueLocationMapProps {
  countryCode: string;
  countryName: string;
  coordinates: VenueCoordinates | null;
  initialCoordinates: VenueCoordinates | null;
  onChange: (coordinates: VenueCoordinates) => void;
}

const countryMapCenters: Record<string, VenueCoordinates> = {
  AU: { latitude: -25.2744, longitude: 133.7751 },
  CA: { latitude: 56.1304, longitude: -106.3468 },
  DE: { latitude: 51.1657, longitude: 10.4515 },
  FR: { latitude: 46.2276, longitude: 2.2137 },
  GH: { latitude: 7.9465, longitude: -1.0232 },
  IN: { latitude: 20.5937, longitude: 78.9629 },
  IE: { latitude: 53.1424, longitude: -7.6921 },
  KE: { latitude: -0.0236, longitude: 37.9062 },
  NG: { latitude: 9.082, longitude: 8.6753 },
  NZ: { latitude: -40.9006, longitude: 174.886 },
  ZA: { latitude: -30.5595, longitude: 22.9375 },
  GB: { latitude: 55.3781, longitude: -3.436 },
  US: { latitude: 39.8283, longitude: -98.5795 },
};

export function getCountryMapCenter(countryCode: string) {
  return countryMapCenters[countryCode.toUpperCase()] ?? { latitude: 0, longitude: 0 };
}
