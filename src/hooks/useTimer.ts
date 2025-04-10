
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Timer } from '@/types/timer';
import { toast } from 'sonner';

export function useTimer() {
  const { user } = useAuth();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const queryClient = useQueryClient();

  // Fetch active timer for the current user
  const { data: activeTimer, isLoading } = useQuery({
    queryKey: ['active-timer', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      try {
        const { data, error } = await supabase
          .from('user_timers')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['running', 'paused'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (error) throw error;
        return data as Timer | null;
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
      return;
    }

    const startTime = new Date(activeTimer.start_time).getTime();
    const endTime = activeTimer.end_time ? new Date(activeTimer.end_time).getTime() : null;
    const now = new Date().getTime();
    
    if (activeTimer.status === 'running') {
      setIsTimerRunning(true);
      setElapsedSeconds(Math.floor((now - startTime) / 1000));
    } else if (activeTimer.status === 'paused' && endTime) {
      setIsTimerRunning(false);
      setElapsedSeconds(Math.floor((endTime - startTime) / 1000));
    }
  }, [activeTimer]);

  // Update elapsed time every second when timer is running
  useEffect(() => {
    let intervalId: number;
    
    if (isTimerRunning) {
      intervalId = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTimerRunning]);

  // Start a new timer
  const startTimer = async (clientId: string, productId: string, description?: string) => {
    if (!user) {
      toast.error('You must be logged in to use the timer');
      return null;
    }

    try {
      // Create a new timer
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
      const { error } = await supabase
        .from('user_timers')
        .update({
          status: 'paused',
          end_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeTimer.id);

      if (error) throw error;
      
      setIsTimerRunning(false);
      
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
      // Update the timer status and remove end_time
      const { error } = await supabase
        .from('user_timers')
        .update({
          status: 'running',
          end_time: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeTimer.id);

      if (error) throw error;
      
      setIsTimerRunning(true);
      
      queryClient.invalidateQueries({ queryKey: ['active-timer', user.id] });
      toast.success('Timer resumed');
    } catch (error) {
      console.error('Error resuming timer:', error);
      toast.error('Failed to resume timer');
    }
  };

  // Stop the timer completely
  const stopTimer = async () => {
    if (!activeTimer || !user) return;

    try {
      const { error } = await supabase
        .from('user_timers')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeTimer.id);

      if (error) throw error;
      
      setIsTimerRunning(false);
      
      queryClient.invalidateQueries({ queryKey: ['active-timer', user.id] });
      toast.success('Timer stopped');
      
      return { ...activeTimer, status: 'completed', end_time: new Date().toISOString() } as Timer;
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error('Failed to stop timer');
      return null;
    }
  };

  // Convert the timer to a time entry
  const convertTimerToTimeEntry = async (timerId: string) => {
    if (!user) return false;

    try {
      // First get the timer data
      const { data: timer, error: fetchError } = await supabase
        .from('user_timers')
        .select('*')
        .eq('id', timerId)
        .single();

      if (fetchError) throw fetchError;
      
      if (!timer.end_time || !timer.client_id || !timer.product_id) {
        toast.error('Timer data is incomplete');
        return false;
      }
      
      // Create the time entry
      const { error: insertError } = await supabase
        .from('time_entries')
        .insert({
          user_id: user.id,
          client_id: timer.client_id,
          product_id: timer.product_id,
          start_time: timer.start_time,
          end_time: timer.end_time,
          description: timer.description,
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
