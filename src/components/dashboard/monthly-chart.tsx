"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { MonthlyTotal } from "@/lib/actions/dashboard";

interface MonthlyChartProps {
  data: MonthlyTotal[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const formatCurrencyCompact = (value: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
        <XAxis
          dataKey="month"
          tick={{ fill: "#737373", fontSize: 12 }}
          axisLine={{ stroke: "#e5e5e5" }}
        />
        <YAxis
          tick={{ fill: "#737373", fontSize: 12 }}
          axisLine={{ stroke: "#e5e5e5" }}
          tickFormatter={formatCurrencyCompact}
        />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e5e5",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar
          dataKey="ingresos"
          name="Ingresos"
          fill="#22c55e"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="gastos"
          name="Gastos"
          fill="#ef4444"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
