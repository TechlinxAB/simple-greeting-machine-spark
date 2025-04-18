
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import { X } from "lucide-react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      className="toaster group"
      closeButton={true}
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-white text-black border border-gray-300", 
          description: "text-black",
          actionButton:
            "bg-black text-white",
          cancelButton:
            "bg-white text-black border border-gray-300",
          closeButton: "text-black hover:bg-white hover:text-gray-800 rounded-full p-1" 
        },
        style: {
          background: '#ffffff',
          color: '#000000',
          border: '1px solid #cccccc'
        },
        duration: 3000,
      }}
      {...props}
    />
  )
}

export { Toaster }

