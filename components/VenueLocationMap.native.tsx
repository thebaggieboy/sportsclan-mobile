import Constants from "expo-constants";
import { useMemo } from "react";
import { StyleSheet, Text, View, Platform } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";

import { colors, fonts } from "@/constants/theme";
import { VenueLocationMapProps } from "@/components/venueMapTypes";

const FALLBACK_REGION: Region = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 80,
  longitudeDelta: 120,
};

export default function VenueLocationMap({
  countryCode,
  countryName,
  coordinates,
  initialCoordinates,
  onChange,
}: VenueLocationMapProps) {
  const initialRegion = useMemo<Region>(() => {
    const center = initialCoordinates ?? coordinates;
    if (!center) return FALLBACK_REGION;
    return {
      ...center,
      latitudeDelta: 0.025,
      longitudeDelta: 0.025,
    };
  }, [coordinates, initialCoordinates]);
  const markerCoordinate = coordinates ?? initialCoordinates;

  const useGoogleProvider =
    Platform.OS === "android" || Boolean(Constants.expoConfig?.extra?.googleMaps?.iosConfigured);

  return (
    <View style={styles.container}>
      <Text style={styles.caption}>Choose a pin in {countryName} ({countryCode}). Tap the map or drag the marker.</Text>
      <MapView
        style={styles.map}
        provider={useGoogleProvider ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion}
        onPress={(event) => onChange(event.nativeEvent.coordinate)}
        showsCompass
        toolbarEnabled={false}
        loadingEnabled
      >
        {markerCoordinate ? (
          <Marker
            coordinate={markerCoordinate}
            draggable
            title={coordinates ? "Selected venue pin" : "Move this pin to choose the venue"}
            description="Tap the map or drag this marker to set the exact location"
            onDragEnd={(event) => onChange(event.nativeEvent.coordinate)}
          />
        ) : null}
      </MapView>
      {coordinates ? (
        <Text style={styles.coordinates}>
          {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
        </Text>
      ) : (
        <Text style={styles.hint}>No pin selected yet.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  caption: { color: colors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 16 },
  map: { height: 240, borderRadius: 8 },
  coordinates: { color: colors.blueDark, fontFamily: fonts.medium, fontSize: 10, lineHeight: 16 },
  hint: { color: colors.orange, fontFamily: fonts.medium, fontSize: 10, lineHeight: 16 },
});
