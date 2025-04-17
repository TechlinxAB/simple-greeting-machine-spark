
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
  Cell,
  LabelList
} from 'recharts';

interface BarChartProps {
  data: any[];
  className?: string;
  height?: number;
  barKey: string;
  barName: string;
  nameKey?: string; 
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
  nameKey = "name",
  barFill = "#4CAF50",
  tooltip
}) => {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <RechartsXAxis dataKey={nameKey} />
          <RechartsYAxis />
          <Tooltip 
            formatter={(value, name, entry) => {
              if (tooltip?.formatter) {
                const [formattedValue, formattedName] = tooltip.formatter(value);
                // If the formatter doesn't provide a name, use the one from the data
                const displayName = formattedName || entry.payload[nameKey]?.split(' ')[0] || name;
                return [formattedValue, displayName];
              }
              return [`${value}`, entry.payload[nameKey]?.split(' ')[0] || name];
            }}
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
  nameKey?: string;
  colors?: string[];
  label?: boolean | ((data: any) => string);
  tooltip?: {
    formatter?: (value: any) => [string, string];
  };
  showLabels?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  className = "w-full h-full",
  height = 300,
  dataKey,
  nameKey = "name",
  colors = ['#8BC34A', '#4CAF50', '#009688', '#2196F3', '#3F51B5', '#673AB7', '#9C27B0'],
  label = false,
  tooltip,
  showLabels = false
}) => {
  // Simplified label function - just show the name with no percentages
  // This helps with readability in small charts
  const renderCustomizedLabel = ({ name }: { name: string }) => name;

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <RechartsPie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={showLabels}
            label={showLabels ? renderCustomizedLabel : false}
            outerRadius={100}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
            {showLabels && (
              <LabelList 
                dataKey={nameKey} 
                position="outside" 
                style={{ fontSize: '12px', fill: '#333' }}
              />
            )}
          </RechartsPie>
          <Tooltip 
            formatter={(value, name, entry) => {
              if (tooltip?.formatter) {
                const [formattedValue, formattedName] = tooltip.formatter(value);
                // If the formatter doesn't provide a name, use the one from the data
                return [formattedValue, formattedName || entry.name || name];
              }
              return [String(value), entry.name || name];
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};
