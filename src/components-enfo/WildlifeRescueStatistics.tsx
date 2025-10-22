import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Delete as DeleteIcon,
  Print as PrintIcon,
  Map as MapIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { getWildlifeRecords, deleteWildlifeRecord, updateWildlifeRecord, type WildlifeRecord, type UpdateWildlifeRecord } from '../services/wildlifeRecords';
import { useMapNavigation } from '../context/MapNavigationContext';

export default function WildlifeRescueStatistics() {
  const theme = useTheme();
  const { navigateToLocation, refreshRecordsVersion } = useMapNavigation();
  const [wildlifeRecords, setWildlifeRecords] = useState<WildlifeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  
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

  // Handle print
  const handlePrint = () => {
    setPrintDialogOpen(true);
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
              ${wildlifeRecords.map(record => `
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
            <p>Total Records: ${wildlifeRecords.length}</p>
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

  const paginatedRecords = wildlifeRecords.slice(
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
          Wildlife Rescue Statistics
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
                  <Chip
                    label={record.status.toUpperCase()}
                    size="small"
                    sx={{
                      bgcolor: 'transparent', // No background
                      color: getStatusTextColorThemeAware(record.status), // Text color from the new function
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 'auto', // Remove fixed height
                      borderRadius: 0, // Remove border radius
                      padding: '0', // Remove padding
                      boxShadow: 'none', // Ensure no shadow
                      border: 'none', // Ensure no border
                      '&:hover': {
                        opacity: 0.8, // Subtle hover effect
                        transition: 'opacity 0.2s ease-in-out',
                        bgcolor: 'transparent', // Ensure hover background is also transparent
                      }
                    }}
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
          count={wildlifeRecords.length}
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
 }
