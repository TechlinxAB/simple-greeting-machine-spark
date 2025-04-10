
import { supabase } from "./supabase";
import { toast } from "sonner";

export async function deleteTimeEntry(entryId: string): Promise<boolean> {
  try {
    // First check if entry exists and is not invoiced
    const { data: entry, error: checkError } = await supabase
      .from("time_entries")
      .select("id, invoiced")
      .eq("id", entryId)
      .single();
    
    if (checkError) {
      console.error("Error checking time entry:", checkError);
      toast.error("Error checking time entry status");
      return false;
    }
    
    if (!entry) {
      toast.error("Time entry not found");
      return false;
    }
    
    if (entry.invoiced) {
      toast.error("Cannot delete an invoiced time entry");
      return false;
    }
    
    // Delete the entry
    const { error: deleteError } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", entryId);
    
    if (deleteError) {
      console.error("Error deleting time entry:", deleteError);
      toast.error("Failed to delete time entry");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Unexpected error deleting time entry:", error);
    toast.error("An unexpected error occurred");
    return false;
  }
}
