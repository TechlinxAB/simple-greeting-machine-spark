
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

interface QueryResult<T> {
  data: T | null;
  error: PostgrestError | null;
  loading: boolean;
  execute: () => Promise<void>;
}

/**
 * A wrapper around Supabase queries to provide consistent error handling
 * and loading states with proper TypeScript typing.
 * 
 * @param queryFn A function that returns a Supabase query
 * @returns QueryResult object with data, error, loading state, and execute function
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>
): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<PostgrestError | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const execute = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await queryFn();
      
      if (error) {
        setError(error);
        console.error('Supabase query error:', error);
      } else {
        setData(data);
      }
    } catch (err) {
      console.error('Unexpected error during Supabase query:', err);
    } finally {
      setLoading(false);
    }
  };

  return { data, error, loading, execute };
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
