import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
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

        {/* Top Barangays Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600, mt: 1 }}>
            Top 5 Barangays with Wildlife Activity
          </Typography>
          {/* Municipality filter */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
            {[
              { label: 'All', value: null },
              { label: 'Manolo Fortich', value: 'Manolo Fortich' },
              { label: 'Sumilao', value: 'Sumilao' },
              { label: 'Malitbog', value: 'Malitbog' },
              { label: 'Impasugong', value: 'Impasugong' },
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
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
            {topBarangays.length > 0 ? (
              <PieChart
                series={[{
                  data: topBarangaysPieData,
                  innerRadius: 26,
                  outerRadius: 92,
                  paddingAngle: 2,
                  cornerRadius: 5,
                  arcLabel: (item) => {
                    const pct = topBarangaysTotal > 0 ? ((item.value / topBarangaysTotal) * 100).toFixed(1) + '%' : '0%';
                    return pct;
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
        </Box>

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

