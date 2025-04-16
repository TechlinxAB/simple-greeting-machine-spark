
import { Toaster as SonnerToaster } from "sonner";
import { X } from "lucide-react";

export function Toaster() {
  return (
    <SonnerToaster 
      position="top-right"
      closeButton={true}
      richColors
      toastOptions={{
        style: {
          background: "#ffffff",
          color: "#000000",
          border: "1px solid hsl(var(--border))",
          cursor: "pointer", 
        },
        className: "toaster group",
        descriptionClassName: "text-sm text-gray-700",
        duration: 3000,
        closeButton: true
      }}
    />
  );
}
