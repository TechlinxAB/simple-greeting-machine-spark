import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Timer, TimerStatus } from "@/types/timer";
import { toast } from "sonner";
import { differenceInSeconds } from "date-fns";

export const useTimer = () => {
  const { user } = useAuth();
  const [activeTimer, setActiveTimer] = useState<Timer | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load existing timer for the user
  useEffect(() => {
    const loadExistingTimer = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from("user_timers")
          .select("*")
          .eq("user_id", user.id)
          .in("status", ["running", "paused"])
          .order("start_time", { ascending: false })
          .limit(1);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          const timer = data[0] as unknown as Timer;
          setActiveTimer(timer);
          setIsTimerRunning(timer.status === "running");
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading timer:", error);
        setIsLoading(false);
      }
    };

    loadExistingTimer();
  }, [user]);

  // Update elapsed time counter
  useEffect(() => {
    if (!activeTimer || !isTimerRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      const startTime = new Date(activeTimer.start_time);
      const pauseDuration = activeTimer.end_time 
        ? differenceInSeconds(new Date(activeTimer.end_time), startTime) 
        : 0;
      
      const now = new Date();
      const totalSeconds = differenceInSeconds(now, startTime);
      setElapsedSeconds(pauseDuration > 0 ? pauseDuration : totalSeconds);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [activeTimer, isTimerRunning]);

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    const padZero = (num: number) => num.toString().padStart(2, '0');
    
    return `${padZero(hours)}:${padZero(minutes)}:${padZero(remainingSeconds)}`;
  };

  // Start a new timer
  const startTimer = async (clientId: string, productId: string, description?: string, customPrice?: number | null) => {
    if (!user) {
      toast.error("You must be logged in to start a timer");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_timers")
        .insert({
          user_id: user.id,
          client_id: clientId,
          product_id: productId,
          description: description || null,
          status: "running" as TimerStatus,
          custom_price: customPrice || null
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setActiveTimer(data as Timer);
      setIsTimerRunning(true);
      setElapsedSeconds(0);
    } catch (error) {
      console.error("Error starting timer:", error);
      toast.error("Failed to start timer");
    }
  };

  // Pause the active timer
  const pauseTimer = async () => {
    if (!activeTimer || !user) return;

    try {
      const { error } = await supabase
        .from("user_timers")
        .update({
          status: "paused" as TimerStatus,
          end_time: new Date().toISOString(),
        })
        .eq("id", activeTimer.id);

      if (error) {
        throw error;
      }

      setIsTimerRunning(false);
      setActiveTimer({
        ...activeTimer,
        status: "paused" as TimerStatus,
        end_time: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error pausing timer:", error);
      toast.error("Failed to pause timer");
    }
  };

  // Resume the paused timer
  const resumeTimer = async () => {
    if (!activeTimer || !user) return;

    try {
      const { error } = await supabase
        .from("user_timers")
        .update({
          status: "running" as TimerStatus,
          end_time: null,
        })
        .eq("id", activeTimer.id);

      if (error) {
        throw error;
      }

      setIsTimerRunning(true);
      setActiveTimer({
        ...activeTimer,
        status: "running" as TimerStatus,
        end_time: null,
      });
    } catch (error) {
      console.error("Error resuming timer:", error);
      toast.error("Failed to resume timer");
    }
  };

  // Stop the active timer
  const stopTimer = async () => {
    if (!activeTimer || !user) return null;

    try {
      const endTime = new Date().toISOString();
      const { error } = await supabase
        .from("user_timers")
        .update({
          status: "completed" as TimerStatus,
          end_time: endTime,
        })
        .eq("id", activeTimer.id);

      if (error) {
        throw error;
      }

      // Calculate actual elapsed time in seconds
      const startTime = new Date(activeTimer.start_time);
      const end = new Date(endTime);
      const calculatedDuration = differenceInSeconds(end, startTime);
      
      // Calculate rounded time for billable purposes
      // Implement rounding logic: round up to nearest 15-minute mark
      const durationMinutes = calculatedDuration / 60;
      let roundedMinutes: number;
      
      if (durationMinutes <= 15) {
        roundedMinutes = 15;
      } else {
        // Round up to the next 15-minute increment
        roundedMinutes = Math.ceil(durationMinutes / 15) * 15;
      }
      
      const roundedDuration = roundedMinutes * 60;
      
      const completedTimer = {
        ...activeTimer,
        status: "completed" as TimerStatus,
        end_time: endTime,
        _calculatedDuration: calculatedDuration,
        _roundedDuration: roundedDuration
      };
      
      setActiveTimer(null);
      setIsTimerRunning(false);
      setElapsedSeconds(0);
      
      return completedTimer;
    } catch (error) {
      console.error("Error stopping timer:", error);
      toast.error("Failed to stop timer");
      return null;
    }
  };
  
  // Fixed version of convertTimerToTimeEntry function
  const convertTimerToTimeEntry = async (timerId: string, actualDuration?: number, roundedDuration?: number) => {
    if (!user) return false;
    
    try {
      // Get the timer details
      const { data: timerData, error: timerError } = await supabase
        .from("user_timers")
        .select("*")
        .eq("id", timerId)
        .single();
      
      if (timerError) throw timerError;
      
      if (!timerData.start_time || !timerData.end_time) {
        throw new Error("Timer does not have valid start/end times");
      }
      
      // Store original times for reference
      const originalStartTime = timerData.start_time;
      const originalEndTime = timerData.end_time;
      
      // Create the time entry (using rounded duration)
      const { error: insertError } = await supabase
        .from("time_entries")
        .insert({
          user_id: timerData.user_id,
          client_id: timerData.client_id,
          product_id: timerData.product_id,
          description: timerData.description,
          custom_price: timerData.custom_price ?? null, // Using nullish coalescing to handle undefined
          start_time: originalStartTime,
          end_time: originalEndTime,
          original_start_time: originalStartTime,
          original_end_time: originalEndTime,
        });
      
      if (insertError) throw insertError;
      
      // Delete the timer
      const { error: deleteError } = await supabase
        .from("user_timers")
        .delete()
        .eq("id", timerId);
      
      if (deleteError) throw deleteError;
      
      toast.success("Timer converted to time entry");
      return true;
    } catch (error) {
      console.error("Error converting timer to time entry:", error);
      toast.error("Failed to convert timer to time entry");
      return false;
    }
  };
  
  // Delete a timer
  const deleteTimer = async (timerId: string) => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from("user_timers")
        .delete()
        .eq("id", timerId);
      
      if (error) throw error;
      
      toast.success("Timer deleted");
      return true;
    } catch (error) {
      console.error("Error deleting timer:", error);
      toast.error("Failed to delete timer");
      return false;
    }
  };

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
};
