import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  TablePagination,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  useTheme,
  Card,
  CardContent,
  InputAdornment,
  Collapse,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Map as MapIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle,
  Close,
} from '@mui/icons-material';
import { getWildlifeRecords, deleteWildlifeRecord, updateWildlifeRecord, approveWildlifeRecord, rejectWildlifeRecord, type WildlifeRecord, type UpdateWildlifeRecord } from '../services/wildlifeRecords';
import { useMapNavigation } from '../context/MapNavigationContext';

interface WildlifeRescueStatisticsProps {
  showPendingOnly?: boolean;
}

const WildlifeRescueStatistics: React.FC<WildlifeRescueStatisticsProps> = ({ showPendingOnly = false }) => {
  const theme = useTheme();
  const { navigateToLocation, refreshRecordsVersion } = useMapNavigation();
  const [wildlifeRecords, setWildlifeRecords] = useState<WildlifeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [approvalFilter, setApprovalFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WildlifeRecord | null>(null);
  const [editFormData, setEditFormData] = useState<UpdateWildlifeRecord>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  
  // Success notification state
  const [successSnackbar, setSuccessSnackbar] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: '',
  });

  // Load wildlife records (initial + on refresh signal)
  useEffect(() => {
    let isCancelled = false;
    const loadRecords = async () => {
      try {
        setLoading(true);
        const records = await getWildlifeRecords();
        if (!isCancelled) setWildlifeRecords(records);
      } catch (error) {
        console.error('Error loading wildlife records:', error);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadRecords();
    return () => { isCancelled = true; };
  }, [refreshRecordsVersion]);

  // Auto-set approval filter when showPendingOnly is true
  useEffect(() => {
    if (showPendingOnly) {
      setApprovalFilter('pending');
    }
  }, [showPendingOnly]);

  // Handle location click - navigate to map location and scroll to map
  const handleLocationClick = (record: WildlifeRecord) => {
    navigateToLocation(record.latitude, record.longitude, record.id);
    
    // Auto-scroll to the map section
    const mapElement = document.querySelector('[data-map-container]') || 
                      document.querySelector('h2')?.nextElementSibling; // Fallback to the map container after the "Wildlife Rescue Map" heading
    
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

  // Handle delete record
  const handleDeleteRecord = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this wildlife record?')) {
      try {
        await deleteWildlifeRecord(id);
        setWildlifeRecords(prev => prev.filter(record => record.id !== id));
      } catch (error) {
        console.error('Error deleting wildlife record:', error);
      }
    }
  };

  // Handle edit record
  const handleEditRecord = (record: WildlifeRecord) => {
    setEditingRecord(record);
    setEditFormData({
      species_name: record.species_name,
      status: record.status as 'reported' | 'rescued' | 'turned over' | 'released',
      barangay: record.barangay || '',
      municipality: record.municipality || '',
      reporter_name: record.reporter_name || '',
      contact_number: record.contact_number || '',
    });
    setEditError(null);
    setEditDialogOpen(true);
  };

  // Handle edit form submission
  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    setEditError(null);
    setEditLoading(true);

    try {
      const updatedRecord = await updateWildlifeRecord(editingRecord.id, editFormData);
      setWildlifeRecords(prev => 
        prev.map(record => record.id === editingRecord.id ? updatedRecord : record)
      );
      setEditDialogOpen(false);
      setEditingRecord(null);
      setEditFormData({});
      
      // Show success popup
      setSuccessSnackbar({
        open: true,
        message: `Wildlife record for "${updatedRecord.species_name}" has been updated successfully!`,
      });
    } catch (error) {
      console.error('Error updating wildlife record:', error);
      setEditError(error instanceof Error ? error.message : 'Failed to update wildlife record');
    } finally {
      setEditLoading(false);
    }
  };

  // Handle edit dialog close
  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setEditingRecord(null);
    setEditFormData({});
    setEditError(null);
  };

  // Handle approve record
  const handleApproveRecord = async (id: string) => {
    try {
      const updatedRecord = await approveWildlifeRecord(id);
      setWildlifeRecords(prev => 
        prev.map(record => record.id === id ? updatedRecord : record)
      );
      setSuccessSnackbar({
        open: true,
        message: 'Wildlife record has been approved successfully!',
      });
    } catch (error) {
      console.error('Error approving wildlife record:', error);
      setSuccessSnackbar({
        open: true,
        message: 'Failed to approve wildlife record',
      });
    }
  };

  // Handle reject record
  const handleRejectRecord = async (id: string) => {
    if (window.confirm('Are you sure you want to reject this wildlife record?')) {
      try {
        const updatedRecord = await rejectWildlifeRecord(id);
        setWildlifeRecords(prev => 
          prev.map(record => record.id === id ? updatedRecord : record)
        );
        setSuccessSnackbar({
          open: true,
          message: 'Wildlife record has been rejected successfully!',
        });
      } catch (error) {
        console.error('Error rejecting wildlife record:', error);
        setSuccessSnackbar({
          open: true,
          message: 'Failed to reject wildlife record',
        });
      }
    }
  };

  // Handle print
  const handlePrint = () => {
    setPrintDialogOpen(true);
  };

  // Handle print individual record
  const handlePrintRecord = (record: WildlifeRecord) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Wildlife Record - ${record.species_name}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #1976d2;
              padding-bottom: 20px;
            }
            .header h1 { 
              color: #1976d2; 
              margin-bottom: 10px; 
              font-size: 28px;
            }
            .header p { 
              color: #666; 
              font-size: 14px;
            }
            .record-details {
              max-width: 800px;
              margin: 0 auto;
              background: #f9f9f9;
              padding: 25px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .detail-row {
              display: flex;
              margin-bottom: 15px;
              border-bottom: 1px solid #e0e0e0;
              padding-bottom: 10px;
            }
            .detail-label {
              font-weight: bold;
              width: 200px;
              color: #333;
              font-size: 14px;
            }
            .detail-value {
              flex: 1;
              color: #555;
              font-size: 14px;
            }
            .status-${record.status.replace(' ', '-')} {
              color: ${getStatusColor(record.status)};
              font-weight: bold;
              font-size: 16px;
            }
            .coordinates {
              font-family: monospace;
              background: #f0f0f0;
              padding: 5px 8px;
              border-radius: 4px;
              font-size: 12px;
            }
            .footer { 
              margin-top: 30px; 
              text-align: center; 
              color: #666; 
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            .record-id {
              background: #1976d2;
              color: white;
              padding: 5px 10px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 12px;
              display: inline-block;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Wildlife Rescue Record</h1>
            <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <div class="record-details">
            <div class="record-id">ID: ${record.id}</div>
            
            <div class="detail-row">
              <div class="detail-label">Species Name:</div>
              <div class="detail-value">${record.species_name}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Status:</div>
              <div class="detail-value">
                <span class="status-${record.status.replace(' ', '-')}">${record.status.toUpperCase()}</span>
              </div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Location:</div>
              <div class="detail-value">
                ${record.barangay || 'N/A'}, ${record.municipality || 'N/A'}<br>
                <span class="coordinates">Lat: ${record.latitude.toFixed(6)}, Lng: ${record.longitude.toFixed(6)}</span>
              </div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Reporter:</div>
              <div class="detail-value">${record.reporter_name || 'N/A'}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Contact Number:</div>
              <div class="detail-value">${record.contact_number || 'N/A'}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Date Captured:</div>
              <div class="detail-value">
                ${new Date(record.timestamp_captured).toLocaleDateString()} at ${new Date(record.timestamp_captured).toLocaleTimeString()}
              </div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Record Created:</div>
              <div class="detail-value">
                ${new Date(record.created_at).toLocaleDateString()} at ${new Date(record.created_at).toLocaleTimeString()}
              </div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">Last Updated:</div>
              <div class="detail-value">
                ${new Date(record.updated_at).toLocaleDateString()} at ${new Date(record.updated_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>Wildlife GIS System - Individual Record Report</p>
            <p>This report contains detailed information for a single wildlife rescue record.</p>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  // Handle scroll to map
  const handleBackToMap = () => {
    // Always scroll to the very top of the page to show entire map section
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  };

  // Print the form
  const printForm = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Wildlife Rescue Statistics Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { color: #1976d2; margin-bottom: 10px; }
            .header p { color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .status-reported { color: #ff9800; font-weight: bold; }
            .status-rescued { color: #f44336; font-weight: bold; }
            .status-turned-over { color: #2196f3; font-weight: bold; }
            .status-released { color: #4caf50; font-weight: bold; }
            .footer { margin-top: 30px; text-align: center; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Wildlife Rescue Statistics Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Species Name</th>
                <th>Status</th>
                <th>Location</th>
                <th>Reporter</th>
                <th>Date Captured</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRecords.map(record => `
                <tr>
                  <td>${record.species_name}</td>
                  <td class="status-${record.status.replace(' ', '-')}">${record.status.toUpperCase()}</td>
                  <td>${record.barangay || 'N/A'}, ${record.municipality || 'N/A'}</td>
                  <td>${record.reporter_name || 'N/A'}</td>
                  <td>${new Date(record.timestamp_captured).toLocaleDateString()}</td>
                  <td>${record.contact_number || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Total Records: ${filteredRecords.length}${hasActiveFilters ? ` (filtered from ${wildlifeRecords.length})` : ''}</p>
            <p>Report generated by Wildlife GIS System</p>
          </div>
        </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
    setPrintDialogOpen(false);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'reported': return '#f44336'; // Red
      case 'rescued': return '#2196f3'; // Blue
      case 'turned over': return '#ffc107'; // Yellow
      case 'released': return '#4caf50'; // Green
      default: return '#666';
    }
  };

  // Get status text color with theme awareness - neutral in light mode, subtle colors in dark mode
  const getStatusTextColorThemeAware = (status: string) => {
    if (theme.palette.mode === 'light') {
      return theme.palette.text.primary; // Use primary text color for light mode (dark text on light background)
    } else { // Dark mode
      switch (status.toLowerCase()) {
        case 'reported':
          return '#9ca3af'; // Lighter grey for dark mode
        case 'rescued':
          return '#60a5fa'; // Lighter blue for dark mode
        case 'turned over':
          return '#fbbf24'; // Lighter amber for dark mode
        case 'released':
          return '#34d399'; // Lighter green for dark mode
        default:
          return theme.palette.text.secondary; // Fallback to secondary text color
      }
    }
  };

  // Pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setSpeciesFilter('');
    setStatusFilter('');
    setApprovalFilter('');
    setLocationFilter('');
    setDateFromFilter('');
    setDateToFilter('');
    setPage(0);
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || speciesFilter || statusFilter || approvalFilter || locationFilter || dateFromFilter || dateToFilter;

  // Filter records based on search and filter criteria
  const filteredRecords = useMemo(() => {
    return wildlifeRecords.filter(record => {
      // Search query filter (searches in species name, reporter name, barangay, municipality)
      const searchMatch = !searchQuery || 
        record.species_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.reporter_name && record.reporter_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (record.barangay && record.barangay.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (record.municipality && record.municipality.toLowerCase().includes(searchQuery.toLowerCase()));

      // Species filter
      const speciesMatch = !speciesFilter || 
        record.species_name.toLowerCase().includes(speciesFilter.toLowerCase());

      // Status filter
      const statusMatch = !statusFilter || record.status === statusFilter;

      // Approval status filter
      const approvalMatch = !approvalFilter || record.approval_status === approvalFilter;

      // Location filter (searches in barangay and municipality)
      const locationMatch = !locationFilter || 
        (record.barangay && record.barangay.toLowerCase().includes(locationFilter.toLowerCase())) ||
        (record.municipality && record.municipality.toLowerCase().includes(locationFilter.toLowerCase()));

      // Date range filter
      const recordDate = new Date(record.timestamp_captured);
      const fromDate = dateFromFilter ? new Date(dateFromFilter) : null;
      const toDate = dateToFilter ? new Date(dateToFilter) : null;
      
      const dateMatch = (!fromDate || recordDate >= fromDate) && 
                       (!toDate || recordDate <= toDate);

      return searchMatch && speciesMatch && statusMatch && approvalMatch && locationMatch && dateMatch;
    });
  }, [wildlifeRecords, searchQuery, speciesFilter, statusFilter, approvalFilter, locationFilter, dateFromFilter, dateToFilter]);

  const paginatedRecords = filteredRecords.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading wildlife records...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      {/* Header with Print and Back to Map Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ color: theme.palette.primary.main }}>
          Wildlife Record List
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<MapIcon />}
            onClick={handleBackToMap}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              borderColor: 'secondary.main',
              color: 'secondary.main',
              '&:hover': {
                backgroundColor: 'secondary.main',
                color: 'white',
                borderColor: 'secondary.main',
              }
            }}
          >
            Back to Map
          </Button>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ 
              bgcolor: theme.palette.primary.main,
              '&:hover': { bgcolor: theme.palette.primary.dark }
            }}
          >
            Print
          </Button>
        </Box>
      </Box>

      {/* Search and Filter Section */}
      <Card sx={{ mb: 3, boxShadow: 1 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <SearchIcon color="action" />
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Search & Filter Records
            </Typography>
            <Button
              variant="outlined"
              startIcon={filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              size="small"
            >
              {filtersExpanded ? 'Hide Filters' : 'Show Filters'}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<ClearIcon />}
                onClick={clearAllFilters}
                size="small"
              >
                Clear All
              </Button>
            )}
          </Box>

          {/* Search Bar */}
          <TextField
            fullWidth
            placeholder="Search by species name, reporter, barangay, or municipality..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {/* Collapsible Filters */}
          <Collapse in={filtersExpanded}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="Species Name"
                    placeholder="Filter by species name"
                    value={speciesFilter}
                    onChange={(e) => {
                      setSpeciesFilter(e.target.value);
                      setPage(0);
                    }}
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(0);
                      }}
                      label="Status"
                      sx={{ minWidth: 200 }}
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      <MenuItem value="reported">Reported</MenuItem>
                      <MenuItem value="rescued">Rescued</MenuItem>
                      <MenuItem value="turned over">Turned Over</MenuItem>
                      <MenuItem value="released">Released</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <FormControl fullWidth>
                    <InputLabel>Approval Status</InputLabel>
                    <Select
                      value={approvalFilter}
                      onChange={(e) => {
                        setApprovalFilter(e.target.value);
                        setPage(0);
                      }}
                      label="Approval Status"
                      sx={{ minWidth: 200 }}
                    >
                      <MenuItem value="">All Approval Statuses</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="approved">Approved</MenuItem>
                      <MenuItem value="rejected">Rejected</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="Location"
                    placeholder="Barangay or Municipality"
                    value={locationFilter}
                    onChange={(e) => {
                      setLocationFilter(e.target.value);
                      setPage(0);
                    }}
                  />
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="Date From"
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => {
                      setDateFromFilter(e.target.value);
                      setPage(0);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 250px', minWidth: 0 }}>
                  <TextField
                    fullWidth
                    label="Date To"
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => {
                      setDateToFilter(e.target.value);
                      setPage(0);
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
              </Box>
            </Box>
          </Collapse>

          {/* Results Summary */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredRecords.length} of {wildlifeRecords.length} records
            </Typography>
            {hasActiveFilters && (
              <Chip
                label={`${wildlifeRecords.length - filteredRecords.length} filtered out`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Statistics Table */}
      <TableContainer component={Paper} sx={{ 
        boxShadow: 1, 
        borderRadius: 2,
        bgcolor: 'background.paper'
      }}>
        <Table>
          <TableHead>
            <TableRow sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'
            }}>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary', 
                borderBottom: `1px solid ${theme.palette.divider}`,
                py: 2,
                width: 120
              }}>
                ID
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary', 
                borderBottom: `1px solid ${theme.palette.divider}`,
                py: 2
              }}>
                Species Name
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary', 
                borderBottom: `1px solid ${theme.palette.divider}`,
                py: 2
              }}>
                Status
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary', 
                borderBottom: `1px solid ${theme.palette.divider}`,
                py: 2
              }}>
                Approval
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary', 
                borderBottom: `1px solid ${theme.palette.divider}`,
                py: 2
              }}>
                Location
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary', 
                borderBottom: `1px solid ${theme.palette.divider}`,
                py: 2
              }}>
                Reporter
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary', 
                borderBottom: `1px solid ${theme.palette.divider}`,
                py: 2
              }}>
                Date Captured
              </TableCell>
              <TableCell sx={{ 
                fontWeight: 600, 
                color: 'text.primary', 
                borderBottom: `1px solid ${theme.palette.divider}`,
                py: 2
              }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRecords.map((record, index) => (
              <TableRow 
                key={record.id}
                sx={{ 
                  bgcolor: index % 2 === 0 
                    ? 'background.paper' 
                    : theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.02)' 
                      : 'rgba(0, 0, 0, 0.02)',
                  '&:hover': { 
                    bgcolor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.04)' 
                  },
                  borderBottom: `1px solid ${theme.palette.divider}`
                }}
              >
                <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}`, py: 2, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {record.id}
                </TableCell>
                <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}`, py: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {record.species_name}
                  </Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}`, py: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: getStatusColor(record.status),
                      fontWeight: 700,
                      fontSize: '0.80rem',
                      letterSpacing: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    {record.status}
                  </Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}`, py: 2 }}>
                  <Chip
                    label={record.approval_status}
                    size="small"
                    color={
                      record.approval_status === 'approved' ? 'success' :
                      record.approval_status === 'rejected' ? 'error' : 'warning'
                    }
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}`, py: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {record.barangay || 'N/A'}, {record.municipality || 'N/A'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Lat: {record.latitude.toFixed(6)}, Lng: {record.longitude.toFixed(6)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}`, py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%', 
                      bgcolor: theme.palette.primary.main,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.875rem'
                    }}>
                      {(record.reporter_name || 'N/A').charAt(0).toUpperCase()}
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                        {record.reporter_name || 'N/A'}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}`, py: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500 }}>
                    {new Date(record.timestamp_captured).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {new Date(record.timestamp_captured).toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}`, py: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => handleLocationClick(record)}
                      sx={{ 
                        color: theme.palette.primary.main,
                        textTransform: 'none',
                        fontWeight: 500,
                        '&:hover': { 
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(25, 118, 210, 0.1)' 
                            : 'rgba(25, 118, 210, 0.04)' 
                        }
                      }}
                    >
                      View Map
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleEditRecord(record)}
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': { 
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(25, 118, 210, 0.1)' 
                            : 'rgba(25, 118, 210, 0.04)',
                          color: theme.palette.primary.main
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handlePrintRecord(record)}
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': { 
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(76, 175, 80, 0.1)' 
                            : 'rgba(76, 175, 80, 0.04)',
                          color: '#4caf50'
                        }
                      }}
                    >
                      <PrintIcon fontSize="small" />
                    </IconButton>
                    {record.approval_status === 'pending' && record.user_id === null && (
                      <>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<CheckCircle fontSize="small" />}
                          onClick={() => handleApproveRecord(record.id)}
                          sx={{ 
                            color: '#4caf50',
                            borderColor: '#4caf50',
                            textTransform: 'none',
                            fontWeight: 500,
                            '&:hover': { 
                              bgcolor: theme.palette.mode === 'dark' 
                                ? 'rgba(76, 175, 80, 0.1)' 
                                : 'rgba(76, 175, 80, 0.04)',
                              borderColor: '#4caf50'
                            }
                          }}
                        >
                          Approved
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Close fontSize="small" />}
                          onClick={() => handleRejectRecord(record.id)}
                          sx={{ 
                            color: theme.palette.error.main,
                            borderColor: theme.palette.error.main,
                            textTransform: 'none',
                            fontWeight: 500,
                            '&:hover': { 
                              bgcolor: theme.palette.mode === 'dark' 
                                ? 'rgba(239, 68, 68, 0.1)' 
                                : 'rgba(239, 68, 68, 0.04)',
                              borderColor: theme.palette.error.main
                            }
                          }}
                        >
                          Rejected
                        </Button>
                      </>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteRecord(record.id)}
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': { 
                          bgcolor: theme.palette.mode === 'dark' 
                            ? 'rgba(239, 68, 68, 0.1)' 
                            : 'rgba(239, 68, 68, 0.04)',
                          color: theme.palette.error.main
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredRecords.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Print Confirmation Dialog */}
      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)}>
        <DialogTitle>Print Wildlife Rescue Statistics</DialogTitle>
        <DialogContent>
          <Typography>
            This will generate a printable report with all wildlife rescue statistics. 
            The report will include species names, statuses, locations, reporters, and dates.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
          <Button onClick={printForm} variant="contained">Print Report</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Record Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleEditDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Wildlife Record</DialogTitle>
        <DialogContent>
          {editError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {editError}
            </Alert>
          )}
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Species Name"
              value={editFormData.species_name || ''}
              onChange={(e) => setEditFormData(prev => ({ ...prev, species_name: e.target.value }))}
              fullWidth
              required
            />
            
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editFormData.status || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as any }))}
                label="Status"
              >
                <MenuItem value="reported">Reported</MenuItem>
                <MenuItem value="rescued">Rescued</MenuItem>
                <MenuItem value="turned over">Turned Over</MenuItem>
                <MenuItem value="released">Released</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Barangay"
              value={editFormData.barangay || ''}
              onChange={(e) => setEditFormData(prev => ({ ...prev, barangay: e.target.value }))}
              fullWidth
            />
            
            <TextField
              label="Municipality"
              value={editFormData.municipality || ''}
              onChange={(e) => setEditFormData(prev => ({ ...prev, municipality: e.target.value }))}
              fullWidth
            />
            
            <TextField
              label="Reporter Name"
              value={editFormData.reporter_name || ''}
              onChange={(e) => setEditFormData(prev => ({ ...prev, reporter_name: e.target.value }))}
              fullWidth
            />
            
            <TextField
              label="Contact Number"
              value={editFormData.contact_number || ''}
              onChange={(e) => setEditFormData(prev => ({ ...prev, contact_number: e.target.value }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose} disabled={editLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleEditSubmit} 
            variant="contained" 
            disabled={editLoading || !editFormData.species_name?.trim()}
          >
            {editLoading ? 'Updating...' : 'Update Record'}
          </Button>
         </DialogActions>
       </Dialog>

       {/* Success Snackbar */}
       <Snackbar
         open={successSnackbar.open}
         autoHideDuration={4000}
         onClose={() => setSuccessSnackbar(prev => ({ ...prev, open: false }))}
         anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
       >
         <Alert
           onClose={() => setSuccessSnackbar(prev => ({ ...prev, open: false }))}
           severity="success"
           variant="filled"
           sx={{ width: '100%' }}
         >
           {successSnackbar.message}
         </Alert>
       </Snackbar>
     </Box>
   );
 };

export default WildlifeRescueStatistics;
