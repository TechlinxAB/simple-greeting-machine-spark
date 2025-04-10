
import { LucideIcon, AlertCircle, FileText, Users, Clock, FilterIcon, Trash, Check, ArrowUpDown, LayoutDashboard, Package, BarChart3, Settings, Newspaper, UserCircle } from "lucide-react";

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
  users: Users,
  clock: Clock,
  filterIcon: FilterIcon,
  trash: Trash,
  check: Check,
  arrowUpDown: ArrowUpDown
};

// Export icons for sidebar and other components
export const DashboardIcon = LayoutDashboard;
export const ClientsIcon = Users;
export const ProductsIcon = Package;
export const InvoicesIcon = FileText;
export const TimeIcon = Clock;
export const ReportsIcon = BarChart3;
export const AdminIcon = Settings;
export const NewsIcon = Newspaper;
export const SettingsIcon = Settings;
export const ProfileIcon = UserCircle;
