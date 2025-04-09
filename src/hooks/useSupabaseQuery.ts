
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
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
        // Create a PostgrestError-like object for consistency
        // Include the 'name' property that was missing before
        setError({
          message: err.message,
          details: '',
          hint: '',
          code: 'UNKNOWN',
          name: 'PostgrestError' // Add the missing name property
        } as PostgrestError);
      }
    } finally {
      setLoading(false);
    }
  };

  // Alias for execute to match React Query naming conventions
  const refetch = execute;

  // Auto-execute query on mount if not disabled
  useEffect(() => {
    if (options?.autoExecute !== false) {
      execute();
    }
  }, []);

  return { data, error, loading, execute, refetch };
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
