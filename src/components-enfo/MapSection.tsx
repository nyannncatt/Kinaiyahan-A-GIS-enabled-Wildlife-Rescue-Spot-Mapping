import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import SatelliteAltOutlinedIcon from '@mui/icons-material/SatelliteAltOutlined';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import MapViewWithBackend from './MapViewWithBackend';
import { motion } from 'framer-motion';

interface MapSectionProps {
  pendingCount: number;
  onScrollToRecordList: () => void;
  onScrollToPendingReports: () => void;
  onModalOpenChange?: (isOpen: boolean) => void;
  environmentalBg?: boolean;
  onDispersalModeChange?: (isActive: boolean) => void;
  onRelocationModeChange?: (isActive: boolean) => void;
}

export default function MapSection({ pendingCount, onScrollToRecordList, onScrollToPendingReports, onModalOpenChange, environmentalBg, onDispersalModeChange, onRelocationModeChange }: MapSectionProps) {
  // State to track selected map skin
  const [skin, setSkin] = useState<"streets" | "dark" | "satellite">("streets");

  return (
    <>
      {/* Map Header */}
      <br></br>
      <Typography component="h2" variant="h6" sx={{ mb: 2, mt: 4, color: '#2e7d32 !important', fontWeight: 600 }}>
        Wildlife Rescue Map
      </Typography>

      {/* Skin Switch (icon-only, no background) */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <IconButton
          size="small"
          aria-label="Streets"
          aria-pressed={skin === 'streets'}
          onClick={() => setSkin('streets')}
          title="Streets"
          sx={{
            color: skin === 'streets' ? '#fff' : '#666',
            backgroundColor: skin === 'streets' ? '#4caf50' : 'transparent',
            position: 'relative',
            '&:hover': {
              backgroundColor: skin === 'streets' ? '#2e7d32' : 'rgba(76, 175, 80, 0.1)',
              '&::after': {
                content: '"Streets"',
                position: 'absolute',
                bottom: '-25px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                pointerEvents: 'none',
              },
            },
          }}
        >
          <MapOutlinedIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          aria-label="Dark"
          aria-pressed={skin === 'dark'}
          onClick={() => setSkin('dark')}
          title="Dark"
          sx={{
            color: skin === 'dark' ? '#fff' : '#666',
            backgroundColor: skin === 'dark' ? '#4caf50' : 'transparent',
            position: 'relative',
            '&:hover': {
              backgroundColor: skin === 'dark' ? '#2e7d32' : 'rgba(76, 175, 80, 0.1)',
              '&::after': {
                content: '"Dark"',
                position: 'absolute',
                bottom: '-25px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                pointerEvents: 'none',
              },
            },
          }}
        >
          <DarkModeOutlinedIcon fontSize="small" />
        </IconButton>

        <IconButton
          size="small"
          aria-label="Satellite"
          aria-pressed={skin === 'satellite'}
          onClick={() => setSkin('satellite')}
          title="Satellite"
          sx={{
            color: skin === 'satellite' ? '#fff' : '#666',
            backgroundColor: skin === 'satellite' ? '#4caf50' : 'transparent',
            position: 'relative',
            '&:hover': {
              backgroundColor: skin === 'satellite' ? '#2e7d32' : 'rgba(76, 175, 80, 0.1)',
              '&::after': {
                content: '"Satellite"',
                position: 'absolute',
                bottom: '-25px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                pointerEvents: 'none',
              },
            },
          }}
        >
          <SatelliteAltOutlinedIcon fontSize="small" />
        </IconButton>

        {/* View Record List Button */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<ListAltIcon />}
          onClick={onScrollToRecordList}
          sx={{
            ml: 2,
            textTransform: 'none',
            fontWeight: 500,
            borderColor: '#4caf50',
            color: '#1b5e20',
            '&:hover': {
              backgroundColor: '#4caf50',
              color: 'white',
              borderColor: '#4caf50',
            }
          }}
        >
          View Record List
        </Button>

        {/* Pending Reports Button */}
        <Button
          variant="outlined"
          size="small"
          startIcon={
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              <PendingActionsIcon />
              {pendingCount > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: -120,
                    transform: 'scale(1) translate(50%, -50%)',
                    transformOrigin: '100% 0%',
                    minWidth: 20,
                    height: 20,
                    borderRadius: '10px',
                    backgroundColor: '#d32f2f',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '0 6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    border: '2px solid white',
                  }}
                >
                  {pendingCount}
                </Box>
              )}
            </Box>
          }
          onClick={onScrollToPendingReports}
          sx={{
            ml: 1,
            textTransform: 'none',
            fontWeight: 500,
            borderColor: pendingCount > 0 ? 'warning.main' : 'text.secondary',
            color: pendingCount > 0 ? 'warning.main' : 'text.secondary',
            '&:hover': {
              backgroundColor: pendingCount > 0 ? 'warning.main' : 'action.hover',
              color: pendingCount > 0 ? 'white' : 'text.primary',
              borderColor: pendingCount > 0 ? 'warning.main' : 'text.secondary',
            }
          }}
        >
          Pending Reports
        </Button>
      </Stack>

      {/* Map Container */}
      <Box 
        component={motion.div}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        data-map-container
        sx={{ 
          height: 700, 
          width: '100%',
          border: '2px solid #4caf50',
          backgroundColor: 'background.paper'
        }}
      >
         <MapViewWithBackend skin={skin} onModalOpenChange={onModalOpenChange} environmentalBg={environmentalBg} onDispersalModeChange={onDispersalModeChange} onRelocationModeChange={onRelocationModeChange} />
      </Box>
    </>
  );
}

