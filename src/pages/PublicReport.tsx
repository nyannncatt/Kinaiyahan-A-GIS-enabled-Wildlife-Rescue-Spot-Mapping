import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  TextField, 
  Typography, 
  Alert, 
  Container,
  Paper,
  Divider,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Avatar,
  Stack,
  useTheme,
  useMediaQuery,
  Fade,
  Slide,
  Modal,
  Backdrop,
  Select,
  MenuItem
} from '@mui/material';
import {
  PhotoCamera,
  LocationOn,
  Person,
  Phone,
  CheckCircle,
  Upload,
  Close,
  ArrowBack,
  ArrowForward,
  CameraAlt,
  Videocam
} from '@mui/icons-material';
import { createWildlifeRecordPublic, uploadWildlifePhotoPublic } from '../services/wildlifeRecords';
import exifr from 'exifr';

function extractLatLngFromExif(file: File): Promise<{ lat?: number; lng?: number } | null> {
  return new Promise(async (resolve) => {
    try {
      console.log('Starting EXIF extraction for file:', file.name, file.size, 'bytes');

      // First, try the dedicated GPS helper from exifr (most reliable for lat/lng)
      let gpsData: any = null;
      try {
        // Cast to any to access helper functions without TS type issues
        gpsData = await (exifr as any).gps(file);
        console.log('exifr.gps() result:', gpsData);
      } catch (gpsError) {
        console.warn('exifr.gps() failed, falling back to generic parse:', gpsError);
      }

      // If gpsData already has latitude/longitude, use that directly
      let exifData: any = null;
      if (gpsData && (gpsData.latitude || gpsData.longitude)) {
        exifData = gpsData;
      } else {
        // Parse full EXIF data with GPS focus - more expensive but more exhaustive
        exifData = await (exifr as any).parse(file, { gps: true });
      }

      console.log('Raw EXIF data (combined GPS/parse):', exifData);
      
      let latitude: number | undefined;
      let longitude: number | undefined;
      
      // Helper function to convert DMS (Degrees, Minutes, Seconds) to decimal
      const dmsToDecimal = (dms: any, ref: string): number | null => {
        if (!dms || !Array.isArray(dms) || dms.length < 3) return null;
        
        let degrees = Number(dms[0]) || 0;
        let minutes = Number(dms[1]) || 0;
        let seconds = Number(dms[2]) || 0;
        
        let decimal = degrees + (minutes / 60) + (seconds / 3600);
        
        // Apply reference (N/S, E/W)
        if (ref === 'S' || ref === 'W') {
          decimal = -decimal;
        }
        
        return decimal;
      };
      
      // Try multiple possible GPS data locations
      if (exifData) {
        // Standard GPS location (already converted to decimal)
        if (exifData.latitude && exifData.longitude) {
          latitude = Number(exifData.latitude);
          longitude = Number(exifData.longitude);
        }
        // GPS coordinates as DMS arrays with refs
        else if (exifData.GPSLatitude && exifData.GPSLongitude) {
          const latRef = exifData.GPSLatitudeRef || 'N';
          const lngRef = exifData.GPSLongitudeRef || 'E';
          
          // Check if already decimal
          if (typeof exifData.GPSLatitude === 'number' && typeof exifData.GPSLongitude === 'number') {
            latitude = exifData.GPSLatitude;
            longitude = exifData.GPSLongitude;
            // Apply refs if needed
            if (latRef === 'S' && latitude !== undefined) latitude = -latitude;
            if (lngRef === 'W' && longitude !== undefined) longitude = -longitude;
          } else {
            // Try to parse as DMS
            const latDecimal = dmsToDecimal(exifData.GPSLatitude, latRef);
            const lngDecimal = dmsToDecimal(exifData.GPSLongitude, lngRef);
            if (latDecimal !== null && lngDecimal !== null) {
              latitude = latDecimal;
              longitude = lngDecimal;
            }
          }
        }
        // GPS data as nested object
        else if (exifData.GPS) {
          const gps = exifData.GPS;
          if (gps.GPSLatitude && gps.GPSLongitude) {
            if (typeof gps.GPSLatitude === 'number' && typeof gps.GPSLongitude === 'number') {
              latitude = gps.GPSLatitude;
              longitude = gps.GPSLongitude;
            } else {
              const latRef = gps.GPSLatitudeRef || 'N';
              const lngRef = gps.GPSLongitudeRef || 'E';
              const latDecimal = dmsToDecimal(gps.GPSLatitude, latRef);
              const lngDecimal = dmsToDecimal(gps.GPSLongitude, lngRef);
              if (latDecimal !== null && lngDecimal !== null) {
                latitude = latDecimal;
                longitude = lngDecimal;
              }
            }
          } else if (gps.latitude && gps.longitude) {
            latitude = Number(gps.latitude);
            longitude = Number(gps.longitude);
          }
        }
        // Latitude/Longitude with different case
        else if (exifData.Latitude && exifData.Longitude) {
          latitude = Number(exifData.Latitude);
          longitude = Number(exifData.Longitude);
        }
        // Try nested Exif or IFD0
        else if (exifData.Exif) {
          const exif = exifData.Exif;
          if (exif.latitude && exif.longitude) {
            latitude = Number(exif.latitude);
            longitude = Number(exif.longitude);
          }
        }
        else if (exifData.IFD0) {
          const ifd0 = exifData.IFD0;
          if (ifd0.latitude && ifd0.longitude) {
            latitude = Number(ifd0.latitude);
            longitude = Number(ifd0.longitude);
          }
        }
      }
      
      // Validate coordinates
      if (latitude !== undefined && longitude !== undefined) {
        // Ensure coordinates are valid numbers and not 0,0
        const lat = Number(latitude);
        const lng = Number(longitude);

        // Accept any non-zero, finite coordinate pair from EXIF
        if (!isNaN(lat) && !isNaN(lng) &&
            isFinite(lat) && isFinite(lng) &&
            lat !== 0 && lng !== 0) {
          // Round to 6 decimal places for accuracy
          const roundedLat = Math.round(lat * 1000000) / 1000000;
          const roundedLng = Math.round(lng * 1000000) / 1000000;

          console.log('GPS coordinates validated and found (no area restriction):', { 
            latitude: roundedLat, 
            longitude: roundedLng,
            precision: '6 decimals',
            original: { lat, lng }
          });
          resolve({
            lat: roundedLat,
            lng: roundedLng
          });
        } else {
          console.log('GPS coordinates found but invalid (NaN, infinite, or 0,0):', { 
            lat, 
            lng
          });
          resolve(null);
        }
      } else {
        console.log('No GPS data found in EXIF');
        resolve(null);
      }
    } catch (error) {
      console.error('EXIF extraction failed:', error);
      resolve(null);
    }
  });
}

