import React, { useState } from "react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteWithRetry } from "@/hooks/useSupabaseQuery";
import { toast } from "sonner";
import { Client } from "@/types";
import { supabase } from "@/lib/supabase";

interface DeleteClientDialogProps {
  client: Client;
  onSuccess: () => void;
}

export function DeleteClientDialog({ client, onSuccess }: DeleteClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!client.id) return;
    setIsDeleting(true);

    try {
      // Check if the client has any time entries
      const { data: timeEntries, error: entriesError } = await supabase
        .from("time_entries")
        .select("id")
        .eq("client_id", client.id)
        .limit(1);

      if (entriesError) {
        throw entriesError;
      }

      // Check if the client has any invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("id")
        .eq("client_id", client.id)
        .limit(1);

      if (invoicesError) {
        throw invoicesError;
      }

      // If the client has time entries or invoices, don't delete
      if (timeEntries && timeEntries.length > 0) {
        toast.error("Cannot delete client with existing time entries");
        setOpen(false);
        return;
      }

      if (invoices && invoices.length > 0) {
        toast.error("Cannot delete client with existing invoices");
        setOpen(false);
        return;
      }

      // Delete the client
      const result = await deleteWithRetry("clients", client.id);

      if (!result.success) {
        toast.error(result.error || "Failed to delete client");
        return;
      }

      toast.success(`Client "${client.name}" deleted successfully`);
      onSuccess();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("Failed to delete client: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsDeleting(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="icon" 
        className="h-8 w-8 text-destructive hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Delete {client.name}</span>
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{client.name}</span>?
              <br /><br />
              This action cannot be undone. This will permanently delete the client and cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-destructive-foreground border-t-transparent"></div>
                  Deleting...
                </>
              ) : "Delete Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
