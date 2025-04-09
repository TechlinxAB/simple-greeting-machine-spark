
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import type { Client } from "@/types";

interface DeleteClientDialogProps {
  client: Client;
  onSuccess?: () => void;
}

export function DeleteClientDialog({ client, onSuccess }: DeleteClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      
      // Check for linked time entries or invoices first
      const { data: timeEntries, error: timeEntriesError } = await supabase
        .from('time_entries')
        .select('id')
        .eq('client_id', client.id)
        .limit(1);
        
      if (timeEntriesError) {
        throw new Error(timeEntriesError.message);
      }
      
      if (timeEntries && timeEntries.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot delete client",
          description: "This client has associated time entries. Please delete those first."
        });
        setOpen(false);
        setIsDeleting(false);
        return;
      }
      
      // Check for invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id')
        .eq('client_id', client.id)
        .limit(1);
        
      if (invoicesError) {
        throw new Error(invoicesError.message);
      }
      
      if (invoices && invoices.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot delete client",
          description: "This client has associated invoices. Please delete those first."
        });
        setOpen(false);
        setIsDeleting(false);
        return;
      }
      
      // If no linked entities, proceed with deletion
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id);
        
      if (error) throw error;
      
      toast({
        title: "Client deleted",
        description: `${client.name} has been removed successfully.`
      });
      
      // Invalidate queries to refresh client list
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['all-clients'] });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete client. Please try again."
      });
    } finally {
      setIsDeleting(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1"
      >
        <Trash2 className="h-4 w-4" />
        <span>Delete</span>
      </Button>
      
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{client.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
