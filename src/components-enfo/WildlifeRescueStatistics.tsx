import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Stack,
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
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { getWildlifeRecords, deleteWildlifeRecord, updateWildlifeRecord, approveWildlifeRecord, rejectWildlifeRecord, getUserRole, uploadWildlifePhoto, type WildlifeRecord, type UpdateWildlifeRecord } from '../services/wildlifeRecords';
import { useAuth } from '../context/AuthContext';
import { useMapNavigation } from '../context/MapNavigationContext';
import * as XLSX from 'xlsx';

interface WildlifeRescueStatisticsProps {
  showPendingOnly?: boolean;
  environmentalBg?: boolean;
}

const WildlifeRescueStatistics: React.FC<WildlifeRescueStatisticsProps> = ({ showPendingOnly = false, environmentalBg = false }) => {
  const { user } = useAuth();
  const [resolvedRole, setResolvedRole] = useState<string | null>((user?.user_metadata as any)?.role || null);
  const theme = useTheme();
  const { navigateToLocation, refreshRecordsVersion } = useMapNavigation();
  const [wildlifeRecords, setWildlifeRecords] = useState<WildlifeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [printDateFrom, setPrintDateFrom] = useState('');
  const [printDateTo, setPrintDateTo] = useState('');
  // Reject confirmation dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [recordToReject, setRecordToReject] = useState<WildlifeRecord | null>(null);
  // Approval preview modal
  const [approvalPreviewOpen, setApprovalPreviewOpen] = useState(false);
  const [recordToApprove, setRecordToApprove] = useState<WildlifeRecord | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const approvalContentRef = useRef<HTMLDivElement>(null);
  
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
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  
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

  // Error notification state
  const [errorSnackbar, setErrorSnackbar] = useState<{
    open: boolean;
    message: string;
  }>({
    open: false,
    message: '',
  });

  // Resolve role from DB if not in auth metadata
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!resolvedRole) {
        try {
          const r = await getUserRole();
          if (!cancelled) setResolvedRole(r);
        } catch {}
      }
    })();
    return () => { cancelled = true; };
  }, [resolvedRole]);

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
    
    // Extract country code and phone number from contact_number
    const contactNumber = record.contact_number || '';
    let countryCode = '+63';
    let phoneNumber = '';
    if (contactNumber) {
      if (contactNumber.startsWith('+63')) {
        countryCode = '+63';
        phoneNumber = contactNumber.replace(/^\+63/, '');
      } else if (contactNumber.startsWith('+1')) {
        countryCode = '+1';
        phoneNumber = contactNumber.replace(/^\+1/, '');
      } else if (contactNumber.startsWith('+44')) {
        countryCode = '+44';
        phoneNumber = contactNumber.replace(/^\+44/, '');
      } else if (contactNumber.startsWith('+81')) {
        countryCode = '+81';
        phoneNumber = contactNumber.replace(/^\+81/, '');
      } else if (contactNumber.startsWith('+86')) {
        countryCode = '+86';
        phoneNumber = contactNumber.replace(/^\+86/, '');
      } else if (contactNumber.startsWith('+82')) {
        countryCode = '+82';
        phoneNumber = contactNumber.replace(/^\+82/, '');
      } else if (contactNumber.startsWith('+65')) {
        countryCode = '+65';
        phoneNumber = contactNumber.replace(/^\+65/, '');
      } else if (contactNumber.startsWith('+60')) {
        countryCode = '+60';
        phoneNumber = contactNumber.replace(/^\+60/, '');
      } else {
        phoneNumber = contactNumber;
      }
    }
    
    setEditFormData({
      species_name: record.species_name,
      status: record.status as 'reported' | 'rescued' | 'turned over' | 'released',
      barangay: record.barangay || '',
      municipality: record.municipality || '',
      reporter_name: record.reporter_name || '',
      contact_number: record.contact_number || '',
      photo_url: record.photo_url || '',
      country_code: countryCode,
      phone_number: phoneNumber,
    });
    setEditPhotoFile(null);
    setEditPhotoPreview(record.photo_url || null);
    setEditError(null);
    setEditDialogOpen(true);
  };

  // Handle edit form submission
  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    setEditError(null);
    setEditLoading(true);

    try {
      // Get the current record from the list to ensure we have the latest photo_url
      const currentRecord = wildlifeRecords.find(r => r.id === editingRecord.id);
      const originalPhotoUrl = currentRecord?.photo_url || editingRecord.photo_url;
      
      // Filter out phone_number and country_code as they're not database columns
      // Also exclude photo_url from form data since we'll handle it separately
      const { phone_number, country_code, photo_url: formPhotoUrl, ...baseUpdateData } = editFormData;
      
      // Build update data
      const updateData: UpdateWildlifeRecord = {
        ...baseUpdateData,
      };
      
      // Handle photo upload/removal
      if (editPhotoFile) {
        // New photo was selected - upload it
        try {
          const uploadedPhotoUrl = await uploadWildlifePhoto(editPhotoFile, editingRecord.id);
          if (uploadedPhotoUrl) {
            updateData.photo_url = uploadedPhotoUrl;
          }
        } catch (photoError) {
          console.error('Error uploading photo:', photoError);
          setEditError('Failed to upload photo. Please try again.');
          setEditLoading(false);
          return;
        }
      } else if (editPhotoPreview === null && originalPhotoUrl) {
        // Photo was removed - set to null
        updateData.photo_url = null as any;
      } else if (!editPhotoFile && originalPhotoUrl) {
        // No new photo selected and no removal - preserve original photo_url
        // CRITICAL: Always preserve photo_url from original record to prevent ERR_FILE_NOT_FOUND
        if (typeof originalPhotoUrl === 'string' && originalPhotoUrl.trim() !== '') {
          updateData.photo_url = originalPhotoUrl;
        }
      }
      
      const updatedRecord = await updateWildlifeRecord(editingRecord.id, updateData);
      setWildlifeRecords(prev => 
        prev.map(record => record.id === editingRecord.id ? updatedRecord : record)
      );
      
      // Clean up blob URL if it exists
      if (editPhotoPreview && editPhotoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(editPhotoPreview);
      }
      
      setEditDialogOpen(false);
      setEditingRecord(null);
      setEditFormData({});
      setEditPhotoFile(null);
      setEditPhotoPreview(null);
      
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
    // Clean up blob URL if it exists
    if (editPhotoPreview && editPhotoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(editPhotoPreview);
    }
    setEditDialogOpen(false);
    setEditingRecord(null);
    setEditFormData({});
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
    setEditError(null);
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (editPhotoPreview && editPhotoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(editPhotoPreview);
      }
    };
  }, [editPhotoPreview]);


  // Handle approve record - open preview modal
  const handleApproveClick = (record: WildlifeRecord) => {
    setRecordToApprove(record);
    setApprovalPreviewOpen(true);
    setHasScrolledToBottom(false);
  };

  // Handle scroll in approval modal
  const handleApprovalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight;
    const clientHeight = target.clientHeight;
    
    // Check if scrolled to bottom (with 50px threshold)
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
    setHasScrolledToBottom(isAtBottom);
  };

  // Final approve function
  const handleFinalApprove = async () => {
    if (!recordToApprove) return;
    
    try {
      const updatedRecord = await approveWildlifeRecord(recordToApprove.id);
      setWildlifeRecords(prev => 
        prev.map(record => record.id === recordToApprove.id ? updatedRecord : record)
      );
      setSuccessSnackbar({
        open: true,
        message: 'Wildlife record has been approved successfully! Refreshing data...',
      });
      
      // Close modal
      setApprovalPreviewOpen(false);
      setRecordToApprove(null);
      setHasScrolledToBottom(false);
      
      // Refresh the entire site after successful approval
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Error approving wildlife record:', error);
      setErrorSnackbar({
        open: true,
        message: 'Failed to approve wildlife record',
      });
    }
  };

  // Handle reject - open confirmation dialog with print option
  const handleRejectRecord = (id: string) => {
    const rec = wildlifeRecords.find(r => r.id === id) || null;
    setRecordToReject(rec);
    setRejectDialogOpen(true);
  };

  const proceedReject = async () => {
    if (!recordToReject) { setRejectDialogOpen(false); return; }
    try {
      const updatedRecord = await rejectWildlifeRecord(recordToReject.id);
      setWildlifeRecords(prev => prev.map(record => record.id === recordToReject.id ? updatedRecord : record));
      setSuccessSnackbar({ open: true, message: 'Wildlife record has been rejected successfully! Refreshing data...' });
      setRejectDialogOpen(false);
      setRecordToReject(null);
      setTimeout(() => { window.location.reload(); }, 1500);
    } catch (error) {
      console.error('Error rejecting wildlife record:', error);
      setErrorSnackbar({ open: true, message: 'Failed to reject wildlife record' });
      setRejectDialogOpen(false);
    }
  };

  const openPrintAndReject = async () => {
    try {
      const idParam = recordToReject?.id ? `?recordId=${recordToReject.id}` : '';
      window.open(`/forms/denr-form.html${idParam}`, '_blank');
    } catch {}
    await proceedReject();
  };

  // View Form for any record: show message if no saved form exists, then open form
  const handleViewForm = (rec: WildlifeRecord) => {
    try {
      const key = `denrForm:${rec.id}`;
      const exists = !!localStorage.getItem(key);
      if (!exists) {
        alert('No saved form exists yet for this record. You can fill and save from the form page.');
        return; // do not open if nothing saved yet
      }
    } catch {}
    window.open(`/forms/denr-form.html?recordId=${rec.id}`,'_blank');
  };



  // Handle Excel export preview
  const handleExcelPreview = () => {
    // Filter records by date range if specified
    let recordsToExport = filteredRecords;
    
    if (printDateFrom || printDateTo) {
      recordsToExport = filteredRecords.filter(record => {
        const recordDate = new Date(record.timestamp_captured);
        const fromDate = printDateFrom ? new Date(printDateFrom) : null;
        const toDate = printDateTo ? new Date(printDateTo) : null;
        
        const dateMatch = (!fromDate || recordDate >= fromDate) && 
                         (!toDate || recordDate <= toDate);
        
        return dateMatch;
      });
    }
    
    const exportData = recordsToExport.map(record => ({
      'Species Name': record.species_name || '',
      'Status': formatStatusLabel(record.status),
      'Location': record.barangay || '',
      'Reporter': record.reporter_name || '',
      'Contact': record.reporter_contact || '',
      'Date Reported': record.timestamp_captured ? new Date(record.timestamp_captured).toLocaleDateString() : '',
      'Approval Status': record.approval_status || '',
      'Notes': record.notes || ''
    }));
    
    setPreviewData(exportData);
    setPreviewDialogOpen(true);
  };

  // Handle Excel export
  const handleExcelExport = () => {
    // Use the preview data that was already filtered
    const exportData = previewData;

    // Create a new workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Apply header styling and status-based colors
    if (exportData.length > 0) {
      const headers = Object.keys(exportData[0]);
      const statusColors: { [key: string]: { text: string; bg: string } } = {
        'Reported': { text: 'FF9800', bg: 'FFF3E0' },      // Orange
        'Rescued': { text: '2196F3', bg: 'E3F2FD' },       // Blue
        'Turned Over': { text: 'FFC107', bg: 'FFF8E1' },  // Yellow
        'Released': { text: '4CAF50', bg: 'E8F5E9' },       // Green
      };
      
      // Style headers
      headers.forEach((header, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({ c: colIndex, r: 0 });
        if (!ws[cellRef]) return;
        
        ws[cellRef].s = {
          font: { 
            bold: true, 
            color: { rgb: 'FFFFFF' }, 
            sz: 12 
          },
          fill: { 
            fgColor: { rgb: '1976D2' },
            patternType: 'solid'
          },
          alignment: { 
            horizontal: 'center', 
            vertical: 'center'
          },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      });
      
      // Color-code rows based on status
      exportData.forEach((row, rowIndex) => {
        headers.forEach((header, colIndex) => {
          const cellRef = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex + 1 });
          if (!ws[cellRef]) return;
          
          // Apply status-based colors
          if (header === 'Status') {
            const status = String(row[header as keyof typeof row]);
            const colors = statusColors[status] || { text: '000000', bg: 'FFFFFF' };
            
            ws[cellRef].s = {
              font: { 
                color: { rgb: colors.text }, 
                bold: true 
              },
              fill: { 
                fgColor: { rgb: colors.bg },
                patternType: 'solid'
              }
            };
          }
        });
      });
      
      // Create a cell styles worksheet
      const styleData: any = {};
      if (headers.length > 0) {
        headers.forEach((_, colIndex) => {
          styleData[XLSX.utils.encode_cell({ c: colIndex, r: 0 })] = {};
        });
      }
      
      ws['!merges'] = [];
    }
    const maxWidth = 50; // Maximum column width
    const minWidth = 10; // Minimum column width
    const colWidths = exportData.length > 0 ? Object.keys(exportData[0]).map(header => {
      // Get the max length of content in this column
      const maxLength = Math.max(
        header.length, // Header length
        ...exportData.map(row => {
          const value = row[header as keyof typeof row];
          return value ? String(value).length : 0;
        })
      );
      // Return width with constraints
      return { wch: Math.min(Math.max(maxLength + 2, minWidth), maxWidth) };
    }) : [];
    
    ws['!cols'] = colWidths;
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Wildlife Records');
    
    // Generate the XLSX file
    const dateRange = printDateFrom || printDateTo ? `_${printDateFrom || 'start'}_to_${printDateTo || 'end'}` : '';
    const fileName = `wildlife_records${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Write options with cell styles
    const wopts: XLSX.WritingOptions = {
      bookType: 'xlsx',
      bookSST: false,
      type: 'binary',
      cellStyles: true
    };
    
    // Write and download the file
    XLSX.writeFile(wb, fileName, wopts);
    
    setPreviewDialogOpen(false);
    setExportDialogOpen(false);
  };

  // Handle print
  const handlePrint = () => {
    setPrintDialogOpen(true);
  };

  // Handle print individual record
  const handlePrintRecord = (record: WildlifeRecord) => {
    // If a saved form already exists, warn that it will be overwritten upon Save
    try {
      const key = `denrForm:${record.id}`;
      const exists = !!localStorage.getItem(key);
      if (exists) {
        const proceed = window.confirm('A saved form already exists for this record. Opening the form and saving again will overwrite the existing saved form. Continue?');
        if (!proceed) return;
      }
    } catch {}

    // Open the DENR form template with recordId in a new tab
    const templatePath = `/forms/denr-form.html?recordId=${record.id}`;
    const printWindow = window.open(templatePath, '_blank');
    
    if (!printWindow) {
      alert('Please allow popups for this site to open the DENR form.');
      return;
    }
    
    // Just open the window; user can manually save/print
  };
  
  // Old handlePrintRecord code for reference (commented out)
  const handlePrintRecordOld = (record: WildlifeRecord) => {
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
                <span class="status-${record.status.replace(' ', '-')}">${formatStatusLabel(record.status).toUpperCase()}</span>
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
    // Filter records by date range if specified
    let recordsToPrint = filteredRecords;
    
    if (printDateFrom || printDateTo) {
      recordsToPrint = filteredRecords.filter(record => {
        const recordDate = new Date(record.timestamp_captured);
        const fromDate = printDateFrom ? new Date(printDateFrom) : null;
        const toDate = printDateTo ? new Date(printDateTo) : null;
        
        const dateMatch = (!fromDate || recordDate >= fromDate) && 
                         (!toDate || recordDate <= toDate);
        
        return dateMatch;
      });
    }
    
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
            ${printDateFrom || printDateTo ? `<p>Date Range: ${printDateFrom || 'Start'} to ${printDateTo || 'End'}</p>` : ''}
            <p>Total Records: ${recordsToPrint.length}</p>
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
              ${recordsToPrint.map(record => `
                <tr>
                  <td>${record.species_name}</td>
                  <td class="status-${record.status.replace(' ', '-')}">${formatStatusLabel(record.status).toUpperCase()}</td>
                  <td>${record.barangay || 'N/A'}, ${record.municipality || 'N/A'}</td>
                  <td>${record.reporter_name || 'N/A'}</td>
                  <td>${new Date(record.timestamp_captured).toLocaleDateString()}</td>
                  <td>${record.contact_number || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Wildlife GIS System - Statistics Report</p>
            <p>This report contains wildlife rescue statistics${printDateFrom || printDateTo ? ' for the specified date range' : ''}.</p>
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

  // Format status label for display
  const formatStatusLabel = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'released':
        return 'Released';
      case 'turned over':
        return 'Turned Over';
      case 'reported':
        return 'Reported';
      case 'rescued':
        return 'Rescued';
      default:
        return status;
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
        <Typography variant="h4" component="h1" sx={{ color: '#2e7d32 !important' }}>
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
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={() => setExportDialogOpen(true)}
            sx={{ 
              bgcolor: theme.palette.success.main,
              '&:hover': { bgcolor: theme.palette.success.dark }
            }}
          >
            Export Excel
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
              {(() => {
                const start = page * rowsPerPage + 1;
                const end = Math.min(page * rowsPerPage + rowsPerPage, filteredRecords.length);
                const total = filteredRecords.length;
                // Calculate approved records count (matching analytics logic)
                const approvedCount = wildlifeRecords.filter(r => r.approval_status === 'approved' || r.user_id !== null).length;
                const totalRecords = wildlifeRecords.length;
                
                if (total === 0) {
                  return 'No records found';
                }
                
                // Build the message
                let message = '';
                if (start === end) {
                  message = `Showing record ${start} of ${total}`;
                } else {
                  message = `Showing ${start}-${end} of ${total} records`;
                }
                
                // Add context about total and approved counts
                if (!hasActiveFilters) {
                  // When no filters, show total vs approved to match analytics
                  if (totalRecords !== approvedCount) {
                    message += ` (${approvedCount} approved, ${totalRecords} total)`;
                  } else {
                    message += ` (${totalRecords} total)`;
                  }
                } else {
                  // When filters are active, show filtered vs total
                  message += ` (${totalRecords} total`;
                  if (totalRecords !== approvedCount) {
                    message += `, ${approvedCount} approved`;
                  }
                  message += ')';
                }
                
                return message;
              })()}
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
                    {formatStatusLabel(record.status)}
                  </Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}`, py: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
                    {record.approval_status === 'pending' && record.user_id === null && record.has_exif_gps === false && (
                      <Chip
                        label="no exif gps data"
                        size="small"
                        color="error"
                        variant="filled"
                        sx={{ 
                          fontWeight: 500,
                          fontSize: '0.7rem',
                          height: 20,
                          mt: 0.5
                        }}
                      />
                    )}
                  </Box>
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
                      View Location
                    </Button>
                    {resolvedRole === 'enforcement' && (
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
                    )}
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
                          onClick={() => handleApproveClick(record)}
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
                          Approve
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
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => handleViewForm(record)}
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
                      View Form
                    </Button>
                    {resolvedRole === 'enforcement' && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => handleDeleteRecord(record.id)}
                        sx={{ 
                          color: '#ff1744 !important',
                          textTransform: 'none',
                          fontWeight: 700,
                          '&:hover': { 
                            bgcolor: 'rgba(255, 23, 68, 0.08)'
                          }
                        }}
                      >
                        Delete
                      </Button>
                    )}
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

      {/* Approval Preview Modal */}
      <Dialog 
        open={approvalPreviewOpen} 
        onClose={() => {
          setApprovalPreviewOpen(false);
          setRecordToApprove(null);
          setHasScrolledToBottom(false);
        }} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            background: environmentalBg
              ? (theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)'
                  : 'radial-gradient(ellipse at 50% 50%, hsl(220, 30%, 5%), hsl(220, 30%, 8%))')
              : undefined,
            backgroundRepeat: environmentalBg ? 'no-repeat' : undefined,
            backgroundSize: environmentalBg ? '100% 100%' : undefined,
            backgroundAttachment: environmentalBg ? 'fixed' : undefined,
            height: '85vh',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
          }
        }}
      >
        <DialogTitle sx={{ pb: 2, textAlign: 'center' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
            <Box
              component="img"
              src="/images/kinaiyahanlogonobg.png"
              alt="Kinaiyahan"
              sx={{ width: 56, height: 56, objectFit: 'contain' }}
            />
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                letterSpacing: '0.3em',
                color: '#2e7d32 !important',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              ＫＩＮＡＩＹＡＨＡＮ
            </Typography>
          </Stack>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2e7d32 !important' }}>
            Review Public Report
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: '#2e7d32 !important' }}>
            Please review the report details before approving
          </Typography>
        </DialogTitle>
        <DialogContent 
          sx={{ 
            pt: 3,
            flex: 1,
            overflowY: 'auto',
            position: 'relative',
            minHeight: 0
          }}
          onScroll={handleApprovalScroll}
          ref={approvalContentRef}
        >
          {recordToApprove && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Photo Section */}
              {recordToApprove.photo_url && (
                <Card sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#2e7d32 !important' }}>
                    Photo
                  </Typography>
                  <Box
                    component="img"
                    src={recordToApprove.photo_url}
                    alt={recordToApprove.species_name}
                    sx={{
                      width: '100%',
                      maxHeight: 350,
                      objectFit: 'contain',
                      borderRadius: 1.5,
                      border: '1px solid rgba(46, 125, 50, 0.3)',
                      bgcolor: 'background.default',
                    }}
                  />
                </Card>
              )}

              {/* Information Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {/* Species Information */}
                <Card sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#2e7d32 !important' }}>
                    Species Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                        Species Name
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32 !important' }}>
                        {recordToApprove.species_name}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                        Status
                      </Typography>
                      <Chip
                        label={recordToApprove.status}
                        size="small"
                        sx={{
                          borderColor: '#2e7d32',
                          color: '#2e7d32',
                          '& .MuiChip-label': {
                            color: '#2e7d32',
                          }
                        }}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </Card>

                {/* Location Information */}
                <Card sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#2e7d32 !important' }}>
                    Location Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {recordToApprove.barangay && (
                      <Box>
                        <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                          Barangay
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32 !important' }}>
                          {recordToApprove.barangay}
                        </Typography>
                      </Box>
                    )}
                    {recordToApprove.municipality && (
                      <Box>
                        <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                          Municipality
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32 !important' }}>
                          {recordToApprove.municipality}
                        </Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                        Coordinates
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#2e7d32 !important' }}>
                        {recordToApprove.latitude.toFixed(6)}, {recordToApprove.longitude.toFixed(6)}
                      </Typography>
                    </Box>
                    {recordToApprove.has_exif_gps && (
                      <Chip
                        label="GPS from Photo EXIF"
                        size="small"
                        sx={{
                          borderColor: '#2e7d32',
                          color: '#2e7d32',
                          mt: 0.5,
                          '& .MuiChip-label': {
                            color: '#2e7d32',
                          }
                        }}
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Card>
              </Box>

              {/* Reporter Information & Date */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {(recordToApprove.reporter_name || recordToApprove.contact_number) && (
                  <Card sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                    <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#2e7d32 !important' }}>
                      Reporter Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {recordToApprove.reporter_name && (
                        <Box>
                          <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                            Reporter Name
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32 !important' }}>
                            {recordToApprove.reporter_name}
                          </Typography>
                        </Box>
                      )}
                      {recordToApprove.contact_number && (
                        <Box>
                          <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                            Contact Number
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32 !important' }}>
                            {recordToApprove.contact_number}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Card>
                )}

                {/* Report Details */}
                <Card sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#2e7d32 !important' }}>
                    Report Details
                  </Typography>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                      Date Captured
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32 !important' }}>
                      {new Date(recordToApprove.timestamp_captured).toLocaleString()}
                    </Typography>
                  </Box>
                </Card>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2, flexDirection: 'column', alignItems: 'stretch' }}>
          {!hasScrolledToBottom && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 2, 
                bgcolor: 'rgba(46, 125, 50, 0.1)',
                border: '1px solid rgba(46, 125, 50, 0.3)',
                '& .MuiAlert-icon': {
                  color: '#2e7d32'
                },
                '& .MuiAlert-message': {
                  color: '#2e7d32'
                }
              }}
            >
              Please scroll down to review all information before approving.
            </Alert>
          )}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button 
              onClick={() => {
                setApprovalPreviewOpen(false);
                setRecordToApprove(null);
                setHasScrolledToBottom(false);
              }}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleFinalApprove} 
              variant="contained"
              startIcon={<CheckCircle />}
              disabled={!hasScrolledToBottom}
              sx={{
                bgcolor: hasScrolledToBottom ? '#4caf50' : 'rgba(46, 125, 50, 0.3)',
                color: hasScrolledToBottom ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  bgcolor: hasScrolledToBottom ? '#388e3c' : 'rgba(46, 125, 50, 0.3)'
                },
                '&:disabled': {
                  bgcolor: 'rgba(46, 125, 50, 0.3)',
                  color: 'rgba(255, 255, 255, 0.5)'
                }
              }}
            >
              Approve Report
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog 
        open={rejectDialogOpen} 
        onClose={() => setRejectDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            background: environmentalBg
              ? (theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)'
                  : 'radial-gradient(ellipse at 50% 50%, hsl(220, 30%, 5%), hsl(220, 30%, 8%))')
              : undefined,
            backgroundRepeat: environmentalBg ? 'no-repeat' : undefined,
            backgroundSize: environmentalBg ? '100% 100%' : undefined,
            backgroundAttachment: environmentalBg ? 'fixed' : undefined,
          }
        }}
      >
        <DialogTitle sx={{ pb: 2, textAlign: 'center' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
            <Box
              component="img"
              src="/images/kinaiyahanlogonobg.png"
              alt="Kinaiyahan"
              sx={{ width: 56, height: 56, objectFit: 'contain' }}
            />
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                letterSpacing: '0.3em',
                color: '#2e7d32 !important',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              ＫＩＮＡＩＹＡＨＡＮ
            </Typography>
          </Stack>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#2e7d32 !important' }}>
            Create Report and Reject
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: '#2e7d32 !important' }}>
            Opening the printable form in a new tab, then this record will be rejected. The site will stay on this page; the print form opens separately.
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {recordToReject && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Photo Section */}
              {recordToReject.photo_url && (
                <Card sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#2e7d32 !important' }}>
                    Photo
                  </Typography>
                  <Box
                    component="img"
                    src={recordToReject.photo_url}
                    alt={recordToReject.species_name}
                    sx={{
                      width: '100%',
                      maxHeight: 350,
                      objectFit: 'contain',
                      borderRadius: 1.5,
                      border: '1px solid rgba(46, 125, 50, 0.3)',
                      bgcolor: 'background.default',
                    }}
                  />
                </Card>
              )}

              {/* Information Grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {/* Species Information */}
                <Card sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#2e7d32 !important' }}>
                    Species Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                        Species Name
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32 !important' }}>
                        {recordToReject.species_name}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                        Status
                      </Typography>
                      <Chip
                        label={recordToReject.status}
                        size="small"
                        sx={{
                          borderColor: '#2e7d32',
                          color: '#2e7d32',
                          '& .MuiChip-label': {
                            color: '#2e7d32',
                          }
                        }}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </Card>

                {/* Location Information */}
                <Card sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#2e7d32 !important' }}>
                    Location Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {recordToReject.barangay && (
                      <Box>
                        <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                          Barangay
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32 !important' }}>
                          {recordToReject.barangay}
                        </Typography>
                      </Box>
                    )}
                    {recordToReject.municipality && (
                      <Box>
                        <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                          Municipality
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32 !important' }}>
                          {recordToReject.municipality}
                        </Typography>
                      </Box>
                    )}
                    <Box>
                      <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                        Coordinates
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#2e7d32 !important' }}>
                        {recordToReject.latitude.toFixed(6)}, {recordToReject.longitude.toFixed(6)}
                      </Typography>
                    </Box>
                    {recordToReject.has_exif_gps && (
                      <Chip
                        label="GPS from Photo EXIF"
                        size="small"
                        sx={{
                          borderColor: '#2e7d32',
                          color: '#2e7d32',
                          mt: 0.5,
                          '& .MuiChip-label': {
                            color: '#2e7d32',
                          }
                        }}
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Card>
              </Box>

              {/* Reporter Information & Date */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {(recordToReject.reporter_name || recordToReject.contact_number) && (
                  <Card sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                    <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#2e7d32 !important' }}>
                      Reporter Information
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {recordToReject.reporter_name && (
                        <Box>
                          <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                            Reporter Name
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32 !important' }}>
                            {recordToReject.reporter_name}
                          </Typography>
                        </Box>
                      )}
                      {recordToReject.contact_number && (
                        <Box>
                          <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                            Contact Number
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32 !important' }}>
                            {recordToReject.contact_number}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Card>
                )}

                {/* Report Details */}
                <Card sx={{ p: 2, bgcolor: 'rgba(46, 125, 50, 0.05)', border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                  <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: '#2e7d32 !important' }}>
                    Report Details
                  </Typography>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#2e7d32 !important', opacity: 0.8, display: 'block', mb: 0.5 }}>
                      Date Captured
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, color: '#2e7d32 !important' }}>
                      {new Date(recordToReject.timestamp_captured).toLocaleString()}
                    </Typography>
                  </Box>
                </Card>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button onClick={() => setRejectDialogOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={openPrintAndReject} color="error" variant="contained">Open Print & Reject</Button>
        </DialogActions>
      </Dialog>

      {/* Print Confirmation Dialog */}
      <Dialog open={printDialogOpen} onClose={() => setPrintDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Print Wildlife Rescue Statistics</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will generate a printable report with wildlife rescue statistics. 
            The report will include species names, statuses, locations, reporters, and dates.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="From Date"
              type="date"
              value={printDateFrom}
              onChange={(e) => setPrintDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="To Date"
              type="date"
              value={printDateTo}
              onChange={(e) => setPrintDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
          <Button onClick={printForm} variant="contained">Print Report</Button>
        </DialogActions>
      </Dialog>

      {/* Export Excel Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export Wildlife Records to Excel</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will export wildlife records to a CSV file that can be opened in Excel. 
            You can specify a date range to filter the records.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="From Date"
              type="date"
              value={printDateFrom}
              onChange={(e) => setPrintDateFrom(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="To Date"
              type="date"
              value={printDateTo}
              onChange={(e) => setPrintDateTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExcelPreview} variant="contained" color="info">Preview</Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Preview Excel Export Data</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Preview of {previewData.length} records that will be exported to Excel:
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {previewData.length > 0 && Object.keys(previewData[0]).map((header) => (
                    <TableCell key={header} sx={{ fontWeight: 'bold', backgroundColor: 'primary.main', color: 'white' }}>
                      {header}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.slice(0, 10).map((row, index) => (
                  <TableRow key={index}>
                    {Object.values(row).map((value, cellIndex) => (
                      <TableCell key={cellIndex}>{String(value)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {previewData.length > 10 && (
            <Typography sx={{ mt: 1, color: 'text.secondary' }}>
              Showing first 10 records of {previewData.length} total records.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExcelExport} variant="contained" color="success">Download</Button>
        </DialogActions>
      </Dialog>
      
      {editingRecord && (() => {
        const countryCode = editFormData.country_code || '+63';
        const phoneNumber = editFormData.phone_number || '';

        return (
          <Dialog 
            open={editDialogOpen} 
            onClose={handleEditDialogClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                marginRight: 'auto',
                marginLeft: environmentalBg ? '35%' : '39%',
                marginTop: '10%',
                transform: 'translateX(0)',
                background: environmentalBg
                  ? (theme.palette.mode === 'light'
                      ? 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)'
                      : 'radial-gradient(ellipse at 50% 50%, hsl(220, 30%, 5%), hsl(220, 30%, 8%))')
                  : undefined,
                backgroundRepeat: environmentalBg ? 'no-repeat' : undefined,
                backgroundSize: environmentalBg ? '100% 100%' : undefined,
                maxHeight: '80vh',
              }
            }}
          >
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                <Box
                  component="img"
                  src="/images/kinaiyahanlogonobg.png"
                  alt="Kinaiyahan"
                  sx={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
                />
                <Typography component="span" variant="h6" sx={{ color: '#2e7d32 !important' }}>
                  Edit Marker Details
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ overflowY: 'auto', maxHeight: 'calc(80vh - 140px)' }}>
              {editError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {editError}
                </Alert>
              )}
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                <TextField
                  placeholder="Species name"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={editFormData.species_name || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, species_name: e.target.value }))}
                  required
                />
                
                <TextField
                  select
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={editFormData.status || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (value: unknown) => {
                      const v = String(value || "");
                      return v !== "" ? v : "Status";
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Status
                  </MenuItem>
                  <MenuItem value="reported">Reported</MenuItem>
                  <MenuItem value="rescued">Rescued</MenuItem>
                  <MenuItem value="turned over">Turned over</MenuItem>
                  <MenuItem value="released">Released</MenuItem>
                </TextField>
                
                <TextField
                  placeholder="Barangay"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={editFormData.barangay || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, barangay: e.target.value }))}
                />
                
                <TextField
                  placeholder="Municipality"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={editFormData.municipality || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, municipality: e.target.value }))}
                />
                
                <TextField
                  placeholder="Name of who sighted"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={editFormData.reporter_name || ''}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, reporter_name: e.target.value }))}
                />
                
                <TextField
                  placeholder="Phone number"
                  size="small"
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  value={phoneNumber}
                  onChange={(e) => {
                    const phoneNumberValue = e.target.value;
                    setEditFormData(prev => {
                      const currentCountryCode = prev.country_code || '+63';
                      const fullNumber = currentCountryCode + phoneNumberValue;
                      return {
                        ...prev, 
                        phone_number: phoneNumberValue,
                        contact_number: fullNumber 
                      };
                    });
                  }}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                          <Select
                            value={countryCode}
                            onChange={(e) => {
                              const countryCodeValue = e.target.value;
                              setEditFormData(prev => {
                                const phoneNumberValue = prev.phone_number || '';
                                const fullNumber = countryCodeValue + phoneNumberValue;
                                return {
                                  ...prev,
                                  country_code: countryCodeValue,
                                  contact_number: fullNumber 
                                };
                              });
                            }}
                            variant="standard"
                            sx={{ 
                              '&:before': { borderBottom: 'none' },
                              '&:after': { borderBottom: 'none' },
                              '&:hover:not(.Mui-disabled):before': { borderBottom: 'none' },
                              '& .MuiSelect-select': { 
                                padding: '0',
                                fontSize: '14px',
                                fontWeight: 500,
                                minHeight: 'auto'
                              }
                            }}
                          >
                            <MenuItem value="+63">🇵🇭 +63</MenuItem>
                            <MenuItem value="+1">🇺🇸 +1</MenuItem>
                            <MenuItem value="+44">🇬🇧 +44</MenuItem>
                            <MenuItem value="+81">🇯🇵 +81</MenuItem>
                            <MenuItem value="+86">🇨🇳 +86</MenuItem>
                            <MenuItem value="+82">🇰🇷 +82</MenuItem>
                            <MenuItem value="+65">🇸🇬 +65</MenuItem>
                            <MenuItem value="+60">🇲🇾 +60</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    )
                  }}
                />

                {/* Photo Upload Section */}
                <Box sx={{ mt: 1 }}>
                  <Button variant="outlined" color="primary" size="small" component="label" sx={{ mb: 1 }}>
                    {editPhotoPreview && !editPhotoFile ? 'Change Photo' : 'Upload Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Clean up previous blob URL if it exists
                          if (editPhotoPreview && editPhotoPreview.startsWith('blob:')) {
                            URL.revokeObjectURL(editPhotoPreview);
                          }
                          setEditPhotoFile(file);
                          const url = URL.createObjectURL(file);
                          setEditPhotoPreview(url);
                        }
                      }}
                    />
                  </Button>
                  {editPhotoPreview && (
                    <Box sx={{ mt: 1 }}>
                      <Box
                        component="img"
                        src={editPhotoPreview}
                        alt="preview"
                        sx={{
                          width: "100%",
                          maxHeight: "280px",
                          objectFit: "contain",
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider'
                        }}
                      />
                      <Button 
                        size="small" 
                        color="error"
                        onClick={() => {
                          // Clean up blob URL if it exists
                          if (editPhotoPreview && editPhotoPreview.startsWith('blob:')) {
                            URL.revokeObjectURL(editPhotoPreview);
                          }
                          if (editPhotoFile) {
                            // If a new photo was selected, remove it and go back to original
                            setEditPhotoFile(null);
                            setEditPhotoPreview(editingRecord?.photo_url || null);
                          } else {
                            // If removing the original photo, set to null
                            setEditPhotoFile(null);
                            setEditPhotoPreview(null);
                          }
                        }}
                        sx={{ mt: 1 }}
                      >
                        Remove
                      </Button>
                    </Box>
                  )}
                </Box>

                {editingRecord.timestamp_captured && (
                  <Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      <strong style={{ color: '#2e7d32' }}>Date & Time Captured:</strong> <span style={{ color: '#2e7d32' }}>{new Date(editingRecord.timestamp_captured).toLocaleString()}</span>
                    </Typography>
                    <Typography variant="body2">
                      <strong style={{ color: '#2e7d32' }}>Latitude:</strong> <span style={{ color: '#2e7d32' }}>{editingRecord.latitude.toFixed(5)}</span>
                    </Typography>
                    <Typography variant="body2">
                      <strong style={{ color: '#2e7d32' }}>Longitude:</strong> <span style={{ color: '#2e7d32' }}>{editingRecord.longitude.toFixed(5)}</span>
                    </Typography>
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                variant="contained"
                color="primary"
                onClick={handleEditSubmit}
                disabled={editLoading || !editFormData.species_name?.trim()}
              >
                {editLoading ? 'Updating...' : 'Save'}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={handleEditDialogClose}
                disabled={editLoading}
              >
                Cancel
              </Button>
            </DialogActions>
          </Dialog>
        );
      })()}

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

       {/* Error Snackbar */}
       <Snackbar
         open={errorSnackbar.open}
         autoHideDuration={4000}
         onClose={() => setErrorSnackbar(prev => ({ ...prev, open: false }))}
         anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
       >
         <Alert
           onClose={() => setErrorSnackbar(prev => ({ ...prev, open: false }))}
           severity="error"
           variant="filled"
           sx={{ width: '100%' }}
         >
           {errorSnackbar.message}
         </Alert>
       </Snackbar>
     </Box>
   );
 };

export default WildlifeRescueStatistics;
