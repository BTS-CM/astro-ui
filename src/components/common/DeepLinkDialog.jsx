import React, { useState, useEffect, useMemo } from "react";

import { nanoquery } from "@nanostores/query";
import { useStore } from "@nanostores/react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import ExternalLink from "./ExternalLink";

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
        if (deeplinkValue && deeplinkValue.result) {
          const decompressed = fflate.decompressSync(fflate.strToU8(deeplinkValue.result, true));
          const finalResult = fflate.strFromU8(decompressed);

          if (finalResult.generatedDeepLink) {
            return finalResult.generatedDeepLink;
          }
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
  const { trxJSON, operationName, usrChain, headerText, dismissCallback, username, userID } =
    properties;

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

  const [activeTab, setActiveTab] = useState("object");

  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        dismissCallback(open);
      }}
    >
      <DialogContent className="sm:max-w-[800px] bg-white">
        <DialogHeader>
          <DialogTitle>{loading ? <>Generating deeplink...</> : <>{headerText}</>}</DialogTitle>
          <DialogDescription>
            With the account: {username} ({userID})<br />
            {!loading ? (
              <>
                Your Bitshares Beet operation is ready to broadcast!
                <br />
                Choose from the methods below to broadcast your transaction via the
                <ExternalLink
                  classNameContents="text-blue-500"
                  type="text"
                  text=" Bitshares BEET multiwallet"
                  hyperlink="https://github.com/bitshares/beet"
                />
                .
              </>
            ) : null}
            {error ? <>An error occurred, sorry. Please close this dialog and try again.</> : null}
          </DialogDescription>
        </DialogHeader>
        <>
          <hr className="mt-3" />
          <div className="grid grid-cols-1 gap-3">
            <Tabs defaultValue="object" className="w-full">
              <TabsList key={`${activeTab}_TabList`} className="grid w-full grid-cols-3 gap-2">
                {activeTab === "object" ? (
                  <TabsTrigger key="activeTRXTab" value="object">
                    View TRX Object
                  </TabsTrigger>
                ) : (
                  <TabsTrigger
                    value="object"
                    key="inactiveTRXTab"
                    onClick={() => setActiveTab("object")}
                  >
                    View TRX Object
                  </TabsTrigger>
                )}
                {activeTab === "deeplink" ? (
                  <TabsTrigger value="deeplink" key="activeDLTab">
                    Raw Deeplink
                  </TabsTrigger>
                ) : (
                  <TabsTrigger
                    value="deeplink"
                    key="inactiveDLTab"
                    onClick={() => setActiveTab("deeplink")}
                  >
                    Raw Deeplink
                  </TabsTrigger>
                )}
                {activeTab === "localJSON" ? (
                  <TabsTrigger key="activeJSONTab" value="localJSON" className="bg-muted">
                    Local JSON file
                  </TabsTrigger>
                ) : (
                  <TabsTrigger
                    value="localJSON"
                    key="inactiveJSONTab"
                    onClick={() => setActiveTab("localJSON")}
                  >
                    Local JSON file
                  </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="object">
                <div className="grid w-full gap-1.5 mb-3">
                  <Label className="text-left">Transaction object JSON</Label>
                  <span className="text-left text-sm">Operation type: {operationName}</span>
                  <Textarea
                    value={JSON.stringify(trxJSON, null, 4)}
                    className="min-h-[250px]"
                    id="trxJSON"
                    readOnly
                  />
                </div>
                <Button
                  onClick={() => {
                    copyToClipboard(JSON.stringify(trxJSON, null, 4));
                  }}
                >
                  Copy operation JSON
                </Button>
              </TabsContent>
              <TabsContent value="deeplink">
                <Label className="text-left">
                  Using a deeplink to broadcast via the Beet multiwallet
                </Label>
                <ol className="ml-4">
                  <li type="1">
                    Launch the BEET wallet and navigate to '<b>Raw Link</b>' in the menu, the wallet
                    has to remain unlocked for the duration of the broadcast.
                  </li>
                  <li type="1">
                    From this page you can either allow all operations, or solely allow operation '
                    <b>{operationName}</b>' (then click save).
                  </li>
                  <li type="1">
                    Once 'Ready for raw links' shows in Beet, then you can click the button below to
                    proceed.
                  </li>
                  <li type="1">
                    A BEET prompt will display, verify the contents, optionally request a Beet
                    receipt, and then broadcast the transaction onto the blockchain.
                  </li>
                  <li type="1">
                    You won't receive a confirmation in this window, but your operation will be
                    processed within seconds on the blockchain.
                  </li>
                </ol>
                {!loading ? (
                  <a href={`rawbeet://api?chain=BTS&request=${deeplink}`}>
                    <Button className="mt-4">Trigger raw Beet deeplink</Button>
                  </a>
                ) : null}
              </TabsContent>
              <TabsContent value="localJSON">
                <Label className="text-left">Via local file upload - ready to proceed</Label>

                <ol className="ml-4">
                  <li type="1">
                    Launch the BEET wallet and navigate to '<b>Local</b>' in the menu.
                  </li>
                  <li type="1">
                    At this page either allow all, or allow just operation '<b>{operationName}</b>'.
                  </li>
                  <li type="1">
                    Once at the local upload page, click the button below to download the JSON file
                    to your computer.
                  </li>
                  <li type="1">
                    From the BEET Local page, upload the JSON file, a prompt should then appear.
                  </li>
                  <li type="1">
                    Thoroughly verify the prompt's contents before approving any operation, also
                    consider toggling the optional receipt for post broadcast analysis and
                    verification purposes.
                  </li>
                </ol>

                {!loading && downloadClicked ? (
                  <Button className="mt-4" variant="outline" disabled>
                    Downloading...
                  </Button>
                ) : null}
                {!loading && !downloadClicked ? (
                  <a
                    href={`data:text/json;charset=utf-8,${deeplink}`}
                    download={`${operationName}.json`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleDownloadClick}
                  >
                    <Button className="mt-4">Download Beet operation JSON</Button>
                  </a>
                ) : null}
              </TabsContent>
            </Tabs>
          </div>
        </>
      </DialogContent>
    </Dialog>
  );
}
