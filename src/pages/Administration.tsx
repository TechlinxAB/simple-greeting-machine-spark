import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Search, FileText, RefreshCcw, Upload, Trash2 } from "lucide-react";
import { FilePlus2 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { isFortnoxConnected } from "@/integrations/fortnox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TimeEntriesTable from "@/components/administration/TimeEntriesTable";
import { DateRangeSelector } from "@/components/administration/DateRangeSelector";

export default function Administration() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [clientId, setClientId] = useState("");
  const [userId, setUserId] = useState("");
  const [fromDate, setFromDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [showTimeEntries, setShowTimeEntries] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isCompact, setIsCompact] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: fortnoxConnected = false } = useQuery({
    queryKey: ["fortnox-connected"],
    queryFn: async () => {
      return await isFortnoxConnected();
    },
  });

  const handleSearch = () => {
    setShowTimeEntries(true);
  };

  const handleDateRangeChange = (from: Date | undefined, to: Date | undefined) => {
    setFromDate(from);
    setToDate(to);
  };

  const handleItemSelect = (id: string) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(itemId => itemId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Assuming you have a way to fetch all item IDs that match the current filters
      // Replace this with your actual logic to fetch all relevant IDs
      // For example, you might need to fetch all time entry IDs for the current client and date range
      // const allItemIds = await fetchAllItemIds(clientId, fromDate, toDate);
      // setSelectedItems(allItemIds);
      toast.error("Select all is not yet implemented. Please select items manually.");
    } else {
      setSelectedItems([]);
    }
  };

  const handleBulkDelete = () => {
    // Implement your bulk delete logic here
    toast.error("Bulk delete is not yet implemented.");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">{t("administration.title")}</h1>
      </div>
      
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
          <CardTitle>{t("administration.timeEntries")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client">{t("administration.client")}</Label>
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("administration.selectClient")} />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="user">{t("administration.user")}</Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("administration.selectUser")} />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <div className="w-full">
                <Label className="text-sm font-medium block mb-2">Time span</Label>
                <DateRangeSelector 
                  fromDate={fromDate}
                  toDate={toDate}
                  onDateChange={handleDateRangeChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="search">{t("administration.search")}</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder={t("administration.searchDescription")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch}>{t("administration.showTimeEntries")}</Button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulk-delete"
                checked={bulkDeleteMode}
                onCheckedChange={(checked) => {
                  setBulkDeleteMode(checked || false);
                  setSelectedItems([]); // Clear selection when toggling bulk delete mode
                }}
              />
              <Label htmlFor="bulk-delete" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {t("administration.bulkDelete")}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {showTimeEntries && (
        <TimeEntriesTable 
          client_id={clientId}
          user_id={userId}
          fromDate={fromDate}
          toDate={toDate}
          searchTerm={searchTerm}
          bulkDeleteMode={bulkDeleteMode}
          selectedItems={selectedItems}
          onItemSelect={handleItemSelect}
          onSelectAll={handleSelectAll}
          onBulkDelete={handleBulkDelete}
          isCompact={isCompact}
        />
      )}
    </div>
  );
}
