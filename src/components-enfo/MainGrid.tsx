import { useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ChartUserByCountry from './ChartUserByCountry';
import CustomizedTreeView from './CustomizedTreeView';
import CustomizedDataGrid from './CustomizedDataGrid';
import HighlightedCard from './HighlightedCard';
import PageViewsBarChart from './PageViewsBarChart';

import MapViewWithBackend from './MapViewWithBackend';
import WildlifeRescueStatistics from './WildlifeRescueStatistics';
import { MapNavigationProvider } from '../context/MapNavigationContext';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import SatelliteAltOutlinedIcon from '@mui/icons-material/SatelliteAltOutlined';

export default function MainGrid() {
  // State to track selected map skin
  const [skin, setSkin] = useState<"streets" | "dark" | "satellite">("streets");

  return (
    <MapNavigationProvider>
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
        {/* Map Header */}
        <Typography component="h2" variant="h6" sx={{ mb: 2, mt: 4 }}>
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
      </Stack>

      {/* Map Container */}
      <Box 
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
      
        {/* Wildlife Rescue Statistics Component */}
        <Box sx={{ mt: 3, mb: 2 }}>
          <WildlifeRescueStatistics />
        </Box>
      </Box>
    </MapNavigationProvider>
  );
}
