import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  CircularProgress,
  Alert,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { useNavigate } from 'react-router-dom';
import AppTheme from '../shared-theme/AppTheme';
import { getArchivedWildlifeRecords } from '../services/wildlifeRecords';

interface ArchivedRecord {
  id: string;
  species_name: string;
  status: string;
  deleted_at?: string;
  created_at?: string;
  timestamp_captured?: string;
  barangay?: string;
  municipality?: string;
  speciespf_id?: string;
  original_id?: string;
}

export default function ArchivedRecords() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<ArchivedRecord[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'deleted_desc' | 'deleted_asc' | 'species_asc' | 'species_desc'>('deleted_desc');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getArchivedWildlifeRecords();
        setRecords(data || []);
        setError(null);
      } catch (err) {
        console.error('Failed to load archived records', err);
        setError('Failed to load archived wildlife records.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    let next = [...records];
    const query = search.trim().toLowerCase();
    if (query) {
      next = next.filter((rec) => {
        const species = (rec.species_name || '').toLowerCase();
        const status = (rec.status || '').toLowerCase();
        const barangay = (rec.barangay || '').toLowerCase();
        const municipality = (rec.municipality || '').toLowerCase();
        const id = String(rec.id || '').toLowerCase();
        return (
          species.includes(query) ||
          status.includes(query) ||
          barangay.includes(query) ||
          municipality.includes(query) ||
          id.includes(query)
        );
      });
    }

    const sortByDate = (rec: ArchivedRecord) => new Date(rec.deleted_at || rec.created_at || rec.timestamp_captured || 0).getTime();

    switch (sort) {
      case 'deleted_asc':
        next.sort((a, b) => sortByDate(a) - sortByDate(b));
        break;
      case 'deleted_desc':
        next.sort((a, b) => sortByDate(b) - sortByDate(a));
        break;
      case 'species_asc':
        next.sort((a, b) => (a.species_name || '').localeCompare(b.species_name || ''));
        break;
      case 'species_desc':
        next.sort((a, b) => (b.species_name || '').localeCompare(a.species_name || ''));
        break;
    }

    return next;
  }, [records, search, sort]);

  return (
    <AppTheme>
      <CssBaseline enableColorScheme />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: (theme) => theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)'
            : 'radial-gradient(ellipse at 50% 50%, hsl(220, 30%, 5%), hsl(220, 30%, 8%))',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 100%',
          backgroundAttachment: 'fixed',
          py: { xs: 6, md: 10 },
          px: { xs: 2, md: 6 },
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 1100,
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3,
            boxShadow: '0 24px 48px rgba(46,125,50,0.25)',
            border: '1px solid rgba(46, 125, 50, 0.35)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ textAlign: 'center', pt: 4, pb: 3, px: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 1.5 }}>
              <Box component="img" src="/images/kinaiyahanlogonobg.png" alt="Kinaiyahan" sx={{ width: 56, height: 56, objectFit: 'contain' }} />
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '0.12em', color: '#2e7d32 !important' }}>
                ＫＩＮＡＩＹＡＨＡＮ
              </Typography>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32 !important' }}>
              Archived Wildlife Records
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: '#2e7d32 !important' }}>
              View previously deleted wildlife records. Data is read-only.
            </Typography>
          </Box>

          <Box sx={{ px: 3, pb: 2, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <TextField
              label="Search archived records"
              variant="outlined"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              InputLabelProps={{ sx: { color: '#2e7d32 !important' } }}
              InputProps={{ sx: { color: '#2e7d32 !important', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2e7d32 !important' } } }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel sx={{ color: '#2e7d32 !important' }}>Sort</InputLabel>
              <Select
                value={sort}
                label="Sort"
                onChange={(e) => setSort(e.target.value as typeof sort)}
                sx={{ color: '#2e7d32 !important', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#2e7d32 !important' } }}
              >
                <MenuItem value="deleted_desc">Deleted Date (Newest)</MenuItem>
                <MenuItem value="deleted_asc">Deleted Date (Oldest)</MenuItem>
                <MenuItem value="species_asc">Species (A-Z)</MenuItem>
                <MenuItem value="species_desc">Species (Z-A)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ px: 3, pb: 3, flexGrow: 1 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress sx={{ color: '#2e7d32' }} />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ color: '#2e7d32 !important', '& .MuiAlert-message': { color: '#2e7d32 !important' } }}>
                {error}
              </Alert>
            ) : filtered.length === 0 ? (
              <Typography sx={{ color: '#2e7d32 !important', textAlign: 'center', py: 4 }}>
                No archived records found.
              </Typography>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 540, bgcolor: 'rgba(255,255,255,0.85)', boxShadow: 'none' }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32 !important' }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32 !important' }}>Species</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32 !important' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32 !important' }}>Deleted At</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', color: '#2e7d32 !important' }}>Location</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((rec, idx) => (
                      <TableRow key={`${rec.id}-${idx}`}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#2e7d32 !important' }}>
                          {rec.speciespf_id || rec.original_id || rec.id}
                        </TableCell>
                        <TableCell sx={{ color: '#2e7d32 !important' }}>{rec.species_name || '—'}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize', color: '#2e7d32 !important' }}>{rec.status || '—'}</TableCell>
                        <TableCell sx={{ color: '#2e7d32 !important' }}>
                          {rec.deleted_at ? new Date(rec.deleted_at).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell sx={{ color: '#2e7d32 !important' }}>
                          {[rec.barangay, rec.municipality].filter(Boolean).join(', ') || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Box>
      </Box>
    </AppTheme>
  );
}
