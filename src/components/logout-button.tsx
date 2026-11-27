import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  className?: string;
  formClassName?: string;
  textClassName?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "xs" | "lg" | "icon";
  showText?: boolean;
}

export function LogoutButton({
  className,
  formClassName,
  textClassName,
  variant = "ghost",
  size = "sm",
  showText = true,
}: LogoutButtonProps) {
  const resolvedFormClassName =
    formClassName ?? (className?.includes("w-full") ? "w-full" : "inline-block");

  return (
    <form action={logoutAction} className={resolvedFormClassName}>
      <Button
        type="submit"
        variant={variant}
        size={size}
        className={className}
        title="Keluar dari sistem"
        aria-label="Keluar dari sistem"
      >
        <LogOut className="size-4 shrink-0" aria-hidden="true" />
        {showText && <span className={textClassName}>Keluar</span>}
      </Button>
    </form>
  );
}
