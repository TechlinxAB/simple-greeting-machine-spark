
import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  Cell
} from 'recharts';

// Custom XAxis with explicit default props
export const XAxis: React.FC<any> = (props) => {
  return <RechartsXAxis {...props} />;
};

// Custom YAxis with explicit default props
export const YAxis: React.FC<any> = (props) => {
  return <RechartsYAxis {...props} />;
};

// Custom BarChart component
interface BarChartProps {
  data: any[];
  className?: string;
  height?: number;
  barKey: string;
  barName: string;
  barFill?: string;
  tooltip?: {
    formatter?: (value: any) => [string, string];
    labelFormatter?: (label: string) => string;
  };
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  className,
  height = 300,
  barKey,
  barName,
  barFill = "#4CAF50",
  tooltip
}) => {
  // Generate a consistent ID for xAxis
  const xAxisId = "xAxis";
  
  return (
    <div className={className || "w-full h-full"}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <RechartsXAxis dataKey="name" xAxisId={xAxisId} />
          <RechartsYAxis />
          <Tooltip 
            formatter={tooltip?.formatter || ((value) => [`${value}`, ''])}
            labelFormatter={tooltip?.labelFormatter || ((label) => `${label}`)}
          />
          <Legend />
          <RechartsBar dataKey={barKey} fill={barFill} name={barName} xAxisId={xAxisId} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Custom PieChart component
interface PieChartProps {
  data: any[];
  className?: string;
  height?: number;
  dataKey: string;
  colors?: string[];
  label?: boolean | ((data: any) => string);
  tooltip?: {
    formatter?: (value: any) => [string, string];
  };
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  className,
  height = 300,
  dataKey,
  colors = ['#8BC34A', '#4CAF50', '#009688', '#2196F3', '#3F51B5', '#673AB7', '#9C27B0'],
  label = true,
  tooltip
}) => {
  const defaultLabel = ({ name, percent }: { name: string; percent: number }) => 
    `${name}: ${(percent * 100).toFixed(0)}%`;
    
  const finalLabel = label === true ? defaultLabel : label;

  return (
    <div className={className || "w-full h-full"}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <RechartsPie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={finalLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey={dataKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </RechartsPie>
          <Tooltip 
            formatter={tooltip?.formatter || ((value) => [String(value), ''])}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};
