import { useState, useEffect } from 'react';
import { supabase, deleteRecord } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
  loading: boolean;
  execute: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * A wrapper around Supabase queries to provide consistent error handling
 * and loading states with proper TypeScript typing.
 * 
 * @param queryFn A function that returns a Supabase query
 * @returns QueryResult object with data, error, loading state, and execute function
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  options?: { autoExecute?: boolean }
): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [loading, setLoading] = useState<boolean>(options?.autoExecute !== false);

  const execute = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await queryFn();
      
      if (error) {
        setError(error);
        console.error('Supabase query error:', error);
        setData(null);
      } else {
        setData(data);
      }
    } catch (err) {
      console.error('Unexpected error during Supabase query:', err);
      if (err instanceof Error) {
        setError({
          message: err.message,
          details: '',
          hint: '',
          code: 'UNKNOWN',
          name: 'PostgrestError'
        } as PostgrestError);
      }
    } finally {
      setLoading(false);
    }
  };

  const refetch = execute;

  useEffect(() => {
    if (options?.autoExecute !== false) {
      execute();
    }
  }, []);

  return { data, error, loading, execute, refetch };
}

type TableName = "clients" | "invoice_items" | "invoices" | "products" | "time_entries" | "news_posts" | "profiles" | "system_settings";

/**
 * Enhanced delete function with improved error handling for RLS issues.
 * 
 * @param tableName The table to delete from (must be a valid table name in the schema)
 * @param id The ID of the record to delete
 * @returns Promise with success/error status
 */
export async function deleteWithRetry(
  tableName: TableName, 
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log(`Starting deletion process for ${tableName} with ID: ${id}`);
    
    // First verify the item exists
    const { data: existingItem, error: checkError } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', id)
      .maybeSingle();
      
    if (checkError) {
      console.error(`Error checking if ${tableName} exists:`, checkError);
      return { success: false, error: `Error verifying ${tableName}: ${checkError.message}` };
    }
    
    if (!existingItem) {
      console.warn(`${tableName} with ID ${id} does not exist or was already deleted`);
      return { success: true, error: null }; // Consider it a success if already deleted
    }
    
    // Attempt direct deletion
    const result = await deleteRecord(tableName, id);
    
    if (!result.success) {
      console.error(`Failed to delete ${tableName}:`, result.error);
      
      // Special error handling for common cases
      if (result.error?.includes('violates foreign key constraint')) {
        return { 
          success: false, 
          error: `Cannot delete this ${tableName.slice(0, -1)} as it is being used by other records.` 
        };
      }
      
      return { success: false, error: result.error };
    }
    
    // Delay slightly to allow the database to process the deletion
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify deletion was successful
    const { data: verifyItem, error: verifyError } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', id)
      .maybeSingle();
      
    if (verifyError) {
      console.error(`Error verifying deletion of ${tableName}:`, verifyError);
      // We'll still check if the item exists despite the error
    }
    
    // If the item still exists after deletion attempt, there's likely an RLS issue
    if (verifyItem) {
      console.error(`Delete operation reported success but ${tableName} with ID ${id} still exists`);
      return { 
        success: false, 
        error: `Permission denied: You may not have the required permissions to delete this item.` 
      };
    }
    
    console.log(`Successfully deleted ${tableName} with ID: ${id}`);
    return { success: true, error: null };
  } catch (err) {
    console.error(`Unexpected error during ${tableName} deletion:`, err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return { success: false, error: errorMessage };
  }
}

/**
 * Helper function for handling data from Supabase queries in a type-safe way.
 * This ensures that we properly handle null or undefined data.
 * 
 * @param data The data returned from a Supabase query
 * @param defaultValue A default value to return if data is null or undefined
 * @returns The data or the default value
 */
export function safeData<T>(data: T | null | undefined, defaultValue: T): T {
  return data ?? defaultValue;
}

/**
 * Fetches profiles data for specific users
 * @param userIds Array of user IDs to fetch profiles for
 * @returns Object mapping user IDs to their profile names
 */
export async function fetchUserProfiles(userIds: string[]): Promise<Record<string, string>> {
  if (!userIds.length) return {};
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds);
      
    if (error) {
      console.error('Error fetching user profiles:', error);
      return {};
    }
    
    // Create a mapping of user ID to name
    const profileMap: Record<string, string> = {};
    data?.forEach(profile => {
      if (profile.id && profile.name) {
        profileMap[profile.id] = profile.name;
      }
    });
    
    return profileMap;
  } catch (error) {
    console.error('Unexpected error fetching profiles:', error);
    return {};
  }
}
