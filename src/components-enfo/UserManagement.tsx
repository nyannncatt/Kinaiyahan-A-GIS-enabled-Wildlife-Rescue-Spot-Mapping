import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { supabase } from '../services/supabase';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

interface LoginEntry {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  role: 'admin' | 'enforcement' | 'cenro' | 'reporter' | 'suspended';
}

const PLACEHOLDER: LoginEntry = { id: '', name: '', email: '', contactNumber: '', role: 'reporter' };

export default function UserManagement() {
  const [entries, setEntries] = React.useState<LoginEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0); // 0-based
  const pageSize = 10;
  const [totalCount, setTotalCount] = React.useState(0);

  // Role modal state
  const [editUserId, setEditUserId] = React.useState<string | null>(null);
  const [selectedRole, setSelectedRole] = React.useState<'enforcement' | 'cenro'>('enforcement');
  const openEdit = (userId: string, currentRole: LoginEntry['role']) => {
    // default to current role if allowed, else 'enforcement'
    const initial = currentRole === 'cenro' ? 'cenro' : 'enforcement';
    setSelectedRole(initial);
    setEditUserId(userId);
  };
  const closeEdit = () => setEditUserId(null);

  // Success feedback
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState('');
  const handleSuccessClose = () => setSuccessOpen(false);

  // Confirm dialog
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const openConfirm = () => setConfirmOpen(true);
  const closeConfirm = () => setConfirmOpen(false);

  // Update role API
  async function updateUserRole(userId: string, newRole: 'enforcement' | 'cenro') {
    const { data, error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId)
      .neq('role', 'admin') // safety: never change admins via UI
      .select('id, role')
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('No row updated');
    return data;
  }

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const from = page * pageSize;
        const to = from + pageSize - 1;
        const { data, error, count } = await supabase
          .from('users')
          .select('id,first_name,last_name,email,contact_number,role', { count: 'exact' })
          .neq('role', 'admin')
          .order('first_name', { ascending: true, nullsFirst: false })
          .range(from, to);

        if (error) throw error;
        if (!mounted) return;

        const mapped: LoginEntry[] = (data ?? [])
          .map((u: any) => ({
            id: u.id ?? '',
            name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email || '',
            email: u.email ?? '',
            contactNumber: u.contact_number ?? '',
            role: (u.role as LoginEntry['role']) ?? 'reporter',
          }));

        setEntries(mapped);
        setTotalCount(count ?? 0);
      } catch (e: any) {
        if (!mounted) return;
        console.error('Fetch users failed:', e?.message || e);
        setError(e?.message || 'Failed to fetch users');
        setEntries([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [page]);

  const paddedEntries: LoginEntry[] = [
    ...entries,
    ...Array(Math.max(0, pageSize - entries.length)).fill(PLACEHOLDER),
  ];

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));

  return (
    <Box sx={{ mt: 6, mb: 8 }}>
      <Typography component="h3" variant="h6" sx={{ mb: 1 }}>
        User Management
      </Typography>
      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading users…</Typography>
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>
      )}
      {!loading && !error && totalCount === 0 && (
        <Alert severity="info" sx={{ mb: 1 }}>No users found or insufficient permissions.</Alert>
      )}
      {/* Header row */}
      <Box sx={{
        display: 'flex',
        gap: 2,
        px: 2,
        py: 1.6,
        bgcolor: 'background.paper',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        border: '1px solid',
        borderColor: 'divider',
        borderBottom: 'none',
        typography: 'subtitle2',
        color: 'text.secondary',
      }}>
        <Box sx={{ width: 140 }}>ID</Box>
        <Box sx={{ flex: 1.2 }}>Name</Box>
        <Box sx={{ flex: 1.6 }}>Email</Box>
        <Box sx={{ flex: 1.2 }}>Contact</Box>
        <Box sx={{ width: 140 }}>Role</Box>
        <Box sx={{ width: 280, textAlign: 'right' }}>Actions</Box>
      </Box>

      <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        {paddedEntries.map((entry, idx) => {
          const isPlaceholder = !entry.name && !entry.email && !entry.contactNumber;
          const isAdmin = entry.role === 'admin';
          const actionButtons = (
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
              <Tooltip title={isAdmin || isPlaceholder ? (isAdmin ? 'Cannot edit admin role' : '') : ''}>
                <span>
                  <Button size="small" variant="outlined" disabled={isAdmin || isPlaceholder} onClick={() => openEdit(entry.id, entry.role)}>Edit Role</Button>
                </span>
              </Tooltip>
              <Tooltip title={isAdmin || isPlaceholder ? (isAdmin ? 'Cannot delete admin' : '') : ''}>
                <span>
                  <Button size="small" variant="outlined" color="error" disabled={isAdmin || isPlaceholder}>Delete User</Button>
                </span>
              </Tooltip>
            </Stack>
          );
          return (
            <React.Fragment key={`row-${entry.id || idx}`}>
              <ListItem secondaryAction={actionButtons} sx={{
                '& .MuiListItemSecondaryAction-root': { right: 16 },
                py: 2,
              }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', pr: 36, width: '100%' }}>
                  <Box sx={{ width: 140 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{entry.id || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2 }}>
                    <Typography variant="body1" sx={{ lineHeight: 1.4 }}>{entry.name || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.6 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{entry.email || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{entry.contactNumber || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ width: 140 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', textTransform: 'capitalize', lineHeight: 1.4 }}>
                      {isPlaceholder ? '\u00A0' : (entry.role || '\u00A0')}
                    </Typography>
                  </Box>
                </Box>
              </ListItem>
              {idx < paddedEntries.length - 1 && <Divider component="li" />}
            </React.Fragment>
          );
        })}
      </List>
      {/* Pagination controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, mb: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Page {page + 1} of {totalPages}
        </Typography>
        <Stack direction="row" sx={{ gap: 1 }}>
          <Button size="small" variant="outlined" disabled={page === 0 || loading} onClick={() => setPage(p => Math.max(0, p - 1))}>Previous</Button>
          <Button size="small" variant="outlined" disabled={(page + 1) >= totalPages || loading} onClick={() => setPage(p => p + 1)}>Next</Button>
        </Stack>
      </Box>

      {/* Edit Role Modal */}
      <Dialog open={Boolean(editUserId)} onClose={closeEdit} fullWidth maxWidth="xs">
        <DialogTitle>Edit Role</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              value={selectedRole}
              label="Role"
              onChange={(e) => setSelectedRole(e.target.value as 'enforcement' | 'cenro')}
            >
              <MenuItem value="enforcement">Enforcement</MenuItem>
              <MenuItem value="cenro">CENRO</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => openConfirm()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Save Modal */}
      <Dialog open={confirmOpen} onClose={closeConfirm} fullWidth maxWidth="xs">
        <DialogTitle>Confirm Role Change</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            You are about to change this user's role to <strong style={{ textTransform: 'capitalize' }}>{selectedRole}</strong>.
            This will affect their access. Do you want to proceed?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>Cancel</Button>
          <Button
            color="warning"
            variant="contained"
            onClick={async () => {
              if (!editUserId) return;
              try {
                const res = await updateUserRole(editUserId, selectedRole);
                setEntries(prev => prev.map(e => (e.id === editUserId ? { ...e, role: selectedRole } : e)));
                closeConfirm();
                closeEdit();
                setSuccessMsg('Role updated successfully.');
                setSuccessOpen(true);
              } catch (e: any) {
                alert(e?.message || 'Failed to update role');
              }
            }}
          >
            Proceed
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={successOpen}
        autoHideDuration={2500}
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert onClose={handleSuccessClose} severity="success" sx={{ width: '100%' }}>
          {successMsg || 'Success'}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}



