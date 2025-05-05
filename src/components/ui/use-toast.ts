
// Import from our centralized toast hook
import { toast } from "@/hooks/use-toast";

// Export for components that import from ui/use-toast
export { toast };

// Create and export the useToast hook
export const useToast = () => {
  return { toast };
};
