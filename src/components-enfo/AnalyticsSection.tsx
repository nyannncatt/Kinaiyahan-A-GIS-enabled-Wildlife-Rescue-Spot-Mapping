import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import InfoIcon from '@mui/icons-material/Info';
import { PieChart } from '@mui/x-charts/PieChart';
import { motion } from 'framer-motion';

interface AnalyticsSectionProps {
  wildlifeRecords: any[];
  approvedRecords: any[];
}

export default function AnalyticsSection({ wildlifeRecords, approvedRecords }: AnalyticsSectionProps) {
  // State for filtering analytics by status
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  // State for municipality filter in analytics (Top Barangays)
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  // State for species report view toggle (species name vs species type)
  const [speciesViewMode, setSpeciesViewMode] = useState<'name' | 'type'>('name');
  // State for showing "Other" species dialog
  const [showOtherSpeciesDialog, setShowOtherSpeciesDialog] = useState(false);
  // State for barangay view toggle (percentage vs total)
  const [barangayViewMode, setBarangayViewMode] = useState<'percentage' | 'total'>('percentage');
  
  // Filter records based on selected status
  const filteredRecords = selectedStatusFilter 
    ? approvedRecords.filter(r => r.status === selectedStatusFilter.toLowerCase())
    : approvedRecords;
  
  // Top barangays with data (based on filters)
  const barangaySource = (selectedStatusFilter ? filteredRecords : approvedRecords).filter((r: any) => {
    if (!selectedMunicipality) return true;
    const m = (r.municipality || '').toLowerCase();
    return m === selectedMunicipality.toLowerCase();
  });
  const barangayFrequency = barangaySource.reduce((acc: any, record: any) => {
    const barangay = record.barangay || 'Unknown';
    acc[barangay] = (acc[barangay] || 0) + 1;
    return acc;
  }, {});
  const topBarangays = Object.entries(barangayFrequency)
    .map(([barangay, count]) => ({ barangay, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 5);
  const topBarangaysTotal = topBarangays.reduce((sum, item) => sum + Number(item.count), 0);
  const topBarangaysPieData = topBarangays.map((item) => ({
    id: item.barangay,
    value: Number(item.count),
    label: item.barangay,
  }));
  
  // Helper function to categorize species into types
  const getSpeciesType = (speciesName: string, scientificName?: string): string => {
    const name = (speciesName || '').toLowerCase().trim();
    const scientific = (scientificName || '').toLowerCase().trim();
    const combined = `${name} ${scientific}`.trim();
    
    // If empty, return Other
    if (!combined || combined === 'unknown') {
      return 'Other';
    }
    
    // Bird patterns
    if (combined.includes('bird') || combined.includes('eagle') || combined.includes('owl') || combined.includes('hawk') || 
        combined.includes('crow') || combined.includes('dove') || combined.includes('parrot') || combined.includes('chicken') ||
        combined.includes('duck') || combined.includes('goose') || combined.includes('pigeon') || combined.includes('sparrow') ||
        combined.includes('hornbill') || combined.includes('kingfisher') || combined.includes('myna') || combined.includes('bulbul') ||
        combined.includes('oriole') || combined.includes('sunbird') || combined.includes('tailorbird') || combined.includes('woodpecker') ||
        combined.includes('egret') || combined.includes('heron') || combined.includes('stork') || combined.includes('ibis') ||
        combined.includes('warbler') || combined.includes('flycatcher') || combined.includes('shrike') || combined.includes('starling') ||
        combined.includes('swift') || combined.includes('swallow') || combined.includes('martin') || combined.includes('swiftlet') ||
        combined.includes('aves') || combined.includes('accipitridae') || combined.includes('strigidae') || combined.includes('columbidae') ||
        combined.includes('bucerotidae') || combined.includes('alcedinidae') || combined.includes('sturnidae') || combined.includes('pycnonotidae') ||
        combined.includes('phylloscopidae') || combined.includes('muscicapidae') || combined.includes('passeridae') || combined.includes('hirundinidae')) {
      return 'Bird';
    }
    
    // Reptile patterns
    if (combined.includes('snake') || combined.includes('lizard') || combined.includes('gecko') || combined.includes('crocodile') ||
        combined.includes('turtle') || combined.includes('tortoise') || combined.includes('iguana') || combined.includes('python') ||
        combined.includes('cobra') || combined.includes('viper') || combined.includes('skink') || combined.includes('monitor') ||
        combined.includes('varanus') || combined.includes('agama') || combined.includes('chameleon') || combined.includes('anole') ||
        combined.includes('reptile') || combined.includes('reptilia') || combined.includes('serpentes') || combined.includes('squamata') ||
        combined.includes('testudines') || combined.includes('chelonia') || combined.includes('crocodylidae') || combined.includes('crocodyliformes') ||
        combined.includes('varanidae') || combined.includes('gekkonidae') || combined.includes('scincidae') || combined.includes('elapidae') ||
        combined.includes('viperidae') || combined.includes('pythonidae') || combined.includes('boidae') || combined.includes('colubridae')) {
      return 'Reptile';
    }
    
    // Mammal patterns
    if (combined.includes('monkey') || combined.includes('deer') || combined.includes('wild boar') || combined.includes('boar') ||
        combined.includes('cat') || combined.includes('dog') || combined.includes('bat') || combined.includes('rat') ||
        combined.includes('mouse') || combined.includes('squirrel') || combined.includes('civet') || combined.includes('bear') ||
        combined.includes('pig') || combined.includes('cow') || combined.includes('buffalo') || combined.includes('carabao') ||
        combined.includes('goat') || combined.includes('sheep') || combined.includes('ram') ||
        combined.includes('macaque') || combined.includes('tarsier') || combined.includes('flying lemur') || combined.includes('pangolin') ||
        combined.includes('porcupine') || combined.includes('otter') || combined.includes('mongoose') || combined.includes('wildcat') ||
        combined.includes('leopard') || combined.includes('tiger') || combined.includes('civet') || combined.includes('binturong') ||
        combined.includes('mammal') || combined.includes('mammalia') || combined.includes('primates') || combined.includes('carnivora') ||
        combined.includes('artiodactyla') || combined.includes('rodentia') || combined.includes('chiroptera') || combined.includes('cervidae') ||
        combined.includes('suidae') || combined.includes('bovidae') || combined.includes('felidae') || combined.includes('canidae') ||
        combined.includes('viverridae') || combined.includes('muridae') || combined.includes('sciuridae') || combined.includes('pteropodidae') ||
        combined.includes('vespertilionidae') || combined.includes('rhinolophidae') || combined.includes('hipposideridae') ||
        combined.includes('capra') || combined.includes('ovis')) {
      return 'Mammal';
    }
    
    // Aquatic patterns
    if (combined.includes('fish') || combined.includes('shark') || combined.includes('eel') || combined.includes('crab') ||
        combined.includes('lobster') || combined.includes('shrimp') || combined.includes('sea turtle') ||
        combined.includes('ray') || combined.includes('stingray') || combined.includes('octopus') || combined.includes('squid') ||
        combined.includes('jellyfish') || combined.includes('starfish') || combined.includes('sea urchin') || combined.includes('sea cucumber') ||
        combined.includes('aquatic') || combined.includes('marine') || combined.includes('pisces') || combined.includes('actinopterygii') ||
        combined.includes('chondrichthyes') || combined.includes('elasmobranchii') || combined.includes('teleostei') || combined.includes('osteichthyes')) {
      return 'Aquatic';
    }
    
    // Default to "Other" if no match
    return 'Other';
  };
  
  // Top species by name - use only approved records (exclude pending and rejected)
  const speciesSource = (selectedStatusFilter 
    ? approvedRecords.filter(r => r.status === selectedStatusFilter.toLowerCase())
    : approvedRecords).filter((r: any) => {
    if (!selectedMunicipality) return true;
    const m = (r.municipality || '').toLowerCase();
    return m === selectedMunicipality.toLowerCase();
  });
  const speciesFrequency = speciesSource.reduce((acc: any, record: any) => {
    const species = record.species_name || 'Unknown';
    acc[species] = (acc[species] || 0) + 1;
    return acc;
  }, {});
  const topSpecies = Object.entries(speciesFrequency)
    .map(([species, count]) => ({ species, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 5);
  const topSpeciesTotal = topSpecies.reduce((sum, item) => sum + Number(item.count), 0);
  const topSpeciesPieData = topSpecies.map((item) => ({
    id: item.species,
    value: Number(item.count),
    label: item.species,
  }));
  
  // Species type breakdown across all top barangays (aggregated, not per barangay)
  const topBarangayNames = topBarangays.map(b => b.barangay);
  const otherSpeciesMap: { [key: string]: number } = {}; // Track species categorized as "Other" with counts
  const speciesTypeData = speciesSource
    .filter((r: any) => topBarangayNames.includes(r.barangay || 'Unknown'))
    .reduce((acc: any, record: any) => {
      const type = getSpeciesType(record.species_name || '', record.scientific_name || '');
      if (type === 'Other') {
        const speciesKey = `${record.species_name || 'Unknown'}${record.scientific_name ? ` (${record.scientific_name})` : ''}`;
        otherSpeciesMap[speciesKey] = (otherSpeciesMap[speciesKey] || 0) + 1;
      }
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  
  // Convert to sorted array for display
  const otherSpeciesList = Object.entries(otherSpeciesMap)
    .map(([species, count]) => ({ species, count }))
    .sort((a, b) => b.count - a.count);
  
  // Log species categorized as "Other" for debugging
  if (otherSpeciesList.length > 0) {
    console.log('Species categorized as "Other":', otherSpeciesList);
  }
  const topSpeciesTypePieData = Object.entries(speciesTypeData)
    .map(([type, count]) => ({ id: type, value: Number(count), label: type }))
    .sort((a, b) => b.value - a.value);
  const topSpeciesTypeTotal = topSpeciesTypePieData.reduce((sum, item) => sum + item.value, 0);
  
  // Records summary counts (based on filtered records)
  const displayRecords = selectedStatusFilter ? filteredRecords : approvedRecords;
  const uniqueSpecies = new Set(displayRecords.map((r: any) => r.species_name)).size;
  const activeBarangays = new Set(displayRecords.map((r: any) => r.barangay).filter(Boolean)).size;
  const totalApproved = wildlifeRecords.filter((r: any) => r.approval_status === 'approved').length;
  const totalRejected = wildlifeRecords.filter((r: any) => r.approval_status === 'rejected').length;

  return (
    <Box 
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      data-analytics sx={{ mt: 8, mb: 3, maxWidth: { xs: '100%', md: '1577px' }, mx: 'auto' }}
    >
      <Card sx={{ p: 2, boxShadow: 1 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ color: '#2e7d32 !important', mb: 2 }}>
          Analytics
        </Typography>
        
        {/* Pie Chart for Status Distribution */}
        <Box sx={{ mb: 3 }}>  
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
              Status Distribution
            </Typography>
          </Box>
          <PieChart
            series={[
              {
                data: [
                  { 
                    id: 'rescued', 
                    value: approvedRecords.filter(r => r.status === 'rescued').length,
                    label: approvedRecords.length > 0 
                      ? `Rescued (${((approvedRecords.filter(r => r.status === 'rescued').length / approvedRecords.length) * 100).toFixed(1)}%)`
                      : 'Rescued (0%)',
                    color: selectedStatusFilter && selectedStatusFilter !== 'Rescued' ? '#1e88e530' : '#1e88e5'
                  },
                  { 
                    id: 'turned over', 
                    value: approvedRecords.filter(r => r.status === 'turned over').length,
                    label: approvedRecords.length > 0 
                      ? `Turned Over (${((approvedRecords.filter(r => r.status === 'turned over').length / approvedRecords.length) * 100).toFixed(1)}%)`
                      : 'Turned Over (0%)',
                    color: selectedStatusFilter && selectedStatusFilter !== 'Turned Over' ? '#fdd83530' : '#fdd835'
                  },
                  { 
                    id: 'released', 
                    value: approvedRecords.filter(r => r.status === 'released').length,
                    label: approvedRecords.length > 0 
                      ? `Released (${((approvedRecords.filter(r => r.status === 'released').length / approvedRecords.length) * 100).toFixed(1)}%)`
                      : 'Released (0%)',
                    color: selectedStatusFilter && selectedStatusFilter !== 'Released' ? '#43a04730' : '#43a047'
                  },
                ],
                innerRadius: 28,
                outerRadius: 95,
                paddingAngle: 2,
                cornerRadius: 5,
                arcLabel: (item) => {
                  const total = approvedRecords.filter(r => r.status === 'rescued').length + 
                               approvedRecords.filter(r => r.status === 'turned over').length + 
                               approvedRecords.filter(r => r.status === 'released').length;
                  const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) + '%' : '0%';
                  return percentage;
                },
                arcLabelMinAngle: 10,
              }
            ]}
            width={320}
            height={220}
          />
        </Box>

        {/* Status Legend with Click Handler */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
          {/* Show All Button */}
          <Box
            onClick={() => setSelectedStatusFilter(null)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              border: `3px solid`,
              borderColor: !selectedStatusFilter ? '#6c757d' : '#6c757d60',
              borderRadius: 2,
              backgroundColor: !selectedStatusFilter ? '#6c757d' : '#6c757d15',
              minWidth: 150,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              transform: !selectedStatusFilter ? 'scale(1.05)' : 'scale(1)',
              boxShadow: !selectedStatusFilter ? `0 4px 12px #6c757d60` : 'none',
              opacity: !selectedStatusFilter ? 1 : 0.5,
              '&:hover': {
                backgroundColor: !selectedStatusFilter ? '#6c757d' : '#6c757d30',
                transform: 'scale(1.03)',
                opacity: 1,
              }
            }}
          >
            <Typography sx={{ fontSize: '1.5rem', opacity: !selectedStatusFilter ? 1 : 0.6 }}>📊</Typography>
            <Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: !selectedStatusFilter ? 700 : 600, 
                  color: !selectedStatusFilter ? 'white' : '#6c757d' 
                }}
              >
                Show All
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: !selectedStatusFilter ? 'white' : 'text.secondary', 
                  fontSize: '0.875rem',
                  opacity: !selectedStatusFilter ? 0.9 : 1
                }}
              >
                {approvedRecords.length} total (100%) • {approvedRecords.length} reported
              </Typography>
            </Box>
          </Box>

          {[
            { label: 'Rescued', color: '#1e88e5', icon: '🤝' },
            { label: 'Turned Over', color: '#fdd835', icon: '🔄' },
            { label: 'Released', color: '#43a047', icon: '🌀' }
          ].map((status) => {
            const count = status.label === 'Released'
              ? approvedRecords.filter(r => r.status === 'released').length
              : approvedRecords.filter(r => r.status === status.label.toLowerCase()).length;
            
            const percentage = approvedRecords.length > 0 
              ? ((count / approvedRecords.length) * 100).toFixed(1) 
              : '0.0';
            
            const isSelected = selectedStatusFilter === status.label;
            const isShowAllMode = !selectedStatusFilter;
            
            return (
              <Box
                key={status.label}
                onClick={() => setSelectedStatusFilter(isSelected ? null : status.label)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  border: `3px solid`,
                  borderColor: (isSelected || isShowAllMode) ? status.color : `${status.color}60`,
                  borderRadius: 2,
                  backgroundColor: isSelected 
                    ? status.color 
                    : isShowAllMode 
                      ? `${status.color}50` 
                      : `${status.color}15`,
                  minWidth: 150,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  transform: (isSelected || isShowAllMode) ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: (isSelected || isShowAllMode) ? `0 4px 12px ${status.color}60` : 'none',
                  opacity: isSelected ? 1 : isShowAllMode ? 0.8 : 0.5,
                  '&:hover': {
                    backgroundColor: isSelected ? status.color : isShowAllMode ? `${status.color}60` : `${status.color}30`,
                    transform: 'scale(1.03)',
                    opacity: 1,
                  }
                }}
              >
                <Typography sx={{ fontSize: '1.5rem', opacity: (isSelected || isShowAllMode) ? 1 : 0.6 }}>{status.icon}</Typography>
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: (isSelected || isShowAllMode) ? 700 : 600, 
                      color: isSelected ? 'white' : status.color 
                    }}
                  >
                    {status.label}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: isSelected ? 'white' : 'text.secondary', 
                      fontSize: '0.875rem',
                      opacity: isSelected ? 0.9 : 1
                    }}
                  >
                    {count} of {approvedRecords.length} total ({percentage}%)
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* Top Barangays and Species Report Section */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600, mt: 1, mb: 0 }}>
              Top 5 Barangays with Wildlife Activity
            </Typography>
            {/* Toggle buttons for species view mode */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant={speciesViewMode === 'name' ? 'contained' : 'outlined'}
                onClick={() => setSpeciesViewMode('name')}
                sx={{ textTransform: 'none' }}
              >
                Species Name
              </Button>
              <Button
                size="small"
                variant={speciesViewMode === 'type' ? 'contained' : 'outlined'}
                onClick={() => setSpeciesViewMode('type')}
                sx={{ textTransform: 'none' }}
              >
                Species Type
              </Button>
            </Box>
          </Box>
          {/* Municipality filter */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            {[
              { label: 'Manolo Fortich', value: 'Manolo Fortich' },
            ].map((opt) => {
              const isActive = (opt.value ?? null) === (selectedMunicipality ?? null);
              return (
                <Button
                  key={opt.label}
                  size="small"
                  variant={isActive ? 'contained' : 'outlined'}
                  onClick={() => setSelectedMunicipality(opt.value as any)}
                  sx={{ textTransform: 'none' }}
                >
                  {opt.label}
                </Button>
              );
            })}
          </Box>
          {/* Two pie charts side by side */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, justifyContent: 'center', alignItems: 'flex-start' }}>
            {/* Top Barangays Pie Chart */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 240 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 500, ml: -15 }}>
                  Top 5 Barangays
                </Typography>
                {/* Toggle buttons for barangay view mode */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Button
                    size="small"
                    variant={barangayViewMode === 'percentage' ? 'contained' : 'outlined'}
                    onClick={() => setBarangayViewMode('percentage')}
                    sx={{ textTransform: 'none', minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
                  >
                    %
                  </Button>
                  <Button
                    size="small"
                    variant={barangayViewMode === 'total' ? 'contained' : 'outlined'}
                    onClick={() => setBarangayViewMode('total')}
                    sx={{ textTransform: 'none', minWidth: 'auto', px: 1, fontSize: '0.7rem' }}
                  >
                    Total
                  </Button>
                </Box>
              </Box>
              {topBarangays.length > 0 ? (
                <PieChart
                  series={[{
                    data: topBarangaysPieData,
                    innerRadius: 26,
                    outerRadius: 92,
                    paddingAngle: 2,
                    cornerRadius: 5,
                    arcLabel: (item) => {
                      if (barangayViewMode === 'total') {
                        return String(item.value);
                      } else {
                        const pct = topBarangaysTotal > 0 ? ((item.value / topBarangaysTotal) * 100).toFixed(1) + '%' : '0%';
                        return pct;
                      }
                    },
                    arcLabelMinAngle: 10,
                  }]}
                  width={360}
                  height={220}
                />
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No barangay data available yet
                </Typography>
              )}
            </Box>
            
            {/* Top Species Report Pie Chart */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 240 }}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1, fontWeight: 500, ml: -10 }}>
                Top Species Report
              </Typography>
              {speciesViewMode === 'name' ? (
                topSpeciesPieData.length > 0 ? (
                  <PieChart
                    series={[{
                      data: topSpeciesPieData,
                      innerRadius: 26,
                      outerRadius: 92,
                      paddingAngle: 2,
                      cornerRadius: 5,
                      arcLabel: (item) => {
                        const pct = topSpeciesTotal > 0 ? ((item.value / topSpeciesTotal) * 100).toFixed(1) + '%' : '0%';
                        return pct;
                      },
                      arcLabelMinAngle: 10,
                    }]}
                    width={360}
                    height={220}
                  />
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No species data available yet
                  </Typography>
                )
              ) : (
                <>
                  {topSpeciesTypePieData.length > 0 ? (
                    <>
                      <PieChart
                        series={[{
                          data: topSpeciesTypePieData,
                          innerRadius: 26,
                          outerRadius: 92,
                          paddingAngle: 2,
                          cornerRadius: 5,
                          arcLabel: (item) => {
                            const pct = topSpeciesTypeTotal > 0 ? ((item.value / topSpeciesTypeTotal) * 100).toFixed(1) + '%' : '0%';
                            return pct;
                          },
                          arcLabelMinAngle: 10,
                        }]}
                        width={360}
                        height={220}
                      />
                      {otherSpeciesList.length > 0 && (
                        <Button
                          size="small"
                          startIcon={<InfoIcon />}
                          onClick={() => setShowOtherSpeciesDialog(true)}
                          sx={{ mt: 1, textTransform: 'none' }}
                        >
                          View {otherSpeciesList.length} "Other" Species
                        </Button>
                      )}
                    </>
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No species type data available yet
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Box>
        </Box>

        {/* Dialog to show "Other" species list */}
        <Dialog
          open={showOtherSpeciesDialog}
          onClose={() => setShowOtherSpeciesDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Species Categorized as "Other"
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              These species could not be automatically categorized. You may want to add patterns for them in the categorization function.
            </Typography>
            <List>
              {otherSpeciesList.map((item, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={item.species}
                    secondary={`${item.count} ${item.count === 1 ? 'record' : 'records'}`}
                  />
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowOtherSpeciesDialog(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Records Summary */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
            Records Summary
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
            <Card sx={{ p: 2, textAlign: 'center', minWidth: 150, boxShadow: 1 }}>
              <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
                {displayRecords.length}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {selectedStatusFilter ? 'Filtered Records' : 'Total Records'}
              </Typography>
            </Card>
            <Card sx={{ p: 2, textAlign: 'center', minWidth: 250, boxShadow: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3 }}>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 700 }}>
                    {totalApproved}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Approved
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 700 }}>
                    {totalRejected}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Rejected
                  </Typography>
                </Box>
              </Box>
            </Card>
            <Card sx={{ p: 2, textAlign: 'center', minWidth: 150, boxShadow: 1 }}>
              <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 700 }}>
                {activeBarangays}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Active Barangays
              </Typography>
            </Card>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}

