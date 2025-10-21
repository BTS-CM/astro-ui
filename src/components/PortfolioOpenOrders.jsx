import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createAccountLimitOrderStore } from "@/nanoeffects/AccountLimitOrders.ts";

import { $currentUser } from "@/stores/users.ts";
import { $blockList } from "@/stores/blocklist.ts";
import { $currentNode } from "@/stores/node.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import ExternalLink from "./common/ExternalLink.jsx";
import { humanReadableFloat } from "@/lib/common";

export default function PortfolioOpenOrders({
  _assetsBTS,
  _assetsTEST,
  _poolsBTS,
  _poolsTEST,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const blocklist = useSyncExternalStore(
    $blockList.subscribe,
    $blockList.get,
    () => true
  );
  useStore($currentNode); // keep reactive to node changes (orders store doesn't take node url)

  const _chain = useMemo(
    () => (usr && usr.chain ? usr.chain : "bitshares"),
    [usr]
  );

  const assets = useMemo(() => {
    if (!_chain || (!_assetsBTS && !_assetsTEST)) return [];
    if (_chain !== "bitshares") return _assetsTEST;
    const relevantAssets = _assetsBTS.filter((asset) => {
      return !blocklist.users.includes(
        toHex(sha256(utf8ToBytes(asset.issuer)))
      );
    });
    return relevantAssets;
  }, [blocklist, _assetsBTS, _assetsTEST, _chain]);

  useInitCache(_chain ?? "bitshares", []);

  const [openOrderCounter, setOpenOrderCounter] = useState(0);
  const [openOrders, setOpenOrders] = useState();
  const [orderID, setOrderID] = useState();
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    let unsubscribeLimitOrdersStore;
    if (usr && usr.id) {
      const limitOrdersStore = createAccountLimitOrderStore([
        usr.chain,
        usr.id,
      ]);
      unsubscribeLimitOrdersStore = limitOrdersStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            setOpenOrders(data);
          }
        }
      );
    }
    return () => {
      if (unsubscribeLimitOrdersStore) unsubscribeLimitOrdersStore();
    };
  }, [usr, openOrderCounter]);

  const OpenOrdersRow = ({ index, style }) => {
    const order = openOrders[index];
    const sellPriceBaseAmount = order.sell_price.base.amount;
    const sellPriceBaseAssetId = order.sell_price.base.asset_id;
    const sellPriceQuoteAmount = order.sell_price.quote.amount;
    const sellPriceQuoteAssetId = order.sell_price.quote.asset_id;
    const orderId = order.id;
    const expiration = order.expiration;

    const sellAsset =
      assets.find((asset) => asset.id === sellPriceBaseAssetId) || null;
    const buyAsset =
      assets.find((asset) => asset.id === sellPriceQuoteAssetId) || null;

    const readableBaseAmount = sellAsset
      ? humanReadableFloat(sellPriceBaseAmount, sellAsset.precision)
      : sellPriceBaseAmount;
    const readableQuoteAmount = buyAsset
      ? humanReadableFloat(sellPriceQuoteAmount, buyAsset.precision)
      : sellPriceQuoteAmount;

    const expirationDate = new Date(expiration);
    const now = new Date();
    const timeDiff = expirationDate - now;
    const minutes = Math.floor((timeDiff / 1000 / 60) % 60);
    const hours = Math.floor((timeDiff / 1000 / 60 / 60) % 24);
    const days = Math.floor(timeDiff / 1000 / 60 / 60 / 24);
    const timeDiffString = `${days}d ${hours}h ${minutes}m`;

    return (
      <div style={{ ...style }}>
        <Card>
          <div className="grid grid-cols-6">
            <div className="col-span-4">
              <CardHeader>
                <CardTitle>
                  {t("PortfolioTabs:sellingFor", {
                    baseAmount: readableBaseAmount,
                    baseSymbol: sellAsset?.symbol,
                    quoteAmount: readableQuoteAmount,
                    quoteSymbol: buyAsset?.symbol,
                  })}
                </CardTitle>
                <CardDescription>
                  {t("PortfolioTabs:tradingPair", {
                    baseAssetId: sellPriceBaseAssetId,
                    quoteAssetId: sellPriceQuoteAssetId,
                  })}
                  <br />
                  {t("PortfolioTabs:orderId")}
                  <ExternalLink
                    classnamecontents="text-blue-500"
                    type="text"
                    text={` ${orderId}`}
                    hyperlink={`https://explorer.bitshares.ws/#/objects/${orderId}${
                      usr.chain === "bitshares" ? "" : "?network=testnet"
                    }`}
                  />
                  <br />
                  {t("PortfolioTabs:expires", { timeDiff: timeDiffString })}
                </CardDescription>
              </CardHeader>
            </div>
            <div className="col-span-2 pt-6">
              <a
                href={`/dex/index.html?market=${sellAsset?.symbol}_${buyAsset?.symbol}`}
              >
                <Button variant="outline">
                  {t("PortfolioTabs:tradeButton")}
                </Button>
              </a>
              <a href={`/order/index.html?id=${orderId}`}>
                <Button variant="outline" className="mb-3 ml-3">
                  {t("PortfolioTabs:updateButton")}
                </Button>
              </a>
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDialog(true);
                    setOrderID(orderId);
                  }}
                >
                  {t("PortfolioTabs:cancelButton")}
                </Button>
                {showDialog && orderId === orderID ? (
                  <DeepLinkDialog
                    operationNames={["limit_order_cancel"]}
                    username={usr.username}
                    usrChain={usr.chain}
                    userID={usr.id}
                    dismissCallback={setShowDialog}
                    key={`Cancelling${readableBaseAmount}${sellAsset?.symbol}for${readableQuoteAmount}${buyAsset?.symbol}`}
                    headerText={t("PortfolioTabs:cancelOffer", {
                      baseAmount: readableBaseAmount,
                      baseSymbol: sellAsset?.symbol,
                      quoteAmount: readableQuoteAmount,
                      quoteSymbol: buyAsset?.symbol,
                    })}
                    trxJSON={[
                      {
                        fee_paying_account: usr.id,
                        order: orderID,
                        extensions: [],
                      },
                    ]}
                  />
                ) : null}
              </>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="container mx-auto mt-5 mb-5">
      <div className="grid grid-cols-1 mt-5">
        <Card>
          <CardHeader>
            <CardTitle>{t("PortfolioTabs:openOrdersTitle")}</CardTitle>
            <CardDescription>
              {t("PortfolioTabs:openOrdersDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {openOrders && openOrders.length ? (
              <div className="max-h-[500px] overflow-auto">
                <List
                  rowComponent={OpenOrdersRow}
                  rowCount={openOrders.length}
                  rowHeight={145}
                  rowProps={{}}
                />
              </div>
            ) : (
              <p>{t("PortfolioTabs:noOpenOrdersFound")}</p>
            )}
          </CardContent>
          <div className="px-6 pb-6">
            <Button
              onClick={() => {
                setOpenOrders();
                setOpenOrderCounter(openOrderCounter + 1);
              }}
            >
              {t("PortfolioTabs:refreshOpenOrdersButton")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
