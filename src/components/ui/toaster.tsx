
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster 
      position="top-right"
      closeButton={true}
      toastOptions={{
        style: {
          background: "#ffffff",
          color: "#000000",
          border: "1px solid hsl(var(--border))",
          cursor: "pointer", 
        },
        className: "toaster group",
        descriptionClassName: "text-sm text-gray-800",
        duration: 3000,
      }}
    />
  );
}
