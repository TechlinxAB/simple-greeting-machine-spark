
import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";

interface RevenueCardProps {
  title: string;
  amount: number;
  icon?: React.ReactNode;
}

export function RevenueCard({ title, amount, icon }: RevenueCardProps) {
  return (
    <div className="bg-secondary/50 rounded-lg p-4 flex items-center">
      <div className="rounded-full bg-primary/20 p-2 mr-3">
        {icon || <DollarSign className="h-5 w-5 text-primary" />}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
      </div>
    </div>
  );
}
