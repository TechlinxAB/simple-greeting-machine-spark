
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useIsLaptop } from "@/hooks/use-mobile";

interface AllTimeToggleProps {
  isAllTime: boolean;
  onAllTimeChange: (isAllTime: boolean) => void;
}

export function AllTimeToggle({ isAllTime, onAllTimeChange }: AllTimeToggleProps) {
  const { t } = useTranslation();
  const isLaptop = useIsLaptop();
  
  return (
    <Button
      variant={isAllTime ? "default" : "outline"}
      size={isLaptop ? "sm" : "default"}
      onClick={() => onAllTimeChange(!isAllTime)}
      className={`whitespace-nowrap ${isLaptop ? "text-xs h-8 px-2" : "h-10"}`}
    >
      {t('common.allTime')}
    </Button>
  );
}
