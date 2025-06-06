
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Timer, UserTimerRecord } from '@/types/timer';
import { toast } from 'sonner';
import { roundTimeToInterval } from "@/lib/formatTime";

/**
 * Rounds up seconds to the nearest 15-minute interval
 * Following these rules:
 * - Time under 15 minutes = 15 minutes
 * - Time under 30 minutes but 16 or more minutes = 30 minutes
 * - Time under 45 minutes but 31 or more minutes = 45 minutes
 * - Time under 60 minutes but 45 or more minutes = 60 minutes
 * - Time over 60 minutes follows the same pattern for each hour
 */
function roundUpToInterval(seconds: number): number {
  // Ensure we have at least 15 minutes (900 seconds)
  if (seconds < 900) {
    return 900; // Minimum 15 minutes
  }
  
  // Calculate minutes
  const minutes = seconds / 60;
  
  // Get the remainder minutes in the current hour
  const remainderMinutes = minutes % 60;
  
  // Round up to the next interval
  let roundedMinutes;
  if (remainderMinutes <= 15) {
    roundedMinutes = 15;
  } else if (remainderMinutes <= 30) {
    roundedMinutes = 30;
  } else if (remainderMinutes <= 45) {
    roundedMinutes = 45;
  } else {
    roundedMinutes = 60;
  }
  
  // Calculate full hours and add the rounded minutes
  const hours = Math.floor(minutes / 60);
  const totalRoundedMinutes = (hours * 60) + roundedMinutes;
  
  // Convert back to seconds
  return totalRoundedMinutes * 60;
}

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
          
        if (error) {
          console.error("Error fetching timer:", error);
          return null;
        }
        
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
  const startTimer = async (clientId: string, productId: string, description?: string, customPrice?: number | null) => {
    if (!user) {
      toast.error('You must be logged in to use the timer');
      return null;
    }

    try {
      console.log("Starting timer with custom price:", customPrice);
      
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
          custom_price: customPrice, // Ensure we save the custom price
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

  // Stop the timer completely - with rounding
  const stopTimer = async () => {
    if (!activeTimer || !user) return null;

    try {
      const currentTime = new Date();
      let finalEndTime: Date;
      let finalElapsedSeconds: number;
      let roundedElapsedSeconds: number;
      
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
      
      // Round up to the nearest 15-minute interval
      roundedElapsedSeconds = roundUpToInterval(finalElapsedSeconds);
      
      // Only update end_time in the database, not the rounded value
      // The rounding is applied when converting to time entry
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
      
      // Create a new Timer object with the updated status, calculated time and rounded time
      const completedTimer = { 
        ...activeTimer, 
        status: 'completed', 
        end_time: finalEndTime.toISOString(),
        _calculatedDuration: finalElapsedSeconds,
        _roundedDuration: roundedElapsedSeconds // Store the rounded duration
      } as Timer & { _calculatedDuration: number; _roundedDuration: number };
      
      return completedTimer;
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error('Failed to stop timer');
      return null;
    }
  };

  // Convert the timer to a time entry - using rounded time
  const convertTimerToTimeEntry = async (timerId: string, calculatedDuration?: number, roundedDuration?: number) => {
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
      const startTime = new Date(timerRecord.start_time);
      const endTimeRecord = timerRecord.end_time ? new Date(timerRecord.end_time) : new Date();
      
      // Store the original start and end times
      const originalStartTime = startTime.toISOString();
      const originalEndTime = endTimeRecord.toISOString();
      
      // Calculate the rounded end time based on the duration
      let endTime = endTimeRecord;
      
      if (roundedDuration) {
        // Create a new end time based on the rounded duration
        endTime = new Date(startTime.getTime() + (roundedDuration * 1000));
      }
      
      console.log("Timer record custom price before insert:", timerRecord.custom_price);
      
      // Create the time entry with both original and rounded times
      // Ensure we pass the custom price from the timer record
      const { error: insertError } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          client_id: timerRecord.client_id,
          product_id: timerRecord.product_id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          original_start_time: originalStartTime,
          original_end_time: originalEndTime,
          description: timerRecord.description,
          // Explicitly set the custom_price from the timer record
          custom_price: timerRecord.custom_price,
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
