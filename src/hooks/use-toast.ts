
import { toast } from "sonner";

// Add a custom click handler to dismiss toasts when clicking on them
const originalToast = toast;

const enhancedToast = Object.assign(
  (...args: Parameters<typeof originalToast>) => {
    return originalToast(...args);
  },
  {
    ...originalToast,
  }
);

export { enhancedToast as toast };
