
import { useState } from "react";
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

export default function TimeTracking() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showClientForm, setShowClientForm] = useState(false);
  const queryClient = useQueryClient();

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
    <div className="container mx-auto py-6">
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
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3 space-y-6">
          <DateSelector 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
          />
          
          <TimerWidget />
        </div>
        
        <div className="col-span-9 space-y-6">
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
