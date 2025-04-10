
import { supabase } from "./supabase";
import { toast } from "sonner";

/**
 * Utility function to delete a time entry by ID.
 * Relies on RLS policies to manage permissions.
 */
export async function deleteTimeEntry(timeEntryId: string): Promise<boolean> {
  try {
    console.log(`Attempting to delete time entry with ID: ${timeEntryId}`);
    
    // First check if the entry is invoiced
    const { data: entryData, error: checkError } = await supabase
      .from("time_entries")
      .select("invoiced, invoice_id")
      .eq("id", timeEntryId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking time entry status:", checkError);
      toast.error("Failed to check time entry status");
      return false;
    }
    
    // If the entry is invoiced, prevent deletion
    if (entryData?.invoiced || entryData?.invoice_id) {
      toast.error("Cannot delete a time entry that has been invoiced");
      return false;
    }
    
    // Attempt to delete the entry - RLS policies will handle permissions
    const { error: deleteError } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", timeEntryId);
      
    if (deleteError) {
      console.error("Error deleting time entry:", deleteError);
      toast.error("Failed to delete time entry: " + deleteError.message);
      return false;
    }
    
    // Verify the deletion was successful
    const { data: verifyData } = await supabase
      .from("time_entries")
      .select("id")
      .eq("id", timeEntryId)
      .maybeSingle();
      
    if (verifyData) {
      console.error("Delete verification failed - entry still exists");
      toast.error("Failed to delete time entry - please try again");
      return false;
    }
    
    console.log(`Successfully deleted time entry with ID: ${timeEntryId}`);
    return true;
  } catch (error) {
    console.error("Unexpected error during time entry deletion:", error);
    toast.error("An unexpected error occurred while deleting the time entry");
    return false;
  }
}
