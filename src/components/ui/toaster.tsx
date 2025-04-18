
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
      gap={8}
      toastOptions={{
        classNames: {
          toast: "group toast bg-black text-white border-none shadow-lg rounded-md overflow-hidden flex items-center justify-center max-w-[350px] w-full p-4 relative",
          description: "text-white text-sm font-normal text-center w-full",
          actionButton: "bg-white text-black",
          cancelButton: "bg-black text-white border border-white hover:bg-gray-900",
          closeButton: "absolute top-2 right-2 p-1 rounded-full text-white hover:bg-white/20 transition-colors"
        },
        style: {
          background: '#000000',
          color: '#ffffff',
          borderRadius: '6px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          margin: '0.5rem',
          padding: '0.75rem',
          maxWidth: '350px',
          width: '100%',
          position: 'relative'
        }
      }}
      {...props}
    />
  );
};

export { Toaster };
