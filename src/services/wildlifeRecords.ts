import { supabase } from './supabase';

export interface WildlifeRecord {
  id: string;
  user_id: string;
  species_name: string;
  scientific_name?: string;
  speciespf_id?: string;
  status: 'reported' | 'rescued' | 'turned over' | 'released' | 'dispersed';
  approval_status: 'pending' | 'approved' | 'rejected';
  latitude: number;
  longitude: number;
  barangay?: string;
  municipality?: string;
  reporter_name?: string;
  contact_number?: string;
  reporter_contact?: string;
  notes?: string;
  photo_url?: string;
  has_exif_gps?: boolean;
  timestamp_captured: string;
  created_at: string;
  updated_at: string;
  // Dispersal tracking fields - temporarily disabled due to database schema limitations
  // original_latitude?: number;
  // original_longitude?: number;
  // original_barangay?: string;
  // dispersal_trace?: boolean;
}

export interface CreateWildlifeRecord {
  species_name: string;
  scientific_name?: string;
  speciespf_id?: string;
  status: 'reported' | 'rescued' | 'turned over' | 'released' | 'dispersed';
  approval_status?: 'pending' | 'approved' | 'rejected';
  latitude: number;
  longitude: number;
  barangay?: string;
  municipality?: string;
  reporter_name?: string;
  contact_number?: string;
  reporter_contact?: string;
  notes?: string;
  photo_url?: string;
  has_exif_gps?: boolean;
  timestamp_captured: string;
  // Dispersal tracking fields - temporarily disabled due to database schema limitations
  // original_latitude?: number;
  // original_longitude?: number;
  // original_barangay?: string;
  // dispersal_trace?: boolean;
}

export interface UpdateWildlifeRecord {
  species_name?: string;
  scientific_name?: string;
  speciespf_id?: string;
  status?: 'reported' | 'rescued' | 'turned over' | 'released';
  approval_status?: 'pending' | 'approved' | 'rejected';
  latitude?: number;
  longitude?: number;
  barangay?: string;
  municipality?: string;
  reporter_name?: string;
  contact_number?: string;
  reporter_contact?: string;
  notes?: string;
  phone_number?: string;
  country_code?: string;
  photo_url?: string;
  has_exif_gps?: boolean;
  timestamp_captured?: string;
}

// Archive a wildlife record (copy to archive table)
export async function archiveWildlifeRecord(record: WildlifeRecord): Promise<void> {
  const archivePayload = {
    original_id: record.id,
    user_id: record.user_id,
    species_name: record.species_name,
    scientific_name: (record as any).scientific_name || null,
    speciespf_id: (record as any).speciespf_id || null,
    status: record.status,
    approval_status: record.approval_status,
    latitude: record.latitude,
    longitude: record.longitude,
    barangay: record.barangay,
    municipality: record.municipality,
    reporter_name: record.reporter_name,
    contact_number: record.contact_number,
    reporter_contact: record.reporter_contact,
    notes: record.notes,
    photo_url: record.photo_url,
    has_exif_gps: record.has_exif_gps,
    timestamp_captured: record.timestamp_captured,
    created_at: record.created_at,
    updated_at: record.updated_at,
    deleted_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('wildlife_records_archive')
    .insert([archivePayload]);
  if (error) {
    console.error('Error archiving wildlife record:', error);
    throw error;
  }
}

export async function getArchivedWildlifeRecords(): Promise<any[]> {
  const { data, error } = await supabase
    .from('wildlife_records_archive')
    .select('*')
    .order('deleted_at', { ascending: false });
  if (error) {
    console.error('Error fetching archived records:', error);
    throw error;
  }
  return data || [];
}

// Get all wildlife records
export async function getWildlifeRecords(): Promise<WildlifeRecord[]> {
  const { data, error } = await supabase
    .from('wildlife_records')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching wildlife records:', error);
    throw error;
  }

  return data || [];
}

// Get wildlife records by user
export async function getWildlifeRecordsByUser(userId: string): Promise<WildlifeRecord[]> {
  const { data, error } = await supabase
    .from('wildlife_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user wildlife records:', error);
    throw error;
  }

  return data || [];
}

// Create a new wildlife record
export async function createWildlifeRecord(record: CreateWildlifeRecord): Promise<WildlifeRecord> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  
  if (!user) {
    throw new Error('User must be authenticated to create wildlife records');
  }

  // Generate speciespf_id if not provided: "MFMMDDYYYYHHmm" (no separators)
  const ensureSpeciesPfId = (ts?: string) => {
    const d = ts ? new Date(ts) : new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const yyyy = d.getFullYear();
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `MF${mm}${dd}${yyyy}${hh}${mi}`;
  };

  const { data, error } = await supabase
    .from('wildlife_records')
    .insert([{
      ...record,
      speciespf_id: record.speciespf_id || ensureSpeciesPfId(record.timestamp_captured),
      user_id: user.id,
      approval_status: 'approved', // Authenticated users are always auto-approved
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating wildlife record:', error);
    throw error;
  }

  return data;
}

// Create a wildlife record without requiring authentication (public report)
// Public payload: same as CreateWildlifeRecord but without status (left null for enforcement verification)
export type PublicWildlifeReport = Omit<CreateWildlifeRecord, 'status'> & { status?: never };

export async function createWildlifeRecordPublic(record: PublicWildlifeReport): Promise<WildlifeRecord> {
  // Set status to 'reported' for public reports (pending enforcement review)
  const generateSpeciesPfId = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    const rand = Math.floor(Math.random() * 9000) + 1000; // 4-digit random number
    return `MF${yyyy}${mm}${dd}${hh}${mi}${ss}${rand}`;
  };

  const recordWithStatus = {
    ...record,
    speciespf_id: (record as any).speciespf_id || generateSpeciesPfId(),
    status: 'reported' as const,
    approval_status: 'pending' as const, // Public reports need approval
    user_id: null
  };
  
  const { data, error } = await supabase
    .from('wildlife_records')
    .insert([recordWithStatus])
    .select()
    .single();

  if (error) {
    console.error('Error creating public wildlife record:', error);
    throw error;
  }

  return data as WildlifeRecord;
}

// Update a wildlife record
export async function updateWildlifeRecord(id: string, updates: UpdateWildlifeRecord): Promise<WildlifeRecord> {
  const { data, error } = await supabase
    .from('wildlife_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating wildlife record:', error);
    throw error;
  }

  return data;
}

// Delete a wildlife record
export async function deleteWildlifeRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from('wildlife_records')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting wildlife record:', error);
    throw error;
  }
}

// Approve a wildlife record
export async function approveWildlifeRecord(id: string): Promise<WildlifeRecord> {
  const { data, error } = await supabase
    .from('wildlife_records')
    .update({ approval_status: 'approved' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error approving wildlife record:', error);
    throw error;
  }

  return data;
}

// Reject a wildlife record
export async function rejectWildlifeRecord(id: string): Promise<WildlifeRecord> {
  const { data, error } = await supabase
    .from('wildlife_records')
    .update({ approval_status: 'rejected' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error rejecting wildlife record:', error);
    throw error;
  }

  return data;
}

// Get user role
export async function getUserRole(): Promise<string | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    
    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      // If there's a policy error, return a default role to prevent infinite loops
      if (error.code === '42P17' || error.message.includes('infinite recursion')) {
        console.warn('Users table policy error detected, using default role');
        return 'user'; // Default role
      }
      return null;
    }

    return data?.role || null;
  } catch (error) {
    console.error('Unexpected error fetching user role:', error);
    return null;
  }
}

// Upload photo to storage (requires authentication)
export async function uploadWildlifePhoto(file: File, recordId: string): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  
  if (!user) {
    throw new Error('User must be authenticated to upload photos');
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${recordId}-${Date.now()}.${fileExt}`;
  const filePath = `wildlife-photos/${fileName}`;

  const { data, error } = await supabase.storage
    .from('wildlife-photos')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('wildlife-photos')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

// Upload photo to storage (public - no authentication required)
export async function uploadWildlifePhotoPublic(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `public-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `public/${fileName}`;

  // Try to upload to the existing wildlife-photos bucket
  const { data, error } = await supabase.storage
    .from('wildlife-photos')
    .upload(filePath, file);

  if (error) {
    console.error('Error uploading public photo:', error);
    
    // If the bucket doesn't allow public uploads, we need to handle this differently
    if (error.message.includes('Bucket not found') || error.message.includes('permission')) {
      throw new Error('Photo upload is currently unavailable. Please try again later or contact support.');
    }
    
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('wildlife-photos')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}
