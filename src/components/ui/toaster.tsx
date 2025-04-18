
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "group toast bg-white text-black border border-gray-300 shadow-md relative",
          description: "text-black",
          actionButton: "bg-black text-white",
          cancelButton: "bg-white text-black border border-gray-300 hover:bg-gray-100",
          closeButton: "absolute right-2 top-2 p-1 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
        },
        style: {
          background: '#ffffff',
          color: '#000000',
          border: '1px solid #cccccc',
          position: 'relative',
          cursor: 'pointer'
        },
        duration: 3000,
      }}
      {...props}
    />
  );
};

export { Toaster };
