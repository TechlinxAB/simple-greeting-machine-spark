
import { toast } from "sonner";

// Add a custom click handler to dismiss toasts when clicking on them
const originalToast = toast;
const enhancedToast = Object.assign(
  (...args: Parameters<typeof originalToast>) => {
    return originalToast(...args);
  },
  {
    ...originalToast,
    // Override other methods as needed, passing the onDismiss callback
    success: (message: string, options?: any) => 
      originalToast.success(message, { 
        ...options,
        onDismiss: () => {
          if (options?.onDismiss) options.onDismiss();
        }
      }),
    error: (message: string, options?: any) => 
      originalToast.error(message, { 
        ...options,
        onDismiss: () => {
          if (options?.onDismiss) options.onDismiss();
        }
      }),
    info: (message: string, options?: any) => 
      originalToast.info(message, { 
        ...options,
        onDismiss: () => {
          if (options?.onDismiss) options.onDismiss();
        }
      }),
    warning: (message: string, options?: any) => 
      originalToast.warning(message, { 
        ...options,
        onDismiss: () => {
          if (options?.onDismiss) options.onDismiss();
        }
      }),
  }
);

export { enhancedToast as toast };
