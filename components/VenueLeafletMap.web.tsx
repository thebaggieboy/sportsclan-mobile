import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "./venueMap.css";

import { VenueCoordinates } from "@/components/venueMapTypes";

interface VenueLeafletMapProps {
  countryCode: string;
  center: VenueCoordinates;
  zoom: number;
  onChange: (coordinates: VenueCoordinates) => void;
}

const venuePinIcon = divIcon({
  className: "sportsclan-venue-pin",
  html: "<span></span>",
  iconSize: [26, 34],
  iconAnchor: [13, 34],
});

function MapClickPicker({ onChange }: { onChange: VenueLeafletMapProps["onChange"] }) {
  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

export default function VenueLeafletMap({ countryCode, center, zoom, onChange }: VenueLeafletMapProps) {
  return (
    <MapContainer
      key={countryCode}
      center={[center.latitude, center.longitude]}
      zoom={zoom}
      scrollWheelZoom
      className="sportsclan-leaflet-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickPicker onChange={onChange} />
      <Marker
        position={[center.latitude, center.longitude]}
        icon={venuePinIcon}
        draggable
        eventHandlers={{
          dragend(event) {
            const point = event.target.getLatLng();
            onChange({ latitude: point.lat, longitude: point.lng });
          },
        }}
      />
    </MapContainer>
  );
}
