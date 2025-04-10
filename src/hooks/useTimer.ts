
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Timer, UserTimerRecord } from '@/types/timer';
import { toast } from 'sonner';

export function useTimer() {
  const { user } = useAuth();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [pausedDuration, setPausedDuration] = useState(0);
  const queryClient = useQueryClient();

  // Fetch active timer for the current user
  const { data: activeTimer, isLoading } = useQuery({
    queryKey: ['active-timer', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      try {
        // The TypeScript error is happening because TypeScript doesn't know about the user_timers table
        // We'll use a type assertion to work around this
        const { data, error } = await supabase
          .from('user_timers')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['running', 'paused'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (error) throw error;
        
        // Type assertion to make TypeScript happy
        return data as UserTimerRecord | null;
      } catch (error) {
        console.error('Error fetching timer:', error);
        return null;
      }
    },
    enabled: !!user,
  });

  // Calculate elapsed time when component mounts or timer changes
  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0);
      setIsTimerRunning(false);
      setStartTimestamp(null);
      setPausedDuration(0);
      return;
    }

    const startTime = new Date(activeTimer.start_time).getTime();
    const now = new Date().getTime();
    
    if (activeTimer.status === 'running') {
      setIsTimerRunning(true);
      setStartTimestamp(startTime);
      setElapsedSeconds(Math.floor((now - startTime) / 1000));
    } else if (activeTimer.status === 'paused' && activeTimer.end_time) {
      setIsTimerRunning(false);
      const endTime = new Date(activeTimer.end_time).getTime();
      const pausedElapsedSeconds = Math.floor((endTime - startTime) / 1000);
      setElapsedSeconds(pausedElapsedSeconds);
      setPausedDuration(pausedElapsedSeconds);
      setStartTimestamp(startTime);
    }
  }, [activeTimer]);

  // Update elapsed time every second when timer is running
  useEffect(() => {
    let intervalId: number;
    
    if (isTimerRunning && startTimestamp) {
      intervalId = window.setInterval(() => {
        const now = new Date().getTime();
        setElapsedSeconds(Math.floor((now - startTimestamp) / 1000));
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTimerRunning, startTimestamp]);

  // Start a new timer
  const startTimer = async (clientId: string, productId: string, description?: string) => {
    if (!user) {
      toast.error('You must be logged in to use the timer');
      return null;
    }

    try {
      // Using a type assertion for the insert operation
      const { data, error } = await supabase
        .from('user_timers')
        .insert({
          user_id: user.id,
          client_id: clientId,
          product_id: productId,
          description: description || null,
          status: 'running',
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      
      setIsTimerRunning(true);
      setElapsedSeconds(0);
      setStartTimestamp(new Date().getTime());
      setPausedDuration(0);
      
      queryClient.invalidateQueries({ queryKey: ['active-timer', user.id] });
      toast.success('Timer started');
      
      return data as Timer;
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error('Failed to start timer');
      return null;
    }
  };

  // Pause the active timer
  const pauseTimer = async () => {
    if (!activeTimer || !user) return;

    try {
      const currentTime = new Date();
      const { error } = await supabase
        .from('user_timers')
        .update({
          status: 'paused',
          end_time: currentTime.toISOString(),
          updated_at: currentTime.toISOString(),
        })
        .eq('id', activeTimer.id);

      if (error) throw error;
      
      setIsTimerRunning(false);
      setPausedDuration(elapsedSeconds);
      
      queryClient.invalidateQueries({ queryKey: ['active-timer', user.id] });
      toast.success('Timer paused');
    } catch (error) {
      console.error('Error pausing timer:', error);
      toast.error('Failed to pause timer');
    }
  };

  // Resume a paused timer
  const resumeTimer = async () => {
    if (!activeTimer || !user || activeTimer.status !== 'paused') return;

    try {
      const currentTime = new Date();
      // Calculate a new start time that accounts for the already elapsed time
      const originalStartTime = new Date(activeTimer.start_time);
      const elapsedMs = pausedDuration * 1000;
      const newStartTime = new Date(currentTime.getTime() - elapsedMs);
      
      // Update the timer status and adjust the start_time
      const { error } = await supabase
        .from('user_timers')
        .update({
          status: 'running',
          start_time: newStartTime.toISOString(),
          end_time: null,
          updated_at: currentTime.toISOString(),
        })
        .eq('id', activeTimer.id);

      if (error) throw error;
      
      setIsTimerRunning(true);
      setStartTimestamp(newStartTime.getTime());
      
      queryClient.invalidateQueries({ queryKey: ['active-timer', user.id] });
      toast.success('Timer resumed');
    } catch (error) {
      console.error('Error resuming timer:', error);
      toast.error('Failed to resume timer');
    }
  };

  // Stop the timer completely
  const stopTimer = async () => {
    if (!activeTimer || !user) return null;

    try {
      const currentTime = new Date();
      let finalEndTime: Date;
      let finalElapsedSeconds: number;
      
      if (activeTimer.status === 'running') {
        finalEndTime = currentTime;
        const startTime = new Date(activeTimer.start_time).getTime();
        finalElapsedSeconds = Math.floor((finalEndTime.getTime() - startTime) / 1000);
      } else if (activeTimer.status === 'paused' && activeTimer.end_time) {
        // For paused timers, use the existing end_time
        finalEndTime = new Date(activeTimer.end_time);
        const startTime = new Date(activeTimer.start_time).getTime();
        finalElapsedSeconds = Math.floor((finalEndTime.getTime() - startTime) / 1000);
      } else {
        // Fallback, should not happen
        finalEndTime = currentTime;
        finalElapsedSeconds = elapsedSeconds;
      }
      
      const { error } = await supabase
        .from('user_timers')
        .update({
          status: 'completed',
          end_time: finalEndTime.toISOString(),
          updated_at: currentTime.toISOString(),
        })
        .eq('id', activeTimer.id);

      if (error) throw error;
      
      setIsTimerRunning(false);
      
      queryClient.invalidateQueries({ queryKey: ['active-timer', user.id] });
      toast.success('Timer stopped');
      
      // Create a new Timer object with the updated status and calculated time
      const completedTimer = { 
        ...activeTimer, 
        status: 'completed', 
        end_time: finalEndTime.toISOString(),
        _calculatedDuration: finalElapsedSeconds // Adding for component use
      } as Timer & { _calculatedDuration: number };
      
      return completedTimer;
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error('Failed to stop timer');
      return null;
    }
  };

  // Convert the timer to a time entry
  const convertTimerToTimeEntry = async (timerId: string, calculatedDuration?: number) => {
    if (!user) return false;

    try {
      // First get the timer data with a type assertion
      const { data: timer, error: fetchError } = await supabase
        .from('user_timers')
        .select('*')
        .eq('id', timerId)
        .single();

      if (fetchError) throw fetchError;
      
      // Cast to our expected type
      const timerRecord = timer as UserTimerRecord;
      
      if (!timerRecord || !timerRecord.client_id || !timerRecord.product_id) {
        toast.error('Timer data is incomplete');
        return false;
      }
      
      // Ensure we have end_time, either from record or current time
      const endTime = timerRecord.end_time || new Date().toISOString();
      
      // Create the time entry
      const { error: insertError } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          client_id: timerRecord.client_id,
          product_id: timerRecord.product_id,
          start_time: timerRecord.start_time,
          end_time: endTime,
          description: timerRecord.description,
        });

      if (insertError) throw insertError;
      
      // Delete the timer
      const { error: deleteError } = await supabase
        .from('user_timers')
        .delete()
        .eq('id', timerId);

      if (deleteError) throw deleteError;
      
      queryClient.invalidateQueries({ queryKey: ['active-timer', user.id] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      toast.success('Timer converted to time entry');
      
      return true;
    } catch (error) {
      console.error('Error converting timer to time entry:', error);
      toast.error('Failed to convert timer to time entry');
      return false;
    }
  };

  // Delete a timer
  const deleteTimer = async (timerId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_timers')
        .delete()
        .eq('id', timerId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['active-timer', user.id] });
      toast.success('Timer deleted');
      
      return true;
    } catch (error) {
      console.error('Error deleting timer:', error);
      toast.error('Failed to delete timer');
      return false;
    }
  };

  // Format seconds to HH:MM:SS
  const formatElapsedTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  }, []);

  return {
    activeTimer,
    isLoading,
    isTimerRunning,
    elapsedSeconds,
    formatElapsedTime,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    convertTimerToTimeEntry,
    deleteTimer
  };
}
