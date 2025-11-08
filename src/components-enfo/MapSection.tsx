import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
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
}

export default function MapSection({ pendingCount, onScrollToRecordList, onScrollToPendingReports }: MapSectionProps) {
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
        <Tooltip title="Streets" placement="top" enterDelay={2000} enterNextDelay={2000}>
          <IconButton
            size="small"
            aria-label="Streets"
            aria-pressed={skin === 'streets'}
            onClick={() => setSkin('streets')}
            sx={(theme) => ({
              color: skin === 'streets' ? theme.palette.primary.contrastText : theme.palette.text.secondary,
              backgroundColor: skin === 'streets' ? theme.palette.primary.main : 'transparent',
              '&:hover': {
                backgroundColor: skin === 'streets' ? theme.palette.primary.dark : theme.palette.action.hover,
              },
            })}
          >
            <MapOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Dark" placement="top" enterDelay={2000} enterNextDelay={2000}>
          <IconButton
            size="small"
            aria-label="Dark"
            aria-pressed={skin === 'dark'}
            onClick={() => setSkin('dark')}
            sx={(theme) => ({
              color: skin === 'dark' ? theme.palette.primary.contrastText : theme.palette.text.secondary,
              backgroundColor: skin === 'dark' ? theme.palette.primary.main : 'transparent',
              '&:hover': {
                backgroundColor: skin === 'dark' ? theme.palette.primary.dark : theme.palette.action.hover,
              },
            })}
          >
            <DarkModeOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Satellite" placement="top" enterDelay={2000} enterNextDelay={2000}>
          <IconButton
            size="small"
            aria-label="Satellite"
            aria-pressed={skin === 'satellite'}
            onClick={() => setSkin('satellite')}
            sx={(theme) => ({
              color: skin === 'satellite' ? theme.palette.primary.contrastText : theme.palette.text.secondary,
              backgroundColor: skin === 'satellite' ? theme.palette.primary.main : 'transparent',
              '&:hover': {
                backgroundColor: skin === 'satellite' ? theme.palette.primary.dark : theme.palette.action.hover,
              },
            })}
          >
            <SatelliteAltOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

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
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'white',
              borderColor: 'primary.main',
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
            <Badge badgeContent={pendingCount} color="error" max={99}>
              <PendingActionsIcon />
            </Badge>
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
          border: '2px solid #1976d2',
          backgroundColor: 'background.paper'
        }}
      >
        <MapViewWithBackend skin={skin} />
      </Box>
    </>
  );
}

