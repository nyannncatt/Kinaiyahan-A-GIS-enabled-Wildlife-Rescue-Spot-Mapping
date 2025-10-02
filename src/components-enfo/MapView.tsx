import { MapContainer, TileLayer, useMap, GeoJSON, Marker, Popup, useMapEvents } from "react-leaflet";
import { useEffect, useRef, useState } from "react";
import { Box, Tooltip, IconButton, Button, TextField, MenuItem } from "@mui/material";
import AddLocationAltOutlinedIcon from "@mui/icons-material/AddLocationAltOutlined";
import L from "leaflet";
// eslint-disable-next-line @typescript-eslint/no-var-requires
// @ts-ignore - osmtogeojson has no official TypeScript types
import osmtogeojson from "osmtogeojson";
// Local fallback GeoJSON of Manolo Fortich boundary
// Vite imports JSON as a plain object
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

  const [isAddingMarker, setIsAddingMarker] = useState(false);
  type AddressInfo = { barangay?: string; municipality?: string; displayName?: string };
  type UserMarker = {
    id: number;
    pos: [number, number];
    title: string;
    speciesName: string;
    status: string;
    timestampIso: string;
    address?: AddressInfo;
  };
  const [userMarkers, setUserMarkers] = useState<UserMarker[]>([]);
  const [pendingMarker, setPendingMarker] = useState<{
    pos: [number, number];
    speciesName: string;
    status: string;
    timestampIso: string;
    address?: AddressInfo;
    addressLoading?: boolean;
  } | null>(null);
  const [speciesOptions, setSpeciesOptions] = useState<Array<{ label: string; common?: string }>>([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);
  const [editDrafts, setEditDrafts] = useState<Record<number, { speciesName: string; status: string }>>({});
  const [editingMarkerId, setEditingMarkerId] = useState<number | null>(null);
  const editInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const markerRefs = useRef<Record<number, any>>({});

  // Restore state from sessionStorage on mount
  useEffect(() => {
    try {
      const savedPending = sessionStorage.getItem('mf-pending-marker');
      if (savedPending) {
        const parsed = JSON.parse(savedPending);
        if (parsed && parsed.pos && Array.isArray(parsed.pos)) {
          setPendingMarker(parsed);
        }
      }
    } catch {}
    try {
      const savedMarkers = sessionStorage.getItem('mf-user-markers');
      if (savedMarkers) {
        const parsed = JSON.parse(savedMarkers);
        if (Array.isArray(parsed)) {
          setUserMarkers(parsed);
        }
      }
    } catch {}
  }, []);

  // Persist state to sessionStorage so switching tabs/apps doesn't lose progress
  useEffect(() => {
    try {
      if (pendingMarker) {
        sessionStorage.setItem('mf-pending-marker', JSON.stringify(pendingMarker));
      } else {
        sessionStorage.removeItem('mf-pending-marker');
      }
    } catch {}
  }, [pendingMarker]);

  useEffect(() => {
    try {
      sessionStorage.setItem('mf-user-markers', JSON.stringify(userMarkers));
    } catch {}
  }, [userMarkers]);

  function AddMarkerOnClick({ enabled }: { enabled: boolean }) {
    useMapEvents({
      click(e) {
        if (!enabled) return;
        const lat = Number(e.latlng.lat);
        const lng = Number(e.latlng.lng);
        setPendingMarker({
          pos: [lat, lng],
          speciesName: "",
          status: "",
          timestampIso: new Date().toISOString(),
          addressLoading: true,
        });
      },
    });
    return null;
  }

  // Reverse-geocode barangay and municipality for pending marker
  useEffect(() => {
    const pm = pendingMarker;
    if (!pm) return;
    const controller = new AbortController();
    (async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pm.pos[0]}&lon=${pm.pos[1]}&zoom=14&addressdetails=1`;
        const res = await fetch(url, {
          headers: {
            "Accept": "application/json",
          },
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
        setPendingMarker((prev) => (prev ? { ...prev, address, addressLoading: false } : prev));
      } catch {
        setPendingMarker((prev) => (prev ? { ...prev, addressLoading: false } : prev));
      }
    })();
    return () => controller.abort();
  }, [pendingMarker?.pos?.[0], pendingMarker?.pos?.[1]]);

  // Debounced species suggestions (iNaturalist) without using Autocomplete
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
        // ignore
      } finally {
        setSpeciesLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [pendingMarker?.speciesName]);

  return (
    <Box sx={{ height: "100%", width: "100%", position: "relative" }}>
      <Box sx={{ position: "absolute", top: 90, left: 10, zIndex: 1000 }}>
        <Tooltip title={isAddingMarker ? "Click map to add a marker" : "Enable add-marker mode"} enterDelay={500}>
          <IconButton
            color={isAddingMarker ? "primary" : "default"}
            size="small"
            onClick={() => setIsAddingMarker((v) => !v)}
            aria-pressed={isAddingMarker}
          >
            <AddLocationAltOutlinedIcon />
          </IconButton>
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
        <AddMarkerOnClick enabled={isAddingMarker} />
        {/* Pending marker rendered outside the cluster to avoid re-clustering on typing */}
        {pendingMarker && (
          <Marker
            key={'pending'}
            position={pendingMarker.pos as [number, number]}
            eventHandlers={{ add: (e: any) => e.target.openPopup() }}
          >
            <Popup>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 260 }}>
                <strong>Add marker here</strong>
                <TextField
                  placeholder="Species name"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={pendingMarker.speciesName}
                  onChange={(e) => setPendingMarker((p) => (p ? { ...p, speciesName: e.target.value } : p))}
                />
                {/* Inline suggestions list in a fixed-height panel to prevent popup resizing */}
                <Box sx={{ mt: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, height: 128, overflow: 'auto' }}>
                  {speciesLoading ? (
                    <Box sx={{ fontSize: 12, opacity: 0.7, p: 1 }}>Searching…</Box>
                  ) : null}
                  {!speciesLoading && speciesOptions.length === 0 ? (
                    <Box sx={{ fontSize: 12, opacity: 0.5, p: 1 }}>No suggestions</Box>
                  ) : null}
                  {!speciesLoading && speciesOptions.length > 0 && (
                    <Box>
                      {speciesOptions.map((opt) => (
                        <Box
                          key={`${opt.label}-${opt.common || ''}`}
                          sx={{ px: 1, py: 0.5, cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                          onClick={() => setPendingMarker((p) => (p ? { ...p, speciesName: opt.label } : p))}
                        >
                          <Box sx={{ fontSize: 14 }}>{opt.label}</Box>
                          {opt.common ? <Box sx={{ fontSize: 12, opacity: 0.7 }}>{opt.common}</Box> : null}
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
                  onChange={(e) => setPendingMarker((p) => (p ? { ...p, status: e.target.value } : p))}
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
                  <MenuItem value="Sighted">Sighted</MenuItem>
                  <MenuItem value="Rescued">Rescued</MenuItem>
                  <MenuItem value="Released">Released</MenuItem>
                </TextField>
                <Box>
                  <div>Date & Time Captured: {new Date(pendingMarker.timestampIso).toLocaleString()}</div>
                  <div>Latitude: {pendingMarker.pos[0].toFixed(5)}</div>
                  <div>Longitude: {pendingMarker.pos[1].toFixed(5)}</div>
                  <div>
                    Barangay: {pendingMarker.addressLoading ? "Loading..." : (pendingMarker.address?.barangay || "N/A")}
                  </div>
                  <div>
                    Municipality: {pendingMarker.addressLoading ? "Loading..." : (pendingMarker.address?.municipality || "N/A")}
                  </div>
                </Box>
                <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      const marker: UserMarker = {
                        id: Date.now(),
                        pos: pendingMarker.pos,
                        title: pendingMarker.speciesName || "Custom Marker",
                        speciesName: pendingMarker.speciesName || "",
                        status: pendingMarker.status,
                        timestampIso: pendingMarker.timestampIso,
                        address: pendingMarker.address,
                      };
                      setUserMarkers((prev) => [...prev, marker]);
                      setPendingMarker(null);
                      setIsAddingMarker(false);
                    }}
                    disabled={!pendingMarker.speciesName || !pendingMarker.status}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setPendingMarker(null)}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </Popup>
          </Marker>
        )}
        {/* Clustered markers with popups */}
        <MarkerClusterGroup chunkedLoading>
          {userMarkers.map((m) => {
            const isEditing = editingMarkerId === m.id;
            const draft = editDrafts[m.id] || { speciesName: m.speciesName, status: m.status };
            return (
            <Marker
              key={m.id}
              position={m.pos as [number, number]}
              ref={(el) => { markerRefs.current[m.id] = el as any; }}
            >
              <Popup>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 260 }}>
                  {!isEditing ? (
                    <>
                      <strong>{m.title}</strong>
                      {m.speciesName ? <div>Species: {m.speciesName}</div> : null}
                      {m.status ? <div>Status: {m.status}</div> : null}
                      {m.timestampIso ? (<div>DateTime: {new Date(m.timestampIso).toLocaleString()}</div>) : null}
                      {m.address ? (
                        <Box>
                          <div>Barangay: {m.address.barangay || "N/A"}</div>
                          <div>Municipality: {m.address.municipality || "N/A"}</div>
                        </Box>
                      ) : null}
                      <div>Latitude: {m.pos[0].toFixed(5)}</div>
                      <div>Longitude: {m.pos[1].toFixed(5)}</div>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => {
                            setEditDrafts((prev) => ({ ...prev, [m.id]: { speciesName: m.speciesName, status: m.status } }));
                            setEditingMarkerId(m.id);
                            setTimeout(() => {
                              try {
                                markerRefs.current[m.id]?.openPopup?.();
                              } catch {}
                              const el = editInputRefs.current[m.id];
                              if (el) {
                                try { el.focus(); } catch {}
                              }
                            }, 0);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          onClick={() => {
                            if (window.confirm('Delete this marker? This cannot be undone.')) {
                              setUserMarkers((prev) => prev.filter((mk) => mk.id !== m.id));
                              setEditDrafts((prev) => { const cp = { ...prev }; delete cp[m.id]; return cp; });
                              if (editingMarkerId === m.id) setEditingMarkerId(null);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </Box>
                    </>
                  ) : (
                    <>
                      <strong>Edit marker</strong>
                      <TextField
                        placeholder="Species name"
                        size="small"
                        variant="outlined"
                        fullWidth
                        margin="dense"
                        value={draft.speciesName}
                        onChange={(e) => setEditDrafts((prev) => ({ ...prev, [m.id]: { ...draft, speciesName: e.target.value } }))}
                        inputRef={(el) => { editInputRefs.current[m.id] = el; }}
                      />
                      <TextField
                        select
                        size="small"
                        variant="outlined"
                        fullWidth
                        margin="dense"
                        value={draft.status}
                        onChange={(e) => setEditDrafts((prev) => ({ ...prev, [m.id]: { ...draft, status: String(e.target.value) } }))}
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
                        <MenuItem value="Sighted">Sighted</MenuItem>
                        <MenuItem value="Rescued">Rescued</MenuItem>
                        <MenuItem value="Released">Released</MenuItem>
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
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Button
                          variant="contained"
                          size="small"
                          disabled={!draft.speciesName || !draft.status}
                          onClick={() => {
                            if (!draft.speciesName || !draft.status) return;
                            if (window.confirm('Save changes to this marker?')) {
                              setUserMarkers((prev) => prev.map((mk) => mk.id === m.id ? {
                                ...mk,
                                speciesName: draft.speciesName,
                                status: draft.status,
                                title: draft.speciesName || mk.title,
                              } : mk));
                              setEditingMarkerId(null);
                            }
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setEditingMarkerId(null)}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </>
                  )}
                </Box>
              </Popup>
            </Marker>
          );})}
        </MarkerClusterGroup>
    </MapContainer>
    </Box>
  );
}
