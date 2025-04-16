
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TimeEntryForm } from "@/components/time-tracking/TimeEntryForm";
import { TimeEntriesList } from "@/components/time-tracking/TimeEntriesList";
import { DateSelector } from "@/components/time-tracking/DateSelector";
import { TimerWidget } from "@/components/time-tracking/TimerWidget";
import { ClientForm } from "@/components/clients/ClientForm";
import { format, isToday } from "date-fns";
import { toast } from "sonner";
import { useIsMobile, useIsSmallScreen } from "@/hooks/use-mobile";

export default function TimeTracking() {
  // Initialize with a stable Date object for today to prevent unnecessary rerenders
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [showClientForm, setShowClientForm] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const isSmallScreen = useIsSmallScreen();

  // Use a strong initialization approach that forces the calendar to update
  useEffect(() => {
    // Force an immediate update
    const today = new Date();
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setSelectedDate(normalizedToday);

    // Then follow up with additional updates to ensure proper rendering
    const timer1 = setTimeout(() => {
      const refreshToday = new Date();
      setSelectedDate(new Date(refreshToday.getFullYear(), refreshToday.getMonth(), refreshToday.getDate()));
    }, 50);

    const timer2 = setTimeout(() => {
      const refreshToday = new Date();
      setSelectedDate(new Date(refreshToday.getFullYear(), refreshToday.getMonth(), refreshToday.getDate()));
    }, 150);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Refetch clients data when the component mounts to ensure data freshness
  const { isLoading: isClientsLoading } = useQuery({
    queryKey: ["clients"],
    staleTime: 15000, // Consider data stale after 15 seconds
    refetchOnMount: "always", // Always refetch on component mount
  });

  const handleClientCreated = () => {
    // Invalidate the clients query to force refresh
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["all-clients"] });
    toast.success("Client created successfully. Client list refreshed.");
  };

  const handleTimeEntryCreated = () => {
    // Invalidate the time entries query to force refresh
    queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    toast.success("Time entry recorded successfully.");
  };

  const formattedDate = isToday(selectedDate) 
    ? "today" 
    : format(selectedDate, "d MMMM yyyy");

  return (
    <div className="container mx-auto py-4 px-4 max-w-screen-xl">
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-12 gap-6'}`}>
        <div className={isMobile ? 'space-y-4' : 'col-span-3 space-y-4'}>
          <DateSelector 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
          />
          
          <TimerWidget />
        </div>
        
        <div className={isMobile ? 'space-y-4 mt-4' : 'col-span-9 space-y-4'}>
          <TimeEntryForm 
            onSuccess={handleTimeEntryCreated} 
            selectedDate={selectedDate}
          />
          
          <TimeEntriesList 
            selectedDate={selectedDate}
            formattedDate={formattedDate}
          />
        </div>
      </div>
      
      <ClientForm 
        open={showClientForm} 
        onOpenChange={setShowClientForm} 
        onSuccess={handleClientCreated}
      />
    </div>
  );
}
