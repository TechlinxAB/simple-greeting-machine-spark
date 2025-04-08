
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarRange, FilePlus2, Search, FileText } from "lucide-react";
import { format } from "date-fns";

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          id,
          invoice_number,
          status,
          issue_date,
          due_date,
          total_amount,
          exported_to_fortnox,
          clients:client_id (id, name)
        `)
        .order("issue_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "default" as const;
      case "sent":
        return "secondary" as const;
      case "overdue":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Invoices</h1>
        
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Search invoices..." 
              className="pl-8 h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button 
            className="flex items-center gap-2"
          >
            <FilePlus2 className="h-4 w-4" />
            <span>New Invoice</span>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 text-muted-foreground/60" />
              <p>No invoices found. Create your first invoice to get started!</p>
              <Button variant="outline" className="mt-4">
                <FilePlus2 className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Exported</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>{invoice.clients?.name || 'Unknown Client'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{format(new Date(invoice.issue_date), 'yyyy-MM-dd')}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(invoice.due_date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell className="font-medium">{invoice.total_amount.toFixed(2)} SEK</TableCell>
                      <TableCell>
                        <Badge variant={getBadgeVariant(invoice.status)}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.exported_to_fortnox ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Exported
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Not Exported
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
