import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import L from "leaflet";

function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

function MapBoundsController() {
  const map = useMap();
  
  useEffect(() => {
    // Set the map to the specific location from Google Maps link
    const specificLocation: [number, number] = [8.371964645263802, 124.85604137091526];
    
    // Set the map view to the specific location with higher zoom
    map.setView(specificLocation, 15);
    
    // Create bounds around the specific location (smaller area)
    const locationBounds = L.latLngBounds(
      [8.2, 124.7], // Southwest corner - smaller area around the location
      [8.5, 125.0]  // Northeast corner - smaller area around the location
    );
    
    // Restrict the map to only show this smaller area
    map.setMaxBounds(locationBounds);
    
    // Set minimum zoom to prevent zooming out too far
    map.setMinZoom(12);
    
    // Set maximum zoom
    map.setMaxZoom(18);
    
  }, [map]);

  return null;
}

export default function MapView() {
  return (
    <Box sx={{ 
      height: "100%", 
      width: "100%", 
      position: "relative"
    }}>
      <MapContainer
        center={[8.371964645263802, 124.85604137091526] as [number, number]} // Specific location from Google Maps link
        zoom={15}
        style={{ 
          height: "100%", 
          width: "100%",
          borderRadius: "8px",
          border: "1px solid #e0e0e0"
        }}
        zoomControl={true}
        scrollWheelZoom={true}
        maxBounds={[[8.2, 124.7], [8.5, 125.0]]} // Restrict to specific location area
        maxBoundsViscosity={1.0} // Prevent dragging outside bounds
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ResizeHandler />
        <MapBoundsController />
      </MapContainer>
    </Box>
  );
}
