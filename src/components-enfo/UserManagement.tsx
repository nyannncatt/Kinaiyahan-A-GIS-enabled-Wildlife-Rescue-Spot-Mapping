import * as React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SortRoundedIcon from '@mui/icons-material/SortRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
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
import { MenuItem as MuiMenuItem } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

interface LoginEntry {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  role: 'admin' | 'enforcement' | 'cenro' | 'reporter' | 'suspended' | 'pending';
}

interface ReportEntry {
  id: string;
  species: string;
  barangay: string;
  municipality: string;
  reporterName: string;
  contactNumber: string;
  date: string;
}

const PLACEHOLDER: LoginEntry = { id: '', name: '', email: '', contactNumber: '', role: 'reporter' };
const PENDING_PLACEHOLDER: LoginEntry = { id: '', name: '', email: '', contactNumber: '', role: 'pending' };
const REPORT_PLACEHOLDER: ReportEntry = { id: '', species: '', barangay: '', municipality: '', reporterName: '', contactNumber: '', date: '' };

// Login log entry (Option A - no IP)
interface LoginLogEntry {
  id: string;
  name: string;
  role?: string;
  date: string;  // ISO string
  time: string;  // formatted HH:MM:SS
}

export default function UserManagement() {
  const [entries, setEntries] = React.useState<LoginEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0); // 0-based
  const pageSize = 10;
  const usersPageSize = 8; // show 8 user rows per page
  const [totalCount, setTotalCount] = React.useState(0);
  const [allRoleCounts, setAllRoleCounts] = React.useState<{ enforcement: number; cenro: number }>({ enforcement: 0, cenro: 0 });
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortAnchorEl, setSortAnchorEl] = React.useState<null | HTMLElement>(null);
  const [sortOption, setSortOption] = React.useState<'name_asc' | 'name_desc' | 'email_asc' | 'role_asc'>('name_asc');

  // Helper function to format ID consistently (maintains layout width)
  const formatId = (id: string, show: boolean, lines: number = 2) => {
    if (!id) return '\u00A0';
    if (show) {
      // Split the entire ID across the requested number of lines (complete, no truncation)
      const perLine = Math.ceil(id.length / Math.max(1, lines));
      const chunks: string[] = [];
      for (let i = 0; i < lines; i++) {
        const start = i * perLine;
        const end = start + perLine;
        const part = id.substring(start, end);
        chunks.push(part);
      }
      return chunks.join('\n');
    }
    // Mask with the same per-line width as the visible split for consistency
    const perLine = Math.ceil(id.length / Math.max(1, lines));
    const lineMask = '•'.repeat(Math.max(1, perLine));
    return Array(Math.max(1, lines)).fill(lineMask).join('\n');
  };

  // Pending applications state
  const [pending, setPending] = React.useState<LoginEntry[]>([]);
  const [pendingLoading, setPendingLoading] = React.useState(true);
  const [pendingError, setPendingError] = React.useState<string | null>(null);
  const [pendingPage, setPendingPage] = React.useState(0);
  const [totalPendingCount, setTotalPendingCount] = React.useState(0);
  const [pendingSearchQuery, setPendingSearchQuery] = React.useState('');
  const [pendingSortAnchorEl, setPendingSortAnchorEl] = React.useState<null | HTMLElement>(null);
  const [pendingSortOption, setPendingSortOption] = React.useState<'name_asc' | 'name_desc' | 'email_asc' | 'email_desc' | 'id_asc' | 'id_desc'>('name_asc');

  // Reports list state
  const [reports, setReports] = React.useState<ReportEntry[]>([]);
  const [reportsLoading, setReportsLoading] = React.useState(true);
  const [reportsError, setReportsError] = React.useState<string | null>(null);
  const [reportsPage, setReportsPage] = React.useState(0);
  const [totalReportsCount, setTotalReportsCount] = React.useState(0);
  const [reportsSearchQuery, setReportsSearchQuery] = React.useState('');
  const [reportsSortAnchorEl, setReportsSortAnchorEl] = React.useState<null | HTMLElement>(null);
  const [reportsSortOption, setReportsSortOption] = React.useState<'date_desc' | 'date_asc' | 'species_asc' | 'species_desc' | 'municipality_asc'>('date_desc');

  // Login logs (Option A - from auth via RPC)
  const [loginLogs, setLoginLogs] = React.useState<LoginLogEntry[]>([]);
  const [loginLogsLoading, setLoginLogsLoading] = React.useState(true);
  const [loginLogsError, setLoginLogsError] = React.useState<string | null>(null);
  const [auditPage, setAuditPage] = React.useState(0);
  const [totalAuditCount, setTotalAuditCount] = React.useState(0);
  const [loginSearchQuery, setLoginSearchQuery] = React.useState('');
  const [loginSortAnchorEl, setLoginSortAnchorEl] = React.useState<null | HTMLElement>(null);
  const [loginSortOption, setLoginSortOption] = React.useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'role_asc'>('date_desc');

  // Show/Hide ID toggles
  const [showUserIds, setShowUserIds] = React.useState(false);
  const [showPendingIds, setShowPendingIds] = React.useState(false);
  const [showReportIds, setShowReportIds] = React.useState(false);
  const [showLoginIds, setShowLoginIds] = React.useState(false);

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
      const userFrom = page * usersPageSize;
      const userTo = userFrom + usersPageSize - 1;
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
        // Refresh total role counts
        await refreshRoleCounts();
      }
    } catch (e: any) {
      alert(e?.message || 'Approve failed');
    }
  };

  // Helper: refresh total role counts across all users (excluding admins)
  const refreshRoleCounts = React.useCallback(async () => {
    try {
      const [{ count: enfCount }, { count: cenroCount }] = await Promise.all([
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'enforcement')
          .neq('role', 'admin'),
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'cenro')
          .neq('role', 'admin'),
      ]);
      setAllRoleCounts({ enforcement: enfCount ?? 0, cenro: cenroCount ?? 0 });
    } catch {
      // keep previous values on error
    }
  }, []);

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
        const from = page * usersPageSize;
        const to = from + usersPageSize - 1;
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
        // Also refresh total role counts independent of current page
        await refreshRoleCounts();
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
  }, [page, refreshRoleCounts]);

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

  // Load reports list
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setReportsLoading(true);
        setReportsError(null);
        const from = reportsPage * pageSize;
        const to = from + pageSize - 1;
        const { data, error, count } = await supabase
          .from('wildlife_records')
          .select('id,species_name,barangay,municipality,reporter_name,contact_number,created_at', { count: 'exact' })
          .order('created_at', { ascending: false, nullsFirst: false })
          .range(from, to);

        if (error) throw error;
        if (!mounted) return;

        const mapped: ReportEntry[] = (data ?? []).map((r: any) => ({
          id: r.id ?? '',
          species: r.species_name ?? '',
          barangay: r.barangay ?? '',
          municipality: r.municipality ?? '',
          reporterName: r.reporter_name ?? '',
          contactNumber: r.contact_number ?? '',
          date: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
        }));
        setReports(mapped);
        setTotalReportsCount(count ?? 0);
      } catch (e: any) {
        if (!mounted) return;
        setReportsError(e?.message || 'Failed to load reports');
        setReports([]);
      } finally {
        if (mounted) setReportsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [reportsPage]);

  // Derived: reports search + sort
  const normalizedReportsQuery = reportsSearchQuery.trim().toLowerCase();
  const filteredReports = React.useMemo(() => {
    if (!normalizedReportsQuery) return reports;
    return reports.filter((r) => {
      const base = [r.id, r.species, r.barangay, r.municipality, r.reporterName, r.contactNumber]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      const dateTokens = buildDateSearchTokens(r.date);
      return [...base, ...dateTokens].some((v) => v.includes(normalizedReportsQuery));
    });
  }, [reports, normalizedReportsQuery]);

  const sortedReports = React.useMemo(() => {
    const arr = [...filteredReports];
    const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
    switch (reportsSortOption) {
      case 'species_asc':
        arr.sort((a, b) => collator.compare(a.species || '', b.species || ''));
        break;
      case 'species_desc':
        arr.sort((a, b) => collator.compare(b.species || '', a.species || ''));
        break;
      case 'municipality_asc':
        arr.sort((a, b) => collator.compare(a.municipality || '', b.municipality || ''));
        break;
      case 'date_asc':
        arr.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
        break;
      case 'date_desc':
      default:
        arr.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        break;
    }
    return arr;
  }, [filteredReports, reportsSortOption]);

  // Derived: pending search + sort
  const normalizedPendingQuery = pendingSearchQuery.trim().toLowerCase();
  const filteredPending = React.useMemo(() => {
    if (!normalizedPendingQuery) return pending;
    return pending.filter((e) => [e.id, e.name, e.email, e.contactNumber]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(normalizedPendingQuery))
    );
  }, [pending, normalizedPendingQuery]);

  const sortedPending = React.useMemo(() => {
    const arr = [...filteredPending];
    const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
    switch (pendingSortOption) {
      case 'name_desc':
        arr.sort((a, b) => collator.compare(b.name || '', a.name || ''));
        break;
      case 'email_asc':
        arr.sort((a, b) => collator.compare(a.email || '', b.email || ''));
        break;
      case 'email_desc':
        arr.sort((a, b) => collator.compare(b.email || '', a.email || ''));
        break;
      case 'id_asc':
        arr.sort((a, b) => collator.compare(a.id || '', b.id || ''));
        break;
      case 'id_desc':
        arr.sort((a, b) => collator.compare(b.id || '', a.id || ''));
        break;
      case 'name_asc':
      default:
        arr.sort((a, b) => collator.compare(a.name || '', b.name || ''));
        break;
    }
    return arr;
  }, [filteredPending, pendingSortOption]);

  // Load login logs from login_logs table joined with users
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoginLogsLoading(true);
        setLoginLogsError(null);
        // 1) Fetch latest login events
        const { data: logs, error: logErr } = await supabase
          .from('login_logs')
          .select('user_id, login_date_and_time')
          .order('login_date_and_time', { ascending: false })
          .limit(200);
        if (logErr) throw logErr;

        const userIds = Array.from(new Set((logs ?? []).map((l: any) => l.user_id).filter(Boolean)));

        // 2) Fetch user details for those IDs
        let usersById: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: usersRows, error: usersErr } = await supabase
            .from('users')
            .select('id, first_name, last_name, email, role')
            .in('id', userIds);
          if (usersErr) throw usersErr;
          usersById = (usersRows || []).reduce((acc: any, u: any) => {
            acc[u.id] = u; return acc;
          }, {} as Record<string, any>);
        }

        const mapped: LoginLogEntry[] = (logs ?? []).map((l: any) => {
          const u = usersById[l.user_id] || {};
          const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email || '';
          const role = u.role || '';
          return {
            id: l.user_id || '',
            name,
            role,
            // store raw ISO timestamp; render formats below will compute date/time correctly
            date: l.login_date_and_time || '',
            time: '',
          };
        });

        if (!mounted) return;
        setLoginLogs(mapped);
        setTotalAuditCount(mapped.length);
      } catch (e: any) {
        if (!mounted) return;
        setLoginLogsError(e?.message || 'Failed to load login logs');
        setLoginLogs([]);
        setTotalAuditCount(0);
      } finally {
        if (mounted) setLoginLogsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Derived: login logs search + sort
  const normalizedLoginQuery = loginSearchQuery.trim().toLowerCase();
  function buildDateSearchTokens(dateStr?: string) {
    if (!dateStr) return [] as string[];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return [String(dateStr).toLowerCase()];
    const y = d.getFullYear();
    const mPadded = String(d.getMonth() + 1).padStart(2, '0');
    const dPadded = String(d.getDate()).padStart(2, '0');
    const mNoPad = String(d.getMonth() + 1);
    const dNoPad = String(d.getDate());
    const iso = `${y}-${mPadded}-${dPadded}`;
    const mdyyyy = `${mPadded}/${dPadded}/${y}`;      // 11/03/2025
    const mdyyyyNoPad = `${mNoPad}/${dNoPad}/${y}`;    // 11/3/2025
    const ddmmyyyy = `${dPadded}/${mPadded}/${y}`;
    const ddmmyyyyNoPad = `${dNoPad}/${mNoPad}/${y}`;
    const monthLong = d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    const monthShort = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    return [iso, mdyyyy, mdyyyyNoPad, ddmmyyyy, ddmmyyyyNoPad, monthLong, monthShort].map((s) => s.toLowerCase());
  }

  const filteredLoginLogs = React.useMemo(() => {
    if (!normalizedLoginQuery) return loginLogs;
    return loginLogs.filter((e) => {
      const base = [e.id, e.name, e.role]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      const dateTokens = buildDateSearchTokens(e.date);
      return [...base, ...dateTokens].some((v) => v.includes(normalizedLoginQuery));
    });
  }, [loginLogs, normalizedLoginQuery]);

  const sortedLoginLogs = React.useMemo(() => {
    const arr = [...filteredLoginLogs];
    const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
    switch (loginSortOption) {
      case 'name_asc':
        arr.sort((a, b) => collator.compare(a.name || '', b.name || ''));
        break;
      case 'name_desc':
        arr.sort((a, b) => collator.compare(b.name || '', a.name || ''));
        break;
      case 'role_asc':
        arr.sort((a, b) => collator.compare(a.role || '', b.role || ''));
        break;
      case 'date_asc':
        arr.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
        break;
      case 'date_desc':
      default:
        arr.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        break;
    }
    return arr;
  }, [filteredLoginLogs, loginSortOption]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredEntries = React.useMemo(() => {
    if (!normalizedQuery) return entries;
    return entries.filter((e) =>
      [e.id, e.name, e.email, e.contactNumber, e.role]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(normalizedQuery))
    );
  }, [entries, normalizedQuery]);

  const sortedEntries = React.useMemo(() => {
    const arr = [...filteredEntries];
    const collator = new Intl.Collator(undefined, { sensitivity: 'base' });
    switch (sortOption) {
      case 'name_desc':
        arr.sort((a, b) => collator.compare(b.name || '', a.name || ''));
        break;
      case 'email_asc':
        arr.sort((a, b) => collator.compare(a.email || '', b.email || ''));
        break;
      case 'role_asc':
        arr.sort((a, b) => collator.compare(a.role || '', b.role || ''));
        break;
      case 'name_asc':
      default:
        arr.sort((a, b) => collator.compare(a.name || '', b.name || ''));
        break;
    }
    return arr;
  }, [filteredEntries, sortOption]);

  // Role counts for quick glance
  const roleCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of entries) {
      counts[e.role] = (counts[e.role] || 0) + 1;
    }
    return counts;
  }, [entries]);

  const paddedEntries: LoginEntry[] = [
    ...sortedEntries.slice(0, usersPageSize),
    ...Array(Math.max(0, Math.min(usersPageSize, usersPageSize - Math.min(usersPageSize, sortedEntries.length)))).fill(PLACEHOLDER),
  ];

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / usersPageSize));

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
    <Box data-map-container sx={{ mt: 2, mb: 2 }}>
      <Button variant="outlined" size="small" disableRipple sx={{ textTransform: 'none', pointerEvents: 'none', mb: 1, color: '#2e7d32 !important', borderColor: '#2e7d32 !important' }}>
        User Management
      </Button>
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
      {/* Controls: search + sort */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        mb: 1.5,
      }}>
        <TextField
          size="small"
          sx={{ flex: '0 1 45%', minWidth: 260 }}
          placeholder="Search users (name, email, contact, role, id)…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {searchQuery && (
                  <IconButton aria-label="clear" size="small" onClick={() => setSearchQuery('')}>
                    <ClearRoundedIcon fontSize="small" />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
        />

        {/* Quick stats and actions */}
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0, alignItems: 'center' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={showUserIds ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            onClick={() => setShowUserIds(v => !v)}
            sx={{ textTransform: 'none' }}
          >
            {showUserIds ? 'Hide ID' : 'Show ID'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            disableRipple
            sx={{
              textTransform: 'none',
              pointerEvents: 'none',
            }}
          >
            Total Users: {totalCount}
          </Button>
          <Button
            variant="outlined"
            size="small"
            disableRipple
            sx={{
              textTransform: 'none',
              pointerEvents: 'none',
            }}
          >
            Enforcement: {allRoleCounts.enforcement}
          </Button>
          <Button
            variant="outlined"
            size="small"
            disableRipple
            sx={{
              textTransform: 'none',
              pointerEvents: 'none',
            }}
          >
            Cenro: {allRoleCounts.cenro}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SortRoundedIcon />}
            onClick={(e) => setSortAnchorEl(e.currentTarget)}
            sx={{ textTransform: 'none' }}
          >
            Sort
          </Button>
        </Stack>
      </Box>
      {/* Users sort menu */}
      <Menu
        anchorEl={sortAnchorEl}
        open={Boolean(sortAnchorEl)}
        onClose={() => setSortAnchorEl(null)}
      >
        <MuiMenuItem onClick={() => { setSortOption('name_asc'); setSortAnchorEl(null); }}>Name (A → Z)</MuiMenuItem>
        <MuiMenuItem onClick={() => { setSortOption('name_desc'); setSortAnchorEl(null); }}>Name (Z → A)</MuiMenuItem>
        <MuiMenuItem onClick={() => { setSortOption('email_asc'); setSortAnchorEl(null); }}>Email (A → Z)</MuiMenuItem>
        <MuiMenuItem onClick={() => { setSortOption('role_asc'); setSortAnchorEl(null); }}>Role (A → Z)</MuiMenuItem>
      </Menu>

      {/* Compact table container (no internal scroll) */}
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        {/* Header row */}
        <Box sx={{
          display: 'flex',
          gap: 1.5,
          px: 1.5,
          py: 1,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          borderBottom: '1px solid',
          borderColor: 'divider',
          typography: 'caption',
          color: 'text.secondary',
          bgcolor: 'background.paper',
        }}>
          <Box sx={{ width: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>ID</Box>
          <Box sx={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Name</Box>
          <Box sx={{ flex: 1.6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Email</Box>
          <Box sx={{ flex: 1.0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Contact</Box>
          <Box sx={{ width: 139, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Role</Box>
          <Box sx={{ width: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Actions</Box>
        </Box>

        <List dense sx={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          bgcolor: 'background.paper'
        }}>
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
                  <Button 
                    size="small" 
                    variant="outlined" 
                    color="error" 
                    disabled={isAdmin} 
                    onClick={() => openDeleteDialog(entry.id, entry.name)}
                    sx={{
                      color: isAdmin ? undefined : '#d32f2f !important',
                      borderColor: isAdmin ? undefined : '#d32f2f',
                      '&:hover': {
                        borderColor: isAdmin ? undefined : '#d32f2f',
                        bgcolor: isAdmin ? undefined : 'rgba(211, 47, 47, 0.04)'
                      },
                      '& .MuiButton-root': {
                        color: '#d32f2f !important'
                      }
                    }}
                  >
                    Delete User
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          ) : null;
          return (
            <React.Fragment key={`row-${entry.id || idx}`}>
              <ListItem sx={{ py: 1, minHeight: 64 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', width: '100%' }}>
                  <Box sx={{ width: 100, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.7rem', whiteSpace: 'pre-line', lineHeight: 1.2 }}>{formatId(entry.id, showUserIds, 3)}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.3 }}>{entry.name || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.6, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3 }}>{entry.email || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.1, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3 }}>{entry.contactNumber || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ width: 120, textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize', lineHeight: 1.3, textAlign: 'center' }}>
                      {isPlaceholder ? '\u00A0' : (entry.role || '\u00A0')}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 220, display: 'flex', justifyContent: 'center' }}>
                    {actionButtons}
                  </Box>
                </Box>
              </ListItem>
              {idx < paddedEntries.length - 1 && <Divider component="li" />}
            </React.Fragment>
          );
          })}
        </List>
      </Box>
      {/* Pagination controls (separate, no border) */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        rowGap: 1,
        mt: 1.25,
        mb: 2,
        px: 0.5,
      }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Page {page + 1} of {totalPages}
        </Typography>
        <Stack direction="row" sx={{ gap: 0.75 }}>
          <Button size="small" variant="outlined" sx={{ px: 1.25, minWidth: 'auto' }} disabled={page === 0 || loading} onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</Button>
          <Button size="small" variant="outlined" sx={{ px: 1.25, minWidth: 'auto' }} disabled={(page + 1) >= totalPages || loading} onClick={() => setPage(p => p + 1)}>Next</Button>
        </Stack>
      </Box>

      {/* Pending Applications */}
      <Box sx={{ height: 320 }} />
      <Box data-record-list>
      <Button variant="outlined" size="small" disableRipple sx={{ textTransform: 'none', pointerEvents: 'none', mb: 1, mt: 2, color: '#2e7d32 !important', borderColor: '#2e7d32 !important' }}>
        Pending Applications
      </Button>
      {/* Applications controls: search + sort */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        mb: 1.5,
      }}>
        <TextField
          size="small"
          sx={{ flex: '0 1 45%', minWidth: 260 }}
          placeholder="Search applications (name, email, contact, id)…"
          value={pendingSearchQuery}
          onChange={(e) => setPendingSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {pendingSearchQuery && (
                  <IconButton aria-label="clear search" size="small" onClick={() => setPendingSearchQuery('')}>
                    <ClearRoundedIcon fontSize="small" />
                  </IconButton>
                )}
              </InputAdornment>
            ),
          }}
        />
         <Box>
           <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
             <Button
               variant="outlined"
               size="small"
               startIcon={showPendingIds ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
               onClick={() => setShowPendingIds(v => !v)}
               sx={{ textTransform: 'none' }}
             >
               {showPendingIds ? 'Hide ID' : 'Show ID'}
             </Button>
            <Button
              variant="outlined"
              size="small"
              disableRipple
              sx={{
                textTransform: 'none',
                pointerEvents: 'none',
              }}
            >
              Total Pending: {totalPendingCount}
            </Button>
            <Button
              variant="outlined"
              startIcon={<SortRoundedIcon />}
              onClick={(e) => setPendingSortAnchorEl(e.currentTarget)}
              sx={{ whiteSpace: 'nowrap', textTransform: 'none' }}
            >
              Sort
            </Button>
          </Stack>
        </Box>
        <Menu
          anchorEl={pendingSortAnchorEl}
          open={Boolean(pendingSortAnchorEl)}
          onClose={() => setPendingSortAnchorEl(null)}
        >
          <MuiMenuItem onClick={() => { setPendingSortOption('name_asc'); setPendingSortAnchorEl(null); }}>Name (A → Z)</MuiMenuItem>
          <MuiMenuItem onClick={() => { setPendingSortOption('name_desc'); setPendingSortAnchorEl(null); }}>Name (Z → A)</MuiMenuItem>
          <MuiMenuItem onClick={() => { setPendingSortOption('email_asc'); setPendingSortAnchorEl(null); }}>Email (A → Z)</MuiMenuItem>
          <MuiMenuItem onClick={() => { setPendingSortOption('email_desc'); setPendingSortAnchorEl(null); }}>Email (Z → A)</MuiMenuItem>
          <MuiMenuItem onClick={() => { setPendingSortOption('id_asc'); setPendingSortAnchorEl(null); }}>ID (A → Z)</MuiMenuItem>
          <MuiMenuItem onClick={() => { setPendingSortOption('id_desc'); setPendingSortAnchorEl(null); }}>ID (Z → A)</MuiMenuItem>
        </Menu>
      </Box>
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
        {[...sortedPending, ...Array(Math.max(0, 10 - sortedPending.length)).fill(PENDING_PLACEHOLDER)].map((entry, idx) => {
          const isPlaceholder = !entry.name && !entry.email && !entry.contactNumber;
          return (
            <React.Fragment key={`pending-row-${entry.id || idx}`}>
              <ListItem sx={{ py: 2, minHeight: 64 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
                  <Box sx={{ width: 140, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-line', lineHeight: 1.2 }}>{formatId(entry.id, showPendingIds, 2)}</Typography>
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
      </Box>

      {/* Reports Logs */}
      <Box sx={{ height: 320 }} />
      <Box data-analytics>
        <Button variant="outlined" size="small" disableRipple sx={{ textTransform: 'none', pointerEvents: 'none', mb: 1, mt: 2, color: '#2e7d32 !important', borderColor: '#2e7d32 !important' }}>
          Reports Logs
        </Button>
        {/* Reports controls: search + sort */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 1.5,
        }}>
          <TextField
            size="small"
            sx={{ flex: '0 1 45%', minWidth: 260 }}
            placeholder="Search reports (species, barangay, municipality, reporter, contact, id)…"
            value={reportsSearchQuery}
            onChange={(e) => setReportsSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {reportsSearchQuery && (
                    <IconButton aria-label="clear search" size="small" onClick={() => setReportsSearchQuery('')}>
                      <ClearRoundedIcon fontSize="small" />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
          />
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={showReportIds ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                onClick={() => setShowReportIds(v => !v)}
                sx={{ textTransform: 'none' }}
              >
                {showReportIds ? 'Hide ID' : 'Show ID'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                disableRipple
                sx={{ textTransform: 'none', pointerEvents: 'none' }}
              >
                Total Reports: {totalReportsCount}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SortRoundedIcon />}
                onClick={(e) => setReportsSortAnchorEl(e.currentTarget)}
                sx={{ whiteSpace: 'nowrap', textTransform: 'none' }}
              >
                Sort
              </Button>
            </Stack>
            <Menu
              anchorEl={reportsSortAnchorEl}
              open={Boolean(reportsSortAnchorEl)}
              onClose={() => setReportsSortAnchorEl(null)}
            >
              <MuiMenuItem onClick={() => { setReportsSortOption('date_desc'); setReportsSortAnchorEl(null); }}>Date (Newest)</MuiMenuItem>
              <MuiMenuItem onClick={() => { setReportsSortOption('date_asc'); setReportsSortAnchorEl(null); }}>Date (Oldest)</MuiMenuItem>
              <MuiMenuItem onClick={() => { setReportsSortOption('species_asc'); setReportsSortAnchorEl(null); }}>Species (A → Z)</MuiMenuItem>
              <MuiMenuItem onClick={() => { setReportsSortOption('species_desc'); setReportsSortAnchorEl(null); }}>Species (Z → A)</MuiMenuItem>
              <MuiMenuItem onClick={() => { setReportsSortOption('municipality_asc'); setReportsSortAnchorEl(null); }}>Municipality (A → Z)</MuiMenuItem>
            </Menu>
          </Box>
        </Box>
      {reportsLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading reports…</Typography>
        </Box>
      )}
      {reportsError && (
        <Alert severity="error" sx={{ mb: 1 }}>{reportsError}</Alert>
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
        <Box sx={{ flex: 1.2, textAlign: 'center' }}>Species</Box>
        <Box sx={{ flex: 1.2, textAlign: 'center' }}>Barangay</Box>
        <Box sx={{ flex: 1.2, textAlign: 'center' }}>Municipality</Box>
        <Box sx={{ flex: 1.2, textAlign: 'center' }}>Reporter Name</Box>
        <Box sx={{ flex: 1.2, textAlign: 'center' }}>Contact Number</Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>Date</Box>
      </Box>

      <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        {(() => {
          const start = reportsPage * pageSize;
          const current = sortedReports.slice(start, start + pageSize);
          const padded = [
            ...current,
            ...Array(Math.max(0, pageSize - current.length)).fill(REPORT_PLACEHOLDER)
          ];
          return padded;
        })().map((entry, idx) => {
          const isPlaceholder = !entry.id && !entry.species && !entry.reporterName;
          return (
            <React.Fragment key={`report-row-${entry.id || idx}`}>
              <ListItem sx={{ py: 2, minHeight: 64 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
                  <Box sx={{ width: 140, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-line', lineHeight: 1.2 }}>{formatId(entry.id, showReportIds, 2)}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ lineHeight: 1.4 }}>{entry.species || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{entry.barangay || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{entry.municipality || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ lineHeight: 1.4 }}>{entry.reporterName || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{entry.contactNumber || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>{entry.date || '\u00A0'}</Typography>
                  </Box>
                </Box>
              </ListItem>
              {idx < (Math.max(10, reports.length) - 1) && <Divider component="li" />}
            </React.Fragment>
          );
        })}
      </List>
      {/* Reports pagination */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Page {reportsPage + 1} of {Math.max(1, Math.ceil((Math.max(0, sortedReports.length) || 0) / pageSize))}
        </Typography>
        <Stack direction="row" sx={{ gap: 1 }}>
          <Button size="small" variant="outlined" disabled={reportsPage === 0 || reportsLoading} onClick={() => setReportsPage(p => Math.max(0, p - 1))}>Previous</Button>
          <Button size="small" variant="outlined" disabled={(reportsPage + 1) >= Math.ceil((Math.max(0, sortedReports.length) || 0) / pageSize) || reportsLoading} onClick={() => setReportsPage(p => p + 1)}>Next</Button>
        </Stack>
      </Box>
      </Box>

      {/* Login Logs */}
      <Box sx={{ height: 320 }} />
      <Box data-audit>
        <Button variant="outlined" size="small" disableRipple sx={{ textTransform: 'none', pointerEvents: 'none', mb: 1, mt: 2, color: '#2e7d32 !important', borderColor: '#2e7d32 !important' }}>
          Login Logs
        </Button>
        {/* Login logs controls: search + sort */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          mb: 1.5,
        }}>
          <TextField
            size="small"
            sx={{ flex: '0 1 45%', minWidth: 260 }}
            placeholder="Search logs (name, role, date, id)…"
            value={loginSearchQuery}
            onChange={(e) => setLoginSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {loginSearchQuery && (
                    <IconButton aria-label="clear search" size="small" onClick={() => setLoginSearchQuery('')}>
                      <ClearRoundedIcon fontSize="small" />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
          />
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={showLoginIds ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                onClick={() => setShowLoginIds(v => !v)}
                sx={{ textTransform: 'none' }}
              >
                {showLoginIds ? 'Hide ID' : 'Show ID'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                disableRipple
                sx={{ textTransform: 'none', pointerEvents: 'none' }}
              >
                Total Logs: {totalAuditCount}
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SortRoundedIcon />}
                onClick={(e) => setLoginSortAnchorEl(e.currentTarget)}
                sx={{ whiteSpace: 'nowrap', textTransform: 'none' }}
              >
                Sort
              </Button>
            </Stack>
            <Menu
              anchorEl={loginSortAnchorEl}
              open={Boolean(loginSortAnchorEl)}
              onClose={() => setLoginSortAnchorEl(null)}
            >
              <MuiMenuItem onClick={() => { setLoginSortOption('date_desc'); setLoginSortAnchorEl(null); }}>Date (Newest)</MuiMenuItem>
              <MuiMenuItem onClick={() => { setLoginSortOption('date_asc'); setLoginSortAnchorEl(null); }}>Date (Oldest)</MuiMenuItem>
              <MuiMenuItem onClick={() => { setLoginSortOption('name_asc'); setLoginSortAnchorEl(null); }}>Name (A → Z)</MuiMenuItem>
              <MuiMenuItem onClick={() => { setLoginSortOption('name_desc'); setLoginSortAnchorEl(null); }}>Name (Z → A)</MuiMenuItem>
              <MuiMenuItem onClick={() => { setLoginSortOption('role_asc'); setLoginSortAnchorEl(null); }}>Role (A → Z)</MuiMenuItem>
            </Menu>
          </Box>
        </Box>
        {loginLogsLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="body2">Loading login logs…</Typography>
          </Box>
        )}
        {loginLogsError && (
          <Alert severity="error" sx={{ mb: 1 }}>{loginLogsError}</Alert>
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
          color: 'text.secondary',
        }}>
          <Box sx={{ width: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.4 }}>ID</Typography>
          </Box>
          <Box sx={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.4 }}>Name</Typography>
          </Box>
          <Box sx={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.4 }}>Role</Typography>
          </Box>
          <Box sx={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.4 }}>Date</Typography>
          </Box>
          <Box sx={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" sx={{ lineHeight: 1.4 }}>Time</Typography>
          </Box>
        </Box>

        <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
          {(() => {
            const start = auditPage * pageSize;
            const current = sortedLoginLogs.slice(start, start + pageSize);
            const padded = [
              ...current,
              ...Array(Math.max(0, pageSize - current.length)).fill({ id: '', name: '', date: '', time: '' })
            ];
            return padded;
          })().map((entry: any, idx) => (
            <React.Fragment key={`audit-row-${idx}`}>
              <ListItem sx={{ py: 2, minHeight: 64 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
                  <Box sx={{ width: 140, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.7rem', whiteSpace: 'pre-line', lineHeight: 1.2 }}>{formatId(entry.id, showLoginIds, 2)}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ lineHeight: 1.4 }}>{entry.name || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>{entry.role || '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{entry.date ? new Date(entry.date).toLocaleDateString() : '\u00A0'}</Typography>
                  </Box>
                  <Box sx={{ flex: 1.2, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>{entry.date ? new Date(entry.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : '\u00A0'}</Typography>
                  </Box>
                </Box>
              </ListItem>
              {idx < (pageSize - 1) && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
        {/* Audit pagination scaffold to match layout */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Page {auditPage + 1} of {Math.max(1, Math.ceil((Math.max(0, sortedLoginLogs.length) || 0) / pageSize))}
          </Typography>
          <Stack direction="row" sx={{ gap: 1 }}>
            <Button size="small" variant="outlined" disabled={auditPage === 0 || loginLogsLoading} onClick={() => setAuditPage(p => Math.max(0, p - 1))}>Previous</Button>
            <Button size="small" variant="outlined" disabled={(auditPage + 1) >= Math.max(1, Math.ceil((Math.max(0, sortedLoginLogs.length) || 0) / pageSize)) || loginLogsLoading} onClick={() => setAuditPage(p => p + 1)}>Next</Button>
          </Stack>
        </Box>
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
              <MuiMenuItem value="enforcement">Enforcement</MuiMenuItem>
              <MuiMenuItem value="cenro">CENRO</MuiMenuItem>
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
              <MuiMenuItem value="enforcement">Enforcement</MuiMenuItem>
              <MuiMenuItem value="cenro">CENRO</MuiMenuItem>
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
        <DialogTitle>
          <Typography sx={{ color: '#d32f2f !important', fontWeight: 600 }}>Delete User</Typography>
        </DialogTitle>
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



