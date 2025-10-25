import React, { useMemo, useState } from 'react';
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
  Pets,
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
      const exifData = await exifr.parse(file, { gps: true });
      console.log('Raw EXIF data:', exifData);
      
      if (exifData && exifData.latitude && exifData.longitude) {
        console.log('GPS coordinates found:', { 
          latitude: exifData.latitude, 
          longitude: exifData.longitude,
          latType: typeof exifData.latitude,
          lngType: typeof exifData.longitude
        });
        resolve({
          lat: exifData.latitude,
          lng: exifData.longitude
        });
      } else {
        console.log('No GPS data found in EXIF');
        resolve(null);
      }
    } catch (error) {
      console.log('EXIF extraction failed:', error);
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
  const [activeStep, setActiveStep] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [stepTransition, setStepTransition] = useState(false);
  const [extractedCoords, setExtractedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hasExifGps, setHasExifGps] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const todayIso = useMemo(() => new Date().toISOString(), []);

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
    // More accurate coordinate ranges for Manolo Fortich barangays
    // Based on actual geographic boundaries
    const barangayBounds = [
      // Updated bounds based on accurate coordinates
      { name: 'Agusan Canyon', latMin: 8.38, latMax: 8.40, lngMin: 124.88, lngMax: 124.89 },
      { name: 'Alae', latMin: 8.42, latMax: 8.43, lngMin: 124.81, lngMax: 124.82 },
      { name: 'Dahilayan', latMin: 8.21, latMax: 8.23, lngMin: 124.84, lngMax: 124.86 },
      { name: 'Dalirig', latMin: 8.37, latMax: 8.38, lngMin: 124.90, lngMax: 124.91 },
      { name: 'Damilag', latMin: 8.35, latMax: 8.36, lngMin: 124.81, lngMax: 124.82 },
      { name: 'Diclum', latMin: 8.36, latMax: 8.37, lngMin: 124.85, lngMax: 124.86 },
      { name: 'Guilang-guilang', latMin: 8.36, latMax: 8.37, lngMin: 124.86, lngMax: 124.87 },
      { name: 'Kalugmanan', latMin: 8.27, latMax: 8.28, lngMin: 124.85, lngMax: 124.86 },
      { name: 'Lindaban', latMin: 8.29, latMax: 8.30, lngMin: 124.84, lngMax: 124.85 },
      { name: 'Lingion', latMin: 8.40, latMax: 8.41, lngMin: 124.88, lngMax: 124.89 },
      { name: 'Lunocan', latMin: 8.41, latMax: 8.42, lngMin: 124.82, lngMax: 124.83 },
      { name: 'Maluko', latMin: 8.37, latMax: 8.38, lngMin: 124.95, lngMax: 124.96 },
      { name: 'Mambatangan', latMin: 8.43, latMax: 8.44, lngMin: 124.80, lngMax: 124.81 },
      { name: 'Mampayag', latMin: 8.26, latMax: 8.27, lngMin: 124.82, lngMax: 124.83 },
      { name: 'Minsuro', latMin: 8.51, latMax: 8.52, lngMin: 124.82, lngMax: 124.83 },
      { name: 'Mantibugao', latMin: 8.45, latMax: 8.47, lngMin: 124.82, lngMax: 124.83 },
      { name: 'Tankulan (Pob.)', latMin: 8.36, latMax: 8.37, lngMin: 124.86, lngMax: 124.87 },
      { name: 'San Miguel', latMin: 8.38, latMax: 8.39, lngMin: 124.83, lngMax: 124.84 },
      { name: 'Sankanan', latMin: 8.31, latMax: 8.32, lngMin: 124.85, lngMax: 124.86 },
      { name: 'Santiago', latMin: 8.43, latMax: 8.44, lngMin: 124.99, lngMax: 125.00 },
      { name: 'Santo Niño', latMin: 8.43, latMax: 8.44, lngMin: 124.86, lngMax: 124.87 },
      { name: 'Ticala', latMin: 8.34, latMax: 8.35, lngMin: 124.89, lngMax: 124.90 }
    ];

    // Find the barangay that contains these coordinates
    for (const barangay of barangayBounds) {
      if (lat >= barangay.latMin && lat <= barangay.latMax && 
          lng >= barangay.lngMin && lng <= barangay.lngMax) {
        console.log(`Found barangay ${barangay.name} for coordinates ${lat}, ${lng}`);
        return barangay.name;
      }
    }

    // If no specific match, try to find the closest one based on distance
    let closestBarangay = '';
    let minDistance = Infinity;

    for (const barangay of barangayBounds) {
      const centerLat = (barangay.latMin + barangay.latMax) / 2;
      const centerLng = (barangay.lngMin + barangay.lngMax) / 2;
      const distance = Math.sqrt(Math.pow(lat - centerLat, 2) + Math.pow(lng - centerLng, 2));
      
      if (distance < minDistance) {
        minDistance = distance;
        closestBarangay = barangay.name;
      }
    }

    console.log(`No exact match found, closest barangay: ${closestBarangay} (distance: ${minDistance})`);
    return closestBarangay;
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    console.log('Starting reverse geocoding for coordinates:', { lat, lng });
    
    // First, try coordinate-based mapping
    const coordinateBarangay = getBarangayFromCoordinates(lat, lng);
    if (coordinateBarangay) {
      console.log('Found barangay from coordinates:', coordinateBarangay);
      setMunicipality('Manolo Fortich');
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
        }
        
        // Auto-populate barangay with improved matching
        if (extractedBarangay) {
          const predefinedBarangays = [
            'Agusan Canyon', 'Alae', 'Dahilayan', 'Dalirig', 'Damilag', 'Diclum',
            'Guilang-guilang', 'Kalugmanan', 'Lindaban', 'Lingion', 'Lunocan',
            'Maluko', 'Mambatangan', 'Mampayag', 'Minsuro', 'Mantibugao',
            'Tankulan (Pob.)', 'San Miguel', 'Sankanan', 'Santiago', 'Santo Niño', 'Ticala'
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
      'Ticala': { lat: 8.341200, lng: 124.891100 }
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
        if (coords && coords.lat && coords.lng) {
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
    // Check if photo is required for step 0 (Wildlife Information)
    if (activeStep === 0 && !photoFile) {
      setError('⚠️ Please upload or take a photo before proceeding to the next step.');
      return;
    }
    
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
    setMunicipality('');
    setSpeciesName('');
    setReporterName('');
    setContactNumber('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setExtractedCoords(null);
    setCurrentLocation(null);
    setShowCamera(false);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setLocationPermission(null);
    setActiveStep(0);
    setError(null);
    setSuccess(null);
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
        return speciesName.trim() !== '';
      case 1:
        return barangay.trim() !== '' || photoFile !== null || extractedCoords !== null;
      case 2:
        return true; // Contact info is optional
      case 3:
        return speciesName.trim() !== '' && (barangay.trim() !== '' || photoFile !== null || extractedCoords !== null);
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
      } else if (barangay.trim()) {
        // Use barangay-specific coordinates if no GPS data but barangay is selected
        const barangayCoords = getBarangayCoordinates(barangay);
        if (barangayCoords) {
          lat = barangayCoords.lat;
          lng = barangayCoords.lng;
          console.log('Using barangay-specific coordinates for', barangay, ':', { lat, lng });
        } else {
          // Fallback to default location if barangay not found
          lat = 8.371964645263802; // Manolo Fortich center
          lng = 124.85604137091526;
          console.log('Barangay not found, using default coordinates (Manolo Fortich center):', { lat, lng });
        }
      } else {
        // Fallback to default location if no GPS data and no barangay selected
        lat = 8.371964645263802; // Manolo Fortich center
        lng = 124.85604137091526;
        console.log('No GPS data and no barangay selected, using default coordinates (Manolo Fortich center):', { lat, lng });
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
        timestamp_captured: todayIso,
      });
      
      console.log('Created record:', created);
      console.log('Record coordinates:', { lat: created.latitude, lng: created.longitude });

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
                     startAdornment={
                       <InputAdornment position="start">
                         <Pets color="action" />
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
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            bgcolor: photoFile ? '#2e7d32' : '#4caf50',
                            borderColor: photoFile ? '#1b5e20' : '#2e7d32'
                          }
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
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
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
                          '&:hover': {
                            bgcolor: '#2e7d32',
                            transform: 'translateY(-1px)'
                          }
                        }}
                      >
                        Choose File
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
                      {photoFile ? photoFile.name : 'Upload from gallery or capture with GPS location'}
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
                        <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 600, mb: 0.5 }}>
                          📍 GPS Location Ready
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#4caf50', fontFamily: 'monospace' }}>
                          Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
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
                      {hasExifGps ? 'Municipality (from photo GPS)' : 'Municipality'}
                    </InputLabel>
                    <Select
                      id="municipality"
                      value={municipality}
                      onChange={(e) => setMunicipality(e.target.value)}
                      label={hasExifGps ? 'Municipality (from photo GPS)' : 'Municipality'}
                      disabled={hasExifGps === true}
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
                      {hasExifGps ? 'Barangay (from photo GPS) *' : 'Barangay *'}
                    </InputLabel>
                    <Select
                      id="barangay"
                      value={barangay}
                      onChange={(e) => setBarangay(e.target.value)}
                      label={hasExifGps ? 'Barangay (from photo GPS) *' : 'Barangay *'}
                      required
                      disabled={hasExifGps === true}
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
                      <MenuItem value="Agusan Canyon">Agusan Canyon</MenuItem>
                      <MenuItem value="Alae">Alae</MenuItem>
                      <MenuItem value="Dahilayan">Dahilayan</MenuItem>
                      <MenuItem value="Dalirig">Dalirig</MenuItem>
                      <MenuItem value="Damilag">Damilag</MenuItem>
                      <MenuItem value="Diclum">Diclum</MenuItem>
                      <MenuItem value="Guilang-guilang">Guilang-guilang</MenuItem>
                      <MenuItem value="Kalugmanan">Kalugmanan</MenuItem>
                      <MenuItem value="Lindaban">Lindaban</MenuItem>
                      <MenuItem value="Lingion">Lingion</MenuItem>
                      <MenuItem value="Lunocan">Lunocan</MenuItem>
                      <MenuItem value="Maluko">Maluko</MenuItem>
                      <MenuItem value="Mambatangan">Mambatangan</MenuItem>
                      <MenuItem value="Mampayag">Mampayag</MenuItem>
                      <MenuItem value="Minsuro">Minsuro</MenuItem>
                      <MenuItem value="Mantibugao">Mantibugao</MenuItem>
                      <MenuItem value="Tankulan (Pob.)">Tankulan (Pob.)</MenuItem>
                      <MenuItem value="San Miguel">San Miguel</MenuItem>
                      <MenuItem value="Sankanan">Sankanan</MenuItem>
                      <MenuItem value="Santiago">Santiago</MenuItem>
                      <MenuItem value="Santo Niño">Santo Niño</MenuItem>
                      <MenuItem value="Ticala">Ticala</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              
              {/* EXIF GPS Data Help Message */}
              {hasExifGps === true && (
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
                      <strong>Location Auto-filled from Photo GPS:</strong> The municipality and barangay fields have been automatically filled using the GPS coordinates from your photo. These fields are disabled because the GPS data is more accurate than manual selection.
                    </Typography>
                  </Alert>
                </Box>
              )}
              
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
              
              {/* Barangay Location Preview */}
              {hasExifGps === false && barangay && (
                <Box sx={{ mt: 2 }}>
                  <Alert 
                    severity="success" 
                    sx={{ 
                      borderRadius: 2,
                      '& .MuiAlert-message': {
                        width: '100%'
                      }
                    }}
                  >
                    <Typography variant="body2">
                      <strong>Selected Location:</strong> {barangay}, {municipality}
                    </Typography>
                    {(() => {
                      const coords = getBarangayCoordinates(barangay);
                      return coords ? (
                        <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.05)', p: 1, borderRadius: 1 }}>
                          <strong>Map Coordinates:</strong> {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                        </Typography>
                      ) : null;
                    })()}
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
                      <strong>GPS Location Found!</strong> We've extracted coordinates from your photo:
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace', bgcolor: 'rgba(0,0,0,0.05)', p: 1, borderRadius: 1 }}>
                      <strong>Latitude:</strong> {extractedCoords.lat.toFixed(8)}<br/>
                      <strong>Longitude:</strong> {extractedCoords.lng.toFixed(8)}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                      These coordinates will be used for the map marker location.
                    </Typography>
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
                       onChange={(e) => setReporterName(e.target.value)}
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
                         const phoneNumberValue = e.target.value;
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
                    Contact information is optional but helps enforcement officers follow up if needed.
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
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
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
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
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
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
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
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
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
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Photo
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 'medium',
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  >
                    {photoFile ? photoFile.name : 'No photo uploaded'}
                  </Typography>
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
      }}
    >
      <Container 
        maxWidth="md" 
        sx={{ 
          width: '100%',
          maxWidth: isMobile ? '100%' : 'md'
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
                <Avatar 
                  sx={{ 
                    bgcolor: '#4caf50', 
                    width: isMobile ? 56 : 80, 
                    height: isMobile ? 56 : 80, 
                    mx: 'auto', 
                    mb: 2,
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
                  }}
                >
                  <Pets fontSize="large" />
                </Avatar>
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
                Wildlife Report
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
                    disabled={submitting || !isStepValid(activeStep)}
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
                    disabled={!isStepValid(activeStep)}
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
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
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

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                onClick={() => {
                  setShowSuccessModal(false);
                  handleReset();
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
              width: isMobile ? '95%' : 600,
              height: isMobile ? '70%' : 500,
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
    </Box>
  );
}