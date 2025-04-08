
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfDay, endOfDay, formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Package, CalendarClock, ClipboardList, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TimeEntriesListProps {
  selectedDate: Date;
  formattedDate: string;
}

export function TimeEntriesList({ selectedDate, formattedDate }: TimeEntriesListProps) {
  const { user } = useAuth();

  const startDate = startOfDay(selectedDate);
  const endDate = endOfDay(selectedDate);

  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ["time-entries", format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user) return [];

      try {
        const { data, error } = await supabase
          .from("time_entries")
          .select(`
            id, 
            description, 
            start_time, 
            end_time, 
            quantity, 
            created_at, 
            invoiced,
            products:product_id (id, name, type, price),
            clients:client_id (id, name)
          `)
          .eq("user_id", user.id)
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .order("created_at", { ascending: false });

        if (error) throw error;
        
        return data || [];
      } catch (error) {
        console.error("Error fetching time entries:", error);
        return [];
      }
    },
    enabled: !!user,
  });

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours.toFixed(2);
  };

  const getItemAmount = (entry: any) => {
    if (entry.products?.type === "activity" && entry.start_time && entry.end_time) {
      const hours = parseFloat(calculateDuration(entry.start_time, entry.end_time));
      return `${hours} hours × ${entry.products.price} SEK`;
    } else if (entry.products?.type === "item" && entry.quantity) {
      return `${entry.quantity} × ${entry.products.price} SEK`;
    }
    return "-";
  };

  const getItemTotal = (entry: any) => {
    if (entry.products?.type === "activity" && entry.start_time && entry.end_time) {
      const hours = parseFloat(calculateDuration(entry.start_time, entry.end_time));
      return (hours * entry.products.price).toFixed(2);
    } else if (entry.products?.type === "item" && entry.quantity) {
      return (entry.quantity * entry.products.price).toFixed(2);
    }
    return "-";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between bg-gray-50 border-b">
        <CardTitle className="text-base font-medium">
          Activities for <span className="text-primary">{formattedDate}</span>
        </CardTitle>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          <span>View full list</span>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : timeEntries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="mx-auto h-12 w-12 mb-4 text-muted-foreground/60" />
            <p>No activities recorded for this day.</p>
            <p className="text-sm mt-2">Click "Save time entry" to add your first activity.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client / Project</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {timeEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.clients?.name || 'Unknown client'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {entry.description || 
                      (entry.products?.name || 'No description')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {entry.products?.type === 'activity' ? (
                        <Clock className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Package className="h-4 w-4 text-primary" />
                      )}
                      <span className="capitalize">{entry.products?.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getItemAmount(entry)}</TableCell>
                  <TableCell className="font-semibold">
                    {getItemTotal(entry)} SEK
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.invoiced ? "default" : "outline"}>
                      {entry.invoiced ? "Invoiced" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      <span>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
