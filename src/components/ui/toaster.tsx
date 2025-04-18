
import { Toaster as SonnerToaster } from "sonner";
import { X } from "lucide-react";

export function Toaster() {
  return (
    <SonnerToaster 
      position="top-right"
      closeButton={({ closeButtonProps }) => (
        <button 
          {...closeButtonProps} 
          className="absolute right-2 top-2 text-white hover:bg-black/20 rounded-full p-1"
        >
          <X className="h-4 w-4 stroke-current" />
        </button>
      )}
      toastOptions={{
        style: {
          background: "#ffffff",
          color: "#000000",
          border: "1px solid hsl(var(--border))",
          cursor: "pointer", 
          position: "relative",
        },
        className: "toaster group relative",
        descriptionClassName: "text-sm text-gray-800",
        duration: 3000,
      }}
    />
  );
}
