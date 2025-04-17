
import React, { useState } from 'react';
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
  LabelList,
  Sector
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
            radius={[4, 4, 0, 0]}
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
  outerRadius?: number;
  innerRadius?: number;
  labelPosition?: 'inside' | 'outside';
  activeIndex?: number;
  onPieEnter?: (data: any, index: number) => void;
  labelLineProps?: any;
  hideOuterLabels?: boolean;
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#333" className="text-sm font-medium">
        {payload.name}
      </text>
      <text x={cx} y={cy} textAnchor="middle" fill="#333" className="text-base font-bold">
        {value}
      </text>
      <text x={cx} y={cy} dy={20} textAnchor="middle" fill="#666" className="text-xs">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    </g>
  );
};

export const PieChart: React.FC<PieChartProps> = ({
  data,
  className = "w-full h-full",
  height = 300,
  dataKey,
  nameKey = "name",
  colors = ['#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#f59e0b', '#84cc16', '#22c55e'],
  tooltip,
  showLabels = false,
  outerRadius = 80,
  innerRadius = 0,
  labelPosition = 'outside',
  activeIndex,
  onPieEnter,
  labelLineProps,
  hideOuterLabels = false
}) => {
  const [activeIdx, setActiveIdx] = useState<number | undefined>(undefined);
  
  const handlePieEnter = (_, index: number) => {
    setActiveIdx(index);
    if (onPieEnter) onPieEnter(_, index);
  };

  // Only show the first 8 chars of a name to avoid overflow
  const truncateName = (name: string) => {
    return name.length > 12 ? `${name.substring(0, 10)}...` : name;
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <RechartsPie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={showLabels && !hideOuterLabels}
            label={showLabels && !hideOuterLabels ? 
              ({ name, percent }) => `${truncateName(name)} (${(percent * 100).toFixed(0)}%)` : 
              false
            }
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey={dataKey}
            nameKey={nameKey}
            paddingAngle={2}
            activeIndex={activeIndex !== undefined ? activeIndex : activeIdx}
            activeShape={renderActiveShape}
            onMouseEnter={handlePieEnter}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
            {showLabels && hideOuterLabels && (
              <LabelList 
                dataKey={nameKey} 
                position="inside"
                fill="#fff"
                style={{ fontSize: '10px', fontWeight: 'bold', textShadow: '0 0 2px #000' }}
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
