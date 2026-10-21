"use client";

import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { focusRelationshipOption } from "../lib/option-keyboard";

type Choice = { value: string; label: string; disabled?: boolean };
type Props = {
  children?: ReactNode;
  name?: string;
  id?: string;
  value?: string | number;
  defaultValue?: string | number;
  onValueChange?(value: string): void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};
function labelText(children: ReactNode): string {
  return Children.toArray(children).map(child => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return isValidElement<{ children?: ReactNode }>(child) ? labelText(child.props.children) : "";
  }).join("");
}
function choices(children: ReactNode): Choice[] {
  const result: Choice[] = [];
  Children.forEach(children, child => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) return;
    if (child.type === Fragment) result.push(...choices(child.props.children));
    else if (child.type === "option") result.push({ value: String(child.props.value ?? labelText(child.props.children)), label: labelText(child.props.children), disabled: child.props.disabled });
  });
  return result;
}

/** The visible text of a wrapping <label>, excluding this control's own subtree. */
export function wrappingLabelText(control: HTMLElement): string {
  const label = control.closest("label");
  if (!label) return "";
  return Array.from(label.childNodes)
    .filter(node => !node.contains(control))
    .map(node => node.textContent ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Construction's searchable single selector with genuine native form
 * transport. The painted trigger is named by its visible field label (an
 * explicit aria-label, or the wrapping <label> text), never by the transport
 * name. It is a select-only combobox (native button, listbox popup), so the
 * invalid state and its error message sit on that trigger. */
export function FormSelect({ children, name, id, value, defaultValue, onValueChange, required, disabled, className, "aria-label": ariaLabel }: Props) {
  const options = choices(children);
  const [selected, setSelected] = useState(() => String(defaultValue ?? options[0]?.value ?? ""));
  const current = value === undefined ? selected : String(value);
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const listId = useId();
  const errorId = useId();
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const empty = options.find(option => option.value === "");
  const chosen = current === "" ? undefined : options.find(option => option.value === current);
  const placeholder = empty?.label || "Select…";
  const label = ariaLabel || fieldLabel || undefined;
  const isDisabled = disabled || !options.length;
  const matches = options.filter(option => !option.disabled && option.label.toLowerCase().includes(search.toLowerCase()));
  useEffect(() => {
    if (!ariaLabel && container.current) setFieldLabel(wrappingLabelText(container.current));
  }, [ariaLabel]);
  function commit(next: string) { setSelected(next); setInvalid(false); onValueChange?.(next); }
  function toggle(next: boolean) { setOpen(next); if (!next) setSearch(""); }
  return <div id={id} ref={container} className="min-w-0">
    <Popover open={open} onOpenChange={toggle}>
      <PopoverTrigger asChild>
        <button ref={trigger} type="button" role="combobox" disabled={isDisabled} aria-label={label}
          aria-controls={listId} aria-haspopup="listbox" aria-expanded={open}
          onKeyDown={event => { if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) { event.preventDefault(); toggle(true); } }}
          aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : undefined} aria-errormessage={invalid ? errorId : undefined}
          className={cn("flex min-h-11 w-full cursor-pointer items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-left ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive", className)}>
          <span className="min-w-0 flex-1 truncate text-left text-base">{chosen?.label ?? placeholder}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      {/* Pinned Radix Popper rewrites inline animation styles. Keep frequent
          keyboard choices unscaled, and unmount closed interactive content. */}
      {open && <PopoverContent onKeyDown={focusRelationshipOption} className="animate-none! max-h-(--radix-popover-content-available-height) w-[var(--radix-popover-trigger-width)] max-w-[400px] overflow-y-auto p-0" align="start">
        <div className="border-b px-3">
          <input aria-label="Search options" placeholder="Search..." value={search} onChange={event => setSearch(event.target.value)}
            className="min-h-11 w-full min-w-11 bg-transparent text-base outline-none" />
        </div>
        <div id={listId} role="listbox" aria-label={label ?? placeholder} className="max-h-72 overflow-y-auto p-1">
          {matches.length === 0 ? <p role="status" className="p-3 text-sm">No matching options</p>
            : matches.map(option => <button key={option.value} type="button" role="option" aria-selected={chosen?.value === option.value}
              onClick={() => { commit(option.value); toggle(false); }}
              className={cn("flex min-h-11 w-full min-w-11 items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none", chosen?.value === option.value && "bg-accent")}>
              <span className="min-w-0 flex-1 break-words">{option.label}</span>
              {chosen?.value === option.value && <Check className="size-4 shrink-0" aria-hidden="true" />}
            </button>)}
        </div>
      </PopoverContent>}
    </Popover>
    <select aria-hidden="true" tabIndex={-1} style={{ display: "none" }} name={name} value={current} required={required} disabled={disabled || !options.length}
      onChange={event => commit(event.target.value)}
      onInvalid={event => { event.preventDefault(); setInvalid(true); trigger.current?.focus(); }}>
      <option value="">{empty?.label ?? "Select…"}</option>
      {options.filter(option => option.value !== "").map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
    </select>
    {invalid && <span id={errorId} role="alert" className="block text-sm text-destructive">Select an option.</span>}
  </div>;
}
