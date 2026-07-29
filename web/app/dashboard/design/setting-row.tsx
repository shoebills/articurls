import { Switch } from "@/components/ui/switch";

export function SettingRow({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="font-medium">{label}</p>
        <Switch
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
        />
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
