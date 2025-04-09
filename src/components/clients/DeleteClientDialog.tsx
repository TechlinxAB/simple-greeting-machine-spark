
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteWithRetry } from "@/hooks/useSupabaseQuery";
import { supabase } from "@/lib/supabase";
import type { Client } from "@/types";

interface DeleteClientDialogProps {
  client: Client;
  onClientDeleted: () => void;
}

export function DeleteClientDialog({ client, onClientDeleted }: DeleteClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasReferences, setHasReferences] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Check if the client has any time entries before attempting deletion
  const checkForReferences = async () => {
    setIsChecking(true);
    
    try {
      // Check if any time entries reference this client
      const { data, error } = await supabase
        .from("time_entries")
        .select("id")
        .eq("client_id", client.id)
        .limit(1);
      
      if (error) {
        console.error("Error checking client references:", error);
        toast.error("Failed to check if client can be deleted");
        setOpen(false);
        return false;
      }
      
      const hasTimeEntries = data && data.length > 0;
      setHasReferences(hasTimeEntries);
      return !hasTimeEntries;
    } catch (error) {
      console.error("Error checking time entries:", error);
      return false;
    } finally {
      setIsChecking(false);
    }
  };

  const handleDeleteClick = async () => {
    const canDelete = await checkForReferences();
    
    if (!canDelete) {
      // The check has already set hasReferences to true if needed
      return;
    }
    
    // If we can delete, proceed with deletion
    await handleDelete();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const result = await deleteWithRetry("clients", client.id);
      
      if (result.success) {
        toast.success(`Client "${client.name}" has been deleted`);
        onClientDeleted();
        setOpen(false);
      } else {
        toast.error(result.error || "Failed to delete client");
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      toast.error("An unexpected error occurred while deleting the client");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setOpen(true)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        title="Delete client"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              {hasReferences ? (
                <>
                  <p className="text-destructive font-medium mb-2">
                    Cannot delete "{client.name}"
                  </p>
                  <p>
                    This client has time entries associated with it and cannot be deleted.
                    You must first delete or reassign all time entries for this client.
                  </p>
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>{client.name}</strong>?
                  <br /><br />
                  This action is irreversible and will remove all client information 
                  from the system. Time entries or invoices associated with this client 
                  will NOT be deleted.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting || isChecking}>
              {hasReferences ? "Close" : "Cancel"}
            </AlertDialogCancel>
            {!hasReferences && (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteClick();
                }}
                disabled={isDeleting || isChecking}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isChecking ? "Checking..." : isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
