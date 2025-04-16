
import { Toaster as SonnerToaster } from "sonner";
import { X } from "lucide-react";

export function Toaster() {
  return (
    <SonnerToaster 
      position="top-right"
      closeButton={true}
      toastOptions={{
        style: {
          background: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          border: "1px solid hsl(var(--border))",
        },
        className: "toaster group",
        descriptionClassName: "text-sm text-muted-foreground",
      }}
    />
  );
}
