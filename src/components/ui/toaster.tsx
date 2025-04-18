
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-center"
      closeButton
      richColors={false}
      duration={4000}
      gap={8}
      toastOptions={{
        classNames: {
          toast: "group flex w-full justify-between items-center bg-[#1a1a1a] text-white rounded-lg shadow-lg py-3 px-4 max-w-[380px]",
          title: "font-medium text-sm",
          description: "text-sm text-gray-200",
          actionButton: "bg-white text-black rounded px-2 py-1 text-xs font-medium",
          cancelButton: "bg-[#333] text-white rounded px-2 py-1 text-xs font-medium",
          closeButton: "text-white/70 hover:text-white transition-colors rounded-full p-1"
        },
        style: {
          background: '#1a1a1a',
          color: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }
      }}
      // Custom close icon as a separate property, not inside toastOptions
      closeIcon={<X size={14} />}
      {...props}
    />
  );
};

export { Toaster };
