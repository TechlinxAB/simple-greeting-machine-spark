
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster 
      position="top-right"
      closeButton={true}
      richColors
      toastOptions={{
        style: {
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
          cursor: "pointer", // Add cursor pointer to indicate clickability
        },
        className: "toaster group",
        descriptionClassName: "text-sm text-muted-foreground",
        duration: 3000, // Auto dismiss after 3 seconds
      }}
    />
  );
}
