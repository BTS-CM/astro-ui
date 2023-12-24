import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance } from "@/lib/i18n.js";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

/**
 * Launches a dialog prompt, prompting the user to verify their intent to launch a new tab to an external web resource
 */
export default function ExternalLink(properties) {
  const { hyperlink, type, text, variant, classnamecontents } = properties;
  const { t, i18n } = useTranslation("en", { i18n: i18nInstance });

  const [open, setOpen] = useState(false);

  const allowedDomains = [
    "https://blocksights.info/",
    "https://bts.exchange/",
    "https://wallet.btwty.com/",
    "https://ex.xbts.io/",
    "https://kibana.bts.mobi/",
    "https://www.bitsharescan.info/",
    "https://github.com/bitshares/beet",
  ]; // Crude counter-xss measure

  if (!allowedDomains.some((domain) => hyperlink.startsWith(domain))) {
    console.log("Invalid external link");
    return null;
  }

  return (
    <>
      {type === "text" ? (
        <span onClick={() => setOpen(true)} className={classnamecontents}>
          {text}
        </span>
      ) : (
        <Button variant={variant} onClick={() => setOpen(true)} className={classnamecontents}>
          {text}
        </Button>
      )}
      <Dialog
        open={open}
        onOpenChange={(open) => {
          setOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[500px] bg-white">
          <DialogHeader>
            <DialogTitle>{t("ExternalLink:dialogContent.leaveApp")}</DialogTitle>
            <DialogDescription>
              {t("ExternalLink:dialogContent.navigateToExternal")}
            </DialogDescription>
          </DialogHeader>
          <h3 className="scroll-m-20 text-1xl font-semibold tracking-tight mb-3 mt-1">
            {t("ExternalLink:dialogContent.proceedToURL")}
          </h3>
          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
            {hyperlink}
          </code>
          <h3 className="scroll-m-20 text-1xl font-semibold tracking-tight mb-3 mt-1">
            {t("ExternalLink:dialogContent.checkingLeave")}
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <a href={hyperlink} target="_blank">
              <Button color="gray" variant="outline">
                {t("ExternalLink:dialogContent.openLink")}
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
