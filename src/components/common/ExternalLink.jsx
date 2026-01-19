import React, { useState } from "react";
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

const _gradient = {
  backgroundImage: "var(--accent-gradient)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundSize: "400%",
  backgroundPosition: "0%",
};

const allowedDomains = [
  "https://www.electronjs.org/",
  "https://bitshareschain.com/",
  "https://bts.exchange/",
  "https://ex.xbts.io/",
  "https://kibana.bitshares.dev/",
  "https://github.com/bitshares/beet",
  "https://react.dev/",
  "https://github.com/",
  "https://astro.build/",
  "https://www.pinata.cloud/",
  "https://nft.storage/",
  "https://web3.storage/",
  "https://fleek.co/ipfs-gateway/",
  "https://infura.io/product/ipfs",
  "https://landing.storj.io/permanently-pin-with-storj-dcs",
  "https://www.eternum.io/",
  "https://blog.ipfs.io/2021-04-05-storing-nfts-on-ipfs/",
];

/**
 * Launches a dialog prompt, prompting the user to verify their intent to launch a new tab to an external web resource
 */
export default function ExternalLink(properties) {
  const { hyperlink, type, text, variant, classnamecontents, gradient } =
    properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const [open, setOpen] = useState(false);

  if (!allowedDomains.some((domain) => hyperlink.startsWith(domain))) {
    console.log("Invalid external link");
    return null;
  }

  return (
    <>
      {type === "text" ? (
        <span
          onClick={(event) => {
            setOpen(true);
            event.preventDefault();
          }}
          className={classnamecontents}
          style={gradient ? _gradient : null}
        >
          {text}
        </span>
      ) : (
        <Button
          variant={variant}
          onClick={(event) => {
            setOpen(true);
            event.preventDefault();
          }}
          className={classnamecontents}
        >
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
            <DialogTitle>
              {t("ExternalLink:dialogContent.leaveApp")}
            </DialogTitle>
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
            {window.electron ? (
              <Button
                color="gray"
                variant="outline"
                onClick={() => window.electron.openURL(hyperlink)}
              >
                {t("ExternalLink:dialogContent.openLink")}
              </Button>
            ) : (
              <a href={hyperlink} target="_blank">
                <Button color="gray" variant="outline">
                  {t("ExternalLink:dialogContent.openLink")}
                </Button>
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
