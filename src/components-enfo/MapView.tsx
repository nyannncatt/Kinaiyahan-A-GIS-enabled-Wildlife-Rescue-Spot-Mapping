import { MapContainer, TileLayer, useMap, GeoJSON } from "react-leaflet";
import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import L from "leaflet";
// eslint-disable-next-line @typescript-eslint/no-var-requires
// @ts-ignore - osmtogeojson has no official TypeScript types
import osmtogeojson from "osmtogeojson";
// Local fallback GeoJSON of Manolo Fortich boundary
// Vite imports JSON as a plain object
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import manoloFortichLocal from "./ManoloFortich.json";

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
    const specificLocation: [number, number] = [8.371964645263802, 124.85604137091526];

    // Center map
    map.setView(specificLocation, 10);

    // Restrict bounds (slightly larger for elastic panning)
    const locationBounds = L.latLngBounds([8.0, 124.6], [8.54, 125.3]);
    map.setMaxBounds(locationBounds);
    // maxBoundsViscosity is now set in MapContainer props

    // Set minimum and maximum zoom
    map.setMinZoom(11);
    map.setMaxZoom(18);
  }, [map]);

  return null;
}

function BoundaryGuide() {
  const map = useMap();
  const [geojsonData, setGeojsonData] = useState<any | null>(null);

  useEffect(() => {
    // Ensure a custom pane so the outline sits above tiles and below markers
    if (!map.getPane('boundary-guide')) {
      map.createPane('boundary-guide');
      const pane = map.getPane('boundary-guide')!;
      pane.style.zIndex = '450';
      pane.style.pointerEvents = 'none';
    }

    // Always render something immediately to avoid flicker on refresh
    if (!geojsonData) {
      try {
        setGeojsonData(manoloFortichLocal as any);
      } catch {}
    }

    const query = `
      [out:json];
      (
        rel["name"="Manolo Fortich"][type=boundary];
        rel["name:en"="Manolo Fortich"][type=boundary];
      );
      out geom;
    `;

    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];

    let isCancelled = false;

    const fetchFrom = async (endpoint: string) => {
      const url = `${endpoint}?data=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Overpass ${endpoint} status ${res.status}`);
      return res.json();
    };

    (async () => {
      for (const ep of endpoints) {
        try {
          const osmJson = await fetchFrom(ep);
          if (isCancelled) return;
          const gj = osmtogeojson(osmJson);
          // Filter to the relation named Manolo Fortich (Bukidnon)
          const features = (gj.features || []).filter((f: any) => {
            const tags = (f.properties && f.properties.tags) || {};
            const isRelation = f.properties && f.properties.type === 'relation';
            const named = tags.name === 'Manolo Fortich' || tags['name:en'] === 'Manolo Fortich';
            const isAdminBoundary = tags.boundary === 'administrative' || tags.type === 'boundary';
            const inBukidnon =
              (tags['is_in:province'] && /bukidnon/i.test(tags['is_in:province'])) ||
              (tags['addr:state'] && /bukidnon/i.test(tags['addr:state'])) ||
              (tags['addr:province'] && /bukidnon/i.test(tags['addr:province'])) ||
              true; // Overpass often omits province; keep named match
            return isRelation && named;
          });
          if (features.length > 0) {
            setGeojsonData({ type: 'FeatureCollection', features });
            // Cache in localStorage to survive reloads
            try {
              localStorage.setItem('mf-boundary-cache', JSON.stringify({ type: 'FeatureCollection', features }));
            } catch {}
          } else {
            // Use local fallback if Overpass yields nothing
            setGeojsonData(manoloFortichLocal as any);
          }
          return; // success
        } catch (e) {
          // try next endpoint
          // console.warn('Overpass endpoint failed, trying next', e);
        }
      }
      // If all endpoints fail, fall back to local GeoJSON if available
      try {
        if (manoloFortichLocal) {
          setGeojsonData(manoloFortichLocal as any);
        }
      } catch {}
    })();

    return () => {
      isCancelled = true;
    };
  }, [map]);

  if (!geojsonData) return null;

  return (
    <GeoJSON
      data={geojsonData as any}
      pane="boundary-guide"
      style={{
        color: "#ff0000",
        weight: 4,
        dashArray: "6 6",
        fill: false,
      }}
    />
  );
}

interface MapViewProps {
  skin?: "streets" | "dark" | "satellite";
}

export default function MapView({ skin = "streets" }: MapViewProps) {
  // Tile URLs for different skins
  const tileUrls: Record<string, string> = {
    streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    dark: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png", // Free dark map
    satellite: "https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.png",
  };

  const attributions: Record<string, string> = {
    streets:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    dark:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    satellite:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  };

  return (
    <Box sx={{ height: "100%", width: "100%", position: "relative" }}>
      <MapContainer
        center={[8.371964645263802, 124.85604137091526]}
        zoom={15}
        style={{
          height: "100%",
          width: "100%",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
        }}
        zoomControl={true}
        scrollWheelZoom={true}
        minZoom={12}
        maxZoom={18}
        maxBoundsViscosity={0.5} // allows some “elastic” dragging outside
      >
        <TileLayer url={tileUrls[skin]} attribution={attributions[skin]} />
        <ResizeHandler />
        <MapBoundsController />
        <BoundaryGuide />
      </MapContainer>
    </Box>
  );
}
