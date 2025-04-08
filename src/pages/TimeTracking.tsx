
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { TimeEntryForm } from "@/components/time-tracking/TimeEntryForm";
import { TimeEntriesList } from "@/components/time-tracking/TimeEntriesList";
import { ClientForm } from "@/components/clients/ClientForm";
import { Plus, Users } from "lucide-react";

export default function TimeTracking() {
  const [showClientForm, setShowClientForm] = useState(false);
  const queryClient = useQueryClient();

  const handleClientCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const handleTimeEntryCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["time-entries"] });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Time Tracking</h1>
        
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => setShowClientForm(true)}
        >
          <Users className="h-4 w-4" />
          <span>Add Client</span>
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-[350px,1fr]">
        <div>
          <TimeEntryForm onSuccess={handleTimeEntryCreated} />
        </div>
        
        <div>
          <TimeEntriesList />
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
