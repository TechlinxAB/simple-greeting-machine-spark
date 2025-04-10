
import { LucideIcon, AlertCircle, FileText } from "lucide-react";

// This file serves as a centralized place to export icons or icon sets
// Create icon configurations used throughout the application
export const Icons = {
  spinner: (props: React.ComponentProps<LucideIcon>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  alertCircle: AlertCircle,
  fileText: FileText,
};
