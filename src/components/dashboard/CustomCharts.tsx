
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

// Use direct components with default parameters instead of wrappers
// This avoids the "Support for defaultProps will be removed" warnings

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
  className = "w-full h-full",
  height = 300,
  barKey,
  barName,
  barFill = "#4CAF50",
  tooltip
}) => {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <RechartsXAxis 
            dataKey="name" 
            // Using React default parameters instead of defaultProps
          />
          <RechartsYAxis />
          <Tooltip 
            formatter={tooltip?.formatter || ((value) => [`${value}`, ''])}
            labelFormatter={tooltip?.labelFormatter || ((label) => `${label}`)}
          />
          <Legend />
          <RechartsBar 
            dataKey={barKey} 
            fill={barFill} 
            name={barName}
          />
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
  className = "w-full h-full",
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
    <div className={className}>
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
