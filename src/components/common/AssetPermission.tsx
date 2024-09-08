import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Props {
  alreadyDisabled: boolean;
  id: string;
  allowedText: string;
  disabledText: string;
  permission: boolean;
  setPermission: (permission: boolean) => void;
  flag: boolean;
  setFlag: (flag: boolean) => void;
}

export default function AssetPermission({
  alreadyDisabled,
  id,
  allowedText,
  disabledText,
  permission,
  setPermission,
  flag,
  setFlag,
}: Props) {
  const lbl = (
    <Label htmlFor={id}>{permission || alreadyDisabled ? allowedText : disabledText}</Label>
  );

  if (alreadyDisabled) {
    return (
      <>
        <Checkbox checked={false} id={id} className="align-middle mr-2" disabled />
        {lbl}
        <br />
      </>
    );
  }

  return (
    <>
      <Checkbox
        onClick={(e) => {
          const target = e.target as Element;
          const isChecked = target.getAttribute("aria-checked") === "true";
          setPermission(!isChecked);
          if (!isChecked && flag) {
            setFlag(false);
          }
        }}
        id={id}
        className="align-middle mr-2"
        checked={permission}
      />
      {lbl}
      <br />
    </>
  );
}
