
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

import MapView from './MapView';

export default function MainGrid() {
  return (
    <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
      {/* Map */}
      <Typography component="h2" variant="h6" sx={{ mb: 2, mt: 4 }}>
        Wildlife Rescue Map
      </Typography>
      <Box sx={{ 
        height: 700, 
        width: '100%',
        border: '2px solid #1976d2',
        backgroundColor: 'background.paper'
      }}>
        <MapView />
      </Box>
      
      {/* Additional Card Below Map */}
      <Card sx={{ mt: 3, mb: 2 }}>
        <CardContent>
          <Typography variant="h6" component="h3" gutterBottom>
            Wildlife Rescue Statistics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This area can be used for additional wildlife rescue data, statistics, or information cards.
            The grey space at the bottom will be completely filled by this card.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
