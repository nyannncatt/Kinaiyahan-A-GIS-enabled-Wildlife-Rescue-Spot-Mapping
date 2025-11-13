import { MapContainer, TileLayer, useMap, GeoJSON, Marker, Popup, useMapEvents } from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import { Box, Tooltip, IconButton, Button, TextField, MenuItem, ToggleButtonGroup, ToggleButton, Stack, FormControl, Select } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddLocationAltOutlinedIcon from "@mui/icons-material/AddLocationAltOutlined";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import L from "leaflet";
// eslint-disable-next-line @typescript-eslint/no-var-requires
// @ts-ignore - osmtogeojson has no official TypeScript types
import osmtogeojson from "osmtogeojson";
// Local fallback GeoJSON of Manolo Fortich boundary
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import manoloFortichLocal from "./ManoloFortich.json";
// Cluster styles
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import "leaflet.markercluster/dist/MarkerCluster.css";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
// React wrapper for Leaflet.markercluster
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import MarkerClusterGroup from "react-leaflet-markercluster";

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

// Helper to capture the Leaflet map instance once
function MapRefSetter({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    // call once
    onReady(map as unknown as L.Map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Utility: status -> color and marker icon
function createStatusIcon(status: string | undefined): L.Icon {
  const v = String(status || "").toLowerCase();
  const base = "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img";
  let iconColor = "blue"; // default style
  if (v === "reported") iconColor = "red";
  else if (v === "rescued") iconColor = "blue";
  else if (v === "turned over") iconColor = "gold"; // yellow variant is named gold
  else if (v === "released" || v === "released".toUpperCase()) iconColor = "green";

  const iconUrl = `${base}/marker-icon-2x-${iconColor}.png`;
  const shadowUrl = `https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png`;

  return L.icon({
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
}

function normalizeStatus(status: string | undefined): string {
  const v = String(status || "").toLowerCase();
  if (v === "released" || v === "released".toUpperCase()) return "released";
  return v;
}

function MapBoundsController() {
  const map = useMap();

  useEffect(() => {
    const specificLocation: [number, number] = [8.371964645263802, 124.85604137091526];
    try {
      if ((map as any)?._loaded) {
        map.setView(specificLocation, 10, { animate: false });
      } else {
        map.whenReady(() => {
          try { map.setView(specificLocation, 10, { animate: false }); } catch {}
        });
      }
    } catch {}

    const locationBounds = L.latLngBounds([8.0, 124.6], [8.84, 125.3]);
    map.setMaxBounds(locationBounds);

    map.setMinZoom(11);
    map.setMaxZoom(18);
  }, [map]);

  return null;
}

function BoundaryGuide() {
  const map = useMap();
  const [geojsonData, setGeojsonData] = useState<any | null>(null);

  useEffect(() => {
    if (!map.getPane("boundary-guide")) {
      map.createPane("boundary-guide");
      const pane = map.getPane("boundary-guide")!;
      pane.style.zIndex = "450";
      pane.style.pointerEvents = "none";
    }

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
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
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
          const features = (gj.features || []).filter((f: any) => {
            const tags = (f.properties && f.properties.tags) || {};
            const isRelation = f.properties && f.properties.type === "relation";
            const named =
              tags.name === "Manolo Fortich" || tags["name:en"] === "Manolo Fortich";
            return isRelation && named;
          });
          if (features.length > 0) {
            setGeojsonData({ type: "FeatureCollection", features });
            try {
              localStorage.setItem(
                "mf-boundary-cache",
                JSON.stringify({ type: "FeatureCollection", features })
              );
            } catch {}
          } else {
            setGeojsonData(manoloFortichLocal as any);
          }
          return;
        } catch (e) {}
      }
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
        color: "#2e7d32",
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
  const tileUrls: Record<string, string> = {
    streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    dark: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
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

  // Transparent labels overlays to show city/place names on satellite
  const labelUrls = {
    esriWorldBoundariesAndPlaces:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    esriWorldTransportation:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
  } as const;

  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  type AddressInfo = { barangay?: string; municipality?: string; displayName?: string };
  type UserMarker = {
    id: number;
    pos: [number, number];
    title: string;
    speciesName: string;
    status: string;
    timestampIso: string;
    address?: AddressInfo;
    photo?: string | null;
    reporterName?: string;
    contactNumber?: string;
  };

  const [userMarkers, setUserMarkers] = useState<UserMarker[]>([]);
  const [pendingMarker, setPendingMarker] = useState<{
    pos: [number, number];
    speciesName: string;
    status: string;
    timestampIso: string;
    address?: AddressInfo;
    addressLoading?: boolean;
    photo?: string | null;
    reporterName?: string;
    contactNumber?: string;
  } | null>(null);

  const [speciesOptions, setSpeciesOptions] = useState<Array<{ label: string; common?: string }>>([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);
  const [editSpeciesOptions, setEditSpeciesOptions] = useState<Array<{ label: string; common?: string }>>([]);
  const [editSpeciesLoading, setEditSpeciesLoading] = useState(false);
  const [editDrafts, setEditDrafts] = useState<Record<number, { speciesName: string; status: string; photo?: string | null; reporterName?: string; contactNumber?: string }>>({});
  const [editingMarkerId, setEditingMarkerId] = useState<number | null>(null);
  const editInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const markerRefs = useRef<Record<number, any>>({});
  const reopenRetryHandle = useRef<number | null>(null);

  function reopenEditingPopupWithRetry(targetId: number, attempts = 60, delayMs = 150) {
    if (reopenRetryHandle.current) {
      window.clearTimeout(reopenRetryHandle.current);
      reopenRetryHandle.current = null;
    }
    const tryOpen = (left: number) => {
      if (left <= 0) return;
      const ref = markerRefs.current[targetId];
      if (ref && typeof ref.openPopup === 'function') {
        try { ref.openPopup(); } catch {}
        setTimeout(() => {
          const el = editInputRefs.current[targetId];
          if (el) { try { el.focus(); } catch {} }
        }, 50);
        return;
      }
      reopenRetryHandle.current = window.setTimeout(() => tryOpen(left - 1), delayMs) as unknown as number;
    };
    tryOpen(attempts);
  }

  // Search state (Nominatim)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Status filters (multi-select)
  const ALL_STATUSES = ["reported", "rescued", "turned over", "released"] as const;
  const [enabledStatuses, setEnabledStatuses] = useState<string[]>([...ALL_STATUSES]);

  useEffect(() => {
    try {
      const savedPending = sessionStorage.getItem("mf-pending-marker");
      if (savedPending) {
        const parsed = JSON.parse(savedPending);
        if (parsed && parsed.pos && Array.isArray(parsed.pos)) {
          setPendingMarker(parsed);
        }
      }
    } catch {}
    try {
      const savedMarkers = sessionStorage.getItem("mf-user-markers");
      if (savedMarkers) {
        const parsed = JSON.parse(savedMarkers);
        if (Array.isArray(parsed)) {
          setUserMarkers(parsed);
        }
      }
    } catch {}
    // Restore edit session
    try {
      const savedEditingId = sessionStorage.getItem("mf-editing-id");
      if (savedEditingId) setEditingMarkerId(Number(savedEditingId));
    } catch {}
    try {
      const savedDrafts = sessionStorage.getItem("mf-edit-drafts");
      if (savedDrafts) {
        const parsed = JSON.parse(savedDrafts);
        if (parsed && typeof parsed === 'object') setEditDrafts(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (pendingMarker) {
        sessionStorage.setItem("mf-pending-marker", JSON.stringify(pendingMarker));
      } else {
        sessionStorage.removeItem("mf-pending-marker");
      }
    } catch {}
  }, [pendingMarker]);

  useEffect(() => {
    try {
      sessionStorage.setItem("mf-user-markers", JSON.stringify(userMarkers));
    } catch {}
  }, [userMarkers]);

  // Persist editing state to survive tab switches
  useEffect(() => {
    try {
      if (editingMarkerId != null) sessionStorage.setItem("mf-editing-id", String(editingMarkerId));
      else sessionStorage.removeItem("mf-editing-id");
    } catch {}
  }, [editingMarkerId]);

  useEffect(() => {
    try {
      sessionStorage.setItem("mf-edit-drafts", JSON.stringify(editDrafts));
    } catch {}
  }, [editDrafts]);

  // When returning to the tab, re-open the editing popup and refocus
  useEffect(() => {
    if (editingMarkerId == null) return;
    const id = editingMarkerId;
    const reopen = () => reopenEditingPopupWithRetry(id);
    // Run on mount and on visibility change
    reopen();
    const onVis = () => {
      if (document.visibilityState === 'visible') reopen();
    };
    const onFocus = () => reopen();
    const onPageShow = () => reopen();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [editingMarkerId, userMarkers]);

  function AddMarkerOnClick({ enabled }: { enabled: boolean }) {
    const map = useMap();
    
    useMapEvents({
      click(e) {
        if (!enabled) return;
        const lat = Number(e.latlng.lat);
        const lng = Number(e.latlng.lng);
        
        // Get the pixel coordinates for the animation
        const point = map.latLngToContainerPoint(e.latlng);
        
        // Create and show click animation
        const container = map.getContainer();
        const ripple = document.createElement('div');
        ripple.style.position = 'absolute';
        ripple.style.left = `${point.x}px`;
        ripple.style.top = `${point.y}px`;
        ripple.style.width = '20px';
        ripple.style.height = '20px';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(76, 175, 80, 0.6)';
        ripple.style.transform = 'translate(-50%, -50%)';
        ripple.style.pointerEvents = 'none';
        ripple.style.zIndex = '10000';
        ripple.style.animation = 'ripple 0.6s ease-out';
        ripple.style.boxShadow = '0 0 0 0 rgba(76, 175, 80, 0.7)';
        
        container.appendChild(ripple);
        
        // Add animation keyframes if not already added
        if (!document.getElementById('ripple-animation-style')) {
          const style = document.createElement('style');
          style.id = 'ripple-animation-style';
          style.textContent = `
            @keyframes ripple {
              0% {
                transform: translate(-50%, -50%) scale(0);
                opacity: 1;
                box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
              }
              50% {
                opacity: 0.8;
                box-shadow: 0 0 0 10px rgba(76, 175, 80, 0.4);
              }
              100% {
                transform: translate(-50%, -50%) scale(2);
                opacity: 0;
                box-shadow: 0 0 0 20px rgba(76, 175, 80, 0);
              }
            }
          `;
          document.head.appendChild(style);
        }
        
        // Remove animation element after animation completes
        setTimeout(() => {
          if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
          }
        }, 600);
        
        // Add delay before setting pending marker
        setTimeout(() => {
          setPendingMarker({
            pos: [lat, lng],
            speciesName: "",
            status: "",
            timestampIso: new Date().toISOString(),
            addressLoading: true,
            photo: null,
            reporterName: "",
            contactNumber: "",
          });
        }, 300); // 300ms delay
      },
    });

    // Change cursor when in add marker mode
    useEffect(() => {
      if (enabled) {
        // Use a custom cursor with plus icon for adding markers
        map.getContainer().style.cursor = 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyUzYuNDggMjIgMTIgMjJTMjIgMTcuNTIgMjIgMTJTMTcuNTIgMiAxMiAyWk0xNyAxM0gxM1YxN0gxMVYxM0g3VjExSDExVjdIMTNWMTFIMTdWMTNaIiBmaWxsPSIjRkY2MDAwIi8+Cjwvc3ZnPg==") 12 12, crosshair';
        return () => {
          map.getContainer().style.cursor = '';
        };
      }
    }, [enabled, map]);

    return null;
  }

  useEffect(() => {
    const pm = pendingMarker;
    if (!pm) return;
    const controller = new AbortController();
    (async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pm.pos[0]}&lon=${pm.pos[1]}&zoom=14&addressdetails=1`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("reverse geocode failed");
        const data = await res.json();
        const addr = data.address || {};
        const address: AddressInfo = {
          barangay: addr.village || addr.suburb || addr.neighbourhood || addr.hamlet || addr.barangay,
          municipality: addr.town || addr.city || addr.municipality || addr.county,
          displayName: data.display_name,
        };
        setPendingMarker((prev) =>
          prev ? { ...prev, address, addressLoading: false } : prev
        );
      } catch {
        setPendingMarker((prev) => (prev ? { ...prev, addressLoading: false } : prev));
      }
    })();
    return () => controller.abort();
  }, [pendingMarker?.pos?.[0], pendingMarker?.pos?.[1]]);

  useEffect(() => {
    const query = pendingMarker?.speciesName?.trim() || "";
    if (!pendingMarker || query.length < 2) {
      setSpeciesOptions([]);
      setSpeciesLoading(false);
      return;
    }
    setSpeciesLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&per_page=8`;
        const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
        if (!res.ok) throw new Error("inat autocomplete failed");
        const data = await res.json();
        const options = (data?.results || [])
          .map((r: any) => ({ label: r?.name || "", common: r?.preferred_common_name || undefined }))
          .filter((o: any) => o.label);
        setSpeciesOptions(options);
      } catch {
      } finally {
        setSpeciesLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pendingMarker?.speciesName]);

  // iNaturalist autocomplete for Edit Marker (mirror Add Marker behavior)
  useEffect(() => {
    if (!editingMarkerId) {
      setEditSpeciesOptions([]);
      setEditSpeciesLoading(false);
      return;
    }
    const current = editDrafts[editingMarkerId];
    // Fallback to existing marker speciesName if no draft yet
    const existing = userMarkers.find((m) => m.id === editingMarkerId);
    const query = (current?.speciesName ?? existing?.speciesName ?? "").trim();
    if (query.length < 2) {
      setEditSpeciesOptions([]);
      setEditSpeciesLoading(false);
      return;
    }
    setEditSpeciesLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(query)}&per_page=8`;
        const res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
        if (!res.ok) throw new Error("inat autocomplete failed");
        const data = await res.json();
        const options = (data?.results || [])
          .map((r: any) => ({ label: r?.name || "", common: r?.preferred_common_name || undefined }))
          .filter((o: any) => o.label);
        setEditSpeciesOptions(options);
      } catch {
      } finally {
        setEditSpeciesLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [editingMarkerId, editDrafts, userMarkers]);

  // Debounced place search
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=7`;
        const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
        if (!res.ok) throw new Error('nominatim search failed');
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        // ignore
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => { clearTimeout(t); controller.abort(); };
  }, [searchQuery]);

  function handleResultSelect(item: any) {
    setShowResults(false);
    setSearchQuery(item?.display_name || "");
    if (!mapInstance) return;
    const lat = Number(item?.lat);
    const lon = Number(item?.lon);
    const bbox = item?.boundingbox;
    if (Array.isArray(bbox) && bbox.length === 4) {
      const south = Number(bbox[0]);
      const north = Number(bbox[1]);
      const west = Number(bbox[2]);
      const east = Number(bbox[3]);
      try {
        mapInstance.fitBounds(L.latLngBounds([south, west], [north, east]), { padding: [20, 20] });
        return;
      } catch {}
    }
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      mapInstance.setView([lat, lon], 15);
    }
  }

  const filteredMarkers = userMarkers.filter((m) => enabledStatuses.includes(normalizeStatus(m.status)));
  const editingMarker = editingMarkerId != null ? userMarkers.find((m) => m.id === editingMarkerId) || null : null;

  return (
    <Box sx={{ height: "100%", width: "100%", position: "relative" }}>
      {/* Hidden placeholder removed: real map below sets instance via MapRefSetter */}
      {/* Search box */}
      <Box sx={{ position: 'absolute', top: 10, left: 45, zIndex: 1100, width: 320 }}>
        <Box sx={{ position: 'relative' }}>
          <TextField
            size="small"
            variant="outlined"
            fullWidth
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            InputProps={{
              sx: { bgcolor: 'background.paper' },
            }}
          />
          {showResults && (searchLoading || searchResults.length > 0) && (
            <Box sx={{ position: 'absolute', top: 36, left: 0, right: 0, maxHeight: 260, overflow: 'auto', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 1, boxShadow: 3 }}>
              {searchLoading && <Box sx={{ p: 1, fontSize: 12, opacity: 0.7 }}>Searching…</Box>}
              {!searchLoading && searchResults.map((it: any) => (
                <Box key={`${it.place_id}`} sx={{ p: 1, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }} onClick={() => handleResultSelect(it)}>
                  <Box sx={{ fontSize: 14 }}>{it.display_name}</Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Status filter toggles */}
      <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1100 }}>
        <ToggleButtonGroup
          value={enabledStatuses}
          onChange={(e, val) => {
            if (Array.isArray(val) && val.length > 0) setEnabledStatuses(val);
          }}
          aria-label="filter markers by status"
        >
          <ToggleButton
            value="reported"
            aria-label="reported"
            sx={(theme) => ({
              borderColor: 'divider',
              color: enabledStatuses.includes('reported') ? '#e53935' : theme.palette.text.primary,
              '&.Mui-selected': {
                backgroundColor: alpha('#e53935', 0.15),
                borderColor: '#e53935',
                color: '#e53935',
              },
              '&.Mui-selected:hover': { backgroundColor: alpha('#e53935', 0.25) },
            })}
          >
            Reported
          </ToggleButton>
          <ToggleButton
            value="rescued"
            aria-label="rescued"
            sx={(theme) => ({
              borderColor: 'divider',
              color: enabledStatuses.includes('rescued') ? '#1e88e5' : theme.palette.text.primary,
              '&.Mui-selected': {
                backgroundColor: alpha('#1e88e5', 0.15),
                borderColor: '#1e88e5',
                color: '#1e88e5',
              },
              '&.Mui-selected:hover': { backgroundColor: alpha('#1e88e5', 0.25) },
            })}
          >
            Rescued
          </ToggleButton>
          <ToggleButton
            value="turned over"
            aria-label="turned over"
            sx={(theme) => ({
              borderColor: 'divider',
              color: enabledStatuses.includes('turned over') ? '#fdd835' : theme.palette.text.primary,
              '&.Mui-selected': {
                backgroundColor: alpha('#fdd835', 0.20),
                borderColor: '#fdd835',
                color: '#fdd835',
              },
              '&.Mui-selected:hover': { backgroundColor: alpha('#fdd835', 0.28) },
            })}
          >
            Turned over
          </ToggleButton>
          <ToggleButton
            value="released"
            aria-label="released"
            sx={(theme) => ({
              borderColor: 'divider',
              color: enabledStatuses.includes('released') ? '#43a047' : theme.palette.text.primary,
              '&.Mui-selected': {
                backgroundColor: alpha('#43a047', 0.15),
                borderColor: '#43a047',
                color: '#43a047',
              },
              '&.Mui-selected:hover': { backgroundColor: alpha('#43a047', 0.25) },
            })}
          >
            Released
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {/* Themed styles for Leaflet popups to adapt to MUI color scheme */}
      <style>{`
        [data-mui-color-scheme="dark"] .themed-popup .leaflet-popup-content-wrapper {
          background-color: #1e1e1e;
          color: rgba(255,255,255,0.87);
          border: 1px solid rgba(255,255,255,0.16);
        }
        [data-mui-color-scheme="dark"] .themed-popup .leaflet-popup-tip {
          background-color: #1e1e1e;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.16);
        }
        /* Ensure MUI buttons adapt in dark mode */
        [data-mui-color-scheme="dark"] .themed-popup .MuiButton-containedPrimary {
          background-color: var(--mui-palette-primary-main) !important;
          color: var(--mui-palette-primary-contrastText) !important;
        }
        [data-mui-color-scheme="dark"] .themed-popup .MuiButton-containedPrimary:hover {
          background-color: var(--mui-palette-primary-dark) !important;
        }
        [data-mui-color-scheme="dark"] .themed-popup .MuiButton-outlinedPrimary {
          color: var(--mui-palette-primary-main) !important;
          border-color: var(--mui-palette-primary-main) !important;
        }
        /* Input borders/text/placeholder in dark */
        [data-mui-color-scheme="dark"] .themed-popup .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline {
          border-color: rgba(255,255,255,0.23);
        }
        [data-mui-color-scheme="dark"] .themed-popup .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
          border-color: var(--mui-palette-primary-main);
        }
        [data-mui-color-scheme="dark"] .themed-popup .MuiInputBase-input::placeholder {
          color: rgba(255,255,255,0.7);
          opacity: 1;
        }
        [data-mui-color-scheme="light"] .themed-popup .leaflet-popup-content-wrapper {
          background-color: #ffffff;
          color: rgba(0,0,0,0.87);
          border: 1px solid rgba(0,0,0,0.12);
        }
        [data-mui-color-scheme="light"] .themed-popup .leaflet-popup-tip {
          background-color: #ffffff;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12);
        }
        /* Keep outlined primary readable in light mode */
        [data-mui-color-scheme="light"] .themed-popup .MuiButton-outlinedPrimary {
          color: var(--mui-palette-primary-main);
          border-color: var(--mui-palette-primary-main);
        }

        /* Force Confirm and Save buttons to stay like light mode in dark mode */
        [data-mui-color-scheme="dark"] .themed-popup .confirm-btn { 
          background-color: var(--mui-palette-primary-main) !important; 
          color: #000 !important; 
        }
        [data-mui-color-scheme="dark"] .themed-popup .confirm-btn:hover { 
          background-color: var(--mui-palette-primary-dark) !important; 
          color: #fff !important; 
        }
        [data-mui-color-scheme="dark"] .themed-popup .confirm-btn.Mui-disabled { 
          background-color: var(--mui-palette-action-disabledBackground) !important; 
          color: #000 !important; 
        }
        
        /* Force Save button to stay like light mode in dark mode */
        [data-mui-color-scheme="dark"] .themed-popup .MuiButton-containedPrimary { 
          background-color: var(--mui-palette-primary-main) !important; 
          color: #000 !important; 
        }
        [data-mui-color-scheme="dark"] .themed-popup .MuiButton-containedPrimary:hover { 
          background-color: var(--mui-palette-primary-dark) !important; 
          color: #fff !important; 
        }
        [data-mui-color-scheme="dark"] .themed-popup .MuiButton-containedPrimary.Mui-disabled { 
          background-color: var(--mui-palette-action-disabledBackground) !important; 
          color: #000 !important; 
        }
        
        /* Style Cancel button in edit mode to match outlined design */
        [data-mui-color-scheme="dark"] .themed-popup .MuiButton-outlinedPrimary { 
          background-color: #000 !important; 
          color: #fff !important; 
          border-color: #000 !important;
        }
        [data-mui-color-scheme="dark"] .themed-popup .MuiButton-outlinedPrimary:hover { 
          background-color: #000 !important; 
          color: #fff !important; 
          border-color: #000 !important;
        }

        /* Prevent tall popup from overflowing viewport: cap content and scroll inside */
        .themed-popup .leaflet-popup-content {
          max-height: 320px;
          overflow: auto;
          margin: 13px 19px; /* keep Leaflet default spacing */
        }
        .themed-popup .leaflet-popup-content-wrapper {
          max-width: 320px; /* avoid overly wide popups at low zoom */
        }
      `}</style>
      <Box sx={{ position: "absolute", top: 10, left: 10, zIndex: 1000, display: "flex", flexDirection: "column", gap: 1 }}>
        <Tooltip title={isAddingMarker ? "Click map to add a marker" : "Enable add-marker mode"} enterDelay={500}>
          <Button
            variant={isAddingMarker ? "contained" : "outlined"}
            color={isAddingMarker ? "primary" : "inherit"}
            size="small"
            onClick={() => setIsAddingMarker((v) => !v)}
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 'auto',
              px: 2,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              gap: 1,
              border: '1px solid black',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: isAddingMarker ? 'primary.dark' : 'action.hover',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                borderColor: isAddingMarker ? 'primary.dark' : 'primary.main',
                color: 'primary.main'
              }
            }}
          >
            <AddLocationAltOutlinedIcon sx={{ fontSize: 18 }} />
            {isAddingMarker ? "Adding Marker" : "Add Marker"}
          </Button>
        </Tooltip>
        
        <Tooltip title="Zoom in" enterDelay={500}>
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            onClick={() => {
              if (mapInstance) {
                const currentZoom = mapInstance.getZoom();
                mapInstance.setZoom(currentZoom + 1);
              }
            }}
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 'auto',
              px: 2,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              gap: 1,
              border: '1px solid black',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                borderColor: 'primary.main',
                color: 'primary.main'
              }
            }}
          >
            <ZoomInIcon sx={{ fontSize: 18 }} />
            Zoom In
          </Button>
        </Tooltip>
        
        <Tooltip title="Zoom out" enterDelay={500}>
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            onClick={() => {
              if (mapInstance) {
                const currentZoom = mapInstance.getZoom();
                mapInstance.setZoom(currentZoom - 1);
              }
            }}
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              minWidth: 'auto',
              px: 2,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              gap: 1,
              border: '1px solid black',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                borderColor: 'primary.main',
                color: 'primary.main'
              }
            }}
          >
            <ZoomOutIcon sx={{ fontSize: 18 }} />
            Zoom Out
          </Button>
        </Tooltip>
      </Box>
    <MapContainer
        center={[8.371964645263802, 124.85604137091526]}
        zoom={15}
        style={{
          height: "100%",
          width: "100%",
          borderRadius: "8px",
          border: "1px solid #e0e0e0",
        }}
        zoomControl={false}
        scrollWheelZoom={true}
        minZoom={12}
        maxZoom={18}
        maxBoundsViscosity={0.5}
        whenReady={() => { /* set in effect below */ }}
      >
        <TileLayer
          url={tileUrls[skin]}
          attribution={attributions[skin]}
          eventHandlers={{
            load: () => console.log("Base map tile layer loaded " + Date()),
          }}
        />
        {skin === 'satellite' && (
          <>
            <TileLayer
              url={labelUrls.esriWorldBoundariesAndPlaces}
              attribution={attributions.satellite}
              opacity={0.9}
              zIndex={400}
            />
            <TileLayer
              url={labelUrls.esriWorldTransportation}
              attribution={attributions.satellite}
              opacity={0.5}
              zIndex={401}
            />
          </>
        )}
        <ResizeHandler />
        <MapBoundsController />
        <BoundaryGuide />
        <MapRefSetter onReady={(m) => { if (!mapInstance) setMapInstance(m); }} />
        <AddMarkerOnClick enabled={isAddingMarker} />

        {/* Pending marker with photo upload */}
        {pendingMarker && (
          <Marker
            key={"pending"}
            position={pendingMarker.pos as [number, number]}
            icon={createStatusIcon(pendingMarker.status)}
            eventHandlers={{ add: (e: any) => e.target.openPopup() }}
          >
            <Popup className="themed-popup" autoPan autoPanPadding={[16,16]}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 300 }}>
                <strong>Add marker here</strong>
                <TextField
                  placeholder="Species name"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={pendingMarker.speciesName}
                  onChange={(e) =>
                    setPendingMarker((p) => (p ? { ...p, speciesName: e.target.value } : p))
                  }
                />
                <Box sx={{ mt: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1, height: 128, overflow: "auto" }}>
                  {speciesLoading && <Box sx={{ fontSize: 12, opacity: 0.7, p: 1 }}>Searching…</Box>}
                  {!speciesLoading && speciesOptions.length === 0 && (
                    <Box sx={{ fontSize: 12, opacity: 0.5, p: 1 }}>No suggestions</Box>
                  )}
                  {!speciesLoading && speciesOptions.length > 0 && (
                    <Box>
                      {speciesOptions.map((opt) => (
                        <Box
                          key={`${opt.label}-${opt.common || ""}`}
                          sx={{ px: 1, py: 0.5, cursor: "pointer", "&:hover": { backgroundColor: "action.hover" } }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPendingMarker((p) => (p ? { ...p, speciesName: opt.label } : p));
                          }}
                        >
                          {opt.common && <Box sx={{ fontSize: 14, fontWeight: 'bold' }}>{opt.common}</Box>}
                          <Box sx={{ fontSize: 12, fontStyle: 'italic', opacity: 0.7 }}>{opt.label}</Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
                <TextField
                  select
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={pendingMarker.status}
                  onChange={(e) =>
                    setPendingMarker((p) => (p ? { ...p, status: e.target.value } : p))
                  }
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (value: unknown) => {
                      const v = String(value || "");
                      return v !== "" ? v : "Status";
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Status
                  </MenuItem>
                  <MenuItem value="reported">Reported</MenuItem>
                  <MenuItem value="rescued">Rescued</MenuItem>
                  <MenuItem value="turned over">Turned over</MenuItem>
                  <MenuItem value="RELEASED">Released</MenuItem>
                </TextField>

                {/* Reporter details */}
                <TextField
                  placeholder="Name of who sighted"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={pendingMarker.reporterName || ""}
                  onChange={(e) => setPendingMarker((p) => (p ? { ...p, reporterName: e.target.value } : p))}
                />
                <TextField
                  placeholder="Contact number"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={pendingMarker.contactNumber || ""}
                  onChange={(e) => setPendingMarker((p) => (p ? { ...p, contactNumber: e.target.value } : p))}
                />

                {/* Upload photo */}
                <Box>
                  <Button variant="outlined" color="primary" size="small" component="label">
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setPendingMarker((p) => (p ? { ...p, photo: url } : p));
                        }
                      }}
                    />
                  </Button>
                  {pendingMarker.photo && (
                    <Box sx={{ mt: 1 }}>
                      <img src={pendingMarker.photo ?? undefined} alt="preview" style={{ width: "100%", borderRadius: 8 }} />
                      <Button size="small" onClick={() => setPendingMarker((p) => (p ? { ...p, photo: null } : p))}>Remove</Button>
                    </Box>
                  )}
                </Box>

                <Box>
                  <div>Date & Time Captured: {new Date(pendingMarker.timestampIso).toLocaleString()}</div>
                  <div>Latitude: {pendingMarker.pos[0].toFixed(5)}</div>
                  <div>Longitude: {pendingMarker.pos[1].toFixed(5)}</div>
                  <div>Barangay: {pendingMarker.addressLoading ? "Loading..." : (pendingMarker.address?.barangay || "N/A")}</div>
                  <div>Municipality: {pendingMarker.addressLoading ? "Loading..." : (pendingMarker.address?.municipality || "N/A")}</div>
                </Box>

                <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      sx={(theme) => ({
                        bgcolor: theme.palette.primary.main,
                        color: theme.palette.mode === 'light' ? '#fff' : '#000',
                        '&:hover': { bgcolor: theme.palette.primary.dark },
                        '&.Mui-disabled': {
                          opacity: 1,
                          bgcolor: theme.palette.action.disabledBackground,
                          color: theme.palette.mode === 'light' ? '#fff' : '#000',
                        },
                      })}
                      className="confirm-btn"
                      type="button"
                      onClick={() => {
                        // Check if all required fields are filled
                        const requiredFields = [
                          { value: pendingMarker.speciesName, name: "Species name" },
                          { value: pendingMarker.status, name: "Status" },
                          { value: pendingMarker.reporterName, name: "Name of who sighted" },
                          { value: pendingMarker.contactNumber, name: "Contact number" }
                        ];
                        
                        const emptyFields = requiredFields.filter(field => !field.value || field.value.trim() === "");
                        
                        if (emptyFields.length > 0) {
                          const fieldNames = emptyFields.map(field => field.name).join(", ");
                          alert(`Please fill in all fields: ${fieldNames}`);
                          return;
                        }
                        
                        const marker: UserMarker = {
                          id: Date.now(),
                          pos: pendingMarker.pos,
                          title: pendingMarker.speciesName || "Custom Marker",
                          speciesName: pendingMarker.speciesName || "",
                          status: pendingMarker.status,
                          timestampIso: pendingMarker.timestampIso,
                          address: pendingMarker.address,
                          photo: pendingMarker.photo || null,
                          reporterName: pendingMarker.reporterName || "",
                          contactNumber: pendingMarker.contactNumber || "",
                        };
                        setUserMarkers((prev) => [...prev, marker]);
                        setPendingMarker(null);
                        setIsAddingMarker(false);
                      }}
                      disabled={!pendingMarker.speciesName}
                    >
                      Confirm
                    </Button>
                  <Button variant="outlined" color="primary" size="small" type="button" onClick={() => { setPendingMarker(null); setIsAddingMarker(false); }}>
                    Cancel
                  </Button>
                </Box>
              </Box>
            </Popup>
          </Marker>
        )}

        {/* When editing, render that marker outside the cluster to avoid recluster animations hiding its popup */}
        {editingMarker && (
          <Marker
            key={`editing-${editingMarker.id}`}
            position={editingMarker.pos}
            icon={createStatusIcon(editingMarker.status)}
            ref={(ref) => { if (ref) markerRefs.current[editingMarker.id] = ref; }}
            eventHandlers={{ add: (e: any) => e.target.openPopup() }}
          >
            <Popup className="themed-popup" maxWidth={420}>
              {/* Reuse the same editing UI by forcing the isEditing branch */}
              {(() => {
                const m = editingMarker;
                const isEditing = true;
                const draft = editDrafts[m.id] || { speciesName: m.speciesName, status: m.status };
                return (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 240 }}>
                    <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125 }}>Species name</Box>
                    <TextField
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      size="small"
                      value={draft.speciesName}
                      onChange={(e) =>
                        setEditDrafts((prev) => ({
                          ...prev,
                          [m.id]: { ...(prev[m.id] || {}), speciesName: e.target.value, status: prev[m.id]?.status ?? m.status, photo: prev[m.id]?.photo ?? m.photo },
                        }))
                      }
                      inputRef={(el) => { editInputRefs.current[m.id] = el; }}
                    />
                    <Box sx={{ mt: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1, maxHeight: 128, overflow: "auto" }}>
                      {editSpeciesLoading && <Box sx={{ fontSize: 12, opacity: 0.7, p: 1 }}>Searching…</Box>}
                      {!editSpeciesLoading && editSpeciesOptions.length === 0 && (
                        <Box sx={{ fontSize: 12, opacity: 0.5, p: 1 }}>No suggestions</Box>
                      )}
                      {!editSpeciesLoading && editSpeciesOptions.length > 0 && (
                        <Box>
                          {editSpeciesOptions.map((opt) => (
                            <Box
                              key={`${opt.label}-${opt.common || ""}`}
                              sx={{ px: 1, py: 0.5, cursor: "pointer", "&:hover": { backgroundColor: "action.hover" } }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditDrafts((prev) => ({
                                  ...prev,
                                  [m.id]: { ...(prev[m.id] || {}), speciesName: opt.label, status: prev[m.id]?.status ?? m.status, photo: prev[m.id]?.photo ?? m.photo },
                                }));
                              }}
                            >
                              {opt.common && <Box sx={{ fontSize: 14, fontWeight: 'bold' }}>{opt.common}</Box>}
                              <Box sx={{ fontSize: 12, fontStyle: 'italic', opacity: 0.7 }}>{opt.label}</Box>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125, mt: 0.125 }}>Status</Box>
                    <TextField
                      select
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      size="small"
                      value={draft.status}
                      onChange={(e) =>
                        setEditDrafts((prev) => ({
                          ...prev,
                          [m.id]: { ...(prev[m.id] || {}), status: String(e.target.value), speciesName: prev[m.id]?.speciesName ?? m.speciesName, photo: prev[m.id]?.photo ?? m.photo },
                        }))
                      }
                    >
                      <MenuItem value="reported">Reported</MenuItem>
                      <MenuItem value="rescued">Rescued</MenuItem>
                      <MenuItem value="turned over">Turned over</MenuItem>
                      <MenuItem value="RELEASED">Released</MenuItem>
                    </TextField>
                    <Box>
                      {m.timestampIso ? (<div>DateTime: {new Date(m.timestampIso).toLocaleString()}</div>) : null}
                      {m.address ? (
                        <Box>
                          <div>Barangay: {m.address.barangay || "N/A"}</div>
                          <div>Municipality: {m.address.municipality || "N/A"}</div>
                        </Box>
                      ) : null}
                      <div>Latitude: {m.pos[0].toFixed(5)}</div>
                      <div>Longitude: {m.pos[1].toFixed(5)}</div>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => {
                          const d = editDrafts[m.id] || draft;
                          if (!d.speciesName || !d.status) return;
                          setUserMarkers((prev) => prev.map((mk) => mk.id === m.id ? { ...mk, speciesName: d.speciesName, status: d.status, title: d.speciesName || mk.title } : mk));
                          setEditingMarkerId(null);
                        }}
                      >
                        Save
                      </Button>
                      <Button variant="outlined" size="small" onClick={() => setEditingMarkerId(null)}>Cancel</Button>
                    </Box>
                  </Box>
                );
              })()}
            </Popup>
          </Marker>
        )}

        {/* Saved user markers */}
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={(cluster: any) => {
            const count = cluster.getChildCount();
            const html = `<div class="cluster-icon-animated" style="
              background:#4caf50; /* green */
              color:#fff;
              border-radius:50%;
              width:32px;height:32px;
              display:flex;align-items:center;justify-content:center;
              border:2px solid #fff;
              box-shadow:0 0 0 2px rgba(0,0,0,0.3);
              font-weight:600;
              position:relative;
            ">
              <div class="cluster-glow-ring"></div>
              <span style="position:relative;z-index:1;">${count}</span>
            </div>`;
            return L.divIcon({ html, className: "cluster-icon", iconSize: [32, 32] });
          }}
        >
          {filteredMarkers.filter((m) => m.id !== editingMarkerId).map((m) => (
            <Marker
              key={m.id}
              position={m.pos}
              icon={createStatusIcon(m.status)}
              ref={(ref) => { markerRefs.current[m.id] = ref; }}
              eventHandlers={{
                add: (e: any) => {
                  e.target.openPopup();
                  // Log marker load with speciesName or title
                  console.log(`${m.title || m.speciesName || 'Marker'} Loaded ` + Date());
                },
              }}
            >
              <Popup className="themed-popup" maxWidth={420}>
                {editingMarkerId === m.id ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 240 }}>
                    <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125 }}>Species name</Box>
                    <TextField
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      size="small"
                      value={editDrafts[m.id]?.speciesName ?? m.speciesName}
                      onChange={(e) =>
                        setEditDrafts((prev) => ({
                          ...prev,
                          [m.id]: {
                            ...prev[m.id],
                            speciesName: e.target.value,
                            status: prev[m.id]?.status ?? m.status,
                            photo: prev[m.id]?.photo ?? m.photo,
                          },
                        }))
                      }
                      inputRef={(el) => { editInputRefs.current[m.id] = el; }}
                    />
                    <Box sx={{ mt: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1, maxHeight: 128, overflow: "auto" }}>
                      {editSpeciesLoading && <Box sx={{ fontSize: 12, opacity: 0.7, p: 1 }}>Searching…</Box>}
                      {!editSpeciesLoading && editSpeciesOptions.length === 0 && (
                        <Box sx={{ fontSize: 12, opacity: 0.5, p: 1 }}>No suggestions</Box>
                      )}
                      {!editSpeciesLoading && editSpeciesOptions.length > 0 && (
                        <Box>
                          {editSpeciesOptions.map((opt) => (
                            <Box
                              key={`${opt.label}-${opt.common || ""}`}
                              sx={{ px: 1, py: 0.5, cursor: "pointer", "&:hover": { backgroundColor: "action.hover" } }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditDrafts((prev) => ({
                                  ...prev,
                                  [m.id]: {
                                    ...prev[m.id],
                                    speciesName: opt.label,
                                    status: prev[m.id]?.status ?? m.status,
                                    photo: prev[m.id]?.photo ?? m.photo,
                                  },
                                }));
                              }}
                            >
                              {opt.common && <Box sx={{ fontSize: 14, fontWeight: 'bold' }}>{opt.common}</Box>}
                              <Box sx={{ fontSize: 12, fontStyle: 'italic', opacity: 0.7 }}>{opt.label}</Box>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125, mt: 0.125 }}>Status</Box>
                    <TextField
                      select
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      size="small"
                      value={editDrafts[m.id]?.status ?? m.status}
                      onChange={(e) =>
                        setEditDrafts((prev) => ({
                          ...prev,
                          [m.id]: {
                            ...prev[m.id],
                            speciesName: prev[m.id]?.speciesName ?? m.speciesName,
                            status: e.target.value,
                            photo: prev[m.id]?.photo ?? m.photo,
                          },
                        }))
                      }
                    >
                      <MenuItem value="reported">Reported</MenuItem>
                      <MenuItem value="rescued">Rescued</MenuItem>
                      <MenuItem value="turned over">Turned over</MenuItem>
                      <MenuItem value="RELEASED">Released</MenuItem>
                    </TextField>

                    {/* Reporter details (editable) */}
                    <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125, mt: 0.125 }}>Name of who sighted</Box>
                    <TextField
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      size="small"
                      value={editDrafts[m.id]?.reporterName ?? m.reporterName ?? ""}
                      onChange={(e) =>
                        setEditDrafts((prev) => ({
                          ...prev,
                          [m.id]: {
                            ...prev[m.id],
                            reporterName: e.target.value,
                            speciesName: prev[m.id]?.speciesName ?? m.speciesName,
                            status: prev[m.id]?.status ?? m.status,
                            photo: prev[m.id]?.photo ?? m.photo,
                            contactNumber: prev[m.id]?.contactNumber ?? m.contactNumber,
                          },
                        }))
                      }
                    />
                    <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125, mt: 0.125 }}>Contact number</Box>
                    <TextField
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      size="small"
                      placeholder="Phone number"
                      value={(editDrafts[m.id] as any)?.phoneNumber ?? ""}
                      onChange={(e) => {
                        const phoneNumber = e.target.value;
                        const countryCode = (editDrafts[m.id] as any)?.countryCode ?? '+63';
                        const fullNumber = countryCode + phoneNumber;
                        setEditDrafts((prev) => ({
                          ...prev,
                          [m.id]: {
                            ...prev[m.id],
                            phoneNumber: phoneNumber,
                            contactNumber: fullNumber,
                            speciesName: prev[m.id]?.speciesName ?? m.speciesName,
                            status: prev[m.id]?.status ?? m.status,
                            photo: prev[m.id]?.photo ?? m.photo,
                            reporterName: prev[m.id]?.reporterName ?? m.reporterName,
                          },
                        }));
                      }}
                      InputProps={{
                        startAdornment: (
                          <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                            <FormControl size="small" sx={{ minWidth: 80 }}>
                              <Select
                                value={(editDrafts[m.id] as any)?.countryCode ?? '+63'}
                                onChange={(e) => {
                                  const countryCode = e.target.value;
                                  const phoneNumber = (editDrafts[m.id] as any)?.phoneNumber ?? '';
                                  const fullNumber = countryCode + phoneNumber;
                                  setEditDrafts((prev) => ({
                                    ...prev,
                                    [m.id]: {
                                      ...prev[m.id],
                                      countryCode: countryCode,
                                      contactNumber: fullNumber,
                                      speciesName: prev[m.id]?.speciesName ?? m.speciesName,
                                      status: prev[m.id]?.status ?? m.status,
                                      photo: prev[m.id]?.photo ?? m.photo,
                                      reporterName: prev[m.id]?.reporterName ?? m.reporterName,
                                    },
                                  }));
                                }}
                                variant="standard"
                                sx={{ 
                                  '&:before': { borderBottom: 'none' },
                                  '&:after': { borderBottom: 'none' },
                                  '&:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
                                  '& .MuiSelect-select': { 
                                    padding: '0',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    minHeight: 'auto'
                                  }
                                }}
                              >
                                <MenuItem value="+63">🇵🇭 +63</MenuItem>
                                <MenuItem value="+1">🇺🇸 +1</MenuItem>
                                <MenuItem value="+44">🇬🇧 +44</MenuItem>
                                <MenuItem value="+81">🇯🇵 +81</MenuItem>
                                <MenuItem value="+86">🇨🇳 +86</MenuItem>
                                <MenuItem value="+82">🇰🇷 +82</MenuItem>
                                <MenuItem value="+65">🇸🇬 +65</MenuItem>
                                <MenuItem value="+60">🇲🇾 +60</MenuItem>
                              </Select>
                            </FormControl>
                          </Box>
                        )
                      }}
                    />

                    {/* Edit photo */}
                    <Box>
                      <Button variant="outlined" color="primary" size="small" component="label">
                        Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const url = URL.createObjectURL(file);
                              setEditDrafts((prev) => ({
                                ...prev,
                                [m.id]: {
                                  ...prev[m.id],
                                  photo: url,
                                },
                              }));
                            }
                          }}
                        />
                      </Button>
                       {editDrafts[m.id]?.photo && (
                        <Box sx={{ mt: 1 }}>
                           <img src={editDrafts[m.id]?.photo ?? undefined} alt="preview" style={{ width: "100%", borderRadius: 8 }} />
                          <Button size="small" onClick={() => setEditDrafts((prev) => ({ ...prev, [m.id]: { ...prev[m.id], photo: null } }))}>Remove</Button>
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ display: "flex", gap: 1, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        sx={(theme) => ({
                          bgcolor: theme.palette.primary.main,
                          color: theme.palette.mode === 'light' ? '#fff' : '#000',
                          '&:hover': { bgcolor: theme.palette.primary.dark },
                          '&.Mui-disabled': {
                            opacity: 1,
                            bgcolor: theme.palette.action.disabledBackground,
                            color: theme.palette.mode === 'light' ? '#fff' : '#000',
                          },
                        })}
                        className="confirm-btn"
                        onClick={() => {
                          const draft = editDrafts[m.id] || {};
                          setUserMarkers((prev) =>
                            prev.map((um) =>
                              um.id === m.id
                                ? {
                                    ...um,
                                    speciesName: draft.speciesName ?? um.speciesName,
                                    status: draft.status ?? um.status,
                                    photo: draft.photo !== undefined ? draft.photo : um.photo,
                                    title: (draft.speciesName ?? um.speciesName) || um.title,
                                    reporterName: draft.reporterName ?? um.reporterName,
                                    contactNumber: draft.contactNumber ?? um.contactNumber,
                                  }
                                : um
                            )
                          );
                          setEditingMarkerId(null);
                          setEditDrafts((prev) => {
                            const cp = { ...prev };
                            delete cp[m.id];
                            return cp;
                          });
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        onClick={() => {
                          setEditingMarkerId(null);
                          setEditDrafts((prev) => {
                            const cp = { ...prev };
                            delete cp[m.id];
                            return cp;
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 360 }}>
                    <div><strong>{m.title}</strong></div>
                    <div>Status: {m.status}</div>
                    {m.photo && <img src={m.photo} alt="marker" style={{ width: "100%", borderRadius: 8 }} />}
                    <div>Date & Time Captured: {new Date(m.timestampIso).toLocaleString()}</div>
                    <div>Latitude: {m.pos[0].toFixed(5)}</div>
                    <div>Longitude: {m.pos[1].toFixed(5)}</div>
                    <div>Barangay: {m.address?.barangay || "N/A"}</div>
                    <div>Municipality: {m.address?.municipality || "N/A"}</div>
                    {m.reporterName ? <div>Reported by: {m.reporterName}</div> : null}
                    {m.contactNumber ? <div>Contact: {m.contactNumber}</div> : null}
                    <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={(e) => {
                          try { e.preventDefault(); e.stopPropagation(); } catch {}
                          setEditDrafts((prev) => ({
                            ...prev,
                            [m.id]: {
                              speciesName: m.speciesName,
                              status: m.status,
                              photo: m.photo ?? null,
                            },
                          }));
                          setEditingMarkerId(m.id);
                          setTimeout(() => {
                            try { markerRefs.current[m.id]?.openPopup?.(); } catch {}
                            // Ensure no input is focused automatically
                            try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch {}
                          }, 0);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={(e) => {
                          try { e.preventDefault(); e.stopPropagation(); } catch {}
                          if (window.confirm("Delete this marker? This cannot be undone.")) {
                            setUserMarkers((prev) => prev.filter((um) => um.id !== m.id));
                            setEditDrafts((prev) => { const cp = { ...prev }; delete cp[m.id]; return cp; });
                            if (editingMarkerId === m.id) setEditingMarkerId(null);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                )}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
    </MapContainer>
    </Box>
  );
}
