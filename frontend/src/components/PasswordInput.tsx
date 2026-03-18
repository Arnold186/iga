import React, { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  showToggleLabel?: boolean;
}

export const PasswordInput: React.FC<Props> = ({ label, showToggleLabel = false, ...rest }) => {
  const [show, setShow] = useState(false);
  const id = useId();

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative flex items-center">
        <Input id={id} type={show ? "text" : "password"} className="pr-20" {...rest} />
        <div className="absolute right-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          {showToggleLabel && (
            <button
              type="button"
              className="cursor-pointer hover:text-foreground"
              onClick={() => setShow((s) => !s)}
            >
              {show ? "Hide" : "Show"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

