import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props {
  alreadyDisabled: boolean;
  id: string;
  allowedText: string;
  disabledText: string;
  permission: boolean;
  flag: boolean;
  setFlag: (flag: boolean) => void;
}

export default function AssetFlag({
  alreadyDisabled,
  id,
  allowedText,
  disabledText,
  permission,
  flag,
  setFlag,
}: Props) {
  const disabledClass = alreadyDisabled || !permission ? "disabled-checkbox" : "";

  if (alreadyDisabled || !permission) {
    return (
      <div key={`div_${id}`}>
        <Checkbox checked={false} id={id} className="align-middle mr-2" disabled />
        <Label htmlFor={id}>{disabledText}</Label>
        <br />
      </div>
    );
  }

  return (
    <div key={`div_${id}`}>
      <Checkbox
        onClick={(e) => {
          const target = e.target as Element;
          const isChecked = target.getAttribute("aria-checked") === "true";
          setFlag(!isChecked);
        }}
        id={id}
        className={`align-middle mr-2 ${disabledClass}`}
        checked={flag}
      />
      <Label htmlFor={id}>{flag ? allowedText : disabledText}</Label>
      <br />
    </div>
  );
}
