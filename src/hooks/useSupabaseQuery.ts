
import { useState, useEffect } from 'react';
import { supabase, executeWithRetry } from '@/lib/supabase';
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

/**
 * Helper function specifically for delete operations that incorporates retry logic
 * and proper error handling.
 * 
 * @param table The table to delete from (must be a valid table name in the schema)
 * @param id The ID of the record to delete
 * @returns Promise with success/error status
 */
export async function deleteWithRetry(
  table: "clients" | "invoice_items" | "invoices" | "products" | "time_entries" | "news_posts" | "profiles" | "system_settings", 
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    console.log(`Attempting to delete ${table} with ID: ${id}`);
    
    // Use the executeWithRetry function which returns a Promise
    const result = await executeWithRetry(async () => {
      const response = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      return response;
    });
    
    if (result.error) {
      console.error(`Error deleting from ${table}:`, result.error);
      
      let errorMessage = result.error.message;
      
      if (result.error.code === '23503') {
        errorMessage = `Cannot delete this ${table.slice(0, -1)} as it is referenced by other records.`;
      } else if (result.error.code === '42501') {
        errorMessage = `You don't have permission to delete this ${table.slice(0, -1)}.`;
      }
      
      return { success: false, error: errorMessage };
    }
    
    console.log(`Successfully deleted ${table} with ID: ${id}`);
    return { success: true, error: null };
  } catch (err) {
    console.error(`Unexpected error during ${table} deletion:`, err);
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
