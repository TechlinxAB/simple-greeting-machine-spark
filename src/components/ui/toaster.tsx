
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
        closeButton: (t) => (
          <button 
            style={{
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '0.25rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '0.25rem'
            }}
            onClick={() => t.dismiss()}
          >
            <X size={16} color="black" strokeWidth={2} />
          </button>
        )
      }}
    />
  );
}
