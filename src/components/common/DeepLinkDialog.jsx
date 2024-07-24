import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { copyToClipboard } from "@/lib/common.js";

/**
 * Launches a dialog prompt, generating a deep link for the given operation.
 * Buttons link to the Beet/BeetEOS multiwallets
 */
export default function DeepLinkDialog(properties) {
  const { trxJSON, operationName, username, usrChain, userID, dismissCallback, headerText } =
    properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const [activeTab, setActiveTab] = useState("object");
  const [deeplink, setDeeplink] = useState();
  useEffect(() => {
    async function fetchDeeplink() {
      if (!window || !window.electron) {
        console.log("No electron window found, cannot fetch deeplink");
        return;
      }

      const response = await fetch(
        `http://localhost:8080/api/deeplink/${usrChain}/${operationName}`,
        {
          method: "POST",
          body: JSON.stringify(trxJSON),
        }
      );
  
      if (!response.ok) {
        console.log("Failed to fetch deeplink");
        return;
      }
  
      const responseContents = await response.json();
      
      setDeeplink(responseContents);
    }

    if (usrChain && operationName && trxJSON) {
      fetchDeeplink();
    }
  }, [usrChain, operationName, trxJSON]);

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
      <DialogContent className="sm:max-w-[800px] bg-white">
        <DialogHeader>
          <DialogTitle>
            {!deeplink ? t("DeepLinkDialog:dialogContent.generatingDeeplink") : <>{headerText}</>}
          </DialogTitle>
          <DialogDescription>
            {t("DeepLinkDialog:dialogContent.withAccount", { username: username, userID: userID })}
            {deeplink ? (
              <>
                <br />
                {t("DeepLinkDialog:dialogContent.readyToBroadcast")}
                <br />
                {t("DeepLinkDialog:dialogContent.chooseMethod")}
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        {activeTab ? (
          <>
            <hr className="mt-3" />
            <div className="grid grid-cols-1 gap-3">
              <Tabs
                defaultValue="object"
                className="w-full"
                key={deeplink ? "deeplinkLoaded" : "loading"}
              >
                <TabsList
                  key={`${activeTab ? activeTab : "loading"}_TabList`}
                  className="grid w-full grid-cols-3 gap-2"
                >
                  <TabsTrigger key="TRXTab" value="object" onClick={() => setActiveTab("object")}>
                    {t("DeepLinkDialog:tabs.viewTRXObject")}
                  </TabsTrigger>
                  <TabsTrigger
                    key="DLTab"
                    value="deeplink"
                    onClick={() => setActiveTab("deeplink")}
                  >
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
                  <Label className="text-left">
                    {t("DeepLinkDialog:tabsContent.usingDeeplink")}
                  </Label>
                  <ol className="ml-4">
                    <li type="1">{t("DeepLinkDialog:tabsContent.step1")}</li>
                    <li type="1">
                      {t("DeepLinkDialog:tabsContent.step2", { operationName: operationName })}
                    </li>
                    <li type="1">{t("DeepLinkDialog:tabsContent.step3")}</li>
                    <li type="1">{t("DeepLinkDialog:tabsContent.step4")}</li>
                    <li type="1">{t("DeepLinkDialog:tabsContent.step5")}</li>
                  </ol>
                  {deeplink ? (
                    <>
                      <a
                        href={`rawbeet://api?chain=${
                          usrChain === "bitshares" ? "BTS" : "BTS_TEST"
                        }&request=${deeplink}`}
                      >
                        <Button className="mt-4">
                          BEET
                        </Button>
                      </a>
                      <a
                        href={`rawbeeteos://api?chain=${
                          usrChain === "bitshares" ? "BTS" : "BTS_TEST"
                        }&request=${deeplink}`}
                      >
                        <Button className="mt-4 ml-3">
                          BeetEOS
                        </Button>
                      </a>
                    </>
                  ) : null}
                </TabsContent>
                <TabsContent value="localJSON">
                  <Label className="text-left">
                    {t("DeepLinkDialog:tabsContent.viaLocalFile")}
                  </Label>
                  <ol className="ml-4">
                    <li type="1">{t("DeepLinkDialog:tabsContent.step1Local")}</li>
                    <li type="1">
                      {t("DeepLinkDialog:tabsContent.step2Local", { operationName: operationName })}
                    </li>
                    <li type="1">{t("DeepLinkDialog:tabsContent.step3Local")}</li>
                    <li type="1">{t("DeepLinkDialog:tabsContent.step4Local")}</li>
                    <li type="1">{t("DeepLinkDialog:tabsContent.step5Local")}</li>
                  </ol>
                  {deeplink && downloadClicked ? (
                    <Button className="mt-4" variant="outline" disabled>
                      {t("DeepLinkDialog:tabsContent.downloading")}
                    </Button>
                  ) : null}
                  {deeplink && !downloadClicked ? (
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
