
export interface Timer {
  id: string;
  user_id: string;
  client_id: string;
  product_id?: string | null;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  status: TimerStatus;
  created_at?: string;
  updated_at?: string;
  _calculatedDuration?: number; // Added for component use
  _roundedDuration?: number; // Added for component use with rounded time
  custom_price?: number | null; // Added for custom pricing
  rounded_duration_minutes?: number; // Store the rounded duration in minutes
  
  // Added to store original time values
  original_start_time?: string | null;
  original_end_time?: string | null;
}

export type TimerStatus = 'running' | 'paused' | 'completed';

// Adding a more specific type for our DB operations
export interface UserTimerRecord {
  id: string;
  user_id: string;
  client_id: string;
  product_id?: string | null;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  status: TimerStatus;
  created_at?: string;
  updated_at?: string;
  custom_price?: number | null; // Added for custom pricing
  rounded_duration_minutes?: number; // Store the rounded duration in minutes
  
  // Added to store original time values
  original_start_time?: string | null;
  original_end_time?: string | null;
}
