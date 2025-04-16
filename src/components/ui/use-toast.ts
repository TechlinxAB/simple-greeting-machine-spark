
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

// After we create our enhanced toast, we register a click event listener on the document
// to catch clicks on toast elements
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  // Find the closest toast element
  const toast = target.closest('.toast');
  if (toast) {
    // If we clicked on a toast (or child of toast), dismiss it
    // We can dismiss it by clicking the hidden close button
    const closeButton = toast.querySelector('[data-sonner-toast-close]') as HTMLButtonElement;
    if (closeButton) {
      closeButton.click();
    }
  }
}, { capture: true });

export { enhancedToast as toast };
