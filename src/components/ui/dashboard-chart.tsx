
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, 
  PieChart 
} from "@/components/dashboard/CustomCharts";

interface ChartCardProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({ 
  title, 
  description, 
  className, 
  children 
}: ChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

// Type for the bar chart component
interface BarChartCardProps {
  title: string;
  description?: string;
  data: any[];
  height?: number;
  barKey: string;
  barName: string;
  barFill?: string;
  className?: string;
  tooltip?: {
    formatter?: (value: any) => [string, string];
    labelFormatter?: (label: string) => string;
  };
}

export function BarChartCard({
  title,
  description,
  data,
  height = 300,
  barKey,
  barName,
  barFill,
  className,
  tooltip
}: BarChartCardProps) {
  return (
    <ChartCard 
      title={title} 
      description={description}
      className={className}
    >
      <BarChart
        data={data}
        height={height}
        barKey={barKey}
        barName={barName}
        barFill={barFill}
        tooltip={tooltip}
      />
    </ChartCard>
  );
}

// Type for the pie chart component
interface PieChartCardProps {
  title: string;
  description?: string;
  data: any[];
  height?: number;
  dataKey: string;
  colors?: string[];
  className?: string;
  tooltip?: {
    formatter?: (value: any) => [string, string];
  };
  showLabels?: boolean;
  outerRadius?: number;
  innerRadius?: number;
  hideOuterLabels?: boolean;
}

export function PieChartCard({
  title,
  description,
  data,
  height = 300,
  dataKey,
  colors,
  className,
  tooltip,
  showLabels = false,
  outerRadius,
  innerRadius,
  hideOuterLabels
}: PieChartCardProps) {
  return (
    <ChartCard 
      title={title} 
      description={description}
      className={className}
    >
      <div className="w-full h-[300px]">
        <PieChart
          data={data}
          height={height}
          dataKey={dataKey}
          colors={colors}
          tooltip={tooltip}
          showLabels={showLabels}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          hideOuterLabels={hideOuterLabels}
        />
      </div>
    </ChartCard>
  );
}
