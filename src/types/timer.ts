
export interface Timer {
  id: string;
  user_id: string;
  client_id: string;
  product_id?: string | null;
  description?: string | null;
  start_time: string;
  end_time?: string | null;
  status: 'running' | 'paused' | 'completed';
  created_at?: string;
  updated_at?: string;
}

export type TimerStatus = 'running' | 'paused' | 'completed';
