
import { toast } from "sonner";

// Create a custom hook that returns the toast functions
export const useToast = () => {
  return toast;
};

// Re-export the toast function directly for convenience
export { toast };
