import { useState } from "react";
import { Clock3 } from "lucide-react";

import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../utils";

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

type Period = "AM" | "PM";

type TimeParts = {
  hour12: number;
  minute: number;
  period: Period;
};

const DEFAULT_TIME: TimeParts = {
  hour12: 9,
  minute: 0,
  period: "AM",
};

const HOURS = Array.from({ length: 12 }, (_, idx) => idx + 1);
const MINUTES = Array.from({ length: 12 }, (_, idx) => idx * 5);

function toTimeParts(value: string): TimeParts | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour24) || Number.isNaN(minute) || hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const period: Period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return { hour12, minute, period };
}

function to24Hour(hour12: number, minute: number, period: Period): string {
  const normalizedHour = hour12 % 12;
  const hour24 = period === "PM" ? normalizedHour + 12 : normalizedHour;

  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toDisplay(value: string): string {
  const parts = toTimeParts(value);
  if (!parts) {
    return "";
  }

  return `${parts.hour12}:${String(parts.minute).padStart(2, "0")} ${parts.period}`;
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);

  const selected = toTimeParts(value) ?? DEFAULT_TIME;

  const updateTime = (next: Partial<TimeParts>) => {
    const merged: TimeParts = {
      hour12: next.hour12 ?? selected.hour12,
      minute: next.minute ?? selected.minute,
      period: next.period ?? selected.period,
    };

    onChange(to24Hour(merged.hour12, merged.minute, merged.period));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start bg-card text-left font-normal hover:bg-muted/50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock3 className="mr-2 h-4 w-4" />
          {value ? toDisplay(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-3" align="start">
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Hour</p>
            <div className="grid grid-cols-4 gap-2">
              {HOURS.map((hour) => (
                <Button
                  key={hour}
                  type="button"
                  size="sm"
                  variant={selected.hour12 === hour ? "default" : "outline"}
                  onClick={() => updateTime({ hour12: hour })}
                >
                  {hour}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Minute</p>
            <div className="grid grid-cols-4 gap-2">
              {MINUTES.map((minute) => (
                <Button
                  key={minute}
                  type="button"
                  size="sm"
                  variant={selected.minute === minute ? "default" : "outline"}
                  onClick={() => updateTime({ minute })}
                >
                  {String(minute).padStart(2, "0")}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Period</p>
            <div className="grid grid-cols-2 gap-2">
              {(["AM", "PM"] as const).map((period) => (
                <Button
                  key={period}
                  type="button"
                  variant={selected.period === period ? "default" : "outline"}
                  onClick={() => {
                    updateTime({ period });
                    setOpen(false);
                  }}
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
