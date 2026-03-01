"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTH_NAMES } from "@/lib/constants";
import type { MonthWithInvoices } from "@/lib/actions/dashboard";

interface MonthSelectorProps {
  months: MonthWithInvoices[];
  currentMonth: number;
  currentYear: number;
}

export function MonthSelector({
  months,
  currentMonth,
  currentYear,
}: MonthSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", month.toString());
    params.set("year", year.toString());
    router.push(`/dashboard?${params.toString()}`);
  };

  const currentValue = `${currentYear}-${currentMonth}`;

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
            {MONTH_NAMES[m.month - 1]} {m.year} ({m.count})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
