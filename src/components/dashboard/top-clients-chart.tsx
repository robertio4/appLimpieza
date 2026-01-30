"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface TopClientsChartProps {
  data: Array<{
    id: string;
    nombre: string;
    total: number;
  }>;
}

export function TopClientsChart({ data }: TopClientsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-neutral-500">
        No hay datos de clientes en este período
      </div>
    );
  }

  const chartData = data.map((item) => ({
    nombre:
      item.nombre.length > 20
        ? item.nombre.substring(0, 20) + "..."
        : item.nombre,
    total: item.total,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
        <YAxis dataKey="nombre" type="category" width={150} />
        <Tooltip
          formatter={(value) => formatCurrency(Number(value))}
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e5e5",
            borderRadius: "6px",
          }}
        />
        <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
