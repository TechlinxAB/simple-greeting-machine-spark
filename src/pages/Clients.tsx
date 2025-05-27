
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ClientForm } from "@/components/clients/ClientForm";
import { DeleteClientDialog } from "@/components/clients/DeleteClientDialog";
import { Plus, Search, RefreshCw, Pencil, Mail, Phone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Client } from "@/types";

export default function Clients() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [showClientForm, setShowClientForm] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

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
    toast.info(t("common.checking") + "...");
    refetch().then(() => {
      toast.success(t("clients.clientList") + " " + t("common.refresh").toLowerCase() + "ed");
    }).catch(error => {
      toast.error(t("error.loadingFailed") + ": " + error.message);
    });
  };

  const handleClientChanged = () => {
    queryClient.invalidateQueries({ queryKey: ["all-clients"] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  };

  const handleEditClient = (client: Client) => {
    setClientToEdit(client);
    setShowClientForm(true);
  };

  const handleAddClient = () => {
    setClientToEdit(null);
    setShowClientForm(true);
  };

  const filteredClients = clients.filter((client: Client) => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.organization_number && client.organization_number.includes(searchTerm)) ||
    (client.client_number && client.client_number.includes(searchTerm))
  );

  return (
    <div className="container mx-auto py-6 space-y-6 px-4 md:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">{t("common.clients")}</h1>
        
        <div className="flex w-full sm:w-auto gap-2 flex-wrap">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("clients.searchClients")}
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
            title={t("common.refreshList")}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button 
            onClick={handleAddClient}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>{t("clients.newClient")}</span>
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t("clients.clientList")}</CardTitle>
          <CardDescription>
            {t("clients.manageClients")}
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
              <p className="text-red-500">{t("error.loadingFailed")}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("common.refresh")}
              </Button>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("clients.noClientsFound")}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={handleAddClient}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("common.addClient")}
              </Button>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("clients.name")}</TableHead>
                    {!isMobile && <TableHead>{t("clients.clientOrganization")}</TableHead>}
                    {!isMobile && <TableHead>{t("clients.clientNumber")}</TableHead>}
                    {!isMobile && <TableHead>{t("clients.clientLocation")}</TableHead>}
                    <TableHead>{t("clients.clientContact")}</TableHead>
                    <TableHead className="text-right">{t("clients.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      {!isMobile && <TableCell>{client.organization_number || "-"}</TableCell>}
                      {!isMobile && <TableCell>{client.client_number || "-"}</TableCell>}
                      {!isMobile && (
                        <TableCell>
                          {client.city ? 
                            `${client.city}${client.county ? `, ${client.county}` : ""}` : 
                            "-"}
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {client.email && (
                            <div className="flex items-center text-xs">
                              <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span className="truncate max-w-[120px] md:max-w-none">{client.email}</span>
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
                        <TooltipProvider>
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditClient(client)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{t("clients.editClient")}</p>
                              </TooltipContent>
                            </Tooltip>
                            
                            <DeleteClientDialog 
                              client={client} 
                              onClientDeleted={handleClientChanged} 
                            />
                          </div>
                        </TooltipProvider>
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
        clientToEdit={clientToEdit}
      />
    </div>
  );
}
