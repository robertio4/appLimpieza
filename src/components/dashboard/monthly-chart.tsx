"use client";

import {
  ComposedChart,
  Area,
  Line,
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

  interface TooltipPayload {
    dataKey: string;
    value: number;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayload[];
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const ingresos = payload.find((p) => p.dataKey === "ingresos");
      const gastos = payload.find((p) => p.dataKey === "gastos");
      const balance = (ingresos?.value || 0) - (gastos?.value || 0);

      return (
        <div className="bg-white border border-neutral-200 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-neutral-900 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                Ingresos:
              </span>
              <span className="text-sm font-semibold text-emerald-600">
                {formatCurrency(ingresos?.value || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                Gastos:
              </span>
              <span className="text-sm font-semibold text-red-600">
                {formatCurrency(gastos?.value || 0)}
              </span>
            </div>
            <div className="border-t border-neutral-200 mt-2 pt-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium">Balance:</span>
                <span
                  className={`text-sm font-bold ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e5e7eb"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fill: "#6b7280", fontSize: 13, fontWeight: 500 }}
          axisLine={{ stroke: "#d1d5db" }}
          tickLine={{ stroke: "#d1d5db" }}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={{ stroke: "#d1d5db" }}
          tickLine={{ stroke: "#d1d5db" }}
          tickFormatter={formatCurrencyCompact}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
        <Area
          type="monotone"
          dataKey="ingresos"
          name="Ingresos"
          fill="url(#colorIngresos)"
          stroke="#10b981"
          strokeWidth={3}
          dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="gastos"
          name="Gastos"
          fill="url(#colorGastos)"
          stroke="#ef4444"
          strokeWidth={3}
          dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey={(data) => data.ingresos - data.gastos}
          name="Balance"
          stroke="#8b5cf6"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
