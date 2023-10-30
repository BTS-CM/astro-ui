import React, { useState } from "react";

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
  const { hyperlink, type, text, variant, classNameContents } = properties;

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
        <span onClick={() => setOpen(true)} className={classNameContents}>
          {text}
        </span>
      ) : (
        <Button
          variant={variant}
          onClick={() => setOpen(true)}
          className={classNameContents}
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
            <DialogTitle>⚠️ You are about to leave this app!</DialogTitle>
            <DialogDescription>
              You are about to nagivate to an external website.
            </DialogDescription>
          </DialogHeader>
          <h3 className="scroll-m-20 text-1xl font-semibold tracking-tight mb-3 mt-1">
            Do you want to proceed to the following URL?
          </h3>
          <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
            {hyperlink}
          </code>
          <h3 className="scroll-m-20 text-1xl font-semibold tracking-tight mb-3 mt-1">
            Just checking - are you sure you want to leave?
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <a href={hyperlink} target="_blank">
              <Button color="gray" variant="outline">
                Open Link
              </Button>
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
