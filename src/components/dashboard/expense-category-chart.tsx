"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ExpenseCategoryChartProps {
  data: Array<{
    categoria: string;
    total: number;
    color: string;
  }>;
}

export function ExpenseCategoryChart({ data }: ExpenseCategoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-neutral-500">
        No hay gastos en este período
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.categoria,
    value: item.total,
    color: item.color,
  }));

  const renderLabel = (entry: { percent?: number }) => {
    if (!entry.percent) return "";
    return `${(entry.percent * 100).toFixed(0)}%`;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e5e5",
            borderRadius: "6px",
          }}
        />
        <Legend
          formatter={(value, entry) => {
            const item = entry.payload;
            return `${value}: ${item?.value ? formatCurrency(Number(item.value)) : ""}`;
          }}
          wrapperStyle={{ fontSize: "14px" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
