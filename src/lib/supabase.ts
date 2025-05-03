// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// These should be environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Type definition for our users table
export type UserProfile = {
  id: string;
  fid?: number;
  spotify_id?: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
};

// Create a single supabase client for the entire app
export const supabase = createClient<{
  public: {
    Tables: {
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}>(supabaseUrl, supabaseAnonKey);

// Helper functions for user profile management
export async function getUserByFid(fid: number) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('fid', fid)
    .single();
  
  if (error) {
    console.error('Error fetching user by FID:', error);
    return null;
  }
  
  return data;
}

export async function getUserBySpotifyId(spotifyId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('spotify_id', spotifyId)
    .single();
  
  if (error) {
    console.error('Error fetching user by Spotify ID:', error);
    return null;
  }
  
  return data;
}

export async function createOrUpdateUser({
  fid,
  spotifyId,
  displayName,
}: {
  fid?: number;
  spotifyId?: string;
  displayName?: string;
}) {
  // First check if a user with either FID or Spotify ID exists
  let existingUser = null;
  
  if (fid) {
    existingUser = await getUserByFid(fid);
  }
  
  if (!existingUser && spotifyId) {
    existingUser = await getUserBySpotifyId(spotifyId);
  }
  
  if (existingUser) {
    // Update existing user
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...(fid && { fid }),
        ...(spotifyId && { spotify_id: spotifyId }),
        ...(displayName && { display_name: displayName }),
      })
      .eq('id', existingUser.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating user:', error);
      throw error;
    }
    
    return data;
  } else {
    // Create new user
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        fid,
        spotify_id: spotifyId,
        display_name: displayName,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      throw error;
    }
    
    return data;
  }
}

export async function linkAccounts(fid: number, spotifyId: string) {
  // First check if these accounts are already linked
  const fidUser = await getUserByFid(fid);
  const spotifyUser = await getUserBySpotifyId(spotifyId);
  
  if (fidUser && spotifyUser) {
    if (fidUser.id === spotifyUser.id) {
      // Already linked
      return fidUser;
    } else {
      // We have two separate accounts that need to be merged
      // In this case, we'll update the FID account with Spotify info
      // and delete the Spotify-only account
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          spotify_id: spotifyId,
          display_name: spotifyUser.display_name || fidUser.display_name,
        })
        .eq('id', fidUser.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error linking accounts:', error);
        throw error;
      }
      
      // Delete the now-redundant Spotify account
      await supabase
        .from('user_profiles')
        .delete()
        .eq('id', spotifyUser.id);
      
      return data;
    }
  } else if (fidUser) {
    // Update FID user with Spotify ID
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        spotify_id: spotifyId,
      })
      .eq('id', fidUser.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error linking Spotify to FID account:', error);
      throw error;
    }
    
    return data;
  } else if (spotifyUser) {
    // Update Spotify user with FID
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        fid,
      })
      .eq('id', spotifyUser.id)
      .select()
      .single();
    
    if (error) {
      console.error('Error linking FID to Spotify account:', error);
      throw error;
    }
    
    return data;
  } else {
    // Neither account exists, create new linked account
    return createOrUpdateUser({ fid, spotifyId });
  }
}
