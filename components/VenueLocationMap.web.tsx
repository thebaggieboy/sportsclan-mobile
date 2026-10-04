import { useEffect, useState, type ComponentType } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { APIProvider, Map, MapMouseEvent, Marker } from "@vis.gl/react-google-maps";

import { colors, fonts } from "@/constants/theme";
import { VenueCoordinates, VenueLocationMapProps } from "@/components/venueMapTypes";

interface LeafletMapProps {
  countryCode: string;
  center: VenueCoordinates;
  zoom: number;
  onChange: (coordinates: VenueCoordinates) => void;
}

export default function VenueLocationMap({ countryCode, countryName, coordinates, initialCoordinates, onChange }: VenueLocationMapProps) {
  const [latitude, setLatitude] = useState(coordinates ? String(coordinates.latitude) : "");
  const [longitude, setLongitude] = useState(coordinates ? String(coordinates.longitude) : "");
  const [mapError, setMapError] = useState(false);
  const [LeafletMap, setLeafletMap] = useState<ComponentType<LeafletMapProps> | null>(null);
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;
  const initialCenter = coordinates ?? initialCoordinates ?? { latitude: 0, longitude: 0 };

  useEffect(() => {
    if (apiKey && !mapError) return;
    let active = true;
    import("@/components/VenueLeafletMap.web").then(({ default: component }) => {
      if (active) setLeafletMap(() => component);
    });
    return () => {
      active = false;
    };
  }, [apiKey, mapError]);

  useEffect(() => {
    setLatitude(coordinates ? String(coordinates.latitude) : "");
    setLongitude(coordinates ? String(coordinates.longitude) : "");
  }, [coordinates]);

  const change = (key: keyof VenueCoordinates, text: string) => {
    const nextLatitude = key === "latitude" ? text : latitude;
    const nextLongitude = key === "longitude" ? text : longitude;
    if (key === "latitude") setLatitude(text);
    else setLongitude(text);

    const parsedLatitude = Number(nextLatitude);
    const parsedLongitude = Number(nextLongitude);
    if (
      nextLatitude.trim() &&
      nextLongitude.trim() &&
      Number.isFinite(parsedLatitude) &&
      Number.isFinite(parsedLongitude) &&
      parsedLatitude >= -90 && parsedLatitude <= 90 &&
      parsedLongitude >= -180 && parsedLongitude <= 180
    ) {
      onChange({ latitude: parsedLatitude, longitude: parsedLongitude });
    }
  };

  const selectMapPin = (event: MapMouseEvent) => {
    const point = event.detail.latLng;
    if (point) onChange({ latitude: point.lat, longitude: point.lng });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.caption}>Tap the map or drag the pin to the exact venue location in {countryName} ({countryCode}).</Text>
      {apiKey && !mapError ? (
        <View style={styles.mapContainer}>
          <APIProvider apiKey={apiKey} region={countryCode} onError={() => setMapError(true)}>
            <Map
              defaultCenter={{ lat: initialCenter.latitude, lng: initialCenter.longitude }}
              defaultZoom={coordinates ? 15 : 5}
              onClick={selectMapPin}
              gestureHandling="greedy"
              disableDefaultUI={false}
              style={styles.map}
            >
                <Marker position={{ lat: initialCenter.latitude, lng: initialCenter.longitude }} draggable onDragEnd={(event) => {
                  const point = event.latLng;
                  if (point) onChange({ latitude: point.lat(), longitude: point.lng() });
                }} />
            </Map>
          </APIProvider>
        </View>
      ) : (
        <View style={styles.fallbackMap}>
          {LeafletMap ? <LeafletMap key={countryCode} countryCode={countryCode} center={initialCenter} zoom={coordinates ? 15 : 5} onChange={onChange} /> : <Text style={styles.mapLoading}>Loading map…</Text>}
          <Text style={styles.mapAttribution}>{apiKey ? "Map fallback · OpenStreetMap" : "OpenStreetMap · Google Maps key not configured"}</Text>
        </View>
      )}
      <View style={styles.fields}>
        <View style={styles.field}>
          <Text style={styles.label}>Latitude</Text>
          <TextInput accessibilityLabel="Venue latitude" keyboardType="decimal-pad" value={latitude} onChangeText={(text) => change("latitude", text)} placeholder="e.g. 51.507400" style={styles.input} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Longitude</Text>
          <TextInput accessibilityLabel="Venue longitude" keyboardType="decimal-pad" value={longitude} onChangeText={(text) => change("longitude", text)} placeholder="e.g. -0.127800" style={styles.input} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 9 },
  caption: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16 },
  fields: { flexDirection: "row", gap: 9 },
  mapContainer: { height: 240, overflow: "hidden", borderRadius: 8, borderWidth: 1, borderColor: colors.line },
  map: { width: "100%", height: "100%" },
  fallbackMap: { height: 260, gap: 4 },
  mapLoading: { height: 240, padding: 12, color: colors.muted, fontFamily: fonts.medium, fontSize: 10 },
  mapAttribution: { color: colors.muted, fontFamily: fonts.regular, fontSize: 8, lineHeight: 14 },
  field: { flex: 1, gap: 6 },
  label: { color: colors.ink, fontFamily: fonts.medium, fontSize: 10 },
  input: { minHeight: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 6, backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.regular, fontSize: 10 },
});
