import { useState, useEffect } from 'react';
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
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import SatelliteAltOutlinedIcon from '@mui/icons-material/SatelliteAltOutlined';
import ListAltIcon from '@mui/icons-material/ListAlt';
import MapIcon from '@mui/icons-material/Map';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { getWildlifeRecords } from '../services/wildlifeRecords';
import { PieChart } from '@mui/x-charts/PieChart';
import { useTheme } from '@mui/material/styles';

export default function MainGrid() {
  const theme = useTheme();
  
  // State to track selected map skin
  const [skin, setSkin] = useState<"streets" | "dark" | "satellite">("streets");
  
  // State for wildlife records for analytics
  const [wildlifeRecords, setWildlifeRecords] = useState<any[]>([]);
  
  // Fetch wildlife records for analytics
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const records = await getWildlifeRecords();
        setWildlifeRecords(records);
      } catch (error) {
        console.error('Error fetching wildlife records for analytics:', error);
      }
    };
    
    fetchRecords();
  }, []);

  // Compute analytics data
  const approvedRecords = wildlifeRecords.filter(r => r.approval_status === 'approved' || r.user_id !== null);
  
  // Top barangays with data
  const barangayFrequency = approvedRecords.reduce((acc: any, record: any) => {
    const barangay = record.barangay || 'Unknown';
    acc[barangay] = (acc[barangay] || 0) + 1;
    return acc;
  }, {});
  const topBarangays = Object.entries(barangayFrequency)
    .map(([barangay, count]) => ({ barangay, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 5);
  
  // State for pending reports
  const [pendingCount, setPendingCount] = useState(0);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Load pending reports count
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const records = await getWildlifeRecords();
        const pendingRecords = records.filter(record => 
          record.approval_status === 'pending' && record.user_id === null
        );
        setPendingCount(pendingRecords.length);
      } catch (error) {
        console.error('Error loading pending count:', error);
      }
    };

    loadPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Function to scroll to record list section
  const scrollToRecordList = () => {
    setShowPendingOnly(false); // Reset filter
    const recordListElement = document.querySelector('[data-record-list]');
    if (recordListElement) {
      recordListElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      // Fallback: scroll to bottom of page
      window.scrollTo({ 
        top: document.body.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

  // Function to scroll to record list and show only pending reports
  const scrollToPendingReports = () => {
    setShowPendingOnly(true); // Set filter to show only pending
    const recordListElement = document.querySelector('[data-record-list]');
    if (recordListElement) {
      recordListElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      // Fallback: scroll to bottom of page
      window.scrollTo({ 
        top: document.body.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

  // Function to scroll back to map section
  const scrollToMap = () => {
    const mapElement = document.querySelector('[data-map-container]');
    if (mapElement) {
      mapElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      // Fallback: scroll to top of page
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }
  };

  return (
    <MapNavigationProvider>
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
        {/* Map Header */}
        <br></br>
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

        {/* View Record List Button */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<ListAltIcon />}
          onClick={scrollToRecordList}
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
          onClick={scrollToPendingReports}
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
        <Box data-record-list sx={{ mt: 3, mb: 2 }}>
          <WildlifeRescueStatistics {...(showPendingOnly && { showPendingOnly })} />
        </Box>

        {/* Analytics Section */}
        <Box data-analytics sx={{ mt: 2, mb: 3, minHeight: '70vh' }}>
          <Card sx={{ p: 2, boxShadow: 1 }}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
              Analytics
            </Typography>
            
            {/* Pie Chart for Status Distribution */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
                Status Distribution
              </Typography>
              <PieChart
                series={[
                  {
                    data: [
                      { 
                        id: 'reported', 
                        value: wildlifeRecords.filter(r => r.status === 'reported' && (r.approval_status === 'approved' || r.user_id !== null)).length,
                        label: 'Reported',
                        color: '#e53935'
                      },
                      { 
                        id: 'rescued', 
                        value: wildlifeRecords.filter(r => r.status === 'rescued' && (r.approval_status === 'approved' || r.user_id !== null)).length,
                        label: 'Rescued',
                        color: '#1e88e5'
                      },
                      { 
                        id: 'turned over', 
                        value: wildlifeRecords.filter(r => r.status === 'turned over' && (r.approval_status === 'approved' || r.user_id !== null)).length,
                        label: 'Turned Over',
                        color: '#fdd835'
                      },
                      { 
                        id: 'dispersed', 
                        value: wildlifeRecords.filter(r => r.status === 'released' && (r.approval_status === 'approved' || r.user_id !== null)).length,
                        label: 'Dispersed',
                        color: '#43a047'
                      },
                    ],
                    innerRadius: 30,
                    outerRadius: 120,
                    paddingAngle: 2,
                    cornerRadius: 5,
                  }
                ]}
                width={400}
                height={350}
              />
            </Box>

            {/* Status Legend */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
              {[
                { label: 'Reported', color: '#e53935', icon: '🗒️' },
                { label: 'Rescued', color: '#1e88e5', icon: '🤝' },
                { label: 'Turned Over', color: '#fdd835', icon: '🔄' },
                { label: 'Dispersed', color: '#43a047', icon: '🌀' }
              ].map((status) => {
                const count = status.label === 'Dispersed'
                  ? wildlifeRecords.filter(r => r.status === 'released' && (r.approval_status === 'approved' || r.user_id !== null)).length
                  : wildlifeRecords.filter(r => r.status === status.label.toLowerCase() && (r.approval_status === 'approved' || r.user_id !== null)).length;
                
                return (
                  <Box
                    key={status.label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1.5,
                      border: `2px solid ${status.color}`,
                      borderRadius: 2,
                      backgroundColor: `${status.color}15`,
                      minWidth: 150,
                    }}
                  >
                    <Typography sx={{ fontSize: '1.5rem' }}>{status.icon}</Typography>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: status.color }}>
                        {status.label}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                        {count} records
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Top Barangays Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600, mt: 3 }}>
                Top 5 Barangays with Wildlife Activity
              </Typography>
              {topBarangays.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                  {topBarangays.map((item, index) => (
                    <Card
                      key={item.barangay}
                      sx={{
                        p: 2,
                        minWidth: 180,
                        boxShadow: 2,
                        border: '2px solid',
                        borderColor: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : 'primary.main',
                        backgroundColor: index < 3 ? `${index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : '#CD7F32'}20` : 'background.paper'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography sx={{ fontSize: '1.5rem' }}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍'}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                          Rank {index + 1}
                        </Typography>
                      </Box>
                      <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {item.barangay}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {Number(item.count)} {Number(item.count) === 1 ? 'record' : 'records'}
                      </Typography>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No barangay data available yet
                </Typography>
              )}
            </Box>

            {/* Records Summary */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
                Records Summary
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
                <Card sx={{ p: 2, textAlign: 'center', minWidth: 150, boxShadow: 1 }}>
                  <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {approvedRecords.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Total Approved Records
                  </Typography>
                </Card>
                <Card sx={{ p: 2, textAlign: 'center', minWidth: 150, boxShadow: 1 }}>
                  <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 700 }}>
                    {new Set(approvedRecords.map(r => r.species_name)).size}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Unique Species
                  </Typography>
                </Card>
                <Card sx={{ p: 2, textAlign: 'center', minWidth: 150, boxShadow: 1 }}>
                  <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 700 }}>
                    {new Set(approvedRecords.map(r => r.barangay).filter(Boolean)).size}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Active Barangays
                  </Typography>
                </Card>
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>
    </MapNavigationProvider>
  );
}
