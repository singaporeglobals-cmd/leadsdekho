"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  /** Currently selected values. Pass `["all"]` or empty array to mean "no filter". */
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  /** Label shown when nothing is selected. Default: placeholder. */
  allLabel?: string;
  className?: string;
  /** Width of the dropdown panel. Default: 220px. */
  panelWidth?: number;
  /** When true, shows a small "x" button on the trigger to clear. Default: true. */
  clearable?: boolean;
  /** When true, shows the "All" option at the top of the dropdown. Default: true. */
  showAllOption?: boolean;
}

/**
 * Multi-select dropdown built on Popover + Checkbox.
 *
 * - Value is an array of strings. Empty array means "no filter / show all".
 * - Clicking "All" clears the selection (sets to []).
 * - Clicking any option toggles it.
 * - The trigger button shows a count badge or the placeholder.
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select",
  allLabel,
  className,
  panelWidth = 220,
  clearable = true,
  showAllOption = true,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedCount = value.length;
  const displayLabel =
    selectedCount === 0
      ? (allLabel || placeholder)
      : selectedCount === 1
      ? options.find((o) => o.value === value[0])?.label || placeholder
      : `${selectedCount} selected`;

  const handleToggle = (val: string) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  const handleAll = () => {
    onChange([]);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-9 justify-between font-normal", className)}
        >
          <span className="flex items-center gap-1.5 truncate">
            {selectedCount > 0 && (
              <Badge variant="secondary" className="rounded-sm px-1 text-[10px] shrink-0">
                {selectedCount}
              </Badge>
            )}
            <span className="truncate">{displayLabel}</span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            {clearable && selectedCount > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onChange([]);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange([]);
                  }
                }}
                className="rounded-sm opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0"
        style={{ width: `${panelWidth}px` }}
      >
        <div className="max-h-[280px] overflow-y-auto py-1">
          {showAllOption && (
            <button
              type="button"
              onClick={handleAll}
              className={cn(
                "flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                selectedCount === 0 && "bg-accent/50"
              )}
            >
              <Check
                className={cn(
                  "h-3.5 w-3.5",
                  selectedCount === 0 ? "opacity-100" : "opacity-0"
                )}
              />
              <span className="font-medium">{allLabel || `All ${placeholder}`}</span>
            </button>
          )}
          {options.length === 0 && !showAllOption && (
            <div className="px-3 py-2 text-xs text-muted-foreground">No options</div>
          )}
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <label
                key={option.value}
                htmlFor={`ms-${option.value}`}
                className="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Checkbox
                  id={`ms-${option.value}`}
                  checked={checked}
                  onCheckedChange={() => handleToggle(option.value)}
                  className="pointer-events-none"
                />
                <span className="truncate flex-1">{option.label}</span>
              </label>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
