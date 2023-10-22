import React, { useState, useEffect, useMemo } from "react";

import { nanoquery } from "@nanostores/query";
import { useStore } from "@nanostores/react";

let refJSON = [];

// Create fetcher store
const [createFetcherStore] = nanoquery({
  fetcher: (...keys) => {
    return fetch(`http://localhost:8080/api/deeplink/${keys[0]}/${keys[1]}`, {
      method: "POST",
      body: JSON.stringify(refJSON),
    })
      .then(async (response) => {
        if (!response.ok) {
          console.log("Failed to generate deeplink");
          throw new Error("Failed to generate deeplink");
        }

        let parsedJSON;
        try {
          parsedJSON = await response.json();
        } catch (e) {
          console.log("Failed to parse JSON");
          throw new Error("Failed to parse JSON");
        }
        return parsedJSON;
      })
      .then((deeplinkValue) => {
        if (
          deeplinkValue &&
          deeplinkValue.result &&
          deeplinkValue.result.generatedDeepLink
        ) {
          return deeplinkValue.result.generatedDeepLink;
        }
        throw new Error("No deep link generated");
      });
  },
});

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { copyToClipboard, blockchainFloat } from "@/lib/common.js";

/**
 * Launches a dialog prompt, generating a deep link for the given operation.
 * Buttons link to the Beet multiwallet
 */
export default function DeepLinkDialog(properties) {
  const {
    trxJSON,
    operationName,
    usrChain,
    headerText,
    dismissCallback,
    username,
    userID,
  } = properties;

  const deepLinkStore = useMemo(() => {
    refJSON = trxJSON;
    return createFetcherStore([usrChain, operationName]);
  }, [usrChain, operationName, trxJSON]);

  const { data: deeplink, loading, error } = useStore(deepLinkStore);

  const [downloadClicked, setDownloadClicked] = useState(false);
  const handleDownloadClick = () => {
    if (!downloadClicked) {
      setDownloadClicked(true);
      setTimeout(() => {
        setDownloadClicked(false);
      }, 10000);
    }
  };

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        dismissCallback(open);
      }}
    >
      <DialogContent className="sm:max-w-[425px] bg-white">
        <>
          {loading ? (
            <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight">
              Generating deeplink...
            </h1>
          ) : (
            <h1 className="scroll-m-20 text-2xl font-extrabold tracking-tight">
              {headerText}
            </h1>
          )}
          {error ? (
            <h2>
              An error occurred, sorry. Please close this dialog and try again.
            </h2>
          ) : null}
          <h3 className="scroll-m-20 text-1xl font-semibold tracking-tight mb-3 mt-1">
            With the account: {username} ({userID})<br />
            {!loading ? (
              <>
                Your Bitshares create limit order operation is ready!
                <br />
                Use the links below to interact with the Beet wallet.
              </>
            ) : null}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <Button
              color="gray"
              className="w-full"
              onClick={() => {
                copyToClipboard(JSON.stringify(trxJSON, null, 4));
              }}
              variant="outline"
            >
              Copy operation JSON
            </Button>

            {downloadClicked ? (
              <Button variant="outline" disabled>
                Downloading...
              </Button>
            ) : (
              <a
                href={`data:text/json;charset=utf-8,${deeplink}`}
                download={`pool_exchange.json`}
                target="_blank"
                rel="noreferrer"
                onClick={handleDownloadClick}
              >
                <Button variant="outline" className="w-full">
                  Download Beet operation JSON
                </Button>
              </a>
            )}

            <a href={`rawbeet://api?chain=BTS&request=${deeplink}`}>
              <Button variant="outline" className="w-full">
                Trigger raw Beet deeplink
              </Button>
            </a>
          </div>
        </>
      </DialogContent>
    </Dialog>
  );
}
