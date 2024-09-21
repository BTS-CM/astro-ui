import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { InfoCircledIcon } from "@radix-ui/react-icons"

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

interface Props {
  alreadyDisabled: boolean;
  id: string;
  allowedText: string;
  enabledInfo: string;
  disabledText: string;
  disabledInfo: string;
  permission: boolean;
  flag: boolean;
  setFlag: (flag: boolean) => void;
}

interface MakeHoverProps {
  children: React.ReactNode;
}

export default function AssetFlag({
  alreadyDisabled,
  id,
  allowedText,
  enabledInfo,
  disabledText,
  disabledInfo,
  permission,
  flag,
  setFlag,
}: Props) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const disabledClass = alreadyDisabled || !permission ? "disabled-checkbox" : "";
 
  const MakeHover: React.FC<MakeHoverProps> = ({ children }) => {
    return (
      <HoverCard>
        <HoverCardTrigger>
          {children}
        </HoverCardTrigger>
        <HoverCardContent className={"w-80 mt-1"} align="start">
          <h4 className="scroll-m-20 text-md font-semibold tracking-tight">
            {t("Predictions:about")}: {id}
          </h4>
          <p className="leading-6 text-sm [&:not(:first-child)]:mt-1">
            {alreadyDisabled || !flag ? disabledInfo : enabledInfo}
          </p>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <span className="grid grid-cols-12">
        <span>
          {
            alreadyDisabled || !permission ? (
              <Checkbox checked={false} id={id} className="align-middle mr-2" disabled />
            ) : (
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
            )
          }
        </span>

        <span className="col-span-10">
          <MakeHover>
            {
              alreadyDisabled
                ? <Label htmlFor={id}>
                    {permission || disabledText}
                  </Label>
                : <Label htmlFor={id}>
                    {flag ? allowedText : disabledText}
                  </Label>
            }
          </MakeHover>
        </span>
        <MakeHover>
          <InfoCircledIcon className="text-gray-400 mt-3"/>
        </MakeHover>
    </span>
  );
}
