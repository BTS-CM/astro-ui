import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { CircleCheck } from "lucide-react";

/**
 * Controlled dialog showing the raw JSON of any blockchain object.
 * Same look as the limit-order JSON dialog (scrollable <pre> + copy).
 */
export default function ObjectJsonDialog({ open, onClose, title, description, data }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const json = JSON.stringify(data ?? null, null, 2);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && onClose) onClose(); }}>
      <DialogContent className="!bg-card border border-border text-foreground/85 sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-muted-foreground/80">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="grid grid-cols-1">
          <div className="col-span-1">
            <ScrollArea className="h-72 rounded-md border border-border bg-card/60 text-sm">
              <pre className="text-xs text-foreground/80 p-3 font-mono">
                {json}
              </pre>
            </ScrollArea>
            <Button
              variant="outline"
              className="mt-2 border-border bg-card/40 hover:border-[hsl(var(--accent-warning)/0.4)] hover:bg-[hsl(var(--accent-warning)/0.1)] text-foreground/80 hover:text-accent-foreground"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(json).catch(() => {});
                }
              }}
            >
              <CircleCheck className="h-3.5 w-3.5 mr-1.5" />
              {t("DeepLinkDialog:tabsContent.copyOperationJSON")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
