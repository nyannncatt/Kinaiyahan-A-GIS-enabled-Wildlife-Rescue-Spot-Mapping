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
  role: 'admin' | 'enforcement' | 'cenro' | 'reporter' | 'suspended' | 'pending';
}

const PLACEHOLDER: LoginEntry = { id: '', name: '', email: '', contactNumber: '', role: 'reporter' };
const PENDING_PLACEHOLDER: LoginEntry = { id: '', name: '', email: '', contactNumber: '', role: 'pending' };

export default function UserManagement() {
  const [entries, setEntries] = React.useState<LoginEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0); // 0-based
  const pageSize = 10;
  const [totalCount, setTotalCount] = React.useState(0);

  // Pending applications state
  const [pending, setPending] = React.useState<LoginEntry[]>([]);
  const [pendingLoading, setPendingLoading] = React.useState(true);
  const [pendingError, setPendingError] = React.useState<string | null>(null);
  const [pendingPage, setPendingPage] = React.useState(0);
  const [totalPendingCount, setTotalPendingCount] = React.useState(0);

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

  // Delete user dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<{ id: string; name: string } | null>(null);
  const openDeleteDialog = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setDeleteDialogOpen(true);
  };
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  // Approve role selection dialog
  const [approveDialogOpen, setApproveDialogOpen] = React.useState(false);
  const [pendingEmailToApprove, setPendingEmailToApprove] = React.useState<string | null>(null);
  const [approveRole, setApproveRole] = React.useState<'enforcement' | 'cenro'>('enforcement');
  const openApproveDialog = (email: string) => {
    setPendingEmailToApprove(email);
    setApproveRole('enforcement'); // default to enforcement
    setApproveDialogOpen(true);
  };
  const closeApproveDialog = () => {
    setApproveDialogOpen(false);
    setPendingEmailToApprove(null);
  };
  const handleApproveWithRole = async () => {
    if (!pendingEmailToApprove) return;
    try {
      await approveByEmail(pendingEmailToApprove, approveRole);
      closeApproveDialog();
      // Refresh pending list
      const from = pendingPage * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from('pending_applications')
        .select('id,name,email,contact_number', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (!error && data) {
        const mapped: LoginEntry[] = data.map((app: any) => ({
          id: app.id ?? '',
          name: app.name ?? '',
          email: app.email ?? '',
          contactNumber: app.contact_number ?? '',
          role: 'pending' as const
        }));
        setPending(mapped);
        setTotalPendingCount(count ?? 0);
      }
      // Refresh user list
      const userFrom = page * pageSize;
      const userTo = userFrom + pageSize - 1;
      const { data: userData, error: userError, count: userCount } = await supabase
        .from('users')
        .select('id,first_name,last_name,email,contact_number,role', { count: 'exact' })
        .neq('role', 'admin')
        .order('first_name', { ascending: true, nullsFirst: false })
        .range(userFrom, userTo);
      if (!userError && userData) {
        const mapped: LoginEntry[] = userData.map((u: any) => ({
          id: u.id ?? '',
          name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email || '',
          email: u.email ?? '',
          contactNumber: u.contact_number ?? '',
          role: (u.role as LoginEntry['role']) ?? 'reporter'
        }));
        setEntries(mapped);
        setTotalCount(userCount ?? 0);
      }
    } catch (e: any) {
      alert(e?.message || 'Approve failed');
    }
  };

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

  // Delete user API - deletes from both public.users and auth.users
  async function deleteUser(userId: string) {
    const { error } = await supabase
      .rpc('delete_user_complete', { user_id: userId });
    
    if (error) throw error;
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

  // Load pending applications (best-effort; adjust table/columns to your schema)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setPendingLoading(true);
        setPendingError(null);
        // Expecting a table like public.pending_applications with similar fields
        const from = pendingPage * pageSize;
        const to = from + pageSize - 1;
        const { data, error, count } = await supabase
          .from('pending_applications')
          .select('id,name,email,contact_number,role', { count: 'exact' })
          .order('name', { ascending: true, nullsFirst: false })
          .range(from, to);

        if (error) throw error;
        if (!mounted) return;

        const mapped: LoginEntry[] = (data ?? []).map((u: any) => ({
          id: u.id ?? '',
          name: u.name ?? '',
          email: u.email ?? '',
          contactNumber: u.contact_number ?? '',
          role: 'pending' as const,
        }));
        setPending(mapped);
        setTotalPendingCount(count ?? 0);
      } catch (e: any) {
        if (!mounted) return;
        setPendingError(e?.message || 'Failed to load pending applications');
        setPending([]);
      } finally {
        if (mounted) setPendingLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [pendingPage]);

  const paddedEntries: LoginEntry[] = [
    ...entries,
    ...Array(Math.max(0, pageSize - entries.length)).fill(PLACEHOLDER),
  ];

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));

  // Pending actions by email (no need to copy UUID)
  async function approveByEmail(email: string, role: 'enforcement' | 'cenro') {
    // 1) read pending row (include all fields)
    const { data: app, error: e1 } = await supabase
      .from('pending_applications')
      .select('name, first_name, last_name, contact_number, gender, avatar_url, auth_user_id')
      .eq('email', email)
      .maybeSingle();
    if (e1) throw e1;
    if (!app) throw new Error('Pending application not found');

    // 2) upsert into users with auth_user_id if available, else update by email
    if (app.auth_user_id) {
      // Use first_name/last_name from pending_applications if available, otherwise parse from name
      const first_name = app.first_name || (app.name ? app.name.trim().split(/\s+/)[0] : '') || '';
      const last_name = app.last_name || (app.name ? app.name.trim().split(/\s+/).slice(1).join(' ') : '') || '';
      const { error: upErr } = await supabase
        .from('users')
        .upsert({
          id: app.auth_user_id,
          role: role, // Use the selected role from dialog
          first_name,
          last_name,
          contact_number: app.contact_number ?? null,
          gender: app.gender ?? null,
          avatar_url: app.avatar_url ?? null,
          email
        }, { onConflict: 'id' });
      if (upErr) throw upErr;
    } else {
      // If no auth_user_id, try to update existing user by email
      const first_name = app.first_name || (app.name ? app.name.trim().split(/\s+/)[0] : '') || '';
      const last_name = app.last_name || (app.name ? app.name.trim().split(/\s+/).slice(1).join(' ') : '') || '';
      const { error: e2 } = await supabase
        .from('users')
        .update({ 
          role: role, // Use the selected role from dialog
          first_name,
          last_name,
          contact_number: app.contact_number ?? null,
          gender: app.gender ?? null,
          avatar_url: app.avatar_url ?? null
        })
        .eq('email', email)
        .neq('role', 'admin');
      if (e2) throw e2;
    }

    // 3) remove pending
    const { error: e3 } = await supabase
      .from('pending_applications')
      .delete()
      .eq('email', email);
    if (e3) throw e3;

    // update UI
    setPending(prev => prev.filter(p => p.email !== email));
    setSuccessMsg('Application approved');
    setSuccessOpen(true);
  }

  async function disapproveByEmail(email: string) {
    const { error } = await supabase
      .from('pending_applications')
      .delete()
      .eq('email', email);
    if (error) throw error;
    setPending(prev => prev.filter(p => p.email !== email));
    setSuccessMsg('Application disapproved');
    setSuccessOpen(true);
  }

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
        <Box sx={{ width: 140, textAlign: 'center' }}>ID</Box>
        <Box sx={{ flex: 1.2, textAlign: 'center' }}>Name</Box>
        <Box sx={{ flex: 1.6, textAlign: 'center' }}>Email</Box>
        <Box sx={{ flex: 1.2, textAlign: 'center' }}>Contact</Box>
        <Box sx={{ width: 140, textAlign: 'center', ml: -0.5 }}>Role</Box>
        <Box sx={{ width: 280, textAlign: 'center' }}>Actions</Box>
      </Box>

      <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        {paddedEntries.map((entry, idx) => {
          const isPlaceholder = !entry.name && !entry.email && !entry.contactNumber;
          const isAdmin = entry.role === 'admin';
          const actionButtons = !isPlaceholder ? (
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
              <Tooltip title={isAdmin ? 'Cannot edit admin role' : ''}>
                <span>
                  <Button size="small" variant="outlined" disabled={isAdmin} onClick={() => openEdit(entry.id, entry.role)}>Edit Role</Button>
                </span>
              </Tooltip>
              <Tooltip title={isAdmin ? 'Cannot delete admin' : ''}>
                <span>
                  <Button size="small" variant="outlined" color="error" disabled={isAdmin} onClick={() => openDeleteDialog(entry.id, entry.name)}>Delete User</Button>
                </span>
              </Tooltip>
            </Stack>
          ) : null;
          return (
            <React.Fragment key={`row-${entry.id || idx}`}>
              <ListItem sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
                  <Box sx={{ width: 140, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{entry.id || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ lineHeight: 1.4 }}>{entry.name || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.6, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{entry.email || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{entry.contactNumber || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ width: 126, textAlign: 'center', ml: -1.10 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', textTransform: 'capitalize', lineHeight: 1.4, textAlign: 'center' }}>
                      {isPlaceholder ? '\u00A0' : (entry.role || '\u00A0')}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 280, display: 'flex', justifyContent: 'center' }}>
                    {actionButtons}
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

      {/* Pending Applications */}
      <Box sx={{ height: 320 }} />
      <Typography component="h3" variant="h6" sx={{ mb: 1, mt: 2 }}>
        Pending Applications
      </Typography>
      {pendingLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading pending…</Typography>
        </Box>
      )}
      {pendingError && (
        <Alert severity="error" sx={{ mb: 1 }}>{pendingError}</Alert>
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
        <Box sx={{ width: 140, textAlign: 'center' }}>ID</Box>
        <Box sx={{ flex: 1.2, textAlign: 'center' }}>Name</Box>
        <Box sx={{ flex: 1.6, textAlign: 'center' }}>Email</Box>
        <Box sx={{ flex: 1.2, textAlign: 'center' }}>Contact</Box>
        <Box sx={{ width: 126, textAlign: 'center', ml: -1.10 }}>Role</Box>
        <Box sx={{ width: 280, textAlign: 'center' }}>Actions</Box>
      </Box>

      <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        {[...pending, ...Array(Math.max(0, 10 - pending.length)).fill(PENDING_PLACEHOLDER)].map((entry, idx) => {
          const isPlaceholder = !entry.name && !entry.email && !entry.contactNumber;
          return (
            <React.Fragment key={`pending-row-${entry.id || idx}`}>
              <ListItem sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
                  <Box sx={{ width: 140, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{entry.id || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ lineHeight: 1.4 }}>{entry.name || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.6, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{entry.email || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{entry.contactNumber || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ width: 126, textAlign: 'center', ml: -1.10 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', textTransform: 'capitalize', lineHeight: 1.4, textAlign: 'center' }}>
                      {isPlaceholder ? '\u00A0' : (entry.role || '\u00A0')}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 280, display: 'flex', justifyContent: 'center' }}>
                    {!isPlaceholder && (
                      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                        <Button size="small" variant="contained" color="success" onClick={() => openApproveDialog(entry.email)}>Approve</Button>
                        <Button size="small" variant="outlined" color="error" onClick={async () => {
                          try { await disapproveByEmail(entry.email); } catch (e:any) { alert(e?.message || 'Disapprove failed'); }
                        }}>Disapprove</Button>
                      </Stack>
                    )}
                  </Box>
                </Box>
              </ListItem>
              {idx < (Math.max(10, pending.length) - 1) && <Divider component="li" />}
            </React.Fragment>
          );
        })}
      </List>
      {/* Pending pagination */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Page {pendingPage + 1} of {Math.max(1, Math.ceil((totalPendingCount || 0) / pageSize))}
        </Typography>
        <Stack direction="row" sx={{ gap: 1 }}>
          <Button size="small" variant="outlined" disabled={pendingPage === 0 || pendingLoading} onClick={() => setPendingPage(p => Math.max(0, p - 1))}>Previous</Button>
          <Button size="small" variant="outlined" disabled={(pendingPage + 1) >= Math.ceil((totalPendingCount || 0) / pageSize) || pendingLoading} onClick={() => setPendingPage(p => p + 1)}>Next</Button>
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

      {/* Approve Role Selection Dialog */}
      <Dialog open={approveDialogOpen} onClose={closeApproveDialog} fullWidth maxWidth="xs">
        <DialogTitle>Approve Application</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, mt: 1 }}>
            Select the role to assign to this user:
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel id="approve-role-label">Role</InputLabel>
            <Select
              labelId="approve-role-label"
              value={approveRole}
              label="Role"
              onChange={(e) => setApproveRole(e.target.value as 'enforcement' | 'cenro')}
            >
              <MenuItem value="enforcement">Enforcement</MenuItem>
              <MenuItem value="cenro">CENRO</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeApproveDialog}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApproveWithRole}
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog} fullWidth maxWidth="xs">
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Are you sure you want to delete <strong>{userToDelete?.name}</strong>?
          </Typography>
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              bgcolor: (theme) => theme.palette.mode === 'dark' 
                ? 'rgba(211, 47, 47, 0.15)' 
                : 'rgba(211, 47, 47, 0.08)',
              borderRadius: 1,
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: (theme) => theme.palette.mode === 'dark' 
                  ? '#ff6b6b' 
                  : '#c62828',
                fontWeight: 500,
                lineHeight: 1.6,
              }}
            >
              This action cannot be undone. The user will be permanently removed from the system.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              if (!userToDelete) return;
              try {
                await deleteUser(userToDelete.id);
                // Remove from UI
                setEntries(prev => prev.filter(e => e.id !== userToDelete.id));
                setTotalCount(prev => Math.max(0, prev - 1));
                closeDeleteDialog();
                setSuccessMsg('User deleted successfully.');
                setSuccessOpen(true);
              } catch (e: any) {
                alert(e?.message || 'Failed to delete user');
              }
            }}
          >
            Delete
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



