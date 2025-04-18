
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
import { useIsMobile, useIsLaptop } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();
  const isLaptop = useIsLaptop();

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

  const handleClientCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["all-clients"] });
    toast.success(t("clients.clientAdded"));
  };

  const handleTimeEntryCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["time-entries"] });
    toast.success(t("timeTracking.timeEntryAdded"));
  };

  const formattedDate = isToday(selectedDate) 
    ? t("timeTracking.today")
    : format(
        selectedDate, 
        'd MMMM yyyy', 
        { locale: language === 'sv' ? sv : undefined }
      );

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : isLaptop ? 'grid-cols-12 gap-4' : 'grid-cols-12 gap-6'}`}>
        <div className={isMobile 
          ? 'space-y-6' 
          : isLaptop 
            ? 'col-span-3 space-y-4 w-full max-w-[240px]' 
            : 'col-span-3 space-y-6 w-full max-w-[300px]'
        }>
          <DateSelector 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
            isCompact={isLaptop}
          />
          
          <TimerWidget />
        </div>
        
        <div className={isMobile 
          ? 'space-y-6 mt-6' 
          : isLaptop 
            ? 'col-span-9 space-y-4' 
            : 'col-span-9 space-y-6'
        }>
          <TimeEntryForm 
            onSuccess={handleTimeEntryCreated} 
            selectedDate={selectedDate}
            isCompact={isLaptop}
          />
          
          <TimeEntriesList 
            selectedDate={selectedDate}
            formattedDate={formattedDate}
            isCompact={isLaptop}
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
