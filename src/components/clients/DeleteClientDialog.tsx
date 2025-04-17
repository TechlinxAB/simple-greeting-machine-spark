import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasReferences, setHasReferences] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [timeEntriesCount, setTimeEntriesCount] = useState(0);

  const checkForReferences = async () => {
    setIsChecking(true);
    
    try {
      const { data, error, count } = await supabase
        .from("time_entries")
        .select("id", { count: 'exact' })
        .eq("client_id", client.id);
      
      if (error) {
        console.error("Error checking client references:", error);
        toast.error("Failed to check if client can be deleted");
        setOpen(false);
        return false;
      }
      
      const hasTimeEntries = data && data.length > 0;
      setTimeEntriesCount(count || 0);
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
      return;
    }
    
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

  const handleNavigateToAdmin = () => {
    window.location.href = "/administration";
    setOpen(false);
  };

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setOpen(true)}
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        title={t("common.delete")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.deleteClient")}</AlertDialogTitle>
            <AlertDialogDescription>
              {hasReferences ? (
                <div className="space-y-4">
                  <div className="text-destructive font-medium">
                    {t("clients.cannotDelete", { name: client.name })}
                  </div>
                  <p>
                    {t("clients.hasTimeEntries", { count: timeEntriesCount })}
                  </p>
                  <p>
                    {t("clients.manageInAdmin")}
                  </p>
                </div>
              ) : (
                <>
                  {t("clients.deleteConfirmation", { name: client.name })}
                  <br /><br />
                  {t("clients.deleteWarning")}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting || isChecking}>
              {hasReferences ? t("common.close") : t("common.cancel")}
            </AlertDialogCancel>
            {hasReferences ? (
              <Button 
                onClick={handleNavigateToAdmin}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t("navigation.administration")}
              </Button>
            ) : (
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteClick();
                }}
                disabled={isDeleting || isChecking}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isChecking ? t("common.checking") : isDeleting ? t("common.deleting") : t("common.delete")}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
