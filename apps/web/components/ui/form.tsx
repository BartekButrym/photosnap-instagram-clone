import { cn } from "@/lib/utils";
import { ComponentProps } from "react";
import { useFormContext } from "react-hook-form";

function FormRootError({ className, ...props }: ComponentProps<"div">) {
  const { formState } = useFormContext();

  if (!formState.errors.root) {
    return null;
  }

  return (
    <div
      data-slot="form-root-error"
      className={cn(
        "bg-destructive/10 border border-destructive/2- text-destructive px-4 py-3 rounded-md text-sm",
        className,
      )}
      {...props}
    >
      {formState.errors.root.message}
    </div>
  );
}

export { FormRootError };
