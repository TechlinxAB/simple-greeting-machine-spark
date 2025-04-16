
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimeEntriesTable } from "@/components/administration/TimeEntriesTable";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2, AlertCircle } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";
import { MonthYearSelector } from "@/components/administration/MonthYearSelector";
import { UserSelect } from "@/components/administration/UserSelect";
import { toast } from "sonner";
import { AllTimeToggle } from "@/components/administration/AllTimeToggle";
import { TimeEntry } from "@/types";

export default function Administration() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedEntriesIds, setSelectedEntriesIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<string | null>("start_time");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [allTimeEnabled, setAllTimeEnabled] = useState(false);

  const handleMonthYearChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const handleUserChange = (userId: string | null) => {
    setSelectedUserId(userId);
  };

  const startDate = allTimeEnabled ? undefined : startOfMonth(new Date(selectedYear, selectedMonth));
  const endDate = allTimeEnabled ? undefined : endOfMonth(new Date(selectedYear, selectedMonth));

  const toggleAllTime = (enabled: boolean) => {
    setAllTimeEnabled(enabled);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectEntry = (id: string) => {
    setSelectedEntriesIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEntriesIds(timeEntries.map(entry => entry.id));
    } else {
      setSelectedEntriesIds([]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedEntriesIds.length === 0) {
      toast.error("No time entries selected");
      return;
    }
    
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSelected = async () => {
    if (selectedEntriesIds.length === 0) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .in("id", selectedEntriesIds);
      
      if (error) {
        throw error;
      }
      
      toast.success(`${selectedEntriesIds.length} time ${selectedEntriesIds.length === 1 ? 'entry' : 'entries'} deleted successfully`);
      setSelectedEntriesIds([]);
      
      // Invalidate and refetch data
      await queryClient.invalidateQueries({ queryKey: ["time-entries"] });
      
    } catch (error: any) {
      console.error("Error deleting time entries:", error);
      toast.error(`Failed to delete time entries: ${error.message || "Unknown error"}`);
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Modified query to fix the relationship issue
  let query = supabase
    .from("time_entries")
    .select(`
      id, 
      user_id,
      client_id,
      product_id,
      start_time, 
      end_time, 
      quantity, 
      description, 
      created_at, 
      updated_at,
      invoiced,
      products (id, name, type, price),
      clients (name)
    `);
  
  if (selectedUserId) {
    query = query.eq("user_id", selectedUserId);
  }
  
  if (startDate) {
    query = query.gte("start_time", startDate.toISOString());
  }
  
  if (endDate) {
    query = query.lte("start_time", endDate.toISOString());
  }
  
  if (sortField) {
    query = query.order(sortField, { ascending: sortDirection === 'asc' });
  }

  const { data: rawTimeEntries = [], isLoading } = useQuery({
    queryKey: ["time-entries", selectedMonth, selectedYear, selectedUserId, sortField, sortDirection, allTimeEnabled],
    queryFn: async () => {
      console.log("Fetching time entries with params:", {
        month: selectedMonth,
        year: selectedYear,
        user: selectedUserId,
        sort: sortField,
        direction: sortDirection,
        allTime: allTimeEnabled
      });
      
      try {
        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching time entries:", error);
          throw error;
        }
        
        // For each entry, fetch the user profile data separately
        const enhancedData = await Promise.all((data || []).map(async (entry) => {
          let profileName = "Unknown";
          
          if (entry.user_id) {
            try {
              const { data: profileData } = await supabase
                .from("profiles")
                .select("name")
                .eq("id", entry.user_id)
                .single();
                
              if (profileData && profileData.name) {
                profileName = profileData.name;
              }
            } catch (err) {
              console.error("Error fetching profile name:", err);
            }
          }
          
          return {
            ...entry,
            profiles: { name: profileName }
          };
        }));
        
        console.log(`Found ${enhancedData?.length || 0} time entries`);
        return enhancedData || [];
      } catch (error) {
        console.error("Error fetching time entries:", error);
        return [];
      }
    },
  });
  
  // Transform raw data to match TimeEntry type
  const timeEntries: TimeEntry[] = rawTimeEntries.map((entry: any) => ({
    ...entry,
    products: entry.products ? {
      ...entry.products,
      type: entry.products.type as 'activity' | 'item'
    } : undefined
  }));

  const handleEntryDeleted = async () => {
    await queryClient.invalidateQueries({ queryKey: ["time-entries"] });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold">Administration</h1>
      </div>
      
      <Tabs defaultValue="time-entries" className="space-y-6">
        <TabsList>
          <TabsTrigger value="time-entries">Time Entries</TabsTrigger>
        </TabsList>
        
        <TabsContent value="time-entries" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Time Entries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                <div className="grid gap-2 flex-1">
                  <UserSelect 
                    value={selectedUserId} 
                    onChange={handleUserChange} 
                  />
                </div>
                
                <div className="grid gap-2 flex-1">
                  <label className="text-sm font-medium">Date filter</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    <AllTimeToggle 
                      allTimeEnabled={allTimeEnabled} 
                      onToggleAllTime={toggleAllTime}
                    />
                    
                    {!allTimeEnabled && (
                      <MonthYearSelector
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        onMonthYearChange={handleMonthYearChange}
                      />
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 self-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleDeleteSelected}
                    disabled={selectedEntriesIds.length === 0}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete Selected ({selectedEntriesIds.length})
                  </Button>
                </div>
              </div>
              
              <TimeEntriesTable 
                timeEntries={timeEntries}
                isLoading={isLoading}
                onEntryDeleted={handleEntryDeleted}
                bulkDeleteMode={true}
                selectedItems={selectedEntriesIds}
                onItemSelect={handleSelectEntry}
                onSelectAll={handleSelectAll}
                onBulkDelete={handleDeleteSelected}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-destructive mr-2" />
              Delete {selectedEntriesIds.length} Time {selectedEntriesIds.length === 1 ? 'Entry' : 'Entries'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEntriesIds.length} time {selectedEntriesIds.length === 1 ? 'entry' : 'entries'}? This action cannot be undone.
              {timeEntries.some(entry => selectedEntriesIds.includes(entry.id) && entry.invoiced) && (
                <div className="mt-2 p-2 border border-yellow-300 bg-yellow-50 rounded text-yellow-800">
                  <strong>Warning:</strong> Some selected entries have already been invoiced. Deleting them may cause inconsistencies with your Fortnox data.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteSelected();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
