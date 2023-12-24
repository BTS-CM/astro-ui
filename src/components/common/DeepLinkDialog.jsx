import React, { useState, useEffect, useMemo } from "react";
import * as fflate from "fflate";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

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
          const _parsed = fflate.strFromU8(decompressed);
          const finalResult = JSON.parse(_parsed);
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
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

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
          <DialogTitle>
            {loading ? t("DeepLinkDialog:dialogContent.generatingDeeplink") : <>{headerText}</>}
          </DialogTitle>
          <DialogDescription>
            {t("DeepLinkDialog:dialogContent.withAccount", { username: username, userID: userID })}
            {!loading ? (
              <>
                {t("DeepLinkDialog:dialogContent.readyToBroadcast")}
                <br />
                {t("DeepLinkDialog:dialogContent.chooseMethod")}
                <ExternalLink
                  classnamecontents="text-blue-500"
                  type="text"
                  text={t("DeepLinkDialog:dialogContent.beetWallet")}
                  hyperlink="https://github.com/bitshares/beet"
                />
              </>
            ) : null}
            {error ? t("DeepLinkDialog:dialogContent.errorOccurred") : null}
          </DialogDescription>
        </DialogHeader>
        <>
          <hr className="mt-3" />
          <div className="grid grid-cols-1 gap-3">
            <Tabs defaultValue="object" className="w-full">
              <TabsList key={`${activeTab}_TabList`} className="grid w-full grid-cols-3 gap-2">
                <TabsTrigger key="TRXTab" value="object" onClick={() => setActiveTab("object")}>
                  {t("DeepLinkDialog:tabs.viewTRXObject")}
                </TabsTrigger>
                <TabsTrigger key="DLTab" value="deeplink" onClick={() => setActiveTab("deeplink")}>
                  {t("DeepLinkDialog:tabs.rawDeeplink")}
                </TabsTrigger>
                <TabsTrigger
                  key="JSONTab"
                  value="localJSON"
                  onClick={() => setActiveTab("localJSON")}
                >
                  {t("DeepLinkDialog:tabs.localJSONFile")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="object">
                <div className="grid w-full gap-1.5 mb-3">
                  <Label className="text-left">
                    {t("DeepLinkDialog:tabsContent.transactionObjectJSON")}
                  </Label>
                  <span className="text-left text-sm">
                    {t("DeepLinkDialog:tabsContent.operationType", {
                      operationName: operationName,
                    })}
                  </span>
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
                  {t("DeepLinkDialog:tabsContent.copyOperationJSON")}
                </Button>
              </TabsContent>
              <TabsContent value="deeplink">
                <Label className="text-left">{t("DeepLinkDialog:tabsContent.usingDeeplink")}</Label>
                <ol className="ml-4">
                  <li type="1">{t("DeepLinkDialog:tabsContent.step1")}</li>
                  <li type="1">
                    {t("DeepLinkDialog:tabsContent.step2", { operationName: operationName })}
                  </li>
                  <li type="1">{t("DeepLinkDialog:tabsContent.step3")}</li>
                  <li type="1">{t("DeepLinkDialog:tabsContent.step4")}</li>
                  <li type="1">{t("DeepLinkDialog:tabsContent.step5")}</li>
                </ol>
                {!loading ? (
                  <a
                    href={`rawbeet://api?chain=${
                      usrChain === "bitshares" ? "BTS" : "BTS_TEST"
                    }&request=${deeplink}`}
                  >
                    <Button className="mt-4">
                      {t("DeepLinkDialog:tabsContent.triggerRawBeet")}
                    </Button>
                  </a>
                ) : null}
              </TabsContent>
              <TabsContent value="localJSON">
                <Label className="text-left">{t("DeepLinkDialog:tabsContent.viaLocalFile")}</Label>
                <ol className="ml-4">
                  <li type="1">{t("DeepLinkDialog:tabsContent.step1Local")}</li>
                  <li type="1">
                    {t("DeepLinkDialog:tabsContent.step2Local", { operationName: operationName })}
                  </li>
                  <li type="1">{t("DeepLinkDialog:tabsContent.step3Local")}</li>
                  <li type="1">{t("DeepLinkDialog:tabsContent.step4Local")}</li>
                  <li type="1">{t("DeepLinkDialog:tabsContent.step5Local")}</li>
                </ol>
                {!loading && downloadClicked ? (
                  <Button className="mt-4" variant="outline" disabled>
                    {t("DeepLinkDialog:tabsContent.downloading")}
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
                    <Button className="mt-4">
                      {t("DeepLinkDialog:tabsContent.downloadBeetOperationJSON")}
                    </Button>
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