export default function PublicReport() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  
  const [barangay, setBarangay] = useState('');
  const [municipality, setMunicipality] = useState('Manolo Fortich');
  const [speciesName, setSpeciesName] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+63');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);
  const [nameWarning, setNameWarning] = useState<string | null>(null);
  const [showFullscreenPhoto, setShowFullscreenPhoto] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [stepTransition, setStepTransition] = useState(false);
  const [extractedCoords, setExtractedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hasExifGps, setHasExifGps] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Auto-hide global error and field warnings after 3 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (phoneWarning) {
      const timer = setTimeout(() => setPhoneWarning(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [phoneWarning]);

  useEffect(() => {
    if (nameWarning) {
      const timer = setTimeout(() => setNameWarning(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [nameWarning]);

  // Auto-hide location permission banner after 2 seconds
  useEffect(() => {
    if (locationPermission !== null) {
      const timer = setTimeout(() => {
        setLocationPermission(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [locationPermission]);

  // Clear location banner when step changes (e.g., next/prev page)
  useEffect(() => {
    if (locationPermission !== null) {
      setLocationPermission(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep]);

  // Define barangays by municipality
  const manoloFortichBarangays = [
    'Agusan Canyon', 'Alae', 'Dahilayan', 'Dalirig', 'Damilag', 'Diclum',
    'Guilang-guilang', 'Kalugmanan', 'Lindaban', 'Lingion', 'Lunocan',
    'Maluko', 'Mambatangan', 'Mampayag', 'Minsuro', 'Mantibugao',
    'Tankulan (Pob.)', 'San Miguel', 'Sankanan', 'Santiago', 'Santo Niño', 'Ticala'
  ];

  const malitbogBarangays = [
    'Kalingking', 'Kiabo', 'Mindagat', 'Omagling', 'Patpat', 'Poblacion',
    'Sampiano', 'San Luis', 'Santa Ines', 'Silo-o', 'Sumalsag'
  ];

  const sumilaoBarangays = [
    'Culasi', 'Kisolon', 'Licoan', 'Lupiagan', 'Ocasion', 'Puntian',
    'San Roque', 'San Vicente', 'Poblacion(Sumilao)', 'Vista Villa'
  ];

  const impasugongBarangays = [
    'Bontongon', 'Bulonay', 'Capitan Bayong', 'Cawayan', 'Dumalaguing', 'Guihean',
    'Hagpa', 'Impalutao', 'Kalabugao', 'Kibenton', 'La Fortuna', 'Poblacion(Impasugong)', 'Sayawan'
  ];

  // Get barangays based on selected municipality
  const getBarangaysForMunicipality = (municipality: string) => {
    switch (municipality) {
      case 'Manolo Fortich':
        return manoloFortichBarangays;
      case 'Malitbog':
        return malitbogBarangays;
      case 'Sumilao':
        return sumilaoBarangays;
      case 'Impasugong':
        return impasugongBarangays;
      default:
        return [...manoloFortichBarangays, ...malitbogBarangays, ...sumilaoBarangays, ...impasugongBarangays];
    }
  };

  const steps = isMobile ? [
    'Wildlife',
    'Location', 
    'Contact',
    'Review'
  ] : [
    'Wildlife Information',
    'Location Details', 
    'Contact Information',
    'Review & Submit'
  ];

  const getBarangayFromCoordinates = (lat: number, lng: number) => {
    // Use actual barangay center coordinates for more accurate distance-based matching
    const barangayCenters = {
      // Manolo Fortich barangays - using accurate center coordinates
      'Agusan Canyon': { lat: 8.390019, lng: 124.884487, municipality: 'Manolo Fortich', radius: 0.02 },
      'Alae': { lat: 8.424440, lng: 124.812780, municipality: 'Manolo Fortich', radius: 0.015 },
      'Dahilayan': { lat: 8.221500, lng: 124.849000, municipality: 'Manolo Fortich', radius: 0.015 },
      'Dalirig': { lat: 8.377220, lng: 124.901390, municipality: 'Manolo Fortich', radius: 0.015 },
      'Damilag': { lat: 8.354720, lng: 124.812220, municipality: 'Manolo Fortich', radius: 0.015 },
      'Diclum': { lat: 8.363745, lng: 124.850793, municipality: 'Manolo Fortich', radius: 0.015 },
      'Guilang-guilang': { lat: 8.369720, lng: 124.864440, municipality: 'Manolo Fortich', radius: 0.015 },
      'Kalugmanan': { lat: 8.277780, lng: 124.859720, municipality: 'Manolo Fortich', radius: 0.015 },
      'Lindaban': { lat: 8.291000, lng: 124.845500, municipality: 'Manolo Fortich', radius: 0.015 },
      'Lingion': { lat: 8.404000, lng: 124.887100, municipality: 'Manolo Fortich', radius: 0.015 },
      'Lunocan': { lat: 8.414300, lng: 124.823100, municipality: 'Manolo Fortich', radius: 0.015 },
      'Maluko': { lat: 8.373200, lng: 124.953800, municipality: 'Manolo Fortich', radius: 0.015 },
      'Mambatangan': { lat: 8.433330, lng: 124.805280, municipality: 'Manolo Fortich', radius: 0.015 },
      'Mampayag': { lat: 8.264440, lng: 124.828610, municipality: 'Manolo Fortich', radius: 0.015 },
      'Minsuro': { lat: 8.511200, lng: 124.829500, municipality: 'Manolo Fortich', radius: 0.015 },
      'Mantibugao': { lat: 8.459500, lng: 124.821900, municipality: 'Manolo Fortich', radius: 0.015 },
      'Tankulan (Pob.)': { lat: 8.368800, lng: 124.864100, municipality: 'Manolo Fortich', radius: 0.015 },
      'San Miguel': { lat: 8.389000, lng: 124.833200, municipality: 'Manolo Fortich', radius: 0.015 },
      'Sankanan': { lat: 8.316000, lng: 124.857900, municipality: 'Manolo Fortich', radius: 0.015 },
      'Santiago': { lat: 8.438600, lng: 124.993400, municipality: 'Manolo Fortich', radius: 0.015 },
      'Santo Niño': { lat: 8.431100, lng: 124.861500, municipality: 'Manolo Fortich', radius: 0.015 },
      'Ticala': { lat: 8.341200, lng: 124.891100, municipality: 'Manolo Fortich', radius: 0.015 },
      // Malitbog barangays
      'Kalingking': { lat: 8.540000, lng: 124.880000, municipality: 'Malitbog', radius: 0.015 },
      'Kiabo': { lat: 8.520000, lng: 124.860000, municipality: 'Malitbog', radius: 0.015 },
      'Mindagat': { lat: 8.500000, lng: 124.900000, municipality: 'Malitbog', radius: 0.015 },
      'Omagling': { lat: 8.480000, lng: 124.840000, municipality: 'Malitbog', radius: 0.015 },
      'Patpat': { lat: 8.560000, lng: 124.920000, municipality: 'Malitbog', radius: 0.015 },
      'Poblacion': { lat: 8.530000, lng: 124.870000, municipality: 'Malitbog', radius: 0.015 },
      'Sampiano': { lat: 8.510000, lng: 124.850000, municipality: 'Malitbog', radius: 0.015 },
      'San Luis': { lat: 8.490000, lng: 124.890000, municipality: 'Malitbog', radius: 0.015 },
      'Santa Ines': { lat: 8.550000, lng: 124.910000, municipality: 'Malitbog', radius: 0.015 },
      'Silo-o': { lat: 8.470000, lng: 124.830000, municipality: 'Malitbog', radius: 0.015 },
      'Sumalsag': { lat: 8.525000, lng: 124.875000, municipality: 'Malitbog', radius: 0.015 },
      // Sumilao barangays
      'Culasi': { lat: 8.300000, lng: 124.950000, municipality: 'Sumilao', radius: 0.015 },
      'Kisolon': { lat: 8.320000, lng: 124.940000, municipality: 'Sumilao', radius: 0.015 },
      'Licoan': { lat: 8.310000, lng: 124.930000, municipality: 'Sumilao', radius: 0.015 },
      'Lupiagan': { lat: 8.290000, lng: 124.920000, municipality: 'Sumilao', radius: 0.015 },
      'Ocasion': { lat: 8.280000, lng: 124.910000, municipality: 'Sumilao', radius: 0.015 },
      'Puntian': { lat: 8.270000, lng: 124.900000, municipality: 'Sumilao', radius: 0.015 },
      'San Roque': { lat: 8.260000, lng: 124.890000, municipality: 'Sumilao', radius: 0.015 },
      'San Vicente': { lat: 8.250000, lng: 124.880000, municipality: 'Sumilao', radius: 0.015 },
      'Poblacion(Sumilao)': { lat: 8.315000, lng: 124.945000, municipality: 'Sumilao', radius: 0.015 },
      'Vista Villa': { lat: 8.330000, lng: 124.935000, municipality: 'Sumilao', radius: 0.015 },
      // Impasugong barangays
      'Bontongon': { lat: 8.300000, lng: 125.000000, municipality: 'Impasugong', radius: 0.015 },
      'Bulonay': { lat: 8.320000, lng: 125.020000, municipality: 'Impasugong', radius: 0.015 },
      'Capitan Bayong': { lat: 8.280000, lng: 125.010000, municipality: 'Impasugong', radius: 0.015 },
      'Cawayan': { lat: 8.350000, lng: 125.030000, municipality: 'Impasugong', radius: 0.015 },
      'Dumalaguing': { lat: 8.250000, lng: 125.005000, municipality: 'Impasugong', radius: 0.015 },
      'Guihean': { lat: 8.270000, lng: 125.015000, municipality: 'Impasugong', radius: 0.015 },
      'Hagpa': { lat: 8.290000, lng: 125.025000, municipality: 'Impasugong', radius: 0.015 },
      'Impalutao': { lat: 8.310000, lng: 125.035000, municipality: 'Impasugong', radius: 0.015 },
      'Kalabugao': { lat: 8.330000, lng: 125.040000, municipality: 'Impasugong', radius: 0.015 },
      'Kibenton': { lat: 8.260000, lng: 125.020000, municipality: 'Impasugong', radius: 0.015 },
      'La Fortuna': { lat: 8.340000, lng: 125.045000, municipality: 'Impasugong', radius: 0.015 },
      'Poblacion(Impasugong)': { lat: 8.315000, lng: 125.030000, municipality: 'Impasugong', radius: 0.015 },
      'Sayawan': { lat: 8.275000, lng: 125.012000, municipality: 'Impasugong', radius: 0.015 }
    };

    // Haversine formula to calculate distance between two coordinates
    const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distance in km
    };

    // First, check if coordinates are within radius of any barangay center
    let matchWithinRadius: { name: string; distance: number; municipality: string } | null = null;
    let minDistance = Infinity;
    let closestBarangay = '';

    for (const [name, center] of Object.entries(barangayCenters)) {
      const distance = calculateDistance(lat, lng, center.lat, center.lng);
      
      // Check if within radius (typically ~1.5km for most barangays)
      if (distance <= center.radius) {
        if (distance < (matchWithinRadius?.distance || Infinity)) {
          matchWithinRadius = { name, distance, municipality: center.municipality };
        }
      }
      
      // Also track the closest barangay regardless of radius
      if (distance < minDistance) {
        minDistance = distance;
        closestBarangay = name;
      }
    }

    // If found a match within radius, return it
    if (matchWithinRadius) {
      console.log(`Found barangay ${matchWithinRadius.name} within radius (distance: ${matchWithinRadius.distance.toFixed(3)} km) for coordinates ${lat}, ${lng}`);
      return matchWithinRadius.name;
    }

    // If within 5km of closest barangay, use it (reasonable for barangay-level accuracy)
    const closestCenter = barangayCenters[closestBarangay as keyof typeof barangayCenters];
    if (closestCenter && minDistance <= 5.0) {
      console.log(`Found closest barangay ${closestBarangay} (distance: ${minDistance.toFixed(3)} km) for coordinates ${lat}, ${lng}`);
      return closestBarangay;
    }

    // If too far from all barangays, return empty (let API reverse geocoding handle it)
    console.log(`No barangay match found within 5km. Closest: ${closestBarangay} (${minDistance.toFixed(3)} km away)`);
    return '';
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    console.log('Starting reverse geocoding for coordinates:', { lat, lng });
    
    // First, try coordinate-based mapping (most accurate)
    const coordinateBarangay = getBarangayFromCoordinates(lat, lng);
    if (coordinateBarangay) {
      console.log('Found barangay from coordinates:', coordinateBarangay);
      
      // Determine municipality based on barangay
      const barangayCenters: Record<string, { municipality: string }> = {
        // Manolo Fortich
        'Agusan Canyon': { municipality: 'Manolo Fortich' },
        'Alae': { municipality: 'Manolo Fortich' },
        'Dahilayan': { municipality: 'Manolo Fortich' },
        'Dalirig': { municipality: 'Manolo Fortich' },
        'Damilag': { municipality: 'Manolo Fortich' },
        'Diclum': { municipality: 'Manolo Fortich' },
        'Guilang-guilang': { municipality: 'Manolo Fortich' },
        'Kalugmanan': { municipality: 'Manolo Fortich' },
        'Lindaban': { municipality: 'Manolo Fortich' },
        'Lingion': { municipality: 'Manolo Fortich' },
        'Lunocan': { municipality: 'Manolo Fortich' },
        'Maluko': { municipality: 'Manolo Fortich' },
        'Mambatangan': { municipality: 'Manolo Fortich' },
        'Mampayag': { municipality: 'Manolo Fortich' },
        'Minsuro': { municipality: 'Manolo Fortich' },
        'Mantibugao': { municipality: 'Manolo Fortich' },
        'Tankulan (Pob.)': { municipality: 'Manolo Fortich' },
        'San Miguel': { municipality: 'Manolo Fortich' },
        'Sankanan': { municipality: 'Manolo Fortich' },
        'Santiago': { municipality: 'Manolo Fortich' },
        'Santo Niño': { municipality: 'Manolo Fortich' },
        'Ticala': { municipality: 'Manolo Fortich' },
        // Malitbog
        'Kalingking': { municipality: 'Malitbog' },
        'Kiabo': { municipality: 'Malitbog' },
        'Mindagat': { municipality: 'Malitbog' },
        'Omagling': { municipality: 'Malitbog' },
        'Patpat': { municipality: 'Malitbog' },
        'Poblacion': { municipality: 'Malitbog' },
        'Sampiano': { municipality: 'Malitbog' },
        'San Luis': { municipality: 'Malitbog' },
        'Santa Ines': { municipality: 'Malitbog' },
        'Silo-o': { municipality: 'Malitbog' },
        'Sumalsag': { municipality: 'Malitbog' },
        // Sumilao
        'Culasi': { municipality: 'Sumilao' },
        'Kisolon': { municipality: 'Sumilao' },
        'Licoan': { municipality: 'Sumilao' },
        'Lupiagan': { municipality: 'Sumilao' },
        'Ocasion': { municipality: 'Sumilao' },
        'Puntian': { municipality: 'Sumilao' },
        'San Roque': { municipality: 'Sumilao' },
        'San Vicente': { municipality: 'Sumilao' },
        'Poblacion(Sumilao)': { municipality: 'Sumilao' },
        'Vista Villa': { municipality: 'Sumilao' },
        // Impasugong
        'Bontongon': { municipality: 'Impasugong' },
        'Bulonay': { municipality: 'Impasugong' },
        'Capitan Bayong': { municipality: 'Impasugong' },
        'Cawayan': { municipality: 'Impasugong' },
        'Dumalaguing': { municipality: 'Impasugong' },
        'Guihean': { municipality: 'Impasugong' },
        'Hagpa': { municipality: 'Impasugong' },
        'Impalutao': { municipality: 'Impasugong' },
        'Kalabugao': { municipality: 'Impasugong' },
        'Kibenton': { municipality: 'Impasugong' },
        'La Fortuna': { municipality: 'Impasugong' },
        'Poblacion(Impasugong)': { municipality: 'Impasugong' },
        'Sayawan': { municipality: 'Impasugong' }
      };
      
      const municipality = barangayCenters[coordinateBarangay]?.municipality || 'Manolo Fortich';
      setMunicipality(municipality);
      setBarangay(coordinateBarangay);
      return;
    }

    // Fallback to API-based reverse geocoding
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      
      console.log('Full reverse geocoding response:', data);
      
      if (data && data.address) {
        const address = data.address;
        
        // Extract municipality and barangay from address
        let extractedMunicipality = '';
        let extractedBarangay = '';
        
        // Check for municipality in various address fields
        if (address.municipality) {
          extractedMunicipality = address.municipality;
        } else if (address.city) {
          extractedMunicipality = address.city;
        } else if (address.town) {
          extractedMunicipality = address.town;
        }
        
        // Check for barangay in various address fields
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
        
        // Auto-populate municipality
        if (extractedMunicipality && extractedMunicipality.toLowerCase().includes('manolo fortich')) {
          setMunicipality('Manolo Fortich');
          console.log('Set municipality to Manolo Fortich');
        } else if (extractedMunicipality && extractedMunicipality.toLowerCase().includes('malitbog')) {
          setMunicipality('Malitbog');
          console.log('Set municipality to Malitbog');
        } else if (extractedMunicipality && extractedMunicipality.toLowerCase().includes('sumilao')) {
          setMunicipality('Sumilao');
          console.log('Set municipality to Sumilao');
        } else if (extractedMunicipality && extractedMunicipality.toLowerCase().includes('impasugong')) {
          setMunicipality('Impasugong');
          console.log('Set municipality to Impasugong');
        }
        
        // Auto-populate barangay with improved matching
        if (extractedBarangay) {
          const predefinedBarangays = [
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
            setBarangay(matchedBarangay);
            console.log('Auto-selected barangay from API:', matchedBarangay);
          } else {
            console.log('Could not match extracted barangay:', extractedBarangay);
          }
        } else {
          console.log('No barangay information found in address');
        }
        
        console.log('Reverse geocoded address:', address);
        console.log('Extracted municipality:', extractedMunicipality);
        console.log('Extracted barangay:', extractedBarangay);
      } else {
        console.log('No address data found in reverse geocoding response');
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  // Get coordinates for a specific barangay (for manual selection)
  // These are the accurate coordinates for each barangay in Manolo Fortich, Bukidnon
  const getBarangayCoordinates = (barangayName: string): { lat: number; lng: number } | null => {
    const barangayCenters = {
      'Agusan Canyon': { lat: 8.390019, lng: 124.884487 },
      'Alae': { lat: 8.424440, lng: 124.812780 },
      'Dahilayan': { lat: 8.221500, lng: 124.849000 },
      'Dalirig': { lat: 8.377220, lng: 124.901390 },
      'Damilag': { lat: 8.354720, lng: 124.812220 },
      'Diclum': { lat: 8.363745, lng: 124.850793 },
      'Guilang-guilang': { lat: 8.369720, lng: 124.864440 },
      'Kalugmanan': { lat: 8.277780, lng: 124.859720 },
      'Lindaban': { lat: 8.291000, lng: 124.845500 },
      'Lingion': { lat: 8.404000, lng: 124.887100 },
      'Lunocan': { lat: 8.414300, lng: 124.823100 },
      'Maluko': { lat: 8.373200, lng: 124.953800 },
      'Mambatangan': { lat: 8.433330, lng: 124.805280 },
      'Mampayag': { lat: 8.264440, lng: 124.828610 },
      'Minsuro': { lat: 8.511200, lng: 124.829500 },
      'Mantibugao': { lat: 8.459500, lng: 124.821900 },
      'Tankulan (Pob.)': { lat: 8.368800, lng: 124.864100 },
      'San Miguel': { lat: 8.389000, lng: 124.833200 },
      'Sankanan': { lat: 8.316000, lng: 124.857900 },
      'Santiago': { lat: 8.438600, lng: 124.993400 },
      'Santo Niño': { lat: 8.431100, lng: 124.861500 },
      'Ticala': { lat: 8.341200, lng: 124.891100 },
      // Malitbog barangays
      'Kalingking': { lat: 8.540000, lng: 124.880000 },
      'Kiabo': { lat: 8.520000, lng: 124.860000 },
      'Mindagat': { lat: 8.500000, lng: 124.900000 },
      'Omagling': { lat: 8.480000, lng: 124.840000 },
      'Patpat': { lat: 8.560000, lng: 124.920000 },
      'Poblacion': { lat: 8.530000, lng: 124.870000 },
      'Sampiano': { lat: 8.510000, lng: 124.850000 },
      'San Luis': { lat: 8.490000, lng: 124.890000 },
      'Santa Ines': { lat: 8.550000, lng: 124.910000 },
      'Silo-o': { lat: 8.470000, lng: 124.830000 },
      'Sumalsag': { lat: 8.525000, lng: 124.875000 },
      // Sumilao barangays
      'Culasi': { lat: 8.300000, lng: 124.950000 },
      'Kisolon': { lat: 8.320000, lng: 124.940000 },
      'Licoan': { lat: 8.310000, lng: 124.930000 },
      'Lupiagan': { lat: 8.290000, lng: 124.920000 },
      'Ocasion': { lat: 8.280000, lng: 124.910000 },
      'Puntian': { lat: 8.270000, lng: 124.900000 },
      'San Roque': { lat: 8.260000, lng: 124.890000 },
      'San Vicente': { lat: 8.250000, lng: 124.880000 },
      'Poblacion(Sumilao)': { lat: 8.315000, lng: 124.945000 },
      'Vista Villa': { lat: 8.330000, lng: 124.935000 },
      // Impasugong barangays
      'Bontongon': { lat: 8.300000, lng: 125.000000 },
      'Bulonay': { lat: 8.320000, lng: 125.020000 },
      'Capitan Bayong': { lat: 8.280000, lng: 125.010000 },
      'Cawayan': { lat: 8.350000, lng: 125.030000 },
      'Dumalaguing': { lat: 8.250000, lng: 125.005000 },
      'Guihean': { lat: 8.270000, lng: 125.015000 },
      'Hagpa': { lat: 8.290000, lng: 125.025000 },
      'Impalutao': { lat: 8.310000, lng: 125.035000 },
      'Kalabugao': { lat: 8.330000, lng: 125.040000 },
      'Kibenton': { lat: 8.260000, lng: 125.020000 },
      'La Fortuna': { lat: 8.340000, lng: 125.045000 },
      'Poblacion(Impasugong)': { lat: 8.315000, lng: 125.030000 },
      'Sayawan': { lat: 8.275000, lng: 125.012000 }
    };

    return barangayCenters[barangayName as keyof typeof barangayCenters] || null;
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Extract EXIF GPS data
      try {
        const coords = await extractLatLngFromExif(file);
        if (
          coords &&
          typeof coords.lat === 'number' &&
          typeof coords.lng === 'number'
        ) {
          setExtractedCoords({ lat: coords.lat, lng: coords.lng });
          setHasExifGps(true);
          console.log('GPS coordinates extracted:', coords);
          
          // Reverse geocode to get address information
          await reverseGeocode(coords.lat, coords.lng);
        } else {
          setExtractedCoords(null);
          setHasExifGps(false);
          console.log('No GPS data found in photo');
        }
      } catch (error) {
        console.error('Error extracting GPS data:', error);
        setExtractedCoords(null);
        setHasExifGps(false);
      }
    }
  };

  const handleNext = () => {
    // Step 0: Wildlife Information - Check species name and photo
    if (activeStep === 0) {
      if (!speciesName.trim()) {
        setError('⚠️ Please enter the species name before proceeding.');
        return;
      }
      if (!photoFile && !photoPreview) {
        setError('⚠️ Please upload or take a photo before proceeding to the next step.');
        return;
      }
    }
    
    // Step 1: Location Information - Check barangay if no EXIF GPS
    if (activeStep === 1) {
      if (!hasExifGps && !barangay.trim()) {
        setError('⚠️ Please select a barangay since your photo does not contain GPS location data.');
        return;
      }
    }
    
    // Step 2: Contact Information - Check contact details
    if (activeStep === 2) {
      if (!reporterName.trim()) {
        setError('⚠️ Please enter your name before proceeding.');
        return;
      }
      if (phoneNumber.trim().length !== 10) {
        setError('⚠️ Please enter a valid 10-digit contact number.');
        return;
      }
    }

    // All validations passed for the current step; clear any previous error
    setError(null);

    setStepTransition(true);
    setTimeout(() => {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
      setStepTransition(false);
    }, 150);
  };

  const handleBack = () => {
    setStepTransition(true);
    setTimeout(() => {
      setActiveStep((prevActiveStep) => prevActiveStep - 1);
      setStepTransition(false);
    }, 150);
  };

  const handleReset = () => {
    setBarangay('');
    setMunicipality('Manolo Fortich');
    setSpeciesName('');
    setReporterName('');
    setContactNumber('');
    setPhoneNumber('');
    setCountryCode('+63');
    setPhotoFile(null);
    setPhotoPreview(null);
    setExtractedCoords(null);
    setCurrentLocation(null);
    setHasExifGps(null);
    setShowCamera(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setLocationPermission(null);
    setActiveStep(0);
    setError(null);
    setSuccess(null);
    setPhoneWarning(null);
    setNameWarning(null);
  };

  const handleExit = () => {
    navigate('/login');
  };

  const requestLocationPermission = async () => {
    try {
      if ('geolocation' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (permission.state === 'granted') {
          // Get current location since permission is already granted
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const coords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              console.log('Location already granted, coordinates:', {
                ...coords,
                accuracy: position.coords.accuracy
              });
              setCurrentLocation(coords);
            },
            (error) => {
              console.log('Could not get current location despite permission:', error);
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 30000
            }
          );
          setLocationPermission(true);
          return true;
        } else if (permission.state === 'prompt') {
          // Request permission and get actual coordinates
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const coords = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude
                };
                console.log('Location permission granted, coordinates:', {
                  ...coords,
                  accuracy: position.coords.accuracy
                });
                setCurrentLocation(coords);
                setLocationPermission(true);
                resolve(true);
              },
              (error) => {
                console.log('Location permission denied:', error);
                setLocationPermission(false);
                resolve(false);
              },
              {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000
              }
            );
          });
        } else {
          setLocationPermission(false);
          return false;
        }
      } else {
        setLocationPermission(false);
        return false;
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
      return false;
    }
  };

  const startCamera = async () => {
    try {
      // Request location permission first
      const hasLocationPermission = await requestLocationPermission();
      
      if (!hasLocationPermission) {
        setError('Location permission is required for accurate GPS coordinates. Please enable location services and try again.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      setCameraStream(stream);
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setError('Unable to access camera. Please check permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (video && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      // Use stored current location or get fresh GPS location for the captured photo
      let photoLocation: { lat: number; lng: number } | null = currentLocation;
      
      // If we don't have a stored location, try to get a fresh one
      if (!photoLocation) {
        try {
          if (navigator.geolocation) {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
              });
            });
            
            photoLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            console.log('Fresh GPS location captured:', photoLocation);
          }
        } catch (error) {
          console.log('Could not get fresh GPS location:', error);
        }
      } else {
        console.log('Using stored GPS location for captured photo:', photoLocation);
      }
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          
          // Set the extracted coordinates if we got GPS location
          if (photoLocation) {
            setExtractedCoords(photoLocation);
            setHasExifGps(true);
            console.log('Using GPS location for captured photo:', photoLocation);
            
            // Reverse geocode to get address information
            await reverseGeocode(photoLocation.lat, photoLocation.lng);
          } else {
            setHasExifGps(false);
          }
          
          // Set the photo file and create preview
          setPhotoFile(file);
          
          // Create preview
          const reader = new FileReader();
          reader.onload = (e) => {
            setPhotoPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
          
          stopCamera();
        }
      }, 'image/jpeg', 0.8);
    }
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return speciesName.trim() !== '' && (photoFile !== null || photoPreview !== null);
      case 1:
        // If no EXIF GPS, require barangay selection
        if (!hasExifGps) {
          return barangay.trim() !== '';
        }
        // If has EXIF GPS, no additional validation needed
        return true;
      case 2:
        return reporterName.trim() !== '' && phoneNumber.trim().length === 10;
      case 3:
        return speciesName.trim() !== '' && 
               (hasExifGps || barangay.trim() !== '') && 
               reporterName.trim() !== '' && 
               phoneNumber.trim().length === 10;
      default:
        return false;
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!speciesName.trim()) {
      setError('Please provide species name.');
      return;
    }
    if (!photoFile && !barangay.trim() && !extractedCoords) {
      setError('Provide a photo (to extract location) or at least a barangay.');
      return;
    }

    setSubmitting(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      
      // Use extracted coordinates if available (from EXIF GPS data)
      if (extractedCoords) {
        lat = extractedCoords.lat;
        lng = extractedCoords.lng;
        console.log('Using extracted GPS coordinates:', { lat, lng });
        console.log('Coordinate validation - lat:', typeof lat, 'lng:', typeof lng);
        console.log('Coordinate values - lat:', lat, 'lng:', lng);
      } else {
        // No EXIF GPS data: use CENRO - Manolo Fortich coordinates for pending marker
        // 8.3719625, 124.8560156 (rounded)
        lat = 8.3719625;
        lng = 124.8560156;
        console.log('No EXIF GPS data, using default CENRO Manolo Fortich coordinates for pending marker:', { lat, lng });
      }

      console.log('Submitting record with coordinates:', { lat, lng });
      
      // Upload photo if available
      let photoUrl: string | undefined = undefined;
      if (photoFile) {
        try {
          console.log('Uploading photo:', photoFile.name);
          photoUrl = await uploadWildlifePhotoPublic(photoFile);
          console.log('Photo uploaded successfully:', photoUrl);
        } catch (photoError) {
          console.error('Failed to upload photo:', photoError);
          // Continue without photo rather than failing the entire submission
          console.warn('Photo upload failed, submitting report without photo. Please configure Supabase storage bucket for public uploads.');
          // Don't show error to user for now, just log it
        }
      }
      
      const timestampCaptured = new Date().toISOString();

      const created = await createWildlifeRecordPublic({
        species_name: speciesName.trim(),
        latitude: lat,
        longitude: lng,
        barangay: barangay || undefined,
        municipality: municipality || undefined,
        reporter_name: reporterName || undefined,
        contact_number: contactNumber || undefined,
        photo_url: photoUrl,
        has_exif_gps: hasExifGps || false,
        timestamp_captured: timestampCaptured,
      });
      
      console.log('Created record:', created);
      console.log('Record coordinates:', { lat: created.latitude, lng: created.longitude });

      // Reset form after successful submission
      handleReset();
      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 3 }}>
              <Box>
                <FormControl fullWidth variant="outlined">
                  <InputLabel htmlFor="species-name">Species Name *</InputLabel>
                   <OutlinedInput
                     id="species-name"
                     value={speciesName}
                     onChange={(e) => setSpeciesName(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         e.preventDefault();
                       }
                     }}
                     startAdornment={
                       <InputAdornment position="start">
                         <Box
                           component="img"
                           src="/images/kinaiyahanlogonobg.png"
                           alt="Kinaiyahan"
                           sx={{ width: 24, height: 24, objectFit: 'contain' }}
                         />
                       </InputAdornment>
                     }
                     label="Species Name *"
                     required
                     sx={{
                       borderRadius: 2,
                       '& .MuiOutlinedInput-root': {
                         fontSize: isMobile ? '0.875rem' : '1rem',
                         '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                           borderColor: '#4caf50',
                           borderWidth: 2
                         },
                         '&:hover .MuiOutlinedInput-notchedOutline': {
                           borderColor: '#66bb6a'
                         }
                       },
                       '& .MuiInputLabel-root.Mui-focused': {
                         color: '#2e7d32'
                       }
                     }}
                   />
                </FormControl>
                {/* Inline species name validation message (mobile-friendly) */}
                {activeStep === 0 && error && error.includes('species name') && (
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 0.5,
                      color: 'error.main',
                      display: 'block'
                    }}
                  >
                    {error}
                  </Typography>
                )}
              </Box>
              <Box>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: isMobile ? 3 : 4, 
                    textAlign: 'center',
                    border: '3px solid',
                    borderColor: photoFile ? '#4caf50' : '#ffffff',
                    bgcolor: photoFile ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 4,
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:hover': {
                      borderColor: photoFile ? '#2e7d32' : '#4caf50',
                      bgcolor: photoFile ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(76, 175, 80, 0.15)'
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: photoFile 
                        ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 248, 255, 0.8) 100%)',
                      zIndex: 0
                    }
                  }}
                >
                  {/* Upload photo input - allows EXIF GPS data extraction for location */}
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="photo-upload"
                    type="file"
                    onChange={handlePhotoChange}
                  />
                
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    {/* Single Camera Icon - More Clear */}
                    <Box sx={{ mb: 3 }}>
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          bgcolor: photoFile ? '#4caf50' : '#ffffff',
                          border: '3px solid',
                          borderColor: photoFile ? '#2e7d32' : '#4caf50',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <PhotoCamera 
                          sx={{ 
                            fontSize: 40, 
                            color: photoFile ? 'white' : '#4caf50',
                            transition: 'color 0.3s ease'
                          }} 
                        />
                      </Box>
                    </Box>
                    
                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                      <Button
                        variant="contained"
                        component="label"
                        htmlFor="photo-upload"
                        startIcon={<Upload />}
                        sx={{
                          bgcolor: '#4caf50',
                          color: 'white',
                          px: 3,
                          py: 1,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          mr: 1.5,
                          '&:hover': {
                            bgcolor: '#2e7d32',
                            transform: 'translateY(-1px)'
                          }
                        }}
                      >
                        Upload Photo
                      </Button>

                      <Button
                        variant="outlined"
                        startIcon={<CameraAlt />}
                        onClick={startCamera}
                        sx={{
                          borderColor: '#4caf50',
                          color: '#4caf50',
                          px: 3,
                          py: 1,
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: '#2e7d32',
                            color: '#2e7d32',
                            bgcolor: 'rgba(76, 175, 80, 0.05)',
                            transform: 'translateY(-1px)'
                          }
                        }}
                      >
                        Take Photo
                      </Button>
                    </Box>

                    {/* Note about EXIF GPS extraction */}
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.8rem',
                        color: 'text.secondary',
                        maxWidth: 380,
                        mx: 'auto',
                        mt: -1,
                      }}
                    >
                      Note: If your uploaded photo contains GPS/EXIF data, the system will automatically extract it to detect the location.
                    </Typography>
                    
                    {/* Status Text */}
                    <Typography 
                      variant={isMobile ? "h6" : "h5"} 
                      sx={{ 
                        color: photoFile ? '#2e7d32' : '#1976d2',
                        fontWeight: 700,
                        mb: 1
                      }}
                    >
                      {photoFile ? '✓ Photo Selected' : 'Add Wildlife Photo'}
                    </Typography>
                    
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: photoFile ? '#4caf50' : '#666',
                        fontWeight: 500,
                        mb: 2
                      }}
                    >
                      {photoFile ? photoFile.name : 'Capture photo with GPS location'}
                    </Typography>
                    
                    {/* GPS Location Info */}
                    {currentLocation && (
                      <Box sx={{ 
                        bgcolor: 'rgba(76, 175, 80, 0.1)', 
                        border: '1px solid #4caf50',
                        borderRadius: 2,
                        p: 2,
                        mb: 2
                      }}>
                        <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                          📍 GPS Location Ready
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  {photoPreview && (
                    <Box sx={{ mt: 3 }}>
                      <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <img 
                          src={photoPreview} 
                          alt="Preview" 
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: isMobile ? 300 : 400, 
                            borderRadius: 12,
                            objectFit: 'contain',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            width: '100%',
                            backgroundColor: '#f5f5f5'
                          }} 
                        />
                        
                        {/* EXIF GPS Data Indicator */}
                        {hasExifGps === true && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              bgcolor: 'rgba(76, 175, 80, 0.9)',
                              color: 'white',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              backdropFilter: 'blur(4px)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                          >
                            <LocationOn sx={{ fontSize: '0.875rem' }} />
                            GPS Location Found
                          </Box>
                        )}
                        
                        {hasExifGps === false && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              bgcolor: 'rgba(255, 152, 0, 0.9)',
                              color: 'white',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              backdropFilter: 'blur(4px)',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                          >
                            <LocationOn sx={{ fontSize: '0.875rem' }} />
                            No GPS Data
                          </Box>
                        )}
                        <Button
                          variant="contained"
                          color="error"
                          size="small"
                          startIcon={<Close />}
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                            setExtractedCoords(null);
                          }}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            minWidth: 'auto',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 600,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            '&:hover': {
                              transform: 'scale(1.05)',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </Box>
                      
                      {/* EXIF Location Status Message */}
                      {!extractedCoords && !currentLocation && (
                        <Box sx={{ 
                          bgcolor: 'rgba(255, 152, 0, 0.1)', 
                          border: '1px solid #ff9800',
                          borderRadius: 2,
                          p: 2,
                          mt: 2
                        }}>
                          <Typography variant="body2" sx={{ color: '#f57c00', fontWeight: 600, mb: 0.5 }}>
                            ⚠️ No Location Data Found
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#ff9800' }}>
                            This photo doesn't contain GPS location data. You'll need to manually enter the location in the next step.
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 3 }}>
              {/* Warning message when GPS data is available */}
              {hasExifGps && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Location Info:</strong> GPS coordinates were extracted from your photo. 
                    You can edit the municipality and barangay fields below for context if the GPS location seems inaccurate, 
                    but this won't change the actual coordinates used for mapping.
                  </Typography>
                </Alert>
              )}
              
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                flexWrap: 'wrap',
                flexDirection: isSmallMobile ? 'column' : 'row'
              }}>
                <Box sx={{ 
                  flex: 1, 
                  minWidth: isSmallMobile ? '100%' : 200 
                }}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel htmlFor="municipality">
                      {hasExifGps ? 'Municipality (editable for context)' : 'Municipality'}
                    </InputLabel>
                    <Select
                      id="municipality"
                      value={municipality}
                      onChange={(e) => {
                        setMunicipality(e.target.value);
                        // Clear barangay when municipality changes
                        setBarangay('');
                      }}
                      label={hasExifGps ? 'Municipality (editable for context)' : 'Municipality'}
                      startAdornment={
                        <InputAdornment position="start">
                          <LocationOn color="action" />
                        </InputAdornment>
                      }
                      sx={{
                        borderRadius: 2,
                        '& .MuiOutlinedInput-root': {
                          fontSize: isMobile ? '0.875rem' : '1rem',
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#4caf50',
                            borderWidth: 2
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#66bb6a'
                          }
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#2e7d32'
                        }
                      }}
                    >
                      <MenuItem value="Manolo Fortich">Manolo Fortich</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Box sx={{ 
                  flex: 1, 
                  minWidth: isSmallMobile ? '100%' : 200 
                }}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel htmlFor="barangay">
                      {hasExifGps ? 'Barangay (editable for context) *' : 'Barangay *'}
                    </InputLabel>
                    <Select
                      id="barangay"
                      value={barangay}
                      onChange={(e) => setBarangay(e.target.value)}
                      label={hasExifGps ? 'Barangay (editable for context) *' : 'Barangay *'}
                      required
                      startAdornment={
                        <InputAdornment position="start">
                          <LocationOn color="action" />
                        </InputAdornment>
                      }
                      sx={{
                        borderRadius: 2,
                        '& .MuiOutlinedInput-root': {
                          fontSize: isMobile ? '0.875rem' : '1rem',
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#4caf50',
                            borderWidth: 2
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#66bb6a'
                          }
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: '#2e7d32'
                        }
                      }}
                    >
                      {getBarangaysForMunicipality(municipality).map((barangayName) => (
                        <MenuItem key={barangayName} value={barangayName}>
                          {barangayName}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              
              {hasExifGps === false && (
                <Box sx={{ mt: 2 }}>
                  <Alert 
                    severity="warning" 
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiAlert-message': {
                        width: '100%'
                      }
                    }}
                  >
                    <Typography variant="body2">
                      <strong>No GPS Data in Photo:</strong> Your photo doesn't contain GPS location data. Please manually select the municipality and barangay where the wildlife was found.
                    </Typography>
                  </Alert>
                </Box>
              )}
              
              {/* Barangay info when there is NO EXIF GPS data */}
              {hasExifGps === false && barangay && (
                <Box sx={{ mt: 2 }}>
                  <Alert 
                    severity="info" 
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiAlert-message': {
                        width: '100%'
                      }
                    }}
                  >
                    <Typography variant="body2">
                      <strong>Barangay recorded:</strong> {barangay}, {municipality}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Since your photo has no GPS/EXIF data, the pending map marker will be placed at CENRO – Manolo Fortich and can be updated later by the officer.
                    </Typography>
                  </Alert>
                </Box>
              )}
              
              <Box>
                {extractedCoords ? (
                  <Alert 
                    severity="success" 
                    sx={{ 
                      mt: 2,
                      borderRadius: 2,
                      '& .MuiAlert-message': {
                        width: '100%'
                      }
                    }}
                  >
                    <Typography variant="body2">
                      <strong>GPS Location Found!</strong> We've extracted location from your photo.
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                      The detected location will be used for the map marker.
                    </Typography>
                    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                        Coordinates:
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        Latitude: <strong>{extractedCoords.lat.toFixed(6)}</strong>
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        Longitude: <strong>{extractedCoords.lng.toFixed(6)}</strong>
                      </Typography>
                    </Box>
                  </Alert>
                ) : (
                  <Alert 
                    severity="info" 
                    sx={{ 
                      mt: 2,
                      borderRadius: 2,
                      '& .MuiAlert-message': {
                        width: '100%'
                      }
                    }}
                  >
                    <Typography variant="body2">
                      <strong>Location Help:</strong> If you uploaded a photo with GPS data, we'll use that location. 
                      Otherwise, please provide at least the barangay name.
                    </Typography>
                  </Alert>
                )}
              </Box>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 2 : 3 }}>
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                flexWrap: 'wrap',
                flexDirection: isSmallMobile ? 'column' : 'row'
              }}>
                <Box sx={{ 
                  flex: 1, 
                  minWidth: isSmallMobile ? '100%' : 200 
                }}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel htmlFor="reporter-name">Your Name</InputLabel>
                     <OutlinedInput
                       id="reporter-name"
                       value={reporterName}
                       onChange={(e) => {
                         const inputValue = e.target.value;
                         // Only allow letters, spaces, and common name characters (hyphens, apostrophes)
                         const nameValue = inputValue.replace(/[^a-zA-Z\s\-']/g, '');
                         
                         // Show warning if numbers or special characters were removed
                         if (inputValue !== nameValue) {
                           setNameWarning('⚠️ Only letters are allowed in name field');
                           // Clear warning after 3 seconds
                           setTimeout(() => setNameWarning(null), 3000);
                         } else {
                           setNameWarning(null);
                         }
                         
                         setReporterName(nameValue);
                       }}
                       startAdornment={
                         <InputAdornment position="start">
                           <Person color="action" />
                         </InputAdornment>
                       }
                       label="Your Name"
                       sx={{
                         borderRadius: 2,
                         '& .MuiOutlinedInput-root': {
                           fontSize: isMobile ? '0.875rem' : '1rem',
                           '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                             borderColor: '#4caf50',
                             borderWidth: 2
                           },
                           '&:hover .MuiOutlinedInput-notchedOutline': {
                             borderColor: '#66bb6a'
                           }
                         },
                         '& .MuiInputLabel-root.Mui-focused': {
                           color: '#2e7d32'
                         }
                       }}
                     />
                  </FormControl>
                  
                  {/* Name warning */}
                  {nameWarning && (
                    <Alert 
                      severity="warning"
                      sx={{ 
                        mt: 1,
                        borderRadius: 2,
                        fontSize: '0.875rem'
                      }}
                    >
                      {nameWarning}
                    </Alert>
                  )}
                </Box>
                <Box sx={{ 
                  flex: 1, 
                  minWidth: isSmallMobile ? '100%' : 200 
                }}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel htmlFor="contact-number">Contact Number</InputLabel>
                     <OutlinedInput
                       id="contact-number"
                       value={phoneNumber}
                       onChange={(e) => {
                         const inputValue = e.target.value;
                         const phoneNumberValue = inputValue.replace(/[^0-9]/g, '').slice(0, 10);
                         
                         // Show warning if non-numeric characters were removed
                         if (inputValue !== phoneNumberValue) {
                           setPhoneWarning('⚠️ Only numbers are allowed in phone number');
                           // Clear warning after 3 seconds
                           setTimeout(() => setPhoneWarning(null), 3000);
                         } else {
                           setPhoneWarning(null);
                         }
                         
                         const fullNumber = countryCode + phoneNumberValue;
                         setPhoneNumber(phoneNumberValue);
                         setContactNumber(fullNumber);
                       }}
                       startAdornment={
                         <InputAdornment position="start">
                           <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                             <FormControl size="small" sx={{ minWidth: 80 }}>
                               <Select
                                 value={countryCode}
                                 onChange={(e) => {
                                   const newCountryCode = e.target.value;
                                   const fullNumber = newCountryCode + phoneNumber;
                                   setCountryCode(newCountryCode);
                                   setContactNumber(fullNumber);
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
                           <Phone color="action" />
                         </InputAdornment>
                       }
                       label="Contact Number"
                       inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                       error={phoneNumber.length > 0 && phoneNumber.length !== 10}
                       endAdornment={
                         phoneNumber.length > 0 && phoneNumber.length !== 10 ? (
                           <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                             10 digits
                           </Typography>
                         ) : undefined
                       }
                       sx={{
                         borderRadius: 2,
                         '& .MuiOutlinedInput-root': {
                           fontSize: isMobile ? '0.875rem' : '1rem',
                           '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                             borderColor: '#4caf50',
                             borderWidth: 2
                           },
                           '&:hover .MuiOutlinedInput-notchedOutline': {
                             borderColor: '#66bb6a'
                           }
                         },
                         '& .MuiInputLabel-root.Mui-focused': {
                           color: '#2e7d32'
                         }
                       }}
                     />
                  </FormControl>
                  
                  {/* Phone number warning */}
                  {phoneWarning && (
                    <Alert 
                      severity="warning"
                      sx={{ 
                        mt: 1,
                        borderRadius: 2,
                        fontSize: '0.875rem'
                      }}
                    >
                      {phoneWarning}
                    </Alert>
                  )}
                </Box>
              </Box>
              <Box>
                <Alert 
                  severity="info"
                  sx={{ 
                    borderRadius: 2,
                    '& .MuiAlert-message': {
                      width: '100%'
                    }
                  }}
                >
                  <Typography variant="body2">
                    Contact information is required, it helps enforcement officers follow up if needed.
                  </Typography>
                </Alert>
              </Box>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ mt: 2 }}>
            <Paper 
              variant="outlined" 
              sx={{ 
                p: isMobile ? 2 : 3, 
                mb: 3,
                borderRadius: 3,
                border: '2px solid',
                borderColor: '#c8e6c9',
                bgcolor: '#e8f5e8'
              }}
            >
              <Typography 
                variant={isMobile ? "subtitle1" : "h6"} 
                gutterBottom 
                color="#2e7d32"
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontWeight: 600
                }}
              >
                <CheckCircle sx={{ mr: 1, verticalAlign: 'middle' }} />
                Review Your Report
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1.5 : 2 }}>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  flexWrap: 'wrap',
                  flexDirection: isSmallMobile ? 'column' : 'row'
                }}>
                  <Box sx={{ 
                    flex: 1, 
                    minWidth: isSmallMobile ? '100%' : 200 
                  }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#2e7d32', fontWeight: 700 }}>
                      Species
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 'medium',
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    >
                      {speciesName || 'Not provided'}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    flex: 1, 
                    minWidth: isSmallMobile ? '100%' : 200 
                  }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#2e7d32', fontWeight: 700 }}>
                      Location
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 'medium',
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    >
                      {barangay && municipality ? `${barangay}, ${municipality}` : barangay || 'Not provided'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  flexWrap: 'wrap',
                  flexDirection: isSmallMobile ? 'column' : 'row'
                }}>
                  <Box sx={{ 
                    flex: 1, 
                    minWidth: isSmallMobile ? '100%' : 200 
                  }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#2e7d32', fontWeight: 700 }}>
                      Reporter
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 'medium',
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    >
                      {reporterName || 'Anonymous'}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    flex: 1, 
                    minWidth: isSmallMobile ? '100%' : 200 
                  }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5, color: '#2e7d32', fontWeight: 700 }}>
                      Contact
                    </Typography>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 'medium',
                        fontSize: isMobile ? '0.875rem' : '1rem'
                      }}
                    >
                      {contactNumber || 'Not provided'}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5, textAlign: 'center', color: '#2e7d32', fontWeight: 700 }}>
                    Photo
                  </Typography>
                  {photoPreview ? (
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center'
                      }}
                    >
                      <Box
                        component="img"
                        src={photoPreview}
                        alt="Wildlife photo preview"
                        sx={{
                          width: '200px',
                          height: '150px',
                          objectFit: 'cover',
                          borderRadius: 2,
                          border: '2px solid #e0e0e0',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          display: 'block',
                          mx: 'auto',
                          '&:hover': {
                            transform: 'scale(1.02)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            borderColor: '#4caf50'
                          }
                        }}
                        onClick={() => setShowFullscreenPhoto(true)}
                      />
                      <Typography 
                        variant="caption" 
                        sx={{ fontSize: '0.75rem', color: '#2e7d32', fontWeight: 600 }}
                      >
                        Click to view full size
                      </Typography>
                    </Box>
                  ) : (
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 'medium',
                        fontSize: isMobile ? '0.875rem' : '1rem',
                        color: 'text.secondary',
                        textAlign: 'center'
                      }}
                    >
                      No photo uploaded
                    </Typography>
                  )}
                </Box>
              </Box>
            </Paper>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: isMobile ? 2 : 4,
        px: isMobile ? 1 : 2,
        position: 'relative'
      }}
    >
      {/* Animated background species */}
      <Box className="bg-animals">
        {/* Right -> Left */}
        <span className="animal rtl" title="Philippine Eagle" style={{ top: '10%', animationDuration: '22s', animationDelay: '0s', animationName: 'popFloatA' }}>🦅</span>
        <span className="animal rtl" title="Philippine Crocodile" style={{ top: '22%', animationDuration: '27s', animationDelay: '0s', animationName: 'zigZagA' }}>🐊</span>
        <span className="animal rtl" title="Whale Shark" style={{ top: '34%', animationDuration: '24s', animationDelay: '0s', animationName: 'popFloatA' }}>🦈</span>
        <span className="animal rtl" title="Philippine Eagle-Owl" style={{ top: '46%', animationDuration: '29s', animationDelay: '0s', animationName: 'zigZagA' }}>🦉</span>
        <span className="animal rtl" title="Philippine Deer" style={{ top: '58%', animationDuration: '26s', animationDelay: '0s', animationName: 'popFloatA' }}>🦌</span>

        {/* Left -> Right */}
        <span className="animal ltr" title="Hawksbill Turtle" style={{ top: '16%', animationDuration: '24s', animationDelay: '0s', animationName: 'popFloatB' }}>🐢</span>
        <span className="animal ltr" title="Tamaraw" style={{ top: '28%', animationDuration: '26s', animationDelay: '0s', animationName: 'zigZagB' }}>🐃</span>
        <span className="animal ltr" title="Visayan Warty Pig" style={{ top: '40%', animationDuration: '23s', animationDelay: '0s', animationName: 'popFloatB' }}>🐗</span>
        <span className="animal ltr" title="Philippine Tarsier" style={{ top: '52%', animationDuration: '29s', animationDelay: '0s', animationName: 'zigZagB' }}>🐵</span>
        <span className="animal ltr" title="Philippine Hornbill" style={{ top: '64%', animationDuration: '27s', animationDelay: '0s', animationName: 'popFloatB' }}>🐦</span>

        {/* Free-form wanderers */}
        <span className="animal" title="Philippine Freshwater Crocodile" style={{ top: '12%', left: '8%', animationDuration: '26s', animationDelay: '0s', animationName: 'wanderA', animationDirection: 'alternate' }}>🐊</span>
        <span className="animal" title="Rufous Hornbill" style={{ top: '72%', left: '12%', animationDuration: '28s', animationDelay: '0s', animationName: 'wanderB', animationDirection: 'alternate' }}>🐦</span>
        <span className="animal" title="Palawan Peacock-Pheasant" style={{ top: '44%', left: '18%', animationDuration: '24s', animationDelay: '0s', animationName: 'wanderA', animationDirection: 'alternate' }}>🦚</span>
        <span className="animal" title="Green Sea Turtle" style={{ top: '26%', left: '70%', animationDuration: '30s', animationDelay: '0s', animationName: 'wanderB', animationDirection: 'alternate' }}>🐢</span>
      </Box>

      <Container 
        maxWidth="md" 
        sx={{ 
          width: '100%',
          maxWidth: isMobile ? '100%' : 'md',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Fade in timeout={800}>
          <Paper 
            elevation={24} 
            sx={{ 
              p: isMobile ? 3 : 4,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Header */}
            <Box sx={{ position: 'relative', mb: isMobile ? 3 : 4 }}>
              {/* Cancel Button */}
              <Button
                onClick={handleExit}
                variant="outlined"
                size="small"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#d32f2f',
                  borderColor: '#d32f2f',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: 'scale(1)',
                  '&:hover': {
                    background: '#ffebee',
                    borderColor: '#b71c1c',
                    color: '#b71c1c',
                    transform: 'scale(1.05)',
                    boxShadow: '0 4px 12px rgba(211, 47, 47, 0.3)'
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                    transition: 'transform 0.1s ease'
                  }
                }}
              >
                Cancel Form
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Box
                  component="img"
                  src="/images/kinaiyahanlogonobg.png"
                  alt="Kinaiyahan"
                  sx={{
                    width: isMobile ? 72 : 100,
                    height: isMobile ? 72 : 100,
                    mx: 'auto',
                    mb: 2,
                    display: 'block',
                    objectFit: 'contain'
                  }}
                />
              <Typography 
                variant={isMobile ? 'h4' : 'h3'} 
                component="h1" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Kinaiyahan Wildlife Report
              </Typography>
              <Typography 
                variant={isMobile ? 'body1' : 'h6'} 
                color="text.secondary" 
                sx={{ mb: 2 }}
              >
                Report Wildlife Sightings or Rescues
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  maxWidth: 600, 
                  mx: 'auto',
                  lineHeight: 1.6
                }}
              >
                Help protect wildlife by reporting sightings. Your report will be reviewed by enforcement officers.
              </Typography>
              </Box>
            </Box>

            {/* Alerts */}
            <Slide direction="down" in={!!error} timeout={300}>
              <Box>
                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3,
                      borderRadius: 2,
                      '& .MuiAlert-message': {
                        width: '100%'
                      }
                    }} 
                    onClose={() => setError(null)}
                  >
                    {error}
                  </Alert>
                )}
              </Box>
            </Slide>
            

            {/* Stepper */}
            <Box sx={{ mb: isMobile ? 3 : 4 }}>
              <Stepper 
                activeStep={activeStep} 
                orientation={isMobile ? "vertical" : "horizontal"}
                 sx={{ 
                   '& .MuiStepLabel-root': {
                     padding: isMobile ? '8px 0' : '8px 16px'
                   },
                   '& .MuiStepLabel-label': {
                     fontSize: isMobile ? '0.75rem' : '0.875rem',
                     fontWeight: 500
                   },
                   '& .MuiStepIcon-root': {
                     color: '#c8e6c9',
                     '&.Mui-active': {
                       color: '#4caf50'
                     },
                     '&.Mui-completed': {
                       color: '#2e7d32'
                     }
                   },
                   '& .MuiStepLabel-label.Mui-active': {
                     color: '#2e7d32',
                     fontWeight: 600
                   },
                   '& .MuiStepLabel-label.Mui-completed': {
                     color: '#2e7d32'
                   }
                 }}
              >
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Step Content */}
            <Box component="form">
              <Slide 
                direction={stepTransition ? "left" : "right"} 
                in={!stepTransition} 
                timeout={300}
                key={activeStep}
              >
                <Box>
                  <Fade in timeout={400} key={`content-${activeStep}`}>
                    <Box>
                      {renderStepContent(activeStep)}
                    </Box>
                  </Fade>
                </Box>
              </Slide>

              {/* Navigation Buttons */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  mt: isMobile ? 3 : 4,
                  gap: 2,
                  flexDirection: isSmallMobile ? 'column' : 'row'
                }}
              >
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                  variant="outlined"
                  startIcon={<ArrowBack />}
                   sx={{
                     minWidth: isSmallMobile ? '100%' : 120,
                     borderRadius: 2,
                     textTransform: 'none',
                     fontWeight: 600,
                     py: 1.5,
                     color: '#000000',
                     background: '#e8f5e8',
                     border: '2px solid #4caf50',
                     transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                     transform: 'scale(1)',
                     '&:hover': {
                       background: '#c8e6c9',
                       borderColor: '#2e7d32',
                       color: '#000000',
                       transform: 'scale(1.05)',
                       boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)'
                     },
                     '&:active': {
                       transform: 'scale(0.95)',
                       transition: 'transform 0.1s ease'
                     },
                     '&:disabled': {
                       background: '#f5f5f5',
                       color: '#9e9e9e',
                       borderColor: '#e0e0e0',
                       transform: 'scale(1)',
                       boxShadow: 'none'
                     }
                   }}
                >
                  Back
                </Button>
                
                {activeStep === steps.length - 1 ? (
                  <Button
                    type="button"
                    variant="contained"
                    disabled={submitting}
                    onClick={handleSubmit}
                    startIcon={submitting ? null : <CheckCircle />}
                     sx={{ 
                       minWidth: isSmallMobile ? '100%' : 140,
                       borderRadius: 2,
                       textTransform: 'none',
                       fontWeight: 600,
                       py: 1.5,
                       color: '#ffffff',
                       background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
                       transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                       transform: 'scale(1)',
                       position: 'relative',
                       overflow: 'hidden',
                       '&:hover': {
                         background: 'linear-gradient(45deg, #1b5e20 30%, #388e3c 90%)',
                         color: '#ffffff',
                         transform: 'scale(1.05)',
                         boxShadow: '0 8px 25px rgba(46, 125, 50, 0.4)'
                       },
                       '&:active': {
                         transform: 'scale(0.95)',
                         transition: 'transform 0.1s ease'
                       },
                       '&:disabled': {
                         background: '#e0e0e0',
                         color: '#9e9e9e',
                         transform: 'scale(1)',
                         boxShadow: 'none'
                       },
                       '&::before': {
                         content: '""',
                         position: 'absolute',
                         top: 0,
                         left: '-100%',
                         width: '100%',
                         height: '100%',
                         background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                         transition: 'left 0.5s',
                       },
                       '&:hover::before': {
                         left: '100%'
                       }
                     }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Report'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    startIcon={<ArrowForward />}
                     sx={{ 
                       minWidth: isSmallMobile ? '100%' : 120,
                       borderRadius: 2,
                       textTransform: 'none',
                       fontWeight: 600,
                       py: 1.5,
                       color: '#000000',
                       background: '#e8f5e8',
                       border: '2px solid #4caf50',
                       transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                       transform: 'scale(1)',
                       '&:hover': {
                         background: '#c8e6c9',
                         borderColor: '#2e7d32',
                         color: '#000000',
                         transform: 'scale(1.05)',
                         boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)'
                       },
                       '&:active': {
                         transform: 'scale(0.95)',
                         transition: 'transform 0.1s ease'
                       },
                       '&:disabled': {
                         background: '#f5f5f5',
                         color: '#9e9e9e',
                         borderColor: '#e0e0e0',
                         transform: 'scale(1)',
                         boxShadow: 'none'
                       }
                     }}
                  >
                    Next
                  </Button>
                )}
              </Box>
            </Box>

            {/* Progress Indicator */}
            <Box sx={{ mt: isMobile ? 3 : 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ mb: 1, color: '#2e7d32', fontWeight: 700 }}>
                Step {activeStep + 1} of {steps.length}
              </Typography>
              <Box 
                sx={{ 
                  width: '100%', 
                  bgcolor: 'grey.200', 
                  borderRadius: 2, 
                  height: 8, 
                  overflow: 'hidden',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <Box 
                  sx={{ 
                    background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
                    height: '100%', 
                    borderRadius: 2,
                    width: `${((activeStep + 1) / steps.length) * 100}%`,
                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
                  }} 
                />
              </Box>
            </Box>
          </Paper>
        </Fade>
      </Container>

      {/* Success Modal */}
      <Modal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: {
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(8px)',
          }
        }}
      >
        <Fade in={showSuccessModal} timeout={600}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '90%' : 500,
              bgcolor: 'background.paper',
              borderRadius: 4,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              p: isMobile ? 3 : 4,
              outline: 'none',
              border: '2px solid #4caf50',
              animation: showSuccessModal ? 'modalBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)' : 'none',
              '@keyframes modalBounce': {
                '0%': {
                  transform: 'translate(-50%, -50%) scale(0.3)',
                  opacity: 0,
                },
                '50%': {
                  transform: 'translate(-50%, -50%) scale(1.05)',
                  opacity: 0.8,
                },
                '100%': {
                  transform: 'translate(-50%, -50%) scale(1)',
                  opacity: 1,
                },
              },
            }}
          >
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Avatar 
                sx={{ 
                  bgcolor: '#4caf50', 
                  width: isMobile ? 64 : 80, 
                  height: isMobile ? 64 : 80, 
                  mx: 'auto', 
                  mb: 2,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
                }}
              >
                <CheckCircle fontSize="large" />
              </Avatar>
              <Typography 
                variant={isMobile ? 'h5' : 'h4'} 
                component="h2" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  color: '#2e7d32'
                }}
              >
                Report Submitted Successfully!
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 2,
                  borderRadius: 2,
                  '& .MuiAlert-message': {
                    width: '100%'
                  }
                }}
              >
                <Typography variant="body2">
                  <strong>Report submitted successfully!</strong> It will appear as pending for enforcement review.
                </Typography>
              </Alert>
              
              <Alert 
                severity="info" 
                sx={{ 
                  borderRadius: 2,
                  '& .MuiAlert-message': {
                    width: '100%'
                  }
                }}
              >
                <Typography variant="body2">
                  Your report will be submitted as <strong>"Reported"</strong> status and will appear on the map 
                  for enforcement officers to review and update.
                </Typography>
              </Alert>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  // Form is already reset after successful submission
                }}
                variant="contained"
                sx={{ 
                  minWidth: 120,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  color: '#ffffff',
                  background: 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: 'scale(1)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1b5e20 30%, #388e3c 90%)',
                    color: '#ffffff',
                    transform: 'scale(1.05)',
                    boxShadow: '0 8px 25px rgba(46, 125, 50, 0.4)'
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                    transition: 'transform 0.1s ease'
                  }
                }}
              >
                Submit Another Report
              </Button>
              
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate('/login');
                }}
                variant="outlined"
                sx={{ 
                  minWidth: 120,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  py: 1.5,
                  color: '#2e7d32',
                  borderColor: '#2e7d32',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: 'scale(1)',
                  '&:hover': {
                    borderColor: '#1b5e20',
                    color: '#1b5e20',
                    backgroundColor: 'rgba(46, 125, 50, 0.04)',
                    transform: 'scale(1.05)',
                    boxShadow: '0 8px 25px rgba(46, 125, 50, 0.2)'
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                    transition: 'transform 0.1s ease'
                  }
                }}
              >
                Go Back to Login
              </Button>
            </Box>
          </Box>
        </Fade>
      </Modal>

      {/* Camera Modal */}
      <Modal
        open={showCamera}
        onClose={stopCamera}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: {
            background: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(8px)',
          }
        }}
      >
        <Fade in={showCamera} timeout={300}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: isMobile ? '95%' : 800,
              height: isMobile ? '85%' : 700,
              maxWidth: '95vw',
              maxHeight: '90vh',
              bgcolor: 'black',
              borderRadius: 2,
              overflow: 'hidden',
              outline: 'none',
            }}
          >
            <Box sx={{ position: 'relative', height: '100%' }}>
              <video
                id="camera-video"
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                ref={(video) => {
                  if (video && cameraStream) {
                    video.srcObject = cameraStream;
                  }
                }}
              />
              
              {/* Camera Controls */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  p: 3,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 2
                }}
              >
                <Button
                  onClick={stopCamera}
                  variant="outlined"
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': {
                      borderColor: '#ffebee',
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  Cancel
                </Button>
                
                <Button
                  onClick={capturePhoto}
                  variant="contained"
                  sx={{
                    background: '#4caf50',
                    '&:hover': {
                      background: '#388e3c'
                    },
                    minWidth: 120
                  }}
                >
                  Capture
                </Button>
              </Box>
              
              {/* Location Permission Status */}
              {locationPermission !== null && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    right: 16,
                    background: locationPermission ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)',
                    color: 'white',
                    p: 1,
                    borderRadius: 1,
                    textAlign: 'center',
                    fontSize: '0.875rem'
                  }}
                >
                  {locationPermission ? '✓ Location enabled' : '⚠ Location disabled - GPS data may not be accurate'}
                </Box>
              )}
            </Box>
          </Box>
        </Fade>
      </Modal>
      {/* Fullscreen Photo Modal */}
      <Modal
        open={showFullscreenPhoto}
        onClose={() => setShowFullscreenPhoto(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: { backgroundColor: 'rgba(0,0,0,0.9)' }
        }}
      >
        <Fade in={showFullscreenPhoto}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90vw',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none'
            }}
          >
            {photoPreview && (
              <Box
                component="img"
                src={photoPreview}
                alt="Wildlife photo full size"
                sx={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: 2,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                }}
              />
            )}
            <Button
              onClick={() => setShowFullscreenPhoto(false)}
              variant="outlined"
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: '#ffebee',
                  background: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Close
            </Button>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
}