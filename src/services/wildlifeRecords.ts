import { supabase } from './supabase';

export interface WildlifeRecord {
  id: string;
  user_id: string;
  species_name: string;
  status: 'reported' | 'rescued' | 'turned over' | 'released';
  latitude: number;
  longitude: number;
  barangay?: string;
  municipality?: string;
  reporter_name?: string;
  contact_number?: string;
  photo_url?: string;
  timestamp_captured: string;
  created_at: string;
  updated_at: string;
}

export interface CreateWildlifeRecord {
  species_name: string;
  status: 'reported' | 'rescued' | 'turned over' | 'released';
  latitude: number;
  longitude: number;
  barangay?: string;
  municipality?: string;
  reporter_name?: string;
  contact_number?: string;
  photo_url?: string;
  timestamp_captured: string;
}

export interface UpdateWildlifeRecord {
  species_name?: string;
  status?: 'reported' | 'rescued' | 'turned over' | 'released';
  barangay?: string;
  municipality?: string;
  reporter_name?: string;
  contact_number?: string;
  photo_url?: string;
  timestamp_captured?: string;
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

  const { data, error } = await supabase
    .from('wildlife_records')
    .insert([{
      ...record,
      user_id: user.id,
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
  const recordWithStatus = {
    ...record,
    status: 'reported' as const,
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

// Get user role
export async function getUserRole(): Promise<string | null> {
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
    return null;
  }

  return data?.role || null;
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
