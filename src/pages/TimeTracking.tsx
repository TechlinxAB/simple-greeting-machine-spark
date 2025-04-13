
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TimeEntryForm } from "@/components/time-tracking/TimeEntryForm";
import { TimeEntriesList } from "@/components/time-tracking/TimeEntriesList";
import { DateSelector } from "@/components/time-tracking/DateSelector";
import { TimerWidget } from "@/components/time-tracking/TimerWidget";
import { ClientForm } from "@/components/clients/ClientForm";
import { Users } from "lucide-react";
import { format, isToday } from "date-fns";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

export default function TimeTracking() {
  // Initialize with current date to ensure today is selected by default
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showClientForm, setShowClientForm] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Force the calendar to properly recognize today's date as selected on initial load
  useEffect(() => {
    // Create a new Date object to force React to see this as a state change
    // This ensures the selected styling is applied correctly on initial render
    const today = new Date();
    
    // Small delay to ensure the component is fully mounted
    const timer = setTimeout(() => {
      setSelectedDate(new Date(today));
    }, 100);
    
    return () => clearTimeout(timer);
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
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex justify-end mb-4">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => setShowClientForm(true)}
          disabled={isClientsLoading}
        >
          {isClientsLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : (
            <Users className="h-4 w-4" />
          )}
          <span>Add Client</span>
        </Button>
      </div>
      
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'grid-cols-12 gap-6'}`}>
        <div className={isMobile ? 'space-y-6' : 'col-span-3 space-y-6 w-full max-w-[300px]'}>
          <DateSelector 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
          />
          
          <TimerWidget />
        </div>
        
        <div className={isMobile ? 'space-y-6 mt-6' : 'col-span-9 space-y-6'}>
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
