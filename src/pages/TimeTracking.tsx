
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TimeEntryForm } from "@/components/time-tracking/TimeEntryForm";
import { TimeEntriesList } from "@/components/time-tracking/TimeEntriesList";
import { DateSelector } from "@/components/time-tracking/DateSelector";
import { TimerWidget } from "@/components/time-tracking/TimerWidget";
import { ClientForm } from "@/components/clients/ClientForm";
import { Users, Menu } from "lucide-react";
import { format, isToday } from "date-fns";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { AppSidebar } from "@/components/AppSidebar";
import { useSidebar } from "@/components/ui/sidebar";

export default function TimeTracking() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showClientForm, setShowClientForm] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();

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

  const MobileSidebarTrigger = () => {
    if (!isMobile) return null;
    
    // Use Drawer component for iOS
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      return (
        <Drawer open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <DrawerTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden fixed top-4 left-4 z-40"
            >
              <Menu />
              <span className="sr-only">Open menu</span>
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-[85vh] bg-sidebar-background text-sidebar-foreground p-0">
            <AppSidebar />
          </DrawerContent>
        </Drawer>
      );
    }
    
    // Use Sheet component for other mobile devices
    return (
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden fixed top-4 left-4 z-40"
          >
            <Menu />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent 
          side="left" 
          className="p-0 w-[80vw] sm:w-[300px] z-50 bg-sidebar-background text-sidebar-foreground"
        >
          <AppSidebar />
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <MobileSidebarTrigger />

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
        <div className={isMobile ? 'space-y-6' : 'col-span-3 space-y-6'}>
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
