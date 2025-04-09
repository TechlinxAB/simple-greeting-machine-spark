
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClientForm } from "@/components/clients/ClientForm";
import { DeleteClientDialog } from "@/components/clients/DeleteClientDialog";
import { Plus, Search, Users, Mail, Phone, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Client } from "@/types";

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["all-clients"],
    queryFn: async () => {
      try {
        console.log("Fetching all clients data...");
        const { data, error } = await supabase
          .from("clients")
          .select("*")
          .order("name");
        
        if (error) {
          console.error("Error fetching clients:", error);
          throw error;
        }
        
        console.log(`Fetched ${data?.length || 0} clients`);
        return data || [];
      } catch (error) {
        console.error("Client fetch query failed:", error);
        throw error;
      }
    },
    staleTime: 10000, // Consider data stale after 10 seconds
    refetchOnMount: "always", // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gets focus
    retry: 2, // Retry failed requests twice
  });

  const handleRefresh = () => {
    toast.info("Refreshing client list...");
    refetch().then(() => {
      toast.success("Client list refreshed");
    }).catch(error => {
      toast.error("Failed to refresh: " + error.message);
    });
  };

  const handleClientChanged = () => {
    queryClient.invalidateQueries({ queryKey: ["all-clients"] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const filteredClients = clients.filter((client: Client) => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.organization_number && client.organization_number.includes(searchTerm)) ||
    (client.client_number && client.client_number.includes(searchTerm))
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Clients</h1>
        
        <div className="flex w-full sm:w-auto gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..." 
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Button 
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh client list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button 
            onClick={() => setShowClientForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Client</span>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
          <CardDescription>
            Manage your clients and their information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col space-y-3 mb-4">
                  <Skeleton className="h-6 w-52" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-red-500">Error loading clients. Please try again.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4 text-muted-foreground/60" />
              <p>No clients found. Add your first client to get started!</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setShowClientForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Organization #</TableHead>
                    <TableHead>Client #</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.organization_number || "-"}</TableCell>
                      <TableCell>{client.client_number || "-"}</TableCell>
                      <TableCell>
                        {client.city ? 
                          `${client.city}${client.county ? `, ${client.county}` : ""}` : 
                          "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {client.email && (
                            <div className="flex items-center text-xs">
                              <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span>{client.email}</span>
                            </div>
                          )}
                          {client.telephone && (
                            <div className="flex items-center text-xs">
                              <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span>{client.telephone}</span>
                            </div>
                          )}
                          {!client.email && !client.telephone && "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DeleteClientDialog 
                          client={client} 
                          onClientDeleted={handleClientChanged} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <ClientForm 
        open={showClientForm} 
        onOpenChange={setShowClientForm} 
        onSuccess={handleClientChanged}
      />
    </div>
  );
}
