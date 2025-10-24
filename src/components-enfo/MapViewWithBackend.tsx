import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, GeoJSON } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Box, Button, TextField, Alert, CircularProgress, Typography, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Chip, Tooltip, IconButton, ToggleButtonGroup, ToggleButton } from '@mui/material';
import SuccessModal from './SuccessModal';
import FetchingModal from './FetchingModal';
import { alpha } from '@mui/material/styles';
import AddLocationAltOutlinedIcon from '@mui/icons-material/AddLocationAltOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useAuth } from '../context/AuthContext';
import { useMapNavigation } from '../context/MapNavigationContext';
import { 
  getWildlifeRecords, 
  createWildlifeRecord, 
  updateWildlifeRecord, 
  deleteWildlifeRecord, 
  getUserRole,
  uploadWildlifePhoto,
  type WildlifeRecord,
  type CreateWildlifeRecord,
  type UpdateWildlifeRecord
} from '../services/wildlifeRecords';
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

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
  if (v === "turned over") return "turned over";
  if (v === "reported") return "reported";
  if (v === "rescued") return "rescued";
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
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const res = await fetch(url, { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'Wildlife-GIS/1.0'
          }
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          throw new Error(`Overpass ${endpoint} status ${res.status}`);
        }
        return res.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
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
        color: "#ff0000",
        weight: 4,
        dashArray: "6 6",
        fill: false,
      }}
    />
  );
}

interface MapViewWithBackendProps {
  skin: 'streets' | 'dark' | 'satellite';
}

interface PendingMarker {
  pos: [number, number];
  speciesName: string;
  status: string;
  timestampIso: string;
  addressLoading: boolean;
  photo: string | null;
  reporterName: string;
  contactNumber: string;
  barangay: string;
  municipality: string;
  address?: AddressInfo;
}

