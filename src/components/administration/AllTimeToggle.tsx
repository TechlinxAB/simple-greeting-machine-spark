
import { Toggle } from "@/components/ui/toggle";
import { Clock } from "lucide-react";

interface AllTimeToggleProps {
  isAllTime: boolean;
  onAllTimeChange: (enabled: boolean) => void;
}

export function AllTimeToggle({ isAllTime, onAllTimeChange }: AllTimeToggleProps) {
  return (
    <Toggle
      pressed={isAllTime}
      onPressedChange={onAllTimeChange}
      variant="outline"
      aria-label="Toggle all time"
      className={`flex gap-2 items-center h-10 px-4 cursor-pointer ${isAllTime ? 'bg-primary/10' : ''}`}
    >
      <Clock className="h-4 w-4" />
      <span>All Time</span>
    </Toggle>
  );
}
