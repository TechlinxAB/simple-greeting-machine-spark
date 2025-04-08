
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, Package, CalendarClock, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function TimeEntriesList() {
  const { user } = useAuth();

  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ["time-entries"],
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
          .order("created_at", { ascending: false })
          .limit(20);

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
      <CardHeader>
        <CardTitle>Recent Time Entries</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : timeEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="mx-auto h-12 w-12 mb-4 text-muted-foreground/60" />
            <p>No time entries found. Create your first one!</p>
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
                        <Package className="h-4 w-4 text-green-500" />
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
