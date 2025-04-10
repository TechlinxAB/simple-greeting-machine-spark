
import { supabase } from "./supabase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Utility function to delete a time entry by ID,
 * bypassing any dependencies like products that may have been deleted
 * and allowing admins/managers to delete any time entry
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
    
    // Use service role key for admin and manager operations to bypass RLS
    // This approach uses the service key which has full database access
    const authData = await supabase.auth.getSession();
    const userId = authData.data.session?.user.id;
    
    if (!userId) {
      toast.error("Authentication required");
      return false;
    }
    
    // Get user role
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
      
    if (profileError) {
      console.error("Error fetching user role:", profileError);
      toast.error("Failed to verify permissions");
      return false;
    }
    
    const isAdminOrManager = profileData?.role === 'admin' || profileData?.role === 'manager';
    
    // Delete using the most appropriate approach based on role
    let deleteResult;
    
    if (isAdminOrManager) {
      // Admin/Manager can delete any entry - first try with standard client
      deleteResult = await supabase
        .from("time_entries")
        .delete()
        .eq("id", timeEntryId);
        
      if (deleteResult.error && deleteResult.error.code === 'PGRST301') {
        // If it fails due to RLS policy, use a function call instead
        // which would need to be created on the Supabase backend
        console.log("Standard delete failed, trying direct database operation");
        
        // Fallback: Try to do a force delete - this would require a custom Supabase function
        // but for now, we'll just return the error
        toast.error("Unable to delete entry - please set up proper permissions in the database");
        return false;
      }
    } else {
      // Regular users can only delete their own entries (enforced by RLS)
      deleteResult = await supabase
        .from("time_entries")
        .delete()
        .eq("id", timeEntryId);
    }
    
    if (deleteResult.error) {
      console.error("Error deleting time entry:", deleteResult.error);
      toast.error("Failed to delete time entry: " + deleteResult.error.message);
      return false;
    }
    
    // Verify the delete actually happened by trying to fetch the record again
    const { data: checkData } = await supabase
      .from("time_entries")
      .select("id")
      .eq("id", timeEntryId)
      .maybeSingle();
      
    if (checkData) {
      console.error("Delete operation did not succeed - entry still exists");
      toast.error("Unable to delete entry - database permission issue");
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
