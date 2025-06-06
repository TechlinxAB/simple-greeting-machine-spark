import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TimeEntryForm } from "@/components/time-tracking/TimeEntryForm";
import { TimeEntriesList } from "@/components/time-tracking/TimeEntriesList";
import { DateSelector } from "@/components/time-tracking/DateSelector";
import { TimerWidget } from "@/components/time-tracking/TimerWidget";
import { ClientForm } from "@/components/clients/ClientForm";
import { format, isToday } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";
import { useResponsiveLayout } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TimeTracking() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [showClientForm, setShowClientForm] = useState(false);
  const queryClient = useQueryClient();
  const { isMobile, isTablet, isDesktop } = useResponsiveLayout();

  // Debug logging
  useEffect(() => {
    console.log('Layout detection:', { isMobile, isTablet, isDesktop });
  }, [isMobile, isTablet, isDesktop]);

  useEffect(() => {
    const today = new Date();
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setSelectedDate(normalizedToday);

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

  const { isLoading: isClientsLoading } = useQuery({
    queryKey: ["clients"],
    staleTime: 15000,
    refetchOnMount: "always",
  });
  
  // When the selected date changes, invalidate the time entries query
  useEffect(() => {
    const dateString = format(selectedDate, "yyyy-MM-dd");
    queryClient.invalidateQueries({ queryKey: ["time-entries", dateString] });
  }, [selectedDate, queryClient]);

  const handleClientCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["all-clients"] });
    toast.success(t("clients.clientAdded"));
  };

  const handleTimeEntryCreated = () => {
    const dateString = format(selectedDate, "yyyy-MM-dd");
    queryClient.invalidateQueries({ queryKey: ["time-entries", dateString] });
    toast.success(t("timeTracking.timeEntryAdded"));
  };

  const formattedDate = isToday(selectedDate) 
    ? t("timeTracking.today")
    : format(
        selectedDate, 
        'd MMMM yyyy', 
        { locale: language === 'sv' ? sv : undefined }
      );

  // Mobile layout: Everything stacked vertically
  if (isMobile) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="space-y-6">
          <DateSelector 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
            isCompact={true}
          />
          
          <TimerWidget />
          
          <TimeEntryForm 
            onSuccess={handleTimeEntryCreated} 
            selectedDate={selectedDate}
            isCompact={true}
          />
          
          <TimeEntriesList 
            selectedDate={selectedDate}
            formattedDate={formattedDate}
            isCompact={true}
          />
        </div>
        
        <ClientForm 
          open={showClientForm} 
          onOpenChange={setShowClientForm} 
          onSuccess={handleClientCreated}
        />
      </div>
    );
  }

  // Tablet layout: Calendar and timer on top row, form below
  if (isTablet) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="space-y-6">
          {/* Top row: Calendar and Timer side by side with responsive sizing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="w-full">
              <DateSelector 
                selectedDate={selectedDate} 
                onDateChange={setSelectedDate} 
                isCompact={false}
              />
            </div>
            
            <div className="w-full">
              <TimerWidget />
            </div>
          </div>
          
          {/* Bottom section: Time Entry Form and List */}
          <div className="space-y-6">
            <TimeEntryForm 
              onSuccess={handleTimeEntryCreated} 
              selectedDate={selectedDate}
              isCompact={false}
            />
            
            <TimeEntriesList 
              selectedDate={selectedDate}
              formattedDate={formattedDate}
              isCompact={false}
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

  // Desktop layout: Side by side with responsive scaling
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex gap-6">
        {/* Left sidebar: Calendar and Timer with responsive width */}
        <div className="w-full max-w-[clamp(280px,25vw,350px)] flex-shrink-0 space-y-6">
          <DateSelector 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
            isCompact={false}
          />
          
          <TimerWidget />
        </div>
        
        {/* Right content: Forms and entries */}
        <div className="flex-1 min-w-0 space-y-6">
          <TimeEntryForm 
            onSuccess={handleTimeEntryCreated} 
            selectedDate={selectedDate}
            isCompact={false}
          />
          
          <TimeEntriesList 
            selectedDate={selectedDate}
            formattedDate={formattedDate}
            isCompact={false}
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
