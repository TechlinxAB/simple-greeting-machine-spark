
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MobileTableCard, MobileCardRow, MobileCardActions } from "@/components/ui/mobile-table-card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Edit, Trash2, Building, Mail, Phone, MapPin, User } from "lucide-react";
import { ClientForm } from "@/components/clients/ClientForm";
import { DeleteClientDialog } from "@/components/clients/DeleteClientDialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import type { Client } from "@/types";

export default function Clients() {
  const { toast } = useToast();
  const { role } = useAuth();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Client[];
    }
  });

  const { data: clientTimeEntryCounts = {} } = useQuery({
    queryKey: ["client-time-entry-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_entries")
        .select("client_id");
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(entry => {
        if (entry.client_id) {
          counts[entry.client_id] = (counts[entry.client_id] || 0) + 1;
        }
      });
      
      return counts;
    }
  });

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.organization_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    toast({
      title: t("clients.clientCreated"),
      description: t("clients.clientCreatedSuccessfully"),
    });
  };

  const handleEditSuccess = () => {
    setEditingClient(null);
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    toast({
      title: t("clients.clientUpdated"),
      description: t("clients.clientUpdatedSuccessfully"),
    });
  };

  const handleDeleteSuccess = () => {
    setDeletingClient(null);
    queryClient.invalidateQueries({ queryKey: ["clients"] });
    queryClient.invalidateQueries({ queryKey: ["client-time-entry-counts"] });
    toast({
      title: t("clients.clientDeleted"),
      description: t("clients.clientDeletedSuccessfully"),
    });
  };

  const canDeleteClient = (clientId: string) => {
    const timeEntryCount = clientTimeEntryCounts[clientId] || 0;
    return timeEntryCount === 0;
  };

  const ClientMobileCard = ({ client }: { client: Client }) => (
    <MobileTableCard>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{client.name}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {clientTimeEntryCounts[client.id] || 0} {t("clients.entries")}
        </Badge>
      </div>
      
      {client.email && (
        <MobileCardRow 
          label={t("clients.email")} 
          value={
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <span className="text-xs">{client.email}</span>
            </div>
          } 
        />
      )}
      
      {(client.telephone || client.phone) && (
        <MobileCardRow 
          label={t("clients.phone")} 
          value={
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              <span className="text-xs">{client.telephone || client.phone}</span>
            </div>
          } 
        />
      )}
      
      {client.organization_number && (
        <MobileCardRow 
          label={t("clients.organizationNumber")} 
          value={<span className="text-xs font-mono">{client.organization_number}</span>} 
        />
      )}
      
      {(client.address || client.city) && (
        <MobileCardRow 
          label={t("clients.location")} 
          value={
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              <span className="text-xs">
                {[client.address, client.city].filter(Boolean).join(", ")}
              </span>
            </div>
          } 
        />
      )}
      
      <MobileCardActions>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditingClient(client)}
          className="h-8 px-2"
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDeletingClient(client)}
          disabled={!canDeleteClient(client.id)}
          className="h-8 px-2 text-destructive hover:text-destructive/90"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </MobileCardActions>
    </MobileTableCard>
  );

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t("clients.title")}</h1>
            <p className="text-muted-foreground">{t("clients.subtitle")}</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                {t("clients.addClient")}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-full sm:max-w-2xl mx-4">
              <DialogHeader>
                <DialogTitle>{t("clients.addNewClient")}</DialogTitle>
                <DialogDescription>{t("clients.addClientDescription")}</DialogDescription>
              </DialogHeader>
              <ClientForm 
                open={isCreateDialogOpen} 
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={handleCreateSuccess} 
              />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("clients.allClients")}
            </CardTitle>
            <CardDescription>{t("clients.manageClientsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("clients.searchClients")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">{t("common.loading")}</div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? t("clients.noClientsFound") : t("clients.noClientsYet")}
              </div>
            ) : isMobile ? (
              <div className="space-y-3">
                {filteredClients.map((client) => (
                  <ClientMobileCard key={client.id} client={client} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("clients.name")}</TableHead>
                      <TableHead>{t("clients.email")}</TableHead>
                      <TableHead>{t("clients.phone")}</TableHead>
                      <TableHead>{t("clients.organizationNumber")}</TableHead>
                      <TableHead>{t("clients.timeEntries")}</TableHead>
                      <TableHead className="text-right">{t("common.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.email || "-"}</TableCell>
                        <TableCell>{client.telephone || client.phone || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {client.organization_number || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {clientTimeEntryCounts[client.id] || 0}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingClient(client)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingClient(client)}
                              disabled={!canDeleteClient(client.id)}
                              className="text-destructive hover:text-destructive/90"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Client Dialog */}
        <Dialog open={!!editingClient} onOpenChange={() => setEditingClient(null)}>
          <DialogContent className="w-full max-w-full sm:max-w-2xl mx-4">
            <DialogHeader>
              <DialogTitle>{t("clients.editClient")}</DialogTitle>
              <DialogDescription>{t("clients.editClientDescription")}</DialogDescription>
            </DialogHeader>
            {editingClient && (
              <ClientForm 
                open={!!editingClient}
                onOpenChange={() => setEditingClient(null)}
                clientToEdit={editingClient}
                onSuccess={handleEditSuccess}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Client Dialog */}
        {deletingClient && (
          <DeleteClientDialog
            client={deletingClient}
            onClientDeleted={handleDeleteSuccess}
          />
        )}
      </div>
    </div>
  );
}
