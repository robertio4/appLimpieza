"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  // Reset spinner when navigation completes (searchParams change)
  useEffect(() => {
    setIsNavigating(false);
  }, [searchParams]);

  const handleChange = (value: string) => {
    setIsNavigating(true);
    if (value === "all") {
      router.push("/dashboard?all=true");
      return;
    }
    const [year, month] = value.split("-").map(Number);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month.toString());
    params.set("year", year.toString());
    params.delete("all");
    router.push(`/dashboard?${params.toString()}`);
  };

  const currentValue = isAll ? "all" : `${currentYear}-${currentMonth}`;

  return (
    <Select
      value={currentValue}
      onValueChange={handleChange}
      disabled={isNavigating}
    >
      <SelectTrigger className="w-[200px]">
        {isNavigating ? (
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
