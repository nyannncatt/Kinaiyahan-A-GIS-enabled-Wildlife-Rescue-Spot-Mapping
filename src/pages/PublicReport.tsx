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
  Backdrop
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
import { createWildlifeRecordPublic } from '../services/wildlifeRecords';
import exifr from 'exifr';

function extractLatLngFromExif(file: File): Promise<{ lat?: number; lng?: number } | null> {
  return new Promise(async (resolve) => {
    try {
      const exifData = await exifr.parse(file, { gps: true });
      
      if (exifData && exifData.latitude && exifData.longitude) {
        resolve({
          lat: exifData.latitude,
          lng: exifData.longitude
        });
      } else {
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
  const [municipality, setMunicipality] = useState('');
  const [speciesName, setSpeciesName] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [stepTransition, setStepTransition] = useState(false);
  const [extractedCoords, setExtractedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);

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
          console.log('GPS coordinates extracted:', coords);
        } else {
          setExtractedCoords(null);
          console.log('No GPS data found in photo');
        }
      } catch (error) {
        console.error('Error extracting GPS data:', error);
        setExtractedCoords(null);
      }
    }
  };

  const handleNext = () => {
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
          setLocationPermission(true);
          return true;
        } else if (permission.state === 'prompt') {
          // Request permission
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => {
                setLocationPermission(true);
                resolve(true);
              },
              () => {
                setLocationPermission(false);
                resolve(false);
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

  const capturePhoto = () => {
    const video = document.getElementById('camera-video') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (video && context) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
          handlePhotoChange({ target: { files: [file] } } as any);
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
      
      // Use extracted coordinates if available
      if (extractedCoords) {
        lat = extractedCoords.lat;
        lng = extractedCoords.lng;
        console.log('Using extracted GPS coordinates:', { lat, lng });
      }

      // Fallback to default location if no GPS data available
      if (lat == null || lng == null) {
        lat = 8.371964645263802; // Manolo Fortich center
        lng = 124.85604137091526;
        console.log('Using default coordinates (Manolo Fortich center):', { lat, lng });
      }

      const created = await createWildlifeRecordPublic({
        species_name: speciesName.trim(),
        latitude: lat,
        longitude: lng,
        barangay: barangay || undefined,
        municipality: municipality || undefined,
        reporter_name: reporterName || undefined,
        contact_number: contactNumber || undefined,
        photo_url: undefined, // Public flow skips upload to keep simple
        timestamp_captured: todayIso,
      });

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
                    p: isMobile ? 2 : 3, 
                    textAlign: 'center',
                    border: '2px dashed',
                    borderColor: photoFile ? 'success.main' : 'grey.300',
                    bgcolor: photoFile ? 'success.50' : 'grey.50',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: photoFile ? 'success.dark' : '#4caf50',
                      bgcolor: photoFile ? 'success.100' : '#e8f5e8'
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
                  
                  <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
                    <label htmlFor="photo-upload">
                      <IconButton 
                        color="primary" 
                        component="span" 
                        size={isMobile ? "medium" : "large"}
                        sx={{ 
                          '&:hover': {
                            transform: 'scale(1.1)',
                            transition: 'transform 0.2s ease'
                          }
                        }}
                      >
                        <PhotoCamera fontSize={isMobile ? "medium" : "large"} />
                      </IconButton>
                    </label>
                    
                    <IconButton 
                      color="primary" 
                      onClick={startCamera}
                      size={isMobile ? "medium" : "large"}
                      sx={{ 
                        '&:hover': {
                          transform: 'scale(1.1)',
                          transition: 'transform 0.2s ease'
                        }
                      }}
                    >
                      <CameraAlt fontSize={isMobile ? "medium" : "large"} />
                    </IconButton>
                  </Box>
                  
                  <Typography variant={isMobile ? "subtitle1" : "h6"} gutterBottom>
                    {photoFile ? 'Photo Selected' : 'Upload or Take Photo'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {photoFile ? photoFile.name : 'Choose from gallery or take a new photo with GPS location'}
                  </Typography>
                  
                  {photoPreview && (
                    <Box sx={{ mt: 2 }}>
                      <img 
                        src={photoPreview} 
                        alt="Preview" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: isMobile ? 150 : 200, 
                          borderRadius: 12,
                          objectFit: 'cover',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                        }} 
                      />
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
                    <InputLabel htmlFor="barangay">Barangay *</InputLabel>
                     <OutlinedInput
                       id="barangay"
                       value={barangay}
                       onChange={(e) => setBarangay(e.target.value)}
                       startAdornment={
                         <InputAdornment position="start">
                           <LocationOn color="action" />
                         </InputAdornment>
                       }
                       label="Barangay *"
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
                <Box sx={{ 
                  flex: 1, 
                  minWidth: isSmallMobile ? '100%' : 200 
                }}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel htmlFor="municipality">Municipality</InputLabel>
                     <OutlinedInput
                       id="municipality"
                       value={municipality}
                       onChange={(e) => setMunicipality(e.target.value)}
                       startAdornment={
                         <InputAdornment position="start">
                           <LocationOn color="action" />
                         </InputAdornment>
                       }
                       label="Municipality"
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
                      {extractedCoords.lat.toFixed(6)}, {extractedCoords.lng.toFixed(6)}
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
                       value={contactNumber}
                       onChange={(e) => setContactNumber(e.target.value)}
                       startAdornment={
                         <InputAdornment position="start">
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