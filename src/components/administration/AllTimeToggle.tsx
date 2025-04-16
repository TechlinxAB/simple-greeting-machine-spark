
import { Toggle } from "@/components/ui/toggle";
import { Clock } from "lucide-react";

interface AllTimeToggleProps {
  allTimeEnabled: boolean;
  onToggleAllTime: (enabled: boolean) => void;
}

export function AllTimeToggle({ allTimeEnabled, onToggleAllTime }: AllTimeToggleProps) {
  return (
    <Toggle
      pressed={allTimeEnabled}
      onPressedChange={onToggleAllTime}
      variant="outline"
      aria-label="Toggle all time"
      className={`flex gap-2 items-center ${allTimeEnabled ? 'bg-primary/10' : ''}`}
    >
      <Clock className="h-4 w-4" />
      <span>All Time</span>
    </Toggle>
  );
}
