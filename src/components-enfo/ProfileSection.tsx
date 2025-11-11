import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockResetIcon from '@mui/icons-material/LockReset';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

export default function ProfileSection({ fullWidth = false, showTitle = true }: { fullWidth?: boolean; showTitle?: boolean }) {
  const { user, session } = useAuth();
  
  // State for user profile data
  const [userProfile, setUserProfile] = useState<{
    userId: string;
    role: string;
    dateCreated: string;
    contactNumber: string;
    avatarPhoto: string | null;
    firstName: string;
    lastName: string;
    gender: string;
    email: string;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  
  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<{
    firstName: string;
    lastName: string;
    gender: string;
    email: string;
    contactNumber: string;
  } | null>(null);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  // State for avatar upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // State for User ID visibility (default to hidden)
  const [showUserId, setShowUserId] = useState(false);
  
  // State for reset password modal
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);
  
  // Fetch user profile data - only when user ID changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      // If no user or session, clear profile
      if (!user || !session) {
        setUserProfile(null);
        setProfileLoading(false);
        setLoadedUserId(null);
        return;
      }

      // If we already loaded profile for this user ID, don't refetch
      if (loadedUserId === user.id && userProfile !== null) {
        setProfileLoading(false);
        return;
      }

      try {
        setProfileLoading(true);
        
        // Get user metadata from auth
        const userMetadata = user.user_metadata || {};
        
        // Fetch user data from users table (this is the source of truth)
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, first_name, last_name, gender, contact_number, avatar_url, email')
          .eq('id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error fetching user data:', userError);
        }

        // Use data from users table first, fallback to auth metadata
        const role = userData?.role || userMetadata?.role || 'reporter';
        const firstName = userData?.first_name || userMetadata?.first_name || userMetadata?.full_name || '';
        const lastName = userData?.last_name || userMetadata?.last_name || '';
        const gender = userData?.gender || userMetadata?.gender || 'Not specified';
        const contactNumber = userData?.contact_number || userMetadata?.phone || userMetadata?.contact_number || 'Not provided';
        const avatarPhoto = userData?.avatar_url || userMetadata?.avatar_url || null;
        const dateCreated = user.created_at || new Date().toISOString();
        const email = userData?.email || user.email || userMetadata?.email || 'Not provided';

        setUserProfile({
          userId: user.id,
          role: role,
          dateCreated: dateCreated,
          contactNumber: contactNumber,
          avatarPhoto: avatarPhoto,
          firstName: firstName,
          lastName: lastName,
          gender: gender,
          email: email,
        });
        setLoadedUserId(user.id);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.id, session?.access_token]);

  // Handle edit mode toggle
  const handleEditClick = () => {
    if (userProfile) {
      setEditedProfile({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        gender: userProfile.gender || 'Not specified',
        email: userProfile.email || '',
        contactNumber: userProfile.contactNumber || '',
      });
      setAvatarFile(null);
      setAvatarPreview(null);
      setIsEditMode(true);
      setUpdateError(null);
      setUpdateSuccess(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedProfile(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    setUpdateError(null);
    setUpdateSuccess(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
    } else {
      setAvatarPreview(null);
    }
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;
    const ext = avatarFile.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const filePath = `avatars/${fileName}`;
    const { error: upErr } = await supabase.storage.from('wildlife-photos').upload(filePath, avatarFile);
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from('wildlife-photos').getPublicUrl(filePath);
    return urlData.publicUrl || null;
  };

  // Handle profile update
  const handleSaveProfile = async () => {
    if (!editedProfile || !user) {
      return;
    }

    setUpdatingProfile(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      // Upload avatar if a new file was selected
      let avatarUrl: string | null = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar(user.id);
      }

      // Prepare update object (email is not editable, so we don't update it)
      const updateData: any = {
        data: {
          first_name: editedProfile.firstName,
          last_name: editedProfile.lastName,
          gender: editedProfile.gender,
          phone: editedProfile.contactNumber,
          contact_number: editedProfile.contactNumber,
          ...(avatarUrl && { avatar_url: avatarUrl }),
        }
      };

      // Update user metadata in Supabase Auth (email stays the same)
      const { data: updatedUser, error: updateError } = await supabase.auth.updateUser(updateData);

      if (updateError) throw updateError;

      // Also update the users table in the database
      const updatePayload: any = {
        id: user.id,
        first_name: editedProfile.firstName,
        last_name: editedProfile.lastName,
        gender: editedProfile.gender,
        contact_number: editedProfile.contactNumber,
        role: userProfile?.role || 'reporter',
      };

      // Only include avatar_url if it was uploaded
      if (avatarUrl) {
        updatePayload.avatar_url = avatarUrl;
      }

      const { data: dbData, error: dbUpdateError } = await supabase
        .from('users')
        .upsert(updatePayload, { 
          onConflict: 'id',
        });

      if (dbUpdateError) {
        console.error('Error updating users table:', dbUpdateError);
        console.error('Error details:', JSON.stringify(dbUpdateError, null, 2));
        setUpdateError(`Profile updated in auth metadata, but database update failed: ${dbUpdateError.message}. Check console for details.`);
      } else {
        console.log('Successfully updated users table:', dbData);
      }

      // Update local state immediately
      setUserProfile(prev => prev ? {
        ...prev,
        firstName: editedProfile.firstName,
        lastName: editedProfile.lastName,
        gender: editedProfile.gender,
        email: updatedUser.user?.email || editedProfile.email,
        contactNumber: editedProfile.contactNumber,
        avatarPhoto: avatarUrl || prev.avatarPhoto,
      } : null);
      
      setAvatarFile(null);
      setAvatarPreview(null);

      setUpdateSuccess(true);
      setIsEditMode(false);
      
      // Force refresh by clearing loadedUserId to trigger refetch on next render
      setLoadedUserId(null);

      // Refresh the session to get updated user data
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (newSession?.user) {
        // Update profile from fresh session data
        const userMetadata = newSession.user.user_metadata || {};
        setUserProfile(prev => prev ? {
          ...prev,
          firstName: userMetadata.first_name || userMetadata.full_name || prev.firstName,
          lastName: userMetadata.last_name || prev.lastName,
          gender: userMetadata.gender || prev.gender,
          email: newSession.user.email || prev.email,
          contactNumber: userMetadata.phone || userMetadata.contact_number || prev.contactNumber,
        } : null);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setUpdateError(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Handle reset password
  const handleResetPassword = async () => {
    if (!userProfile?.email) {
      setResetPasswordError('Email not found');
      return;
    }

    setResetPasswordLoading(true);
    setResetPasswordError(null);
    setResetPasswordSuccess(false);

    try {
      // Use environment variable for production, fallback to window.location.origin for development
      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(userProfile.email, {
        redirectTo: `${baseUrl}/reset-password`,
      });

      if (error) throw error;
      setResetPasswordSuccess(true);
    } catch (err: any) {
      setResetPasswordError(err.message || 'Failed to send reset email');
    } finally {
      setResetPasswordLoading(false);
    }
  };

  const handleCloseResetPassword = () => {
    setResetPasswordOpen(false);
    setResetPasswordError(null);
    setResetPasswordSuccess(false);
  };

  return (
    <Box 
      component={motion.div}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      data-profile 
      sx={{
        mt: 2,
        mb: 3,
        width: fullWidth ? '100%' : undefined,
        maxWidth: fullWidth ? { xs: '100%', md: '100%' } : { xs: '100%', md: '1577px' },
        mx: fullWidth ? 0 : 'auto',
        minHeight: { xs: 'auto', md: '650px' }
      }}
    >
      <Card sx={{ p: 3.5, boxShadow: 1, minHeight: { xs: 'auto', md: '650px' }, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: -8, flexShrink: 0 }}>
          {showTitle && (
            <Typography variant="h4" component="h2" sx={{ color: '#2e7d32 !important', mb: 3 }}>
              My Profile
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, minHeight: '32.5px', alignItems: 'center' }}>
            {!isEditMode && userProfile && (
              <>
                <Box
                  component={motion.div}
                  key="edit-button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleEditClick}
                    size="small"
                  >
                    Edit
                  </Button>
                </Box>
                <Box
                  component={motion.div}
                  key="reset-password-button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Button
                    variant="outlined"
                    startIcon={<LockResetIcon />}
                    onClick={() => setResetPasswordOpen(true)}
                    size="small"
                    color="warning"
                  >
                    Reset Password
                  </Button>
                </Box>
              </>
            )}
            {isEditMode && (
              <Box
                component={motion.div}
                key="action-buttons"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                style={{ display: 'flex', gap: 8 }}
              >
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancelEdit}
                  disabled={updatingProfile}
                  size="small"
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={updatingProfile ? <CircularProgress size={16} /> : <SaveIcon />}
                  onClick={handleSaveProfile}
                  disabled={updatingProfile}
                  size="small"
                  sx={{
                    backgroundColor: '#4caf50',
                    '&:hover': {
                      backgroundColor: '#388e3c',
                    }
                  }}
                >
                  {updatingProfile ? 'Saving...' : 'Save'}
                </Button>
              </Box>
            )}
          </Box>
        </Box>
        
        {(updateSuccess || updateError) && (
          <Box sx={{ mb: 2, flexShrink: 0, minHeight: updateSuccess && updateError ? '104px' : '52px' }}>
            {updateSuccess && (
              <Alert severity="success" sx={{ mb: 1 }}>
                Profile updated successfully!
              </Alert>
            )}
            {updateError && (
              <Alert severity="error">
                {updateError}
              </Alert>
            )}
          </Box>
        )}
        
        {profileLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 450 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Loading profile...
            </Typography>
          </Box>
        ) : !userProfile ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 450 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Please sign in to view your profile
            </Typography>
          </Box>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 5, 
            minHeight: { xs: 'auto', md: '550px' },
            flex: 1,
            justifyContent: 'flex-start' 
          }}>
            {/* Avatar Section - Centered at top */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <Avatar
                  src={avatarPreview || userProfile.avatarPhoto || undefined}
                  sx={{ 
                    width: { xs: 160, md: 200 }, 
                    height: { xs: 160, md: 200 },
                    border: '4px solid',
                    borderColor: '#4caf50',
                    bgcolor: 'primary.light',
                    fontSize: { xs: '3.5rem', md: '4.5rem' },
                    boxShadow: (theme) => theme.palette.mode === 'dark' 
                      ? '0 8px 24px rgba(76, 175, 80, 0.4)'
                      : '0 8px 24px rgba(76, 175, 80, 0.25)',
                  }}
                >
                  {!avatarPreview && !userProfile.avatarPhoto && (userProfile.firstName?.[0] || userProfile.lastName?.[0] || 'U')}
                </Avatar>
                {isEditMode && (
                  <Box
                    component="label"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      bgcolor: '#4caf50',
                      color: '#ffffff !important',
                      border: '3px solid',
                      borderColor: 'background.paper',
                      borderRadius: 2,
                      px: 1,
                      py: 0.5,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#388e3c',
                        color: '#ffffff !important',
                      },
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  >
                    <PhotoCameraIcon 
                      sx={{ 
                        fontSize: { xs: 16, md: 20 },
                        color: '#ffffff !important',
                      }} 
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#ffffff !important',
                        fontWeight: 600,
                        fontSize: { xs: '0.7rem', md: '0.75rem' },
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Edit
                    </Typography>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleAvatarChange}
                    />
                  </Box>
                )}
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', textAlign: 'center', mt: 1 }}>
                {userProfile.firstName && userProfile.lastName 
                  ? `${userProfile.firstName} ${userProfile.lastName}`
                  : userProfile.firstName || 'User'
                }
              </Typography>
              <Chip 
                label={userProfile.role.toUpperCase()} 
                size="small"
                sx={{ 
                  fontWeight: 600, 
                  letterSpacing: '0.5px',
                  color: '#ffffff !important',
                  backgroundColor: '#4caf50 !important',
                  '&:hover': {
                    backgroundColor: '#388e3c !important',
                    color: '#ffffff !important',
                  },
                  '&.MuiChip-root': {
                    backgroundColor: '#4caf50 !important',
                    color: '#ffffff !important',
                  },
                  '&.MuiChip-root:hover': {
                    backgroundColor: '#388e3c !important',
                    color: '#ffffff !important',
                  },
                  '& .MuiChip-label': {
                    color: '#ffffff !important',
                  }
                }}
              />
            </Box>
            
            {/* Profile Fields Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              {/* First Name */}
              <Card variant="outlined" sx={{ p: 3, transition: 'all 0.3s ease' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.875rem' }}>
                  First Name
                </Typography>
                <Box
                  component={motion.div}
                  initial={false}
                  key={isEditMode ? 'edit' : 'view'}
                  animate={{ opacity: [0, 1] }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  {isEditMode && editedProfile ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedProfile.firstName}
                      onChange={(e) => setEditedProfile({ ...editedProfile, firstName: e.target.value })}
                      variant="standard"
                      sx={{
                        '& .MuiInput-input': {
                          fontWeight: 500,
                          fontSize: '1.125rem',
                          padding: 0,
                          marginTop: 0.5,
                        },
                        '& .MuiInput-underline:before': {
                          borderBottom: '1px solid',
                          borderBottomColor: 'divider',
                        },
                        '& .MuiInput-underline:hover:before': {
                          borderBottom: '2px solid',
                          borderBottomColor: 'primary.main',
                        },
                        '& .MuiInput-underline:after': {
                          borderBottom: '2px solid',
                          borderBottomColor: 'primary.main',
                        },
                        mt: -0.5,
                      }}
                    />
                  ) : (
                    <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1.125rem' }}>
                      {userProfile.firstName || 'Not provided'}
                    </Typography>
                  )}
                </Box>
              </Card>
              
              {/* Last Name */}
              <Card variant="outlined" sx={{ p: 3, transition: 'all 0.3s ease' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.875rem' }}>
                  Last Name
                </Typography>
                <Box
                  component={motion.div}
                  initial={false}
                  key={isEditMode ? 'edit' : 'view'}
                  animate={{ opacity: [0, 1] }}
                  transition={{ duration: 0.3, delay: 0.05, ease: 'easeInOut' }}
                >
                  {isEditMode && editedProfile ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedProfile.lastName}
                      onChange={(e) => setEditedProfile({ ...editedProfile, lastName: e.target.value })}
                      variant="standard"
                      sx={{
                        '& .MuiInput-input': {
                          fontWeight: 500,
                          fontSize: '1.125rem',
                          padding: 0,
                          marginTop: 0.5,
                        },
                        '& .MuiInput-underline:before': {
                          borderBottom: '1px solid',
                          borderBottomColor: 'divider',
                        },
                        '& .MuiInput-underline:hover:before': {
                          borderBottom: '2px solid',
                          borderBottomColor: 'primary.main',
                        },
                        '& .MuiInput-underline:after': {
                          borderBottom: '2px solid',
                          borderBottomColor: 'primary.main',
                        },
                        mt: -0.5,
                      }}
                    />
                  ) : (
                    <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1.125rem' }}>
                      {userProfile.lastName || 'Not provided'}
                    </Typography>
                  )}
                </Box>
              </Card>
              
              {/* Role - Not Editable */}
              <Card variant="outlined" sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    Role
                  </Typography>
                  {isEditMode && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontStyle: 'italic' }}>
                      Cannot be edited
                    </Typography>
                  )}
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 500, textTransform: 'capitalize', fontSize: '1.125rem' }}>
                  {userProfile.role}
                </Typography>
              </Card>
              
              {/* User ID - Not Editable */}
              <Card variant="outlined" sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                      User ID
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => setShowUserId(!showUserId)}
                      sx={{
                        padding: 0,
                        minWidth: 'auto',
                        width: 'auto',
                        height: 'auto',
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'primary.main',
                        },
                      }}
                    >
                      {showUserId ? (
                        <VisibilityIcon sx={{ fontSize: '0.875rem' }} />
                      ) : (
                        <VisibilityOffIcon sx={{ fontSize: '0.875rem' }} />
                      )}
                    </IconButton>
                  </Box>
                  {isEditMode && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontStyle: 'italic' }}>
                      Cannot be edited
                    </Typography>
                  )}
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 500, wordBreak: 'break-all', fontSize: '0.875rem' }}>
                  {showUserId ? userProfile.userId : '••••••••••••'}
                </Typography>
              </Card>
              
              {/* Gender */}
              <Card variant="outlined" sx={{ p: 3, transition: 'all 0.3s ease' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.875rem' }}>
                  Gender
                </Typography>
                <Box
                  component={motion.div}
                  initial={false}
                  key={isEditMode ? 'edit' : 'view'}
                  animate={{ opacity: [0, 1] }}
                  transition={{ duration: 0.3, delay: 0.1, ease: 'easeInOut' }}
                >
                  {isEditMode && editedProfile ? (
                    <FormControl fullWidth sx={{ mt: -0.5 }}>
                      <Select
                        value={editedProfile.gender}
                        onChange={(e) => setEditedProfile({ ...editedProfile, gender: e.target.value })}
                        sx={{
                          '& .MuiSelect-select': {
                            fontWeight: 500,
                            fontSize: '1.125rem',
                            padding: '6px 14px',
                            textTransform: 'capitalize',
                            color: 'text.primary',
                            backgroundColor: 'transparent',
                            '&:focus': {
                              backgroundColor: 'transparent',
                            },
                          },
                          '& .MuiOutlinedInput-notchedOutline': {
                            border: 'none',
                            borderBottom: '2px solid',
                            borderColor: 'divider',
                            borderRadius: 0,
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                            borderBottomWidth: '2px',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                            borderBottomWidth: '2px',
                          },
                          '& .MuiSvgIcon-root': {
                            color: 'text.secondary',
                          },
                        }}
                        MenuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          PaperProps: {
                            sx: {
                              maxHeight: 200,
                              mt: 1,
                              borderRadius: 2,
                              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                              border: '1px solid',
                              borderColor: 'divider',
                              '& .MuiMenuItem-root': {
                                fontSize: '1rem',
                                py: 1.25,
                                px: 2,
                                textTransform: 'capitalize',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'primary.light',
                                  color: 'primary.contrastText',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: 'primary.main',
                                  color: 'white',
                                  '&:hover': {
                                    backgroundColor: 'primary.dark',
                                  },
                                },
                              },
                            },
                          },
                          disableAutoFocusItem: true,
                          disableScrollLock: true,
                        }}
                      >
                        <MenuItem value="male">Male</MenuItem>
                        <MenuItem value="female">Female</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                        <MenuItem value="prefer_not_to_say">Prefer Not to Say</MenuItem>
                        <MenuItem value="Not specified">Not specified</MenuItem>
                      </Select>
                    </FormControl>
                  ) : (
                    <Typography variant="body1" sx={{ fontWeight: 500, textTransform: 'capitalize', fontSize: '1.125rem' }}>
                      {userProfile.gender.replace(/_/g, ' ')}
                    </Typography>
                  )}
                </Box>
              </Card>
              
              {/* Date Created - Not Editable */}
              <Card variant="outlined" sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    Date Created
                  </Typography>
                  {isEditMode && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontStyle: 'italic' }}>
                      Cannot be edited
                    </Typography>
                  )}
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1.125rem' }}>
                  {new Date(userProfile.dateCreated).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              </Card>
              
              {/* Email - Read Only */}
              <Card variant="outlined" sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    Email
                  </Typography>
                  {isEditMode && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', fontStyle: 'italic' }}>
                      Cannot be edited
                    </Typography>
                  )}
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 500, wordBreak: 'break-all', fontSize: '1.125rem', color: 'text.secondary' }}>
                  {userProfile.email}
                </Typography>
              </Card>
              
              {/* Contact Number */}
              <Card variant="outlined" sx={{ p: 3, transition: 'all 0.3s ease' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.875rem' }}>
                  Contact Number
                </Typography>
                <Box
                  component={motion.div}
                  initial={false}
                  key={isEditMode ? 'edit' : 'view'}
                  animate={{ opacity: [0, 1] }}
                  transition={{ duration: 0.3, delay: 0.15, ease: 'easeInOut' }}
                >
                  {isEditMode && editedProfile ? (
                    <TextField
                      fullWidth
                      size="small"
                      value={editedProfile.contactNumber}
                      onChange={(e) => setEditedProfile({ ...editedProfile, contactNumber: e.target.value })}
                      variant="standard"
                      sx={{
                        '& .MuiInput-input': {
                          fontWeight: 500,
                          fontSize: '1.125rem',
                          padding: 0,
                          marginTop: 0.5,
                        },
                        '& .MuiInput-underline:before': {
                          borderBottom: '1px solid',
                          borderBottomColor: 'divider',
                        },
                        '& .MuiInput-underline:hover:before': {
                          borderBottom: '2px solid',
                          borderBottomColor: 'primary.main',
                        },
                        '& .MuiInput-underline:after': {
                          borderBottom: '2px solid',
                          borderBottomColor: 'primary.main',
                        },
                        mt: -0.5,
                      }}
                    />
                  ) : (
                    <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1.125rem' }}>
                      {userProfile.contactNumber}
                    </Typography>
                  )}
                </Box>
              </Card>
            </Box>
          </Box>
        )}
      </Card>

      {/* Reset Password Modal */}
      <Dialog
        open={resetPasswordOpen}
        onClose={handleCloseResetPassword}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            We'll send a password reset link to your email address: <strong>{userProfile?.email}</strong>
          </DialogContentText>

          {resetPasswordError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {resetPasswordError}
            </Alert>
          )}

          {resetPasswordSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Password reset email sent! Please check your inbox and follow the instructions to reset your password.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ pb: 3, px: 3 }}>
          <Button onClick={handleCloseResetPassword} disabled={resetPasswordLoading}>
            {resetPasswordSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!resetPasswordSuccess && (
            <Button
              variant="contained"
              onClick={handleResetPassword}
              disabled={resetPasswordLoading}
              color="warning"
            >
              {resetPasswordLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}