type AddressInfo = { barangay?: string; municipality?: string; displayName?: string };
  
  const tileUrls: Record<string, string> = {
    // OSM standard (no key required)
    streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    // CARTO Dark Matter (no key required; supports subdomains a,b,c,d)
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
    // Esri World Imagery (satellite, no key required)
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  };

  const attributions: Record<string, string> = {
    streets:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    dark:
      'Map tiles by <a href="https://carto.com/attributions">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    satellite:
      'Tiles &copy; Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  };

const statusColors: Record<string, string> = {
  'reported': '#f44336', // Red
  'rescued': '#2196f3', // Blue
  'turned over': '#ffc107', // Yellow
  'released': '#4caf50' // Green
};

export default function MapViewWithBackend({ skin }: MapViewWithBackendProps) {
  const { user } = useAuth();
  const { targetRecordId, clearTarget, triggerRecordsRefresh } = useMapNavigation();
  const [wildlifeRecords, setWildlifeRecords] = useState<WildlifeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [pendingMarker, setPendingMarker] = useState<PendingMarker | null>(null);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, any>>({});
  const [relocatingMarkerId, setRelocatingMarkerId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [hasLoadedRecords, setHasLoadedRecords] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [visibilityBump, setVisibilityBump] = useState(0);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [pendingWarning, setPendingWarning] = useState<string | null>(null);

  const isPendingComplete = (pm: PendingMarker | null): boolean => {
    if (!pm) return false;
    const hasSpecies = Boolean(pm.speciesName && pm.speciesName.trim());
    const hasReporter = Boolean(pm.reporterName && pm.reporterName.trim());
    const hasContact = Boolean(pm.contactNumber && pm.contactNumber.trim());
    return hasSpecies && hasReporter && hasContact;
  };

  // Modal states
  const [successModal, setSuccessModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: '',
  });
  const [fetchingModal, setFetchingModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: '',
  });



  // Search state (Nominatim)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<any>>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Status filters (multi-select)
  const ALL_STATUSES = ["reported", "rescued", "turned over", "released"] as const;
  const [enabledStatuses, setEnabledStatuses] = useState<string[]>([...ALL_STATUSES]);

  // Debug logging for initial state
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Component mounted - enabledStatuses:', enabledStatuses);
      console.log('Component mounted - wildlifeRecords length:', wildlifeRecords.length);
    }
  }, [enabledStatuses, wildlifeRecords.length]);

  // Species autocomplete
  const [speciesOptions, setSpeciesOptions] = useState<Array<{ label: string; common?: string }>>([]);
  const [speciesLoading, setSpeciesLoading] = useState(false);
  
  const markerRefs = useRef<Record<string, L.Marker | null>>({});
  const editInputRefs = useRef<Record<string, HTMLInputElement>>({});
  const reopenRetryHandle = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<number | null>(null);
  const isInitialLoad = useRef(true);
  const pendingSpeciesRef = useRef<HTMLInputElement | null>(null);
  const pendingReporterRef = useRef<HTMLInputElement | null>(null);
  const pendingContactRef = useRef<HTMLInputElement | null>(null);
  let lastRecordsRefreshBlockUntil = 0;

  // Timeout wrapper for API calls
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ]);
  };

  // Load wildlife records
  const loadWildlifeRecords = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
        setError(null);
      console.log('Loading wildlife records...');
      const records = await withTimeout(getWildlifeRecords(), 10000);
      console.log('Loaded wildlife records:', records);
      setWildlifeRecords(records);
          setHasLoadedRecords(true);
    } catch (err) {
      console.error('Error loading wildlife records:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wildlife records');
    } finally {
          setLoading(false);
    }
  }, [user]);

  // Refresh map data with fetching modal
  const refreshMapData = useCallback(async () => {
    if (!user) return;
    
    try {
      setFetchingModal({
        open: true,
        title: 'Refreshing Data',
        message: 'Fetching latest wildlife records...',
      });
      
      setError(null); // Clear any previous errors
      console.log('Refreshing wildlife records...');
      const records = await withTimeout(getWildlifeRecords(), 10000);
      console.log('Refreshed wildlife records:', records);
      console.log('Records count:', records.length);
      console.log('Current enabled statuses:', enabledStatuses);
      setWildlifeRecords(records);
      setHasLoadedRecords(true);
      
      // Force map re-render to ensure markers are displayed
      setVisibilityBump(prev => prev + 1);
      
      // Close fetching modal after a short delay to show it was successful
      setTimeout(() => {
        setFetchingModal(prev => ({ ...prev, open: false }));
      }, 500);
    } catch (err) {
      console.error('Error refreshing wildlife records:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh wildlife records');
      setFetchingModal(prev => ({ ...prev, open: false }));
    }
  }, [user]);

  // Get user role
  const loadUserRole = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('Loading user role...');
      const userRole = await getUserRole();
      console.log('Loaded user role:', userRole);
      setRole(userRole);
    } catch (err) {
      console.error('Error loading user role:', err);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user && isInitialLoad.current) {
        isInitialLoad.current = false;
      loadUserRole();
      loadWildlifeRecords();
    }
  }, [user, loadUserRole, loadWildlifeRecords]);

  // Handle navigation to specific record
  useEffect(() => {
    if (targetRecordId && mapInstance && wildlifeRecords.length > 0) {
      const targetRecord = wildlifeRecords.find(record => record.id === targetRecordId);
      if (targetRecord) {
        // Navigate to the location
        mapInstance.setView([targetRecord.latitude, targetRecord.longitude], 16, { animate: true });
        
        // Open the popup after a short delay to ensure the marker is visible
        setTimeout(() => {
          const marker = markerRefs.current[targetRecordId];
          if (marker && typeof marker.openPopup === 'function') {
            try {
              marker.openPopup();
            } catch (error) {
              console.log('Could not open popup:', error);
            }
          }
        }, 1000);
        
        // Clear the target after navigation
        clearTarget();
      }
    }
  }, [targetRecordId, mapInstance, wildlifeRecords, clearTarget]);

  // Set loading timeout
  useEffect(() => {
    if (loading && !hasLoadedRecords) {
      loadingTimeoutRef.current = window.setTimeout(() => {
      setLoading(false);
        setError('Loading timeout - please refresh the page');
      }, 15000);
    }

    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [loading, hasLoadedRecords]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        window.clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // When returning to the tab, clear any delayed loading and ensure map is interactive
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        if (loadingTimeoutRef.current) {
          window.clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setLoading(false);
        try { mapInstance?.closePopup?.(); } catch {}
        try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch {}
        setEditingMarkerId(null);
        setIsAddingMarker(false);
        try { mapInstance?.invalidateSize?.(); } catch {}

        // Refresh role to mimic first-load behavior
        if (user) {
          loadUserRole();
        }

        // Background records refresh (no spinner); keep cache until it completes
        if (user) {
          if (Date.now() < lastRecordsRefreshBlockUntil) return;
          (async () => {
            try {
              const refreshed = await withTimeout(getWildlifeRecords(), 12000);
              setWildlifeRecords(refreshed);
              setHasLoadedRecords(true);
            } catch (e) {
              lastRecordsRefreshBlockUntil = Date.now() + 120000;
            }
          })();
        }

        // Finally, bump key to remount the Leaflet map and restore handlers
        setVisibilityBump((k) => k + 1);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [mapInstance, user, loadUserRole]);

  // Address lookup for pending marker
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
        
        // Debug logging to see what address fields are available
        console.log('Address lookup result:', { addr, displayName: data.display_name });
        
        const address: AddressInfo = {
          barangay: addr.village || addr.suburb || addr.neighbourhood || addr.hamlet || addr.barangay || addr.city_district || addr.district,
          municipality: addr.town || addr.city || addr.municipality || addr.county || addr.state,
          displayName: data.display_name,
        };
        
        console.log('Parsed address:', address);
        setPendingMarker((prev) =>
          prev ? { ...prev, address, addressLoading: false } : prev
        );
      } catch {
        setPendingMarker((prev) => (prev ? { ...prev, addressLoading: false } : prev));
      }
    })();
    return () => controller.abort();
  }, [pendingMarker?.pos?.[0], pendingMarker?.pos?.[1]]);

  // Species autocomplete
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

  // Reopen editing popup when returning to tab
  useEffect(() => {
    if (editingMarkerId == null) return;
    const id = editingMarkerId;
    const reopen = () => reopenEditingPopupWithRetry(id);
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
  }, [editingMarkerId, wildlifeRecords]);

  function reopenEditingPopupWithRetry(targetId: string, attempts = 60, delayMs = 150) {
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

  // Handle adding new marker
  const handleAddMarker = async () => {
    if (!pendingMarker || !user) return;

    try {
      // Validate required credentials before confirming
      const speciesOk = Boolean(pendingMarker.speciesName && pendingMarker.speciesName.trim());
      const reporterOk = Boolean(pendingMarker.reporterName && pendingMarker.reporterName.trim());
      const contactOk = Boolean(pendingMarker.contactNumber && pendingMarker.contactNumber.trim());
      if (!speciesOk || !reporterOk || !contactOk) {
        setPendingWarning('Please provide Species, Reporter Name, and Contact number before confirming.');
        return;
      }

      // Upload photo to Supabase if it exists
      let photoUrl: string | undefined = undefined;
      if (pendingMarker.photo && pendingMarker.photo.startsWith('blob:')) {
        // Convert blob URL to file and upload
        const response = await fetch(pendingMarker.photo);
        const blob = await response.blob();
        const file = new File([blob], 'wildlife-photo.jpg', { type: blob.type });
        const uploadedUrl = await handlePhotoUpload(file, 'temp');
        photoUrl = uploadedUrl || undefined;
      } else if (pendingMarker.photo) {
        photoUrl = pendingMarker.photo;
      }

      const newRecord: CreateWildlifeRecord = {
        species_name: pendingMarker.speciesName,
        status: pendingMarker.status as any,
        latitude: pendingMarker.pos[0],
        longitude: pendingMarker.pos[1],
        barangay: pendingMarker.address?.barangay || undefined,
        municipality: pendingMarker.address?.municipality || undefined,
        reporter_name: pendingMarker.reporterName || undefined,
        contact_number: pendingMarker.contactNumber || undefined,
        photo_url: photoUrl,
        timestamp_captured: pendingMarker.timestampIso,
      };

      const createdRecord = await createWildlifeRecord(newRecord);
      setWildlifeRecords(prev => [createdRecord, ...prev]);
      setPendingMarker(null);
      setIsAddingMarker(false);
      setPendingWarning(null);
      try { triggerRecordsRefresh(); } catch {}
      
      // Show success modal
      setSuccessModal({
        open: true,
        title: 'Success!',
        message: `Wildlife record for "${createdRecord.species_name}" has been added successfully.`,
      });
      
      // Refresh map data after successful add
      setTimeout(() => {
        refreshMapData();
      }, 1000);
    } catch (err) {
      console.error('Error creating wildlife record:', err);
      setError(err instanceof Error ? err.message : 'Failed to create wildlife record');
    }
  };

  // Handle updating marker
  const handleUpdateMarker = async (id: string) => {
    const updates = editDrafts[id];
    if (!updates) return;

    try {
      const updatedRecord = await updateWildlifeRecord(id, updates);
      setWildlifeRecords(prev => 
        prev.map(record => record.id === id ? updatedRecord : record)
      );
      setEditingMarkerId(null);
      setEditDrafts(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[id];
        return newDrafts;
      });
      try { triggerRecordsRefresh(); } catch {}
      
      // Show success modal
      setSuccessModal({
        open: true,
        title: 'Success!',
        message: `Wildlife record for "${updatedRecord.species_name}" has been updated successfully.`,
      });
      
      // Refresh map data after successful update
      setTimeout(() => {
        refreshMapData();
      }, 1000);
    } catch (err) {
      console.error('Error updating wildlife record:', err);
      setError(err instanceof Error ? err.message : 'Failed to update wildlife record');
    }
  };

  // Handle deleting marker
  const handleDeleteMarker = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this wildlife record?')) return;

    try {
      await deleteWildlifeRecord(id);
      setWildlifeRecords(prev => prev.filter(record => record.id !== id));
      setEditingMarkerId(null);
    } catch (err) {
      console.error('Error deleting wildlife record:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete wildlife record');
    }
  };

  // Handle relocating marker
  const handleRelocateMarker = async (id: string, newLat: number, newLng: number) => {
    try {
      const updates = {
        latitude: newLat,
        longitude: newLng
      };
      
      const updatedRecord = await updateWildlifeRecord(id, updates);
      setWildlifeRecords(prev => 
        prev.map(record => record.id === id ? updatedRecord : record)
      );
      setRelocatingMarkerId(null);
      try { triggerRecordsRefresh(); } catch {}
      
      // Show success modal
      setSuccessModal({
        open: true,
        title: 'Success!',
        message: `Wildlife record location has been updated successfully.`,
      });
      
      // Refresh map data after successful update
      setTimeout(() => {
        refreshMapData();
      }, 1000);
    } catch (err) {
      console.error('Error relocating wildlife record:', err);
      setError(err instanceof Error ? err.message : 'Failed to relocate wildlife record');
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (file: File, recordId?: string) => {
    try {
      const photoUrl = await uploadWildlifePhoto(file, recordId || 'temp');
      return photoUrl;
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
      return null;
    }
  };

  // Add marker on click component
  function AddMarkerOnClick({ enabled }: { enabled: boolean }) {
    const map = useMap();
    
    useMapEvents({
      click(e) {
        if (!enabled) return;
        const lat = Number(e.latlng.lat);
        const lng = Number(e.latlng.lng);
        setPendingMarker({
          pos: [lat, lng],
          speciesName: "",
          status: "reported",
          timestampIso: new Date().toISOString(),
          addressLoading: true,
          photo: null,
          reporterName: "",
          contactNumber: "",
          barangay: "",
          municipality: "",
        });
        setIsAddingMarker(true);
      }
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

  // Relocate marker on click component
  function RelocateMarkerOnClick({ enabled, markerId }: { enabled: boolean; markerId: string | null }) {
    const map = useMap();
    
    useMapEvents({
      click(e) {
        if (!enabled || !markerId) return;
        const lat = Number(e.latlng.lat);
        const lng = Number(e.latlng.lng);
        handleRelocateMarker(markerId, lat, lng);
      }
    });

    // Change cursor when in relocation mode
    useEffect(() => {
      if (enabled) {
        // Use a custom cursor with location pin icon
        map.getContainer().style.cursor = 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyUzYuNDggMjIgMTIgMjJTMjIgMTcuNTIgMjIgMTJTMTcuNTIgMiAxMiAyWk0xMiAxM0MxMC4zNCAxMyA5IDExLjY2IDkgMTBTMTAuMzQgNyAxMiA3UzE1IDguMzQgMTUgMTBTMTMuNjYgMTMgMTIgMTNaIiBmaWxsPSIjRkY2MDAwIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiIGZpbGw9IiNGRkZGRkYiLz4KPC9zdmc+") 12 12, pointer';
        return () => {
          map.getContainer().style.cursor = '';
        };
      }
    }, [enabled, map]);

    return null;
  }

  // Map instance ref
  function MapInstance() {
    const map = useMap();
    useEffect(() => {
      setMapInstance(map);
    }, [map]);
    return null;
  }

  const filteredMarkers = wildlifeRecords.filter((m) => {
    const normalizedStatus = normalizeStatus(m.status);
    const isIncluded = enabledStatuses.includes(normalizedStatus);
    // Show approved records OR records created by authenticated users (no approval needed)
    const isApproved = m.approval_status === 'approved' || m.user_id !== null;
    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`Marker ${m.id}: status="${m.status}" -> normalized="${normalizedStatus}" -> included=${isIncluded}, approved=${isApproved}`);
      console.log('Enabled statuses:', enabledStatuses);
      console.log('Total wildlife records:', wildlifeRecords.length);
    }
    return isIncluded && isApproved;
  });

  // Debug: Add test markers if no real data - REMOVED TO PREVENT RANDOM PINS
  const testMarkers: any[] = []; // Disabled test markers
  
  // Add a test marker to verify coordinate system (temporary debugging)
  const debugTestMarker = {
    id: 'debug-test',
    species_name: 'Test Marker',
    status: 'reported' as const,
    latitude: 8.371964645263802, // Manolo Fortich center
    longitude: 124.85604137091526,
    barangay: 'Test Barangay',
    municipality: 'Manolo Fortich',
    reporter_name: 'Debug User',
    contact_number: '000-000-0000',
    photo_url: undefined,
    timestamp_captured: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'debug'
  };
  
  // Uncomment the line below to enable debug test marker
  // testMarkers.push(debugTestMarker);

  const allMarkers = [...wildlifeRecords, ...testMarkers];
  const finalFilteredMarkers = allMarkers.filter((m) => {
    const normalizedStatus = normalizeStatus(m.status);
    const isIncluded = enabledStatuses.includes(normalizedStatus);
    // Show approved records OR records created by authenticated users (no approval needed)
    const isApproved = m.approval_status === 'approved' || m.user_id !== null;
    return isIncluded && isApproved;
  });
  const editingMarker = editingMarkerId != null ? wildlifeRecords.find((m) => m.id === editingMarkerId) || null : null;

  if (loading && !hasLoadedRecords) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading wildlife records...
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ height: "100%", width: "100%", position: "relative" }}>
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
            if (Array.isArray(val)) {
              setEnabledStatuses(val);
            }
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

      {/* Map control buttons */}
      <Box sx={{ position: "absolute", top: 90, left: 10, zIndex: 1000, display: "flex", flexDirection: "column", gap: 1 }}>
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
          
          <Tooltip title="Refresh map data" enterDelay={500}>
            <IconButton
              color="default"
              size="small"
              onClick={refreshMapData}
              disabled={fetchingModal.open}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
      </Box>

      {error && (
        <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1302, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Alert severity="error" sx={{ mr: 1 }}>{error}</Alert>
          <Button variant="outlined" size="small" onClick={() => { setError(null); setHasLoadedRecords(false); setReloadKey((k) => k + 1); }}>
            Retry
          </Button>
        </Box>
      )}

      <MapContainer
        key={`map-${visibilityBump}`}
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
        maxBoundsViscosity={0.5}
        whenReady={() => { /* set in effect below */ }}
      >
        <TileLayer url={tileUrls[skin]} attribution={attributions[skin]} />
        <ResizeHandler />
        <MapBoundsController />
        <BoundaryGuide />
        <MapInstance />
        <AddMarkerOnClick enabled={isAddingMarker && role === 'enforcement'} />
        <RelocateMarkerOnClick enabled={!!relocatingMarkerId} markerId={relocatingMarkerId} />

        {/* Pending marker with photo upload */}
        {pendingMarker && (
          <Marker
            key={"pending"}
            position={pendingMarker.pos as [number, number]}
            icon={createStatusIcon(pendingMarker.status)}
            eventHandlers={{ add: (e: any) => e.target.openPopup() }}
          >
            <Popup className="themed-popup" autoPan autoPanPadding={[16,16]}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 260 }}>
                <strong>Add marker here</strong>
                {pendingWarning && (
                  <Alert severity="warning" sx={{ my: 0.5 }}>
                    {pendingWarning}
                  </Alert>
                )}
                <TextField
                  placeholder="Species name"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={pendingMarker.speciesName}
                  onChange={(e) =>
                    setPendingMarker((p) => {
                      const next = p ? { ...p, speciesName: e.target.value } : p;
                      if (next && isPendingComplete(next)) setPendingWarning(null);
                      return next as PendingMarker;
                    })
                  }
                  required
                  error={Boolean(pendingWarning) && !(pendingMarker.speciesName || '').trim()}
                  inputRef={(el) => { pendingSpeciesRef.current = el; }}
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
                          onClick={() =>
                            setPendingMarker((p) => (p ? { ...p, speciesName: opt.label } : p))
                          }
                        >
                          <Box sx={{ fontSize: 14 }}>{opt.label}</Box>
                          {opt.common && <Box sx={{ fontSize: 12, opacity: 0.7 }}>{opt.common}</Box>}
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
                  <MenuItem value="released">Released</MenuItem>
                </TextField>

                {/* Reporter details */}
                <TextField
                  placeholder="Name of who sighted"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={pendingMarker.reporterName || ""}
                  onChange={(e) => setPendingMarker((p) => {
                    const next = p ? { ...p, reporterName: e.target.value } : p;
                    if (next && isPendingComplete(next)) setPendingWarning(null);
                    return next as PendingMarker;
                  })}
                  required
                  error={Boolean(pendingWarning) && !(pendingMarker.reporterName || '').trim()}
                  inputRef={(el) => { pendingReporterRef.current = el; }}
                />
                <TextField
                  placeholder="Contact number"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={pendingMarker.contactNumber || ""}
                  onChange={(e) => setPendingMarker((p) => {
                    const next = p ? { ...p, contactNumber: e.target.value } : p;
                    if (next && isPendingComplete(next)) setPendingWarning(null);
                    return next as PendingMarker;
                  })}
                  required
                  error={Boolean(pendingWarning) && !(pendingMarker.contactNumber || '').trim()}
                  inputRef={(el) => { pendingContactRef.current = el; }}
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
                        if (!isPendingComplete(pendingMarker)) {
                          setPendingWarning('Please provide Species, Reporter Name, and Contact number before confirming.');
                          // Focus the first missing field for convenience
                          const missing = [
                            { ok: Boolean((pendingMarker?.speciesName || '').trim()), ref: pendingSpeciesRef },
                            { ok: Boolean((pendingMarker?.reporterName || '').trim()), ref: pendingReporterRef },
                            { ok: Boolean((pendingMarker?.contactNumber || '').trim()), ref: pendingContactRef },
                          ];
                          const firstMissing = missing.find((m) => !m.ok)?.ref?.current;
                          try { firstMissing?.focus(); } catch {}
                          return;
                        }
                        handleAddMarker();
                      }}
                    // Keep button enabled to allow warning popup UX, but gate in handler
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
            position={[editingMarker.latitude, editingMarker.longitude]}
            icon={createStatusIcon(editingMarker.status)}
            ref={(ref) => { if (ref) markerRefs.current[editingMarker.id] = ref; }}
          >
            <Popup className="themed-popup">
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 240 }}>
                <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125 }}>Species name</Box>
                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  size="small"
                  value={editDrafts[editingMarker.id]?.species_name || editingMarker.species_name}
                  onChange={(e) =>
                    setEditDrafts((prev) => ({
                      ...prev,
                      [editingMarker.id]: { ...(prev[editingMarker.id] || {}), species_name: e.target.value, status: prev[editingMarker.id]?.status ?? editingMarker.status, photo_url: prev[editingMarker.id]?.photo_url ?? editingMarker.photo_url, barangay: prev[editingMarker.id]?.barangay ?? editingMarker.barangay, municipality: prev[editingMarker.id]?.municipality ?? editingMarker.municipality },
                    }))
                  }
                  inputRef={(el) => { editInputRefs.current[editingMarker.id] = el; }}
                />
                <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125, mt: 0.125 }}>Status</Box>
                <TextField
                  select
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  size="small"
                  value={editDrafts[editingMarker.id]?.status || editingMarker.status}
                  onChange={(e) =>
                    setEditDrafts((prev) => ({
                      ...prev,
                      [editingMarker.id]: { ...(prev[editingMarker.id] || {}), status: String(e.target.value), species_name: prev[editingMarker.id]?.species_name ?? editingMarker.species_name, photo_url: prev[editingMarker.id]?.photo_url ?? editingMarker.photo_url, barangay: prev[editingMarker.id]?.barangay ?? editingMarker.barangay, municipality: prev[editingMarker.id]?.municipality ?? editingMarker.municipality },
                    }))
                  }
                >
                  <MenuItem value="reported">Reported</MenuItem>
                  <MenuItem value="rescued">Rescued</MenuItem>
                  <MenuItem value="turned over">Turned over</MenuItem>
                  <MenuItem value="released">Released</MenuItem>
                </TextField>
                <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125, mt: 0.125 }}>Barangay</Box>
                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  size="small"
                  value={editDrafts[editingMarker.id]?.barangay || editingMarker.barangay || ''}
                  onChange={(e) =>
                    setEditDrafts((prev) => ({
                      ...prev,
                      [editingMarker.id]: { ...(prev[editingMarker.id] || {}), barangay: e.target.value, species_name: prev[editingMarker.id]?.species_name ?? editingMarker.species_name, status: prev[editingMarker.id]?.status ?? editingMarker.status, photo_url: prev[editingMarker.id]?.photo_url ?? editingMarker.photo_url, municipality: prev[editingMarker.id]?.municipality ?? editingMarker.municipality },
                    }))
                  }
                />
                <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125, mt: 0.125 }}>Municipality</Box>
                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  size="small"
                  value={editDrafts[editingMarker.id]?.municipality || editingMarker.municipality || ''}
                  onChange={(e) =>
                    setEditDrafts((prev) => ({
                      ...prev,
                      [editingMarker.id]: { ...(prev[editingMarker.id] || {}), municipality: e.target.value, species_name: prev[editingMarker.id]?.species_name ?? editingMarker.species_name, status: prev[editingMarker.id]?.status ?? editingMarker.status, photo_url: prev[editingMarker.id]?.photo_url ?? editingMarker.photo_url, barangay: prev[editingMarker.id]?.barangay ?? editingMarker.barangay },
                    }))
                  }
                />
                <Box>
                  {editingMarker.timestamp_captured ? (<div>DateTime: {new Date(editingMarker.timestamp_captured).toLocaleString()}</div>) : null}
                  <div>Latitude: {editingMarker.latitude.toFixed(5)}</div>
                  <div>Longitude: {editingMarker.longitude.toFixed(5)}</div>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => {
                          const d = editDrafts[editingMarker.id] || {};
                          if (!d.species_name || !d.status) return;
                          handleUpdateMarker(editingMarker.id);
                        }}
                      >
                        Save
                      </Button>
                      <Button variant="outlined" size="small" onClick={() => setEditingMarkerId(null)}>Cancel</Button>
                    </Box>
              </Box>
            </Popup>
          </Marker>
        )}

        {/* When relocating, render that marker outside the cluster */}
        {relocatingMarkerId && (() => {
          const relocatingMarker = finalFilteredMarkers.find(m => m.id === relocatingMarkerId);
          return relocatingMarker ? (
            <Marker
              key={`relocating-${relocatingMarker.id}`}
              position={[relocatingMarker.latitude, relocatingMarker.longitude]}
              icon={createStatusIcon(relocatingMarker.status)}
              ref={(ref) => { if (ref) markerRefs.current[relocatingMarker.id] = ref; }}
            >
              <Popup className="themed-popup">
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 240 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'warning.main' }}>
                    Relocating: {relocatingMarker.species_name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Click anywhere on the map to move this pin to the new location.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setRelocatingMarkerId(null)}
                    sx={{ mt: 1 }}
                  >
                    Cancel Relocation
                  </Button>
                </Box>
              </Popup>
            </Marker>
          ) : null;
        })()}

        {/* Saved user markers */}
        {finalFilteredMarkers.filter((m) => m.id !== editingMarkerId && m.id !== relocatingMarkerId).length > 0 && (
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={(cluster: any) => {
              const count = cluster.getChildCount();
              const html = `<div style="
                background:#ff9800; /* orange */
                color:#fff;
                border-radius:50%;
                width:32px;height:32px;
                display:flex;align-items:center;justify-content:center;
                border:2px solid #fff;
                box-shadow:0 0 0 2px rgba(0,0,0,0.3);
                font-weight:600;
              ">${count}</div>`;
              return L.divIcon({ html, className: "cluster-icon", iconSize: [32, 32] });
            }}
          >
            {finalFilteredMarkers.filter((m) => m.id !== editingMarkerId).map((m) => {
              console.log(`Marker ${m.id} coordinates:`, { lat: m.latitude, lng: m.longitude });
              console.log(`Marker ${m.id} position array:`, [m.latitude, m.longitude]);
              return (
              <Marker
                key={m.id}
                position={[m.latitude, m.longitude]}
                icon={createStatusIcon(m.status)}
                ref={(ref) => { markerRefs.current[m.id] = ref; }}
              >
              <Popup className="themed-popup">
                {editingMarkerId === m.id ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 240 }}>
                    <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125 }}>Species name</Box>
                    <TextField
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      size="small"
                      value={editDrafts[m.id]?.species_name ?? m.species_name}
                      onChange={(e) =>
                        setEditDrafts((prev) => ({
                          ...prev,
                          [m.id]: {
                            ...prev[m.id],
                            species_name: e.target.value,
                            status: prev[m.id]?.status ?? m.status,
                            photo_url: prev[m.id]?.photo_url ?? m.photo_url,
                      },
                    }))
                  }
                      inputRef={(el) => { editInputRefs.current[m.id] = el; }}
                />
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
                            species_name: prev[m.id]?.species_name ?? m.species_name,
                            status: e.target.value,
                            photo_url: prev[m.id]?.photo_url ?? m.photo_url,
                      },
                    }))
                  }
                >
                  <MenuItem value="reported">Reported</MenuItem>
                  <MenuItem value="rescued">Rescued</MenuItem>
                  <MenuItem value="turned over">Turned over</MenuItem>
                  <MenuItem value="released">Released</MenuItem>
                </TextField>

                {/* Reporter details (editable) */}
                <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125, mt: 0.125 }}>Name of who sighted</Box>
                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  size="small"
                      value={editDrafts[m.id]?.reporter_name ?? m.reporter_name ?? ""}
                  onChange={(e) =>
                    setEditDrafts((prev) => ({
                      ...prev,
                          [m.id]: {
                            ...prev[m.id],
                            reporter_name: e.target.value,
                            species_name: prev[m.id]?.species_name ?? m.species_name,
                            status: prev[m.id]?.status ?? m.status,
                            photo_url: prev[m.id]?.photo_url ?? m.photo_url,
                            contact_number: prev[m.id]?.contact_number ?? m.contact_number,
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
                      value={editDrafts[m.id]?.contact_number ?? m.contact_number ?? ""}
                  onChange={(e) =>
                    setEditDrafts((prev) => ({
                      ...prev,
                          [m.id]: {
                            ...prev[m.id],
                            contact_number: e.target.value,
                            species_name: prev[m.id]?.species_name ?? m.species_name,
                            status: prev[m.id]?.status ?? m.status,
                            photo_url: prev[m.id]?.photo_url ?? m.photo_url,
                            reporter_name: prev[m.id]?.reporter_name ?? m.reporter_name,
                      },
                    }))
                  }
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
                                  photo_url: url,
                            },
                          }));
                        }
                      }}
                    />
                  </Button>
                       {editDrafts[m.id]?.photo_url && (
                    <Box sx={{ mt: 1 }}>
                           <img src={editDrafts[m.id]?.photo_url ?? undefined} alt="preview" style={{ width: "100%", borderRadius: 8 }} />
                          <Button size="small" onClick={() => setEditDrafts((prev) => ({ ...prev, [m.id]: { ...prev[m.id], photo_url: null } }))}>Remove</Button>
                    </Box>
                  )}
                </Box>

                    <Box sx={{ display: "flex", gap: 1 }}>
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
                          handleUpdateMarker(m.id);
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
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <div><strong>{m.species_name}</strong></div>
                    <div>Status: {m.status}</div>
                    {m.photo_url && <img src={m.photo_url} alt="marker" style={{ width: "100%", borderRadius: 8 }} />}
                    <div>Date & Time Captured: {new Date(m.timestamp_captured).toLocaleString()}</div>
                    <div>Latitude: {m.latitude.toFixed(5)}</div>
                    <div>Longitude: {m.longitude.toFixed(5)}</div>
                    <div>Barangay: {m.barangay || "N/A"}</div>
                    <div>Municipality: {m.municipality || "N/A"}</div>
                    {m.reporter_name ? <div>Reported by: {m.reporter_name}</div> : null}
                    {m.contact_number ? <div>Contact: {m.contact_number}</div> : null}
                      <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            try { e.preventDefault(); e.stopPropagation(); } catch {}
                            setEditDrafts((prev) => ({
                              ...prev,
                            [m.id]: {
                              species_name: m.species_name,
                              status: m.status,
                              photo_url: m.photo_url ?? null,
                              barangay: m.barangay ?? null,
                              municipality: m.municipality ?? null,
                              },
                            }));
                          setEditingMarkerId(m.id);
                            setTimeout(() => {
                            try { markerRefs.current[m.id]?.openPopup?.(); } catch {}
                            const el = editInputRefs.current[m.id];
                              if (el) { try { el.focus(); } catch {} }
                            }, 0);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="secondary"
                          onClick={(e) => {
                            try { e.preventDefault(); e.stopPropagation(); } catch {}
                            setRelocatingMarkerId(m.id);
                            // Close the popup to allow clicking on map
                            try { markerRefs.current[m.id]?.closePopup?.(); } catch {}
                          }}
                        >
                          Relocate Pin
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                        onClick={(e) => {
                            try { e.preventDefault(); e.stopPropagation(); } catch {}
                          handleDeleteMarker(m.id);
                          }}
                        >
                          Delete
                        </Button>
                      </Box>
                  </Box>
                )}
              </Popup>
            </Marker>
            );
            })}
        </MarkerClusterGroup>
        )}
      </MapContainer>
      
      {/* Success Modal */}
      <SuccessModal
        open={successModal.open}
        onClose={() => setSuccessModal(prev => ({ ...prev, open: false }))}
        title={successModal.title}
        message={successModal.message}
      />
      
      {/* Fetching Modal */}
      <FetchingModal
        open={fetchingModal.open}
        title={fetchingModal.title}
        message={fetchingModal.message}
      />

      {/* Relocation Mode Indicator */}
      {relocatingMarkerId && (
        <Box
          sx={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            px: 2,
            py: 1,
            borderRadius: 1,
            boxShadow: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Click on the map to relocate the pin (cursor changed to location icon)
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            onClick={() => setRelocatingMarkerId(null)}
            sx={{ 
              color: 'inherit',
              borderColor: 'currentColor',
              '&:hover': {
                borderColor: 'currentColor',
                bgcolor: 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Cancel
          </Button>
        </Box>
      )}
      
    </Box>
  );
}
