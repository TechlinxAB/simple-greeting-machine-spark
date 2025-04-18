
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      closeButton
      richColors={false}
      duration={4000}
      gap={8}
      toastOptions={{
        classNames: {
          toast: "group flex w-full items-center bg-white text-gray-800 rounded-lg shadow-lg py-3 px-5 max-w-[400px]",
          title: "font-medium text-base font-semibold",
          description: "text-sm text-gray-600 mt-1",
          actionButton: "bg-primary text-white rounded px-2 py-1 text-xs font-medium",
          cancelButton: "bg-gray-100 text-gray-800 rounded px-2 py-1 text-xs font-medium",
          closeButton: "absolute right-2 top-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
        },
        style: {
          background: '#ffffff',
          color: '#1f2937',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }
      }}
      {...props}
    />
  );
};

export { Toaster };
