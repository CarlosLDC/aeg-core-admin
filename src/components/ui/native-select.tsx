import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { formFieldNativeSelectClass } from "@/lib/toggle-button-styles";
import { cn } from "@/lib/utils";

export type NativeSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  wrapperClassName?: string;
};

export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => {
    return (
      <div className={cn("relative", wrapperClassName)}>
        <select
          ref={ref}
          className={cn(formFieldNativeSelectClass, className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
      </div>
    );
  },
);

NativeSelect.displayName = "NativeSelect";
