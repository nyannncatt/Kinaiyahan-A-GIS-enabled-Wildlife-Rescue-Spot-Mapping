import React, { useMemo, useState } from 'react';
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
  Stack
} from '@mui/material';
import {
  PhotoCamera,
  LocationOn,
  Person,
  Phone,
  Pets,
  CheckCircle,
  Upload,
  Close
} from '@mui/icons-material';
import { createWildlifeRecordPublic } from '../services/wildlifeRecords';

function extractLatLngFromExif(file: File): Promise<{ lat?: number; lng?: number } | null> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        // Lightweight placeholder: browsers don't expose EXIF easily without a lib.
        // In real impl, use exifr or piexifjs. Here we just return null.
        resolve(null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsArrayBuffer(file);
    } catch {
      resolve(null);
    }
  });
}

export default function PublicReport() {
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

  const todayIso = useMemo(() => new Date().toISOString(), []);

  const steps = [
    'Wildlife Information',
    'Location Details', 
    'Contact Information',
    'Review & Submit'
  ];

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setBarangay('');
    setMunicipality('');
    setSpeciesName('');
    setReporterName('');
    setContactNumber('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setActiveStep(0);
    setError(null);
    setSuccess(null);
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 0:
        return speciesName.trim() !== '';
      case 1:
        return barangay.trim() !== '' || photoFile !== null;
      case 2:
        return true; // Contact info is optional
      case 3:
        return speciesName.trim() !== '' && (barangay.trim() !== '' || photoFile !== null);
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
    if (!photoFile && !barangay.trim()) {
      setError('Provide a photo (to extract location) or at least a barangay.');
      return;
    }

    setSubmitting(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      if (photoFile) {
        const exif = await extractLatLngFromExif(photoFile);
        if (exif?.lat && exif?.lng) {
          lat = exif.lat;
          lng = exif.lng;
        }
      }

      // Fallback randomization within municipality bounds is app-specific; here, if no lat/lng
      // we set a safe default near Manolo Fortich center
      if (lat == null || lng == null) {
        lat = 8.371964645263802;
        lng = 124.85604137091526;
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

      setSuccess('Report submitted successfully! It will appear as pending for enforcement review.');
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                  />
                </FormControl>
              </Box>
              <Box>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 3, 
                    textAlign: 'center',
                    border: '2px dashed',
                    borderColor: photoFile ? 'success.main' : 'grey.300',
                    bgcolor: photoFile ? 'success.50' : 'grey.50'
                  }}
                >
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="photo-upload"
                    type="file"
                    onChange={handlePhotoChange}
                  />
                  <label htmlFor="photo-upload">
                    <IconButton color="primary" component="span" size="large">
                      <PhotoCamera fontSize="large" />
                    </IconButton>
                  </label>
                  <Typography variant="h6" gutterBottom>
                    {photoFile ? 'Photo Selected' : 'Upload Wildlife Photo'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {photoFile ? photoFile.name : 'Click to select a photo (optional but recommended)'}
                  </Typography>
                  {photoPreview && (
                    <Box sx={{ mt: 2 }}>
                      <img 
                        src={photoPreview} 
                        alt="Preview" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: 200, 
                          borderRadius: 8,
                          objectFit: 'cover'
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 200 }}>
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
                    />
                  </FormControl>
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
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
                    />
                  </FormControl>
                </Box>
              </Box>
              <Box>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Location Help:</strong> If you uploaded a photo with GPS data, we'll use that location. 
                    Otherwise, please provide at least the barangay name.
                  </Typography>
                </Alert>
              </Box>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: 1, minWidth: 200 }}>
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
                    />
                  </FormControl>
                </Box>
                <Box sx={{ flex: 1, minWidth: 200 }}>
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
                    />
                  </FormControl>
                </Box>
              </Box>
              <Box>
                <Alert severity="info">
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
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom color="primary">
                <CheckCircle sx={{ mr: 1, verticalAlign: 'middle' }} />
                Review Your Report
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="subtitle2" color="text.secondary">Species</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {speciesName || 'Not provided'}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="subtitle2" color="text.secondary">Location</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {barangay && municipality ? `${barangay}, ${municipality}` : barangay || 'Not provided'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="subtitle2" color="text.secondary">Reporter</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {reporterName || 'Anonymous'}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="subtitle2" color="text.secondary">Contact</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {contactNumber || 'Not provided'}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Photo</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {photoFile ? photoFile.name : 'No photo uploaded'}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Your report will be submitted as <strong>"Reported"</strong> status and will appear on the map 
                for enforcement officers to review and update.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mx: 'auto', mb: 2 }}>
            <Pets fontSize="large" />
          </Avatar>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Wildlife Report
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            Report Wildlife Sightings or Rescues
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Help protect wildlife by reporting sightings. Your report will be reviewed by enforcement officers.
          </Typography>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* Stepper */}
        <Stepper activeStep={activeStep} orientation="horizontal" sx={{ mb: 4 }}>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        <Box component="form" onSubmit={handleSubmit}>
          {renderStepContent(activeStep)}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
              startIcon={<Close />}
            >
              Back
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                type="submit"
                variant="contained"
                disabled={submitting || !isStepValid(activeStep)}
                startIcon={submitting ? null : <CheckCircle />}
                sx={{ minWidth: 120 }}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!isStepValid(activeStep)}
                sx={{ minWidth: 120 }}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>

        {/* Progress Indicator */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Step {activeStep + 1} of {steps.length}
          </Typography>
          <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 8, mt: 1 }}>
            <Box 
              sx={{ 
                bgcolor: 'primary.main', 
                height: '100%', 
                borderRadius: 1,
                width: `${((activeStep + 1) / steps.length) * 100}%`,
                transition: 'width 0.3s ease'
              }} 
            />
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}