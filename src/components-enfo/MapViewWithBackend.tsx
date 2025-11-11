import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, GeoJSON, Polyline } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Box, Button, TextField, Alert, CircularProgress, Typography, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Chip, Tooltip, IconButton, ToggleButtonGroup, ToggleButton } from '@mui/material';
import SuccessModal from './SuccessModal';
import FetchingModal from './FetchingModal';
import { alpha } from '@mui/material/styles';
import AddLocationAltOutlinedIcon from '@mui/icons-material/AddLocationAltOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
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

function formatStatusLabel(status: string | undefined): string {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case "released":
      return "Released";
    case "turned over":
      return "Turned Over";
    case "reported":
      return "Reported";
    case "rescued":
      return "Rescued";
    default:
      return String(status || "");
  }
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
  phoneNumber: string;
  countryCode: string;
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

  // Transparent labels/reference overlays (to show city/place names on satellite)
  const labelUrls = {
    esriWorldBoundariesAndPlaces:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    esriWorldTransportation:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
  } as const;

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
  'released': '#4caf50', // Green
  'dispersed': '#ff9800' // Orange
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
  const [dispersingMarkerId, setDispersingMarkerId] = useState<string | null>(null);
  const [originalLocation, setOriginalLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [relocationOriginalLocation, setRelocationOriginalLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dispersalTraces, setDispersalTraces] = useState<Array<{
    id: string;
    originalLat: number;
    originalLng: number;
    originalBarangay?: string;
    dispersedLat: number;
    dispersedLng: number;
    dispersedBarangay?: string;
    speciesName: string;
  }>>(() => {
    // Load dispersal traces from localStorage on component mount
    try {
      const saved = localStorage.getItem('wildlife-dispersal-traces');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [role, setRole] = useState<string | null>(null);
  const [editSpeciesOptions, setEditSpeciesOptions] = useState<Array<{ label: string; common?: string }>>([]);
  const [editSpeciesLoading, setEditSpeciesLoading] = useState(false);
  const [showEditSpeciesDropdown, setShowEditSpeciesDropdown] = useState(false);
  const [speciesSelectedFromDropdown, setSpeciesSelectedFromDropdown] = useState(false);
  const [hasLoadedRecords, setHasLoadedRecords] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Save dispersal traces to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('wildlife-dispersal-traces', JSON.stringify(dispersalTraces));
    } catch (error) {
      console.error('Failed to save dispersal traces to localStorage:', error);
    }
  }, [dispersalTraces]);
  const [visibilityBump, setVisibilityBump] = useState(0);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [pendingWarning, setPendingWarning] = useState<string | null>(null);

  const isPendingComplete = (pm: PendingMarker | null): boolean => {
    if (!pm) return false;
    const hasSpecies = Boolean(pm.speciesName && pm.speciesName.trim());
    const hasReporter = Boolean(pm.reporterName && pm.reporterName.trim());
    const hasContact = Boolean(pm.phoneNumber && pm.phoneNumber.trim());
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
  const ALL_STATUSES = ["reported", "rescued", "turned over", "released", "dispersed"] as const;
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
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
  
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

  // Load initial species suggestions when component mounts
  useEffect(() => {
    const loadInitialSpecies = async () => {
      setSpeciesLoading(true);
      try {
        // Load popular wildlife species for the Philippines
        const url = `https://api.inaturalist.org/v1/taxa/autocomplete?q=wildlife&per_page=12`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (res.ok) {
          const data = await res.json();
          const options = (data?.results || [])
            .map((r: any) => ({ label: r?.name || "", common: r?.preferred_common_name || undefined }))
            .filter((o: any) => o.label);
          setSpeciesOptions(options);
          setShowSpeciesDropdown(true);
        }
      } catch (error) {
        console.log('Failed to load initial species suggestions:', error);
      } finally {
        setSpeciesLoading(false);
      }
    };

    // Load initial suggestions after a short delay to ensure component is ready
    const timer = setTimeout(loadInitialSpecies, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Species autocomplete
  useEffect(() => {
    const query = pendingMarker?.speciesName?.trim() || "";
    if (!pendingMarker || query.length < 2) {
      setSpeciesOptions([]);
      setSpeciesLoading(false);
      setShowSpeciesDropdown(false);
      return;
    }
    setSpeciesLoading(true);
    setShowSpeciesDropdown(true);
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

  // Species autocomplete for edit mode
  useEffect(() => {
    const currentDraft = editingMarkerId ? editDrafts[editingMarkerId] : null;
    const query = currentDraft?.species_name?.trim() || "";
    
    // Don't search if species was selected from dropdown
    if (speciesSelectedFromDropdown) {
      return;
    }
    
    if (!editingMarkerId || query.length < 2) {
      setEditSpeciesOptions([]);
      setEditSpeciesLoading(false);
      setShowEditSpeciesDropdown(false);
      return;
    }
    // Ensure dropdown becomes visible again once user types >= 2 chars
    if (!showEditSpeciesDropdown) {
      setShowEditSpeciesDropdown(true);
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
        // ignore errors
      } finally {
        setEditSpeciesLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [editDrafts, editingMarkerId, showEditSpeciesDropdown, speciesSelectedFromDropdown]);

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

  // Get barangay and municipality from coordinates using reverse geocoding API
  const getLocationFromCoordinates = async (lat: number, lng: number) => {
    try {
      console.log('Reverse geocoding coordinates:', { lat, lng });
      
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      console.log('Reverse geocoding response:', data);
      
      if (data && data.address) {
        const address = data.address;
        
        // Extract barangay from various address fields
        let extractedBarangay = '';
        
        if (address.suburb) {
          extractedBarangay = address.suburb;
        } else if (address.village) {
          extractedBarangay = address.village;
        } else if (address.hamlet) {
          extractedBarangay = address.hamlet;
        } else if (address.neighbourhood) {
          extractedBarangay = address.neighbourhood;
        } else if (address.quarter) {
          extractedBarangay = address.quarter;
        }
        
        // Extract municipality from various address fields
        let extractedMunicipality = '';
        
        if (address.town) {
          extractedMunicipality = address.town;
        } else if (address.city) {
          extractedMunicipality = address.city;
        } else if (address.municipality) {
          extractedMunicipality = address.municipality;
        } else if (address.county) {
          extractedMunicipality = address.county;
        }
        
        // Check if we found a barangay and match it to our predefined list
        if (extractedBarangay) {
          const predefinedBarangays = [
            // Manolo Fortich barangays
            'Agusan Canyon', 'Alae', 'Dahilayan', 'Dalirig', 'Damilag', 'Diclum',
            'Guilang-guilang', 'Kalugmanan', 'Lindaban', 'Lingion', 'Lunocan',
            'Maluko', 'Mambatangan', 'Mampayag', 'Minsuro', 'Mantibugao',
            'Tankulan (Pob.)', 'San Miguel', 'Sankanan', 'Santiago', 'Santo Niño', 'Ticala',
            // Malitbog barangays
            'Kalingking', 'Kiabo', 'Mindagat', 'Omagling', 'Patpat', 'Poblacion',
            'Sampiano', 'San Luis', 'Santa Ines', 'Silo-o', 'Sumalsag',
            // Sumilao barangays
            'Culasi', 'Kisolon', 'Licoan', 'Lupiagan', 'Ocasion', 'Puntian',
            'San Roque', 'San Vicente', 'Poblacion(Sumilao)', 'Vista Villa',
            // Impasugong barangays
            'Bontongon', 'Bulonay', 'Capitan Bayong', 'Cawayan', 'Dumalaguing', 'Guihean',
            'Hagpa', 'Impalutao', 'Kalabugao', 'Kibenton', 'La Fortuna', 'Poblacion(Impasugong)', 'Sayawan'
          ];
          
          // Try exact match first
          let matchedBarangay = predefinedBarangays.find(barangay => 
            barangay.toLowerCase() === extractedBarangay.toLowerCase()
          );
          
          // If no exact match, try partial matching
          if (!matchedBarangay) {
            matchedBarangay = predefinedBarangays.find(barangay => 
              barangay.toLowerCase().includes(extractedBarangay.toLowerCase()) ||
              extractedBarangay.toLowerCase().includes(barangay.toLowerCase()) ||
              barangay.toLowerCase().replace(/\s+/g, '').includes(extractedBarangay.toLowerCase().replace(/\s+/g, ''))
            );
          }
          
          if (matchedBarangay) {
            // Determine municipality based on barangay
            let municipality = '';
            if (['Agusan Canyon', 'Alae', 'Dahilayan', 'Dalirig', 'Damilag', 'Diclum',
                'Guilang-guilang', 'Kalugmanan', 'Lindaban', 'Lingion', 'Lunocan',
                'Maluko', 'Mambatangan', 'Mampayag', 'Minsuro', 'Mantibugao',
                'Tankulan (Pob.)', 'San Miguel', 'Sankanan', 'Santiago', 'Santo Niño', 'Ticala'].includes(matchedBarangay)) {
              municipality = 'Manolo Fortich';
            } else if (['Kalingking', 'Kiabo', 'Mindagat', 'Omagling', 'Patpat', 'Poblacion',
                       'Sampiano', 'San Luis', 'Santa Ines', 'Silo-o', 'Sumalsag'].includes(matchedBarangay)) {
              municipality = 'Malitbog';
            } else if (['Culasi', 'Kisolon', 'Licoan', 'Lupiagan', 'Ocasion', 'Puntian',
                       'San Roque', 'San Vicente', 'Poblacion(Sumilao)', 'Vista Villa'].includes(matchedBarangay)) {
              municipality = 'Sumilao';
            } else if (['Bontongon', 'Bulonay', 'Capitan Bayong', 'Cawayan', 'Dumalaguing', 'Guihean',
                       'Hagpa', 'Impalutao', 'Kalabugao', 'Kibenton', 'La Fortuna', 'Poblacion(Impasugong)', 'Sayawan'].includes(matchedBarangay)) {
              municipality = 'Impasugong';
            }
            
            console.log(`Matched barangay: ${matchedBarangay}, municipality: ${municipality} for coordinates ${lat}, ${lng}`);
            return { barangay: matchedBarangay, municipality };
          }
        }
        
        // If no match found, try to find the closest barangay based on distance
        const barangayCenters = [
          // Manolo Fortich barangays
          { name: 'Tankulan (Pob.)', lat: 8.356, lng: 124.864, municipality: 'Manolo Fortich' },
          { name: 'Agusan Canyon', lat: 8.45, lng: 124.85, municipality: 'Manolo Fortich' },
          { name: 'Alae', lat: 8.40, lng: 124.95, municipality: 'Manolo Fortich' },
          { name: 'Dahilayan', lat: 8.50, lng: 124.85, municipality: 'Manolo Fortich' },
          { name: 'Dalirig', lat: 8.30, lng: 124.90, municipality: 'Manolo Fortich' },
          { name: 'Damilag', lat: 8.35, lng: 124.75, municipality: 'Manolo Fortich' },
          { name: 'Diclum', lat: 8.35, lng: 125.00, municipality: 'Manolo Fortich' },
          { name: 'Guilang-guilang', lat: 8.45, lng: 124.90, municipality: 'Manolo Fortich' },
          { name: 'Kalugmanan', lat: 8.25, lng: 124.85, municipality: 'Manolo Fortich' },
          { name: 'Lindaban', lat: 8.35, lng: 124.65, municipality: 'Manolo Fortich' },
          { name: 'Lingion', lat: 8.30, lng: 125.00, municipality: 'Manolo Fortich' },
          { name: 'Lunocan', lat: 8.50, lng: 124.90, municipality: 'Manolo Fortich' },
          { name: 'Maluko', lat: 8.25, lng: 124.90, municipality: 'Manolo Fortich' },
          { name: 'Mambatangan', lat: 8.35, lng: 124.55, municipality: 'Manolo Fortich' },
          { name: 'Mampayag', lat: 8.30, lng: 125.05, municipality: 'Manolo Fortich' },
          { name: 'Minsuro', lat: 8.55, lng: 124.85, municipality: 'Manolo Fortich' },
          { name: 'Mantibugao', lat: 8.20, lng: 124.85, municipality: 'Manolo Fortich' },
          { name: 'San Miguel', lat: 8.35, lng: 124.45, municipality: 'Manolo Fortich' },
          { name: 'Sankanan', lat: 8.30, lng: 125.10, municipality: 'Manolo Fortich' },
          { name: 'Santiago', lat: 8.50, lng: 124.95, municipality: 'Manolo Fortich' },
          { name: 'Santo Niño', lat: 8.20, lng: 124.90, municipality: 'Manolo Fortich' },
          { name: 'Ticala', lat: 8.35, lng: 124.35, municipality: 'Manolo Fortich' },
          // Malitbog barangays
          { name: 'Kalingking', lat: 8.540000, lng: 124.880000, municipality: 'Malitbog' },
          { name: 'Kiabo', lat: 8.520000, lng: 124.860000, municipality: 'Malitbog' },
          { name: 'Mindagat', lat: 8.500000, lng: 124.900000, municipality: 'Malitbog' },
          { name: 'Omagling', lat: 8.480000, lng: 124.840000, municipality: 'Malitbog' },
          { name: 'Patpat', lat: 8.560000, lng: 124.920000, municipality: 'Malitbog' },
          { name: 'Poblacion', lat: 8.530000, lng: 124.870000, municipality: 'Malitbog' },
          { name: 'Sampiano', lat: 8.510000, lng: 124.850000, municipality: 'Malitbog' },
          { name: 'San Luis', lat: 8.490000, lng: 124.890000, municipality: 'Malitbog' },
          { name: 'Santa Ines', lat: 8.550000, lng: 124.910000, municipality: 'Malitbog' },
          { name: 'Silo-o', lat: 8.470000, lng: 124.830000, municipality: 'Malitbog' },
          { name: 'Sumalsag', lat: 8.525000, lng: 124.875000, municipality: 'Malitbog' },
          // Sumilao barangays
          { name: 'Culasi', lat: 8.300000, lng: 124.950000, municipality: 'Sumilao' },
          { name: 'Kisolon', lat: 8.320000, lng: 124.940000, municipality: 'Sumilao' },
          { name: 'Licoan', lat: 8.310000, lng: 124.930000, municipality: 'Sumilao' },
          { name: 'Lupiagan', lat: 8.290000, lng: 124.920000, municipality: 'Sumilao' },
          { name: 'Ocasion', lat: 8.280000, lng: 124.910000, municipality: 'Sumilao' },
          { name: 'Puntian', lat: 8.270000, lng: 124.900000, municipality: 'Sumilao' },
          { name: 'San Roque', lat: 8.260000, lng: 124.890000, municipality: 'Sumilao' },
          { name: 'San Vicente', lat: 8.250000, lng: 124.880000, municipality: 'Sumilao' },
          { name: 'Poblacion(Sumilao)', lat: 8.315000, lng: 124.945000, municipality: 'Sumilao' },
          { name: 'Vista Villa', lat: 8.330000, lng: 124.935000, municipality: 'Sumilao' },
          // Impasugong barangays
          { name: 'Bontongon', lat: 8.300000, lng: 125.000000, municipality: 'Impasugong' },
          { name: 'Bulonay', lat: 8.320000, lng: 125.020000, municipality: 'Impasugong' },
          { name: 'Capitan Bayong', lat: 8.280000, lng: 125.010000, municipality: 'Impasugong' },
          { name: 'Cawayan', lat: 8.350000, lng: 125.030000, municipality: 'Impasugong' },
          { name: 'Dumalaguing', lat: 8.250000, lng: 125.005000, municipality: 'Impasugong' },
          { name: 'Guihean', lat: 8.270000, lng: 125.015000, municipality: 'Impasugong' },
          { name: 'Hagpa', lat: 8.290000, lng: 125.025000, municipality: 'Impasugong' },
          { name: 'Impalutao', lat: 8.310000, lng: 125.035000, municipality: 'Impasugong' },
          { name: 'Kalabugao', lat: 8.330000, lng: 125.040000, municipality: 'Impasugong' },
          { name: 'Kibenton', lat: 8.260000, lng: 125.020000, municipality: 'Impasugong' },
          { name: 'La Fortuna', lat: 8.340000, lng: 125.045000, municipality: 'Impasugong' },
          { name: 'Poblacion(Impasugong)', lat: 8.315000, lng: 125.030000, municipality: 'Impasugong' },
          { name: 'Sayawan', lat: 8.275000, lng: 125.012000, municipality: 'Impasugong' }
        ];
        
        let closestBarangay = '';
        let closestMunicipality = '';
        let minDistance = Infinity;
        
        for (const barangay of barangayCenters) {
          const distance = Math.sqrt(Math.pow(lat - barangay.lat, 2) + Math.pow(lng - barangay.lng, 2));
          
          if (distance < minDistance) {
            minDistance = distance;
            closestBarangay = barangay.name;
            closestMunicipality = barangay.municipality;
          }
        }
        
        console.log(`Using closest barangay: ${closestBarangay}, municipality: ${closestMunicipality} (distance: ${minDistance})`);
        return { barangay: closestBarangay, municipality: closestMunicipality };
      }
      
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  };

  // Handle relocating marker
  const handleRelocateMarker = async (id: string, newLat: number, newLng: number) => {
    try {
      // Get the new barangay and municipality based on coordinates using reverse geocoding
      const locationData = await getLocationFromCoordinates(newLat, newLng);
      
      const updates = {
        latitude: newLat,
        longitude: newLng,
        barangay: locationData?.barangay || undefined,
        municipality: locationData?.municipality || undefined
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
        message: `Wildlife record location has been updated successfully.${locationData?.barangay ? ` New location: ${locationData.barangay}, ${locationData.municipality}` : ''}`,
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

  const handleUndispersed = async (dispersedRecordId: string) => {
    try {
      console.log('Starting undispersed for record:', dispersedRecordId);
      
      // Find the dispersal trace to get original location info
      const trace = dispersalTraces.find(t => t.id === dispersedRecordId);
      if (!trace) {
        throw new Error('Dispersal trace not found');
      }
      
      // Find the original marker
      const originalMarker = wildlifeRecords.find(m => 
        m.latitude === trace.originalLat && 
        m.longitude === trace.originalLng &&
        m.species_name === trace.speciesName
      );
      
      if (!originalMarker) {
        throw new Error('Original marker not found');
      }
      
      // Delete the dispersed record
      await deleteWildlifeRecord(dispersedRecordId);
      
      // Remove from dispersal traces
      setDispersalTraces(prev => prev.filter(t => t.id !== dispersedRecordId));
      
      // Refresh records
      try { triggerRecordsRefresh(); } catch {}
      
      // Show success modal
      setSuccessModal({
        open: true,
        title: 'Success!',
        message: `Dispersal has been undone. Wildlife record restored to original location.`,
      });
      
      // Refresh map data
      setTimeout(() => {
        refreshMapData();
      }, 1000);
      
    } catch (err) {
      console.error('Error undoing dispersal:', err);
      setError(err instanceof Error ? err.message : 'Failed to undo dispersal');
    }
  };

  const handleDispersalMarker = async (id: string, newLat: number, newLng: number) => {
    try {
      console.log('Starting dispersal for marker:', id, 'to coordinates:', { lat: newLat, lng: newLng });
      
      // Get the original marker data
      const originalMarker = wildlifeRecords.find(m => m.id === id);
      if (!originalMarker) {
        throw new Error('Original marker not found');
      }
      
      // Get the new barangay and municipality based on coordinates using reverse geocoding
      const locationData = await getLocationFromCoordinates(newLat, newLng);
      console.log('New location from coordinates:', locationData);
      
      // Create a new record for the dispersed location instead of updating the original
      const dispersedRecord = {
        species_name: originalMarker.species_name,
        status: 'released' as const,
        approval_status: 'approved' as const,
        latitude: newLat,
        longitude: newLng,
        barangay: locationData?.barangay || undefined,
        municipality: locationData?.municipality || originalMarker.municipality,
        reporter_name: originalMarker.reporter_name,
        contact_number: originalMarker.contact_number,
        photo_url: originalMarker.photo_url,
        has_exif_gps: originalMarker.has_exif_gps,
        timestamp_captured: new Date().toISOString()
        // Note: Dispersal tracking fields removed for now due to database schema limitations
      };
      
      console.log('Creating dispersed record:', dispersedRecord);
      const createdRecord = await createWildlifeRecord(dispersedRecord);
      console.log('Created dispersed record:', createdRecord);
      
      // Store dispersal trace information in state
      const traceInfo: {
        id: string;
        originalLat: number;
        originalLng: number;
        originalBarangay?: string;
        dispersedLat: number;
        dispersedLng: number;
        dispersedBarangay?: string;
        speciesName: string;
      } = {
        id: createdRecord.id,
        originalLat: originalMarker.latitude,
        originalLng: originalMarker.longitude,
        originalBarangay: originalMarker.barangay || undefined,
        dispersedLat: newLat,
        dispersedLng: newLng,
        dispersedBarangay: locationData?.barangay || undefined,
        speciesName: originalMarker.species_name
      };
      
      setDispersalTraces(prev => [...prev, traceInfo]);
      setDispersingMarkerId(null);
      setOriginalLocation(null);
      try { triggerRecordsRefresh(); } catch {}
      
      // Show success modal
      setSuccessModal({
        open: true,
        title: 'Success!',
        message: `Wildlife record has been dispersed to new location. Original location preserved with trace line.${locationData?.barangay ? ` New location: ${locationData.barangay}, ${locationData.municipality}` : ''}`,
      });
      
      // Refresh map data after successful creation
      setTimeout(() => {
        refreshMapData();
      }, 1000);
    } catch (err) {
      console.error('Error dispersing wildlife record:', err);
      
      // Check if it's a database constraint error
      if (err instanceof Error && err.message.includes('dispersed')) {
        setError('The "dispersed" status is not supported by the database. Please contact the administrator to add this status.');
      } else if (err instanceof Error && err.message.includes('constraint')) {
        setError('Database constraint error. The dispersed status may not be allowed.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to disperse wildlife record');
      }
      
      // Reset dispersal state on error
      setDispersingMarkerId(null);
      setOriginalLocation(null);
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
          phoneNumber: "",
          countryCode: "+63",
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
      },
      mousemove(e) {
        if (!enabled) return;
        const lat = Number(e.latlng.lat);
        const lng = Number(e.latlng.lng);
        setCursorPosition({ lat, lng });
      },
      mouseout() {
        if (enabled) {
          setCursorPosition(null);
        }
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

  function DispersalMarkerOnClick({ enabled, markerId }: { enabled: boolean; markerId: string | null }) {
    const map = useMap();
    
    useMapEvents({
      click(e) {
        if (!enabled || !markerId) return;
        const lat = Number(e.latlng.lat);
        const lng = Number(e.latlng.lng);
        handleDispersalMarker(markerId, lat, lng);
      },
      mousemove(e) {
        if (!enabled) return;
        const lat = Number(e.latlng.lat);
        const lng = Number(e.latlng.lng);
        setCursorPosition({ lat, lng });
      },
      mouseout() {
        if (enabled) {
          setCursorPosition(null);
        }
      }
    });

    // Change cursor when in dispersal mode
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
    const showAllBecauseReported = enabledStatuses.includes('reported');
    const isIncluded = showAllBecauseReported || enabledStatuses.includes(normalizedStatus);
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
    const showAllBecauseReported = enabledStatuses.includes('reported');
    const isIncluded = showAllBecauseReported || enabledStatuses.includes(normalizedStatus);
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
      <Box sx={{ position: 'absolute', top: 10, left: 10, zIndex: 1100, width: 320 }}>
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
              sx: { 
                bgcolor: 'background.paper',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                },
                '&.Mui-focused': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                }
              },
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

      {/* Enhanced Status Filter */}
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        right: 10, 
        zIndex: 1500,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: { xs: 'calc(100vw - 20px)', sm: 'auto' },
        width: { xs: 'calc(100vw - 20px)', sm: 'auto' }
      }}>
        {/* Status Filter Buttons */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          gap: { xs: 0.5, sm: 1 },
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
            {[
              { 
                value: 'reported', 
                label: 'Reported', 
                color: '#e53935',
                icon: '🗒️',
                count: wildlifeRecords.filter(r => (r.approval_status === 'approved' || r.user_id !== null)).length
              },
              { 
                value: 'rescued', 
                label: 'Rescued', 
                color: '#1e88e5',
                icon: '🤝',
                count: wildlifeRecords.filter(r => normalizeStatus(r.status) === 'rescued' && (r.approval_status === 'approved' || r.user_id !== null)).length
              },
              { 
                value: 'turned over', 
                label: 'Turned Over', 
                color: '#fdd835',
                icon: '🔄',
                count: wildlifeRecords.filter(r => normalizeStatus(r.status) === 'turned over' && (r.approval_status === 'approved' || r.user_id !== null)).length
              },
              { 
                value: 'released', 
                label: 'Released', 
                color: '#43a047',
                icon: '🌀',
                count: wildlifeRecords.filter(r => normalizeStatus(r.status) === 'released' && (r.approval_status === 'approved' || r.user_id !== null)).length
              },
            ].map((status) => {
              const isSelected = enabledStatuses.includes(status.value);
              return (
                <Tooltip 
                  key={status.value}
                  title={isSelected ? `Hide ${status.label} records` : `Show ${status.label} records`} 
                  enterDelay={500}
                  PopperProps={{
                    style: { zIndex: 1500 }
                  }}
                >
                  <Button
                    variant={isSelected ? "contained" : "outlined"}
                    color="inherit"
                    size="small"
                    onClick={() => {
                      if (isSelected) {
                        setEnabledStatuses(prev => prev.filter(s => s !== status.value));
                      } else {
                        setEnabledStatuses(prev => [...prev, status.value]);
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
                      },
                      backgroundColor: isSelected ? status.color : 'rgba(255, 255, 255, 0.8)',
                      color: isSelected ? 'white' : status.color,
                      backdropFilter: 'blur(5px)'
                    }}
                  >
                    <Typography sx={{ fontSize: '1.1rem' }}>{status.icon}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          fontSize: '0.875rem'
                        }}
                      >
                        {status.label}
                      </Typography>
                      <Chip
                        label={status.count}
                        size="small"
                        sx={{
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.9)' : alpha(status.color, 0.2),
                          color: isSelected ? status.color : status.color,
                          fontWeight: 600,
                          minWidth: 20,
                          height: 20,
                          fontSize: '0.7rem',
                          transition: 'all 0.2s ease-in-out',
                          border: `1px solid ${isSelected ? status.color : 'transparent'}`,
                          '& .MuiChip-label': {
                            px: 0.5
                          }
                        }}
                      />
                    </Box>
                  </Button>
                </Tooltip>
              );
            })}
        </Box>
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
          max-height: 280px;
          overflow: auto;
          margin: 13px 19px; /* keep Leaflet default spacing */
        }
        .themed-popup .leaflet-popup-content-wrapper {
          max-width: 320px; /* avoid overly wide popups at low zoom */
        }
        
        /* Auto-adjust popup position to prevent overflow at map edges */
        .themed-popup {
          position: absolute;
        }
        
        .themed-popup .leaflet-popup-content-wrapper {
          max-width: min(90vw, 400px); /* Responsive width */
        }
        
        /* Ensure popup always stays within viewport */
        .leaflet-popup-container {
          max-width: 100vw;
        }
        
        .themed-popup .leaflet-popup-content img {
          max-width: 100%;
          height: auto;
          object-fit: contain;
        }
        
        /* Lock popup size when editing to prevent resizing */
        .themed-popup.lock-size .leaflet-popup-content-wrapper {
          width: auto !important;
          max-width: min(90vw, 400px) !important;
        }
        
      `}</style>

      {/* Map control buttons */}
      <Box sx={{ position: "absolute", top: 60, left: 10, zIndex: 1000, display: "flex", flexDirection: "column", gap: 1 }}>
          <Tooltip title={isAddingMarker ? "Click map to add a marker" : "Enable add-marker mode"} enterDelay={500}>
          <Button
            variant={isAddingMarker ? "contained" : "outlined"}
            color={isAddingMarker ? "primary" : "inherit"}
              size="small"
              onClick={() => { if (role === 'enforcement') setIsAddingMarker((v) => !v); }}
              disabled={role !== 'enforcement'}
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
          
          <Tooltip title="Refresh map data" enterDelay={500}>
          <Button
            variant="outlined"
            color="inherit"
              size="small"
              onClick={refreshMapData}
              disabled={fetchingModal.open}
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
            <RefreshIcon sx={{ fontSize: 18 }} />
            Refresh
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
        zoomControl={false}
        scrollWheelZoom={true}
        minZoom={12}
        maxZoom={18}
        maxBoundsViscosity={0.5}
        whenReady={() => { /* set in effect below */ }}
      >
        <TileLayer url={tileUrls[skin]} attribution={attributions[skin]} />
        {/* Add labels overlay on top of satellite imagery */}
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
        <MapInstance />
        <AddMarkerOnClick enabled={isAddingMarker && role === 'enforcement'} />
        <RelocateMarkerOnClick enabled={!!relocatingMarkerId} markerId={relocatingMarkerId} />
        <DispersalMarkerOnClick enabled={!!dispersingMarkerId} markerId={dispersingMarkerId} />

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
                  onFocus={() => {
                    if (speciesOptions.length > 0) {
                      setShowSpeciesDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow click on dropdown items
                    setTimeout(() => setShowSpeciesDropdown(false), 200);
                  }}
                  required
                  error={Boolean(pendingWarning) && !(pendingMarker.speciesName || '').trim()}
                  inputRef={(el) => { pendingSpeciesRef.current = el; }}
                />
                {showSpeciesDropdown && (
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
                              setShowSpeciesDropdown(false);
                            }}
                          >
                            {opt.common && <Box sx={{ fontSize: 14, fontWeight: 'bold' }}>{opt.common}</Box>}
                            <Box sx={{ fontSize: 12, fontStyle: 'italic', opacity: 0.7 }}>{opt.label}</Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                )}
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
                  placeholder="Phone number"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={pendingMarker.phoneNumber || ""}
                  onChange={(e) => {
                    const phoneNumber = e.target.value;
                    const countryCode = pendingMarker.countryCode || '+63';
                    const fullNumber = countryCode + phoneNumber;
                    setPendingMarker((p) => {
                      const next = p ? { ...p, phoneNumber, contactNumber: fullNumber } : p;
                    if (next && isPendingComplete(next)) setPendingWarning(null);
                    return next as PendingMarker;
                    });
                  }}
                  required
                  error={Boolean(pendingWarning) && !(pendingMarker.phoneNumber || '').trim()}
                  inputRef={(el) => { pendingContactRef.current = el; }}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value={pendingMarker.countryCode || '+63'}
                            onChange={(e) => setPendingMarker((p) => p ? { ...p, countryCode: e.target.value } : p)}
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
                            { ok: Boolean((pendingMarker?.phoneNumber || '').trim()), ref: pendingContactRef },
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
            <Popup className="themed-popup" autoPan autoPanPadding={[50, 50]}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 240 }}>
                <Box sx={{ fontSize: 12, color: 'text.secondary', mb: 0.125 }}>Species name</Box>
                <Box>
                <TextField
                  variant="outlined"
                  margin="dense"
                  fullWidth
                  size="small"
                  value={
                    editDrafts[editingMarker.id]?.species_name !== undefined
                      ? editDrafts[editingMarker.id]?.species_name
                      : editingMarker.species_name
                  }
                  onChange={(e) => {
                    const nextValue = e.target.value;
                    setEditDrafts((prev) => ({
                      ...prev,
                      [editingMarker.id]: { ...(prev[editingMarker.id] || {}), species_name: nextValue, status: prev[editingMarker.id]?.status ?? editingMarker.status, photo_url: prev[editingMarker.id]?.photo_url ?? editingMarker.photo_url, barangay: prev[editingMarker.id]?.barangay ?? editingMarker.barangay, municipality: prev[editingMarker.id]?.municipality ?? editingMarker.municipality },
                    }));
                    // Suggestions disabled - no dropdown functionality
                  }}
                  onFocus={() => {
                    // Suggestions disabled - no dropdown functionality
                  }}
                  onBlur={() => {
                    // Suggestions disabled - no dropdown functionality
                  }}
                  inputRef={(el) => { editInputRefs.current[editingMarker.id] = el; }}
                />
                  {/* Species suggestions disabled - entire dropdown section commented out */}
                </Box>
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
              <Popup className="themed-popup" autoPan autoPanPadding={[50, 50]} maxWidth={420}>
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

        {/* Dispersal marker and trace line */}
        {dispersingMarkerId && (() => {
          const dispersingMarker = finalFilteredMarkers.find(m => m.id === dispersingMarkerId);
          return dispersingMarker ? (
            <>
              {/* Original location marker */}
              <Marker
                key={`original-${dispersingMarker.id}`}
                position={[originalLocation?.lat || dispersingMarker.latitude, originalLocation?.lng || dispersingMarker.longitude]}
                icon={createStatusIcon(dispersingMarker.status)}
                ref={(ref) => { if (ref) markerRefs.current[`original-${dispersingMarker.id}`] = ref; }}
              >
                <Popup className="themed-popup" autoPan autoPanPadding={[50, 50]}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 240 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'info.main' }}>
                      Original Location: {dispersingMarker.species_name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      This is the original location before dispersal.
                    </Typography>
                  </Box>
                </Popup>
              </Marker>
              
              {/* Dispersal location marker (temporary) */}
              <Marker
                key={`dispersal-${dispersingMarker.id}`}
                position={[dispersingMarker.latitude, dispersingMarker.longitude]}
                icon={createStatusIcon('released')}
                ref={(ref) => { if (ref) markerRefs.current[`dispersal-${dispersingMarker.id}`] = ref; }}
              >
                <Popup className="themed-popup" autoPan autoPanPadding={[50, 50]}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 240 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'warning.main' }}>
                      Released: {dispersingMarker.species_name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Click anywhere on the map to set the new release location.
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        setDispersingMarkerId(null);
                        setOriginalLocation(null);
                      }}
                      sx={{ mt: 1 }}
                    >
                      Cancel Release
                    </Button>
                  </Box>
                </Popup>
              </Marker>
              
              {/* Trace line from original to dispersal location */}
              <Polyline
                positions={[
                  [originalLocation?.lat || dispersingMarker.latitude, originalLocation?.lng || dispersingMarker.longitude],
                  [dispersingMarker.latitude, dispersingMarker.longitude]
                ]}
                pathOptions={{
                  color: '#ff9800',
                  weight: 3,
                  opacity: 0.8,
                  dashArray: '10, 10'
                }}
              />
            </>
          ) : null;
        })()}

        {/* Dispersal trace lines with multiple curves */}
        {dispersalTraces.map(trace => {
          const startLat = trace.originalLat;
          const startLng = trace.originalLng;
          const endLat = trace.dispersedLat;
          const endLng = trace.dispersedLng;
          
          // Calculate distance
          const latDiff = endLat - startLat;
          const lngDiff = endLng - startLng;
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
          
          // Determine number of curves based on distance
          // Near: 3 curves, Far: more curves (up to 7)
          const numCurves = distance < 0.01 ? 3 : Math.min(Math.floor(distance * 1000) + 3, 7);
          
          // Generate multiple curve segments
          const allCurvePoints: [number, number][] = [];
          
          for (let curveIndex = 0; curveIndex < numCurves; curveIndex++) {
            // Calculate segment start and end points
            const segmentStart = curveIndex / numCurves;
            const segmentEnd = (curveIndex + 1) / numCurves;
            
            const segStartLat = startLat + latDiff * segmentStart;
            const segStartLng = startLng + lngDiff * segmentStart;
            const segEndLat = startLat + latDiff * segmentEnd;
            const segEndLng = startLng + lngDiff * segmentEnd;
            
            // Calculate segment midpoint
            const segMidLat = (segStartLat + segEndLat) / 2;
            const segMidLng = (segStartLng + segEndLng) / 2;
            
            // Calculate segment distance for curve offset
            const segLatDiff = segEndLat - segStartLat;
            const segLngDiff = segEndLng - segStartLng;
            const segDistance = Math.sqrt(segLatDiff * segLatDiff + segLngDiff * segLngDiff);
            
            // Create alternating curve directions for wave-like effect
            const curveDirection = curveIndex % 2 === 0 ? 1 : -1;
            const curveOffset = Math.min(segDistance * 0.15, 0.008) * curveDirection;
            
            // Perpendicular offset for curve
            const perpLat = -segLngDiff / segDistance * curveOffset;
            const perpLng = segLatDiff / segDistance * curveOffset;
            
            // Control point for this segment
            const controlLat = segMidLat + perpLat;
            const controlLng = segMidLng + perpLng;
            
            // Generate curve points for this segment
            const segmentPoints: [number, number][] = [];
            const numPoints = Math.max(8, Math.floor(segDistance * 2000)); // More points for longer segments
            
            for (let i = 0; i <= numPoints; i++) {
              const t = i / numPoints;
              const lat = (1 - t) * (1 - t) * segStartLat + 2 * (1 - t) * t * controlLat + t * t * segEndLat;
              const lng = (1 - t) * (1 - t) * segStartLng + 2 * (1 - t) * t * controlLng + t * t * segEndLng;
              segmentPoints.push([lat, lng]);
            }
            
            // Add segment points to overall curve (skip first point to avoid duplicates)
            if (curveIndex === 0) {
              allCurvePoints.push(...segmentPoints);
            } else {
              allCurvePoints.push(...segmentPoints.slice(1));
            }
          }
          
          return (
            <Polyline
              key={`trace-${trace.id}`}
              positions={allCurvePoints}
              pathOptions={{
                color: '#4caf50',
                weight: 4,
                opacity: 0.9
              }}
            />
          );
        })}

        {/* Dynamic trace line following cursor during relocation (red) */}
        {relocatingMarkerId && cursorPosition && relocationOriginalLocation && (() => {
          const startLat = relocationOriginalLocation.lat;
          const startLng = relocationOriginalLocation.lng;
          const endLat = cursorPosition.lat;
          const endLng = cursorPosition.lng;
          
          // Calculate distance
          const latDiff = endLat - startLat;
          const lngDiff = endLng - startLng;
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
          
          // Determine number of curves based on distance
          const numCurves = distance < 0.01 ? 3 : Math.min(Math.floor(distance * 1000) + 3, 7);
          
          // Generate multiple curve segments
          const allCurvePoints: [number, number][] = [];
          
          for (let curveIndex = 0; curveIndex < numCurves; curveIndex++) {
            const segmentStart = curveIndex / numCurves;
            const segmentEnd = (curveIndex + 1) / numCurves;
            
            const segStartLat = startLat + latDiff * segmentStart;
            const segStartLng = startLng + lngDiff * segmentStart;
            const segEndLat = startLat + latDiff * segmentEnd;
            const segEndLng = startLng + lngDiff * segmentEnd;
            
            const segMidLat = (segStartLat + segEndLat) / 2;
            const segMidLng = (segStartLng + segEndLng) / 2;
            
            const segLatDiff = segEndLat - segStartLat;
            const segLngDiff = segEndLng - segStartLng;
            const segDistance = Math.sqrt(segLatDiff * segLatDiff + segLngDiff * segLngDiff);
            
            const curveDirection = curveIndex % 2 === 0 ? 1 : -1;
            const curveOffset = Math.min(segDistance * 0.15, 0.008) * curveDirection;
            
            const perpLat = -segLngDiff / segDistance * curveOffset;
            const perpLng = segLatDiff / segDistance * curveOffset;
            
            const controlLat = segMidLat + perpLat;
            const controlLng = segMidLng + perpLng;
            
            const segmentPoints: [number, number][] = [];
            const numPoints = Math.max(8, Math.floor(segDistance * 2000));
            
            for (let i = 0; i <= numPoints; i++) {
              const t = i / numPoints;
              const lat = (1 - t) * (1 - t) * segStartLat + 2 * (1 - t) * t * controlLat + t * t * segEndLat;
              const lng = (1 - t) * (1 - t) * segStartLng + 2 * (1 - t) * t * controlLng + t * t * segEndLng;
              segmentPoints.push([lat, lng]);
            }
            
            if (curveIndex === 0) {
              allCurvePoints.push(...segmentPoints);
            } else {
              allCurvePoints.push(...segmentPoints.slice(1));
            }
          }
          
          return (
            <Polyline
              key="dynamic-relocation-trace"
              positions={allCurvePoints}
              pathOptions={{
                color: '#f44336',
                weight: 3,
                opacity: 0.6,
                dashArray: '5, 5'
              }}
            />
          );
        })()}

        {/* Dynamic trace line following cursor during dispersal (green) */}
        {dispersingMarkerId && cursorPosition && originalLocation && (() => {
          const startLat = originalLocation.lat;
          const startLng = originalLocation.lng;
          const endLat = cursorPosition.lat;
          const endLng = cursorPosition.lng;
          
          // Calculate distance
          const latDiff = endLat - startLat;
          const lngDiff = endLng - startLng;
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
          
          // Determine number of curves based on distance
          const numCurves = distance < 0.01 ? 3 : Math.min(Math.floor(distance * 1000) + 3, 7);
          
          // Generate multiple curve segments
          const allCurvePoints: [number, number][] = [];
          
          for (let curveIndex = 0; curveIndex < numCurves; curveIndex++) {
            // Calculate segment start and end points
            const segmentStart = curveIndex / numCurves;
            const segmentEnd = (curveIndex + 1) / numCurves;
            
            const segStartLat = startLat + latDiff * segmentStart;
            const segStartLng = startLng + lngDiff * segmentStart;
            const segEndLat = startLat + latDiff * segmentEnd;
            const segEndLng = startLng + lngDiff * segmentEnd;
            
            // Calculate segment midpoint
            const segMidLat = (segStartLat + segEndLat) / 2;
            const segMidLng = (segStartLng + segEndLng) / 2;
            
            // Calculate segment distance for curve offset
            const segLatDiff = segEndLat - segStartLat;
            const segLngDiff = segEndLng - segStartLng;
            const segDistance = Math.sqrt(segLatDiff * segLatDiff + segLngDiff * segLngDiff);
            
            // Create alternating curve directions for wave-like effect
            const curveDirection = curveIndex % 2 === 0 ? 1 : -1;
            const curveOffset = Math.min(segDistance * 0.15, 0.008) * curveDirection;
            
            // Perpendicular offset for curve
            const perpLat = -segLngDiff / segDistance * curveOffset;
            const perpLng = segLatDiff / segDistance * curveOffset;
            
            // Control point for this segment
            const controlLat = segMidLat + perpLat;
            const controlLng = segMidLng + perpLng;
            
            // Generate curve points for this segment
            const segmentPoints: [number, number][] = [];
            const numPoints = Math.max(8, Math.floor(segDistance * 2000));
            
            for (let i = 0; i <= numPoints; i++) {
              const t = i / numPoints;
              const lat = (1 - t) * (1 - t) * segStartLat + 2 * (1 - t) * t * controlLat + t * t * segEndLat;
              const lng = (1 - t) * (1 - t) * segStartLng + 2 * (1 - t) * t * controlLng + t * t * segEndLng;
              segmentPoints.push([lat, lng]);
            }
            
            // Add segment points to overall curve
            if (curveIndex === 0) {
              allCurvePoints.push(...segmentPoints);
            } else {
              allCurvePoints.push(...segmentPoints.slice(1));
            }
          }
          
          return (
            <Polyline
              key="dynamic-dispersal-trace"
              positions={allCurvePoints}
              pathOptions={{
                color: '#4caf50',
                weight: 3,
                opacity: 0.6,
                dashArray: '5, 5'
              }}
            />
          );
        })()}

        {/* Saved user markers */}
        {finalFilteredMarkers.filter((m) => m.id !== editingMarkerId && m.id !== relocatingMarkerId && m.id !== dispersingMarkerId).length > 0 && (
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
              <Popup className="themed-popup" autoPan autoPanPadding={[50, 50]}>
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
                  placeholder="Phone number"
                  value={editDrafts[m.id]?.phone_number ?? ""}
                  onChange={(e) => {
                    const phoneNumber = e.target.value;
                    const countryCode = editDrafts[m.id]?.country_code ?? '+63';
                    const fullNumber = countryCode + phoneNumber;
                    setEditDrafts((prev) => ({
                      ...prev,
                          [m.id]: {
                            ...prev[m.id],
                        phone_number: phoneNumber,
                        contact_number: fullNumber,
                            species_name: prev[m.id]?.species_name ?? m.species_name,
                            status: prev[m.id]?.status ?? m.status,
                            photo_url: prev[m.id]?.photo_url ?? m.photo_url,
                            reporter_name: prev[m.id]?.reporter_name ?? m.reporter_name,
                      },
                    }));
                  }}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value={editDrafts[m.id]?.country_code ?? '+63'}
                            onChange={(e) => {
                              const countryCode = e.target.value;
                              const phoneNumber = editDrafts[m.id]?.phone_number ?? '';
                              const fullNumber = countryCode + phoneNumber;
                              setEditDrafts((prev) => ({
                                ...prev,
                                [m.id]: {
                                  ...prev[m.id],
                                  country_code: countryCode,
                                  contact_number: fullNumber,
                                  species_name: prev[m.id]?.species_name ?? m.species_name,
                                  status: prev[m.id]?.status ?? m.status,
                                  photo_url: prev[m.id]?.photo_url ?? m.photo_url,
                                  reporter_name: prev[m.id]?.reporter_name ?? m.reporter_name,
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
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 360 }}>
                    <div><strong>{m.species_name}</strong></div>
                    <div>Status: {formatStatusLabel(m.status)}</div>
                    {/* Dispersal information */}
                    {(() => {
                      const trace = dispersalTraces.find(t => t.id === m.id);
                      return trace ? (
                        <Box sx={{ 
                          bgcolor: '#e8f5e8', 
                          color: '#2e7d32', 
                          p: 1, 
                          borderRadius: 1, 
                          fontSize: '0.875rem',
                          border: '1px solid',
                          borderColor: '#4caf50'
                        }}>
                          <div><strong>📍 Released Location</strong></div>
                          <div>Original: {trace.originalBarangay || 'Unknown'} ({trace.originalLat.toFixed(5)}, {trace.originalLng.toFixed(5)})</div>
                          <div>Current: {trace.dispersedBarangay || 'Unknown'} ({trace.dispersedLat.toFixed(5)}, {trace.dispersedLng.toFixed(5)})</div>
                      <Tooltip title={role !== 'enforcement' ? 'Only enforcement can modify' : ''} disableHoverListener={role === 'enforcement'} arrow>
                        <span>
                          <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              sx={{ 
                                mt: 1,
                                minWidth: 'fit-content',
                                whiteSpace: 'nowrap',
                                fontSize: '0.75rem',
                                py: 0.5,
                                px: 1,
                                borderColor: '#d32f2f',
                                color: '#d32f2f',
                                '&:hover': {
                                  borderColor: '#b71c1c',
                                  color: '#b71c1c',
                                  bgcolor: 'rgba(211, 47, 47, 0.04)'
                                }
                              }}
                              onClick={(e) => {
                                try { e.preventDefault(); e.stopPropagation(); } catch {}
                                if (role === 'enforcement') handleUndispersed(m.id);
                              }}
                              disabled={role !== 'enforcement'}
                            >
                              Unrelease
                            </Button>
                        </span>
                      </Tooltip>
                        </Box>
                      ) : null;
                    })()}
                    {m.photo_url && <img src={m.photo_url} alt="marker" style={{ width: "100%", borderRadius: 8 }} />}
                    <div>Date & Time Captured: {new Date(m.timestamp_captured).toLocaleString()}</div>
                    <div>Latitude: {m.latitude.toFixed(5)}</div>
                    <div>Longitude: {m.longitude.toFixed(5)}</div>
                    <div>Barangay: {m.barangay || "N/A"}</div>
                    <div>Municipality: {m.municipality || "N/A"}</div>
                    {m.reporter_name ? <div>Reported by: {m.reporter_name}</div> : null}
                    {m.contact_number ? <div>Contact: {m.contact_number}</div> : null}
                      <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                        {role === 'enforcement' && (
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ 
                              minWidth: 'fit-content', 
                              whiteSpace: 'nowrap'
                            }}
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
                              setSpeciesSelectedFromDropdown(false);
                              setTimeout(() => {
                                try { markerRefs.current[m.id]?.openPopup?.(); } catch {}
                                try { (document.activeElement as HTMLElement | null)?.blur?.(); } catch {}
                              }, 0);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        <Tooltip title={role !== 'enforcement' ? 'Only enforcement can modify' : ''} disableHoverListener={role === 'enforcement'} arrow>
                        <span>
                        <Button
                          variant="outlined"
                          size="small"
                          color="secondary"
                          sx={{ 
                            minWidth: 'fit-content', 
                            whiteSpace: 'nowrap',
                            '&.Mui-disabled': {
                              opacity: 1,
                              borderColor: 'divider',
                              color: 'text.disabled',
                              bgcolor: 'action.disabledBackground',
                            }
                          }}
                          onClick={(e) => {
                            try { e.preventDefault(); e.stopPropagation(); } catch {}
                            if (role === 'enforcement') {
                            setRelocationOriginalLocation({ lat: m.latitude, lng: m.longitude });
                            setRelocatingMarkerId(m.id);
                            }
                            // Close the popup to allow clicking on map
                            try { markerRefs.current[m.id]?.closePopup?.(); } catch {}
                          }}
                          disabled={role !== 'enforcement'}
                        >
                          Relocate Pin
                        </Button>
                        </span>
                        </Tooltip>
                        <Tooltip title={role !== 'enforcement' ? 'Only enforcement can modify' : ''} disableHoverListener={role === 'enforcement'} arrow>
                        <span>
                        <Button
                          variant="outlined"
                          size="small"
                          color="warning"
                          sx={{ 
                            minWidth: 'fit-content', 
                            whiteSpace: 'nowrap',
                            '&.Mui-disabled': {
                              opacity: 1,
                              borderColor: 'divider',
                              color: 'text.disabled',
                              bgcolor: 'action.disabledBackground',
                            }
                          }}
                          onClick={(e) => {
                            try { e.preventDefault(); e.stopPropagation(); } catch {}
                            if (role === 'enforcement') {
                            setOriginalLocation({ lat: m.latitude, lng: m.longitude });
                            setDispersingMarkerId(m.id);
                            }
                            // Close the popup to allow clicking on map
                            try { markerRefs.current[m.id]?.closePopup?.(); } catch {}
                          }}
                          disabled={role !== 'enforcement'}
                        >
                          Release
                        </Button>
                        </span>
                        </Tooltip>
                        <Tooltip title={role !== 'enforcement' ? 'Only enforcement can modify' : ''} disableHoverListener={role === 'enforcement'} arrow>
                        <span>
                        <Button
                          variant="outlined"
                          size="small"
                          color="error"
                          sx={{ 
                            minWidth: 'fit-content', 
                            whiteSpace: 'nowrap',
                            '&.Mui-disabled': {
                              opacity: 1,
                              borderColor: 'divider',
                              color: 'text.disabled',
                              bgcolor: 'action.disabledBackground',
                            }
                          }}
                        onClick={(e) => {
                            try { e.preventDefault(); e.stopPropagation(); } catch {}
                            if (role === 'enforcement') handleDeleteMarker(m.id);
                          }}
                          disabled={role !== 'enforcement'}
                        >
                          Delete
                        </Button>
                        </span>
                        </Tooltip>
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

      {/* Dispersal Mode Indicator */}
      {dispersingMarkerId && (
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
            Click on the map to set dispersal location (cursor changed to location icon)
          </Typography>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            onClick={() => {
              setDispersingMarkerId(null);
              setOriginalLocation(null);
            }}
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
