
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      richColors={false}
      closeButton
      duration={3000}
      toastOptions={{
        classNames: {
          toast: "group toast bg-white text-black border border-gray-200 shadow-sm relative",
          description: "text-black",
          actionButton: "bg-black text-white",
          cancelButton: "bg-white text-black border border-gray-200 hover:bg-gray-100",
          closeButton: "absolute right-2 top-2 p-1 rounded-md text-black hover:text-gray-700 transition-colors border border-gray-200 bg-white hover:bg-gray-50"
        },
        style: {
          background: '#ffffff',
          color: '#000000',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          margin: '0.5rem',
          position: 'relative'
        }
      }}
      {...props}
    />
  );
};

export { Toaster };
