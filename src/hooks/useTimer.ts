
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { type UserTimerRecord } from "@/types/timer";

// Timer state hook
export function useTimer() {
  const { user } = useAuth();
  
  // Query the timer state from Supabase
  const { status, data: timer, refetch } = useQuery({
    queryKey: ["timer", user?.id],
    queryFn: async () => {
      try {
        if (!user) return null;

        // Check for any running timer
        const { data, error } = await supabase
          .from("user_timers")
          .select(`
            id, 
            user_id, 
            client_id, 
            product_id, 
            description, 
            start_time, 
            end_time, 
            status, 
            created_at, 
            updated_at
          `)
          .eq("user_id", user.id)
          .eq("status", "running")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        return data as UserTimerRecord | null;
      } catch (err) {
        console.error("Error fetching timer:", err);
        toast.error("Failed to load timer data");
        return null;
      }
    },
    enabled: !!user,
    refetchIntervalInBackground: false,
    refetchOnMount: true,
  });

  const queryClient = useQueryClient();

  // Get client data for the timer
  const { data: clientData } = useQuery({
    queryKey: ["timer-client", timer?.client_id],
    queryFn: async () => {
      if (!timer?.client_id) return null;
      
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("id", timer.client_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!timer?.client_id,
    staleTime: Infinity,
  });

  // Get product data for the timer
  const { data: productData } = useQuery({
    queryKey: ["timer-product", timer?.product_id],
    queryFn: async () => {
      if (!timer?.product_id) return null;
      
      const { data, error } = await supabase
        .from("products")
        .select("id, name, type, price")
        .eq("id", timer.product_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!timer?.product_id,
    staleTime: Infinity,
  });

  // Start a new timer
  const startTimer = useCallback(
    async (clientId: string, productId?: string, description?: string, customPrice?: number | null) => {
      try {
        if (!user) {
          toast.error("You need to be logged in to start a timer");
          return;
        }

        // First, check if there's an existing running timer
        const { data: existingTimer, error: fetchError } = await supabase
          .from("user_timers")
          .select("id, client_id")
          .eq("user_id", user.id)
          .eq("status", "running")
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingTimer) {
          // Stop the existing timer first
          await stopTimer(true);
        }

        // Start a new timer
        const newTimer = {
          user_id: user.id,
          client_id: clientId,
          product_id: productId || null,
          description: description || null,
          start_time: new Date().toISOString(),
          status: 'running' as const
        };

        const { data, error } = await supabase
          .from("user_timers")
          .insert(newTimer)
          .select()
          .single();

        if (error) throw error;

        toast.success("Timer started");
        await refetch();
        queryClient.invalidateQueries({ queryKey: ["time-entries"] });
        
        return data as UserTimerRecord;
      } catch (err) {
        console.error("Error starting timer:", err);
        toast.error("Failed to start timer");
        return null;
      }
    },
    [user, refetch, queryClient]
  );

  // Pause the current timer
  const pauseTimer = useCallback(async () => {
    try {
      if (!user || !timer) {
        toast.error("No active timer to pause");
        return null;
      }

      const { data, error } = await supabase
        .from("user_timers")
        .update({ status: "paused", updated_at: new Date().toISOString() })
        .eq("id", timer.id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Timer paused");
      await refetch();
      return data as UserTimerRecord;
    } catch (err) {
      console.error("Error pausing timer:", err);
      toast.error("Failed to pause timer");
      return null;
    }
  }, [user, timer, refetch]);

  // Resume a paused timer
  const resumeTimer = useCallback(async () => {
    try {
      if (!user || !timer) {
        toast.error("No timer to resume");
        return null;
      }

      const { data, error } = await supabase
        .from("user_timers")
        .update({ status: "running", updated_at: new Date().toISOString() })
        .eq("id", timer.id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Timer resumed");
      await refetch();
      return data as UserTimerRecord;
    } catch (err) {
      console.error("Error resuming timer:", err);
      toast.error("Failed to resume timer");
      return null;
    }
  }, [user, timer, refetch]);

  // Stop the current timer
  const stopTimer = useCallback(
    async (skipInsertion = false) => {
      try {
        if (!user || !timer) {
          toast.error("No active timer to stop");
          return null;
        }

        // Get the current time
        const endTime = new Date().toISOString();

        // Update the timer record to completed with end time
        const { data: updatedTimer, error: updateError } = await supabase
          .from("user_timers")
          .update({
            status: "completed",
            end_time: endTime,
            updated_at: new Date().toISOString(),
          })
          .eq("id", timer.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Calculate the duration in hours
        const startDate = new Date(timer.start_time);
        const endDate = new Date(endTime);
        const durationMs = endDate.getTime() - startDate.getTime();

        // Skip time entry insertion if requested (used when starting a new timer before stopping old one)
        if (!skipInsertion) {
          // Insert a time entry with the timer duration
          const timeEntry = {
            user_id: user.id,
            client_id: timer.client_id,
            start_time: timer.start_time,
            end_time: endTime,
            description: timer.description,
            product_id: timer.product_id || null
          };

          const { error: insertError } = await supabase
            .from("time_entries")
            .insert(timeEntry);

          if (insertError) throw insertError;

          toast.success("Timer stopped and time entry created");
          queryClient.invalidateQueries({ queryKey: ["time-entries"] });
        }

        await refetch();
        return updatedTimer as UserTimerRecord;
      } catch (err) {
        console.error("Error stopping timer:", err);
        toast.error("Failed to stop timer");
        return null;
      }
    },
    [user, timer, refetch, queryClient]
  );

  // Format the duration for display
  const formatDuration = (time: number) => {
    const hours = Math.floor(time / 3600000);
    const minutes = Math.floor((time % 3600000) / 60000);
    const seconds = Math.floor((time % 60000) / 1000);
    
    const padWithZero = (num: number) => num.toString().padStart(2, '0');
    
    return `${padWithZero(hours)}:${padWithZero(minutes)}:${padWithZero(seconds)}`;
  };

  // For a running timer, calculate elapsed time
  const [elapsedTime, setElapsedTime] = useState(0);
  
  useEffect(() => {
    if (!timer || timer.status !== "running") {
      setElapsedTime(0);
      return () => {};
    }
    
    // Get current elapsed time
    const calculateElapsed = () => {
      const startTime = new Date(timer.start_time).getTime();
      const now = new Date().getTime();
      return now - startTime;
    };
    
    // Set initial time
    setElapsedTime(calculateElapsed());
    
    // Update every second
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        setElapsedTime(calculateElapsed());
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [timer]);

  const formattedElapsedTime = useMemo(() => {
    return formatDuration(elapsedTime);
  }, [elapsedTime]);

  // Convert seconds to formatted time
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const padWithZero = (num: number) => num.toString().padStart(2, '0');
    
    return `${padWithZero(hours)}:${padWithZero(minutes)}:${padWithZero(remainingSeconds)}`;
  };

  // Check if the timer is currently running
  const isTimerRunning = timer?.status === "running";

  // Calculate elapsed seconds
  const elapsedSeconds = elapsedTime / 1000;
  
  // Convert timer to time entry
  const convertTimerToTimeEntry = async (timerId: string, calculatedDuration?: number, roundedDuration?: number) => {
    try {
      // Implementation will be added when needed
      return true;
    } catch (err) {
      console.error("Error converting timer to time entry:", err);
      toast.error("Failed to convert timer to time entry");
      return false;
    }
  };

  // Delete a timer
  const deleteTimer = async (timerId: string) => {
    try {
      // Implementation will be added when needed
      return true;
    } catch (err) {
      console.error("Error deleting timer:", err);
      toast.error("Failed to delete timer");
      return false;
    }
  };
  
  // Return the hook's value
  return {
    hasTimer: !!timer,
    isLoading: status === "loading",
    error: status === "error",
    timer,
    timerWithClientInfo: timer ? {
      ...timer,
      client: clientData,
      product: productData,
    } : null,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    refetchTimer: refetch,
    elapsedTime,
    formattedElapsedTime,
    // Add these properties to fix the errors in TimerWidget.tsx
    activeTimer: timer,
    isTimerRunning,
    elapsedSeconds,
    formatElapsedTime,
    convertTimerToTimeEntry,
    deleteTimer
  };
}
