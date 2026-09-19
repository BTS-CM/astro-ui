import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";

interface HoverInfoProps {
  header: string;
  content: string;
  type: string | null;
}

export default function HoverInfo({ header, content, type }: HoverInfoProps) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {!type ? (
          <Label className="mb-2 cursor-default leading-relaxed">{header}</Label>
        ) : (
          <Label className="text-xl text-semibold mb-3 cursor-default leading-snug">{header}</Label>
        )}
      </HoverCardTrigger>
      <HoverCardContent
        className="w-80"
        side="bottom"
        align="start"
        sideOffset={2}
        avoidCollisions={false}
      >
        <h4 className="scroll-m-20 text-md font-semibold tracking-tight">
          <div className="flex items-center">
            <span>{t("AssetCommon:about")}:</span>
            <span className="ml-2">{header}</span>
          </div>
        </h4>
        <p className="leading-6 text-sm [&:not(:first-child)]:mt-1">
          {content}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
