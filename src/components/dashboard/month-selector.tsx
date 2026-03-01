"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { MONTH_NAMES } from "@/lib/constants";
import type { MonthWithInvoices } from "@/lib/actions/dashboard";

interface MonthSelectorProps {
  months: MonthWithInvoices[];
  currentMonth: number;
  currentYear: number;
  isAll?: boolean;
}

export function MonthSelector({
  months,
  currentMonth,
  currentYear,
  isAll = false,
}: MonthSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (value: string) => {
    startTransition(() => {
      if (value === "all") {
        router.push("/dashboard?all=true");
        return;
      }
      const [year, month] = value.split("-").map(Number);
      router.push(`/dashboard?month=${month}&year=${year}`);
    });
  };

  const currentValue = isAll ? "all" : `${currentYear}-${currentMonth}`;

  return (
    <Select
      value={currentValue}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-[200px]">
        {isPending ? (
          <span
            className="flex items-center gap-2 text-neutral-500"
            style={{ display: "flex" }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </span>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los meses</SelectItem>
        {months.map((m) => (
          <SelectItem
            key={`${m.year}-${m.month}`}
            value={`${m.year}-${m.month}`}
          >
            {MONTH_NAMES[m.month - 1]} {m.year} ({m.count})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
