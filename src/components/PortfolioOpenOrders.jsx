import React, {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { List } from "react-window";
// Table header is rendered as a simple grid to avoid extra scrollbars

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
  const [openOrdersLoading, setOpenOrdersLoading] = useState(false);
  const [orderID, setOrderID] = useState();
  const [showDialog, setShowDialog] = useState(false);
  useEffect(() => {
    async function fetchLimitOrders() {
      if (usr && usr.id) {
        const limitOrdersStore = createAccountLimitOrderStore([
          usr.chain,
          usr.id,
        ]);
        limitOrdersStore.subscribe(({ data, error, loading }) => {
          setOpenOrdersLoading(Boolean(loading));
          if (data && !error && !loading) {
            setOpenOrders(data);
          }
          if (!data && !loading && error) {
            setOpenOrders([]);
          }
        });
      }
    }
    fetchLimitOrders();
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

    // Price as QUOTE per BASE
    let priceDisplay = "-";
    if (sellAsset && buyAsset && Number(readableBaseAmount) > 0) {
      const price = Number(readableQuoteAmount) / Number(readableBaseAmount);
      priceDisplay = `${price.toLocaleString(undefined, {
        maximumFractionDigits: 8,
      })} ${buyAsset.symbol}/${sellAsset.symbol}`;
    }

    const expirationDate = new Date(expiration);
    const now = new Date();
    const timeDiff = expirationDate - now;
    const minutes = Math.floor((timeDiff / 1000 / 60) % 60);
    const hours = Math.floor((timeDiff / 1000 / 60 / 60) % 24);
    const days = Math.floor(timeDiff / 1000 / 60 / 60 / 24);
    const timeDiffString = `${days}d ${hours}h ${minutes}m`;

    const rightActions = (
      <>
        <a
          href={`/dex/index.html?market=${sellAsset?.symbol}_${buyAsset?.symbol}`}
        >
          <Button
            variant="outline"
            size="sm"
            className="bg-white hover:shadow-lg"
          >
            {t("PortfolioTabs:tradeButton")}
          </Button>
        </a>
        <a href={`/order/index.html?id=${orderId}`}>
          <Button
            variant="outline"
            size="sm"
            className="bg-white hover:shadow-lg"
          >
            {t("PortfolioTabs:updateButton")}
          </Button>
        </a>
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowDialog(true);
              setOrderID(orderId);
            }}
            className="bg-white hover:shadow-lg"
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
      </>
    );

    return (
      <>
        <div style={style} className="px-2 block md:hidden">
          <Dialog>
            <DialogTrigger asChild>
              <Card
                className="hover:bg-gray-50 w-full p-3"
                title={`${orderId} - ${timeDiffString}`}
              >
                <CardTitle className="text-sm">
                  {t("PortfolioTabs:sellingFor", {
                    baseAmount: readableBaseAmount,
                    baseSymbol: sellAsset?.symbol,
                    quoteAmount: readableQuoteAmount,
                    quoteSymbol: buyAsset?.symbol,
                  })}
                </CardTitle>
                <CardDescription>
                  {priceDisplay && priceDisplay !== "-"
                    ? `${priceDisplay.split(" ")[0]} ${buyAsset?.symbol}/${
                        sellAsset?.symbol
                      }`
                    : ""}
                </CardDescription>
              </Card>
            </DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader>
                <DialogTitle>{`${readableBaseAmount} ${sellAsset?.symbol} → ${readableQuoteAmount} ${buyAsset?.symbol}`}</DialogTitle>
                <DialogDescription>
                  <div className="grid grid-cols-1 gap-1">
                    <span>
                      <b>{t("PortfolioTabs:expirationHeader")}</b>:{" "}
                      {timeDiffString}
                    </span>
                    <span>
                      <b>{t("PortfolioTabs:priceHeader")}</b>: {priceDisplay}
                    </span>
                    <span>
                      <b>{t("PortfolioTabs:orderId")}</b> {orderId}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {rightActions}
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>

        {/* MD-only view: smaller text, no Order ID or Expiration columns */}
        <div style={style} className="px-2 hidden md:block lg:hidden">
          <Card className="hover:bg-gray-50 text-sm">
            <div className="grid grid-cols-[50%_110px_1fr] items-start gap-2 p-2 mb-2">
              <div>
                <div>
                  <a
                    href={`/dex/index.html?market=${sellAsset?.symbol}_${buyAsset?.symbol}`}
                    className="hover:text-blue-500"
                  >
                    {t("PortfolioTabs:sellingFor", {
                      baseAmount: readableBaseAmount,
                      baseSymbol: sellAsset?.symbol,
                      quoteAmount: readableQuoteAmount,
                      quoteSymbol: buyAsset?.symbol,
                    })}
                  </a>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("PortfolioTabs:tradingPair", {
                    baseAssetId: sellPriceBaseAssetId,
                    quoteAssetId: sellPriceQuoteAssetId,
                  })}
                </div>
              </div>
              <div
                title={`${
                  priceDisplay && priceDisplay !== "-"
                    ? priceDisplay.split(" ")[0]
                    : 0
                } ${buyAsset?.symbol}/${sellAsset?.symbol}`}
              >
                {priceDisplay && priceDisplay !== "-"
                  ? priceDisplay.split(" ")[0]
                  : "?"}
              </div>
              <span className="flex items-center justify-end gap-1">
                {rightActions}
              </span>
            </div>
          </Card>
        </div>

        {/* LG+ view: existing 5-column layout with Order ID and Expiration */}
        <div style={style} className="px-2 hidden lg:block text-sm">
          <Card className="hover:bg-gray-50">
            <div className="grid grid-cols-[40%_1fr_1fr_1fr_1fr] items-start gap-2 p-2 mb-2">
              <div>
                <div>
                  <a
                    href={`/dex/index.html?market=${sellAsset?.symbol}_${buyAsset?.symbol}`}
                    className="hover:text-blue-500"
                  >
                    {t("PortfolioTabs:sellingFor", {
                      baseAmount: readableBaseAmount,
                      baseSymbol: sellAsset?.symbol,
                      quoteAmount: readableQuoteAmount,
                      quoteSymbol: buyAsset?.symbol,
                    })}
                  </a>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("PortfolioTabs:tradingPair", {
                    baseAssetId: sellPriceBaseAssetId,
                    quoteAssetId: sellPriceQuoteAssetId,
                  })}
                </div>
              </div>
              <div className="truncate">
                <ExternalLink
                  classnamecontents="hover:text-blue-500"
                  type="text"
                  text={`${orderId}`}
                  hyperlink={`https://explorer.bitshares.ws/#/objects/${orderId}${
                    usr.chain === "bitshares" ? "" : "?network=testnet"
                  }`}
                />
              </div>
              <div>{timeDiffString}</div>
              <div>
                <div>
                  {priceDisplay && priceDisplay !== "-"
                    ? priceDisplay.split(" ")[0]
                    : "-"}
                </div>
                {priceDisplay && priceDisplay !== "-" ? (
                  <div className="text-xs text-muted-foreground">
                    {buyAsset?.symbol}/{sellAsset?.symbol}
                  </div>
                ) : null}
              </div>
              <span className="flex items-center justify-end gap-2">
                {rightActions}
              </span>
            </div>
          </Card>
        </div>
      </>
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
            {openOrdersLoading ? (
              <div className="flex items-center gap-3">
                <Spinner />
                <p>{t("Market:loading")}</p>
              </div>
            ) : openOrders && openOrders.length ? (
              <div>
                {/* MD-only header: no Order ID or Expiration, smaller text */}
                <span className="hidden md:block lg:hidden">
                  <div className="grid grid-cols-[50%_110px_1fr] items-center h-10 px-2 text-muted-foreground font-medium text-sm">
                    <div className="text-left">
                      {t("PortfolioTabs:descriptionHeader")}
                    </div>
                    <div className="text-left">
                      {t("PortfolioTabs:priceHeader")}
                    </div>
                    <div className="text-left">
                      {t("PortfolioTabs:actionsHeader")}
                    </div>
                  </div>
                </span>
                {/* LG+ header: original 5 columns */}
                <span className="hidden lg:block">
                  <div className="grid grid-cols-[40%_1fr_1fr_1fr_1fr] items-center h-10 px-2 text-muted-foreground font-medium">
                    <div className="text-left">
                      {t("PortfolioTabs:descriptionHeader")}
                    </div>
                    <div className="text-left">
                      {t("PortfolioTabs:orderIdHeader")}
                    </div>
                    <div className="text-left">
                      {t("PortfolioTabs:expirationHeader")}
                    </div>
                    <div className="text-left">
                      {t("PortfolioTabs:priceHeader")}
                    </div>
                    <div className="text-left">
                      {t("PortfolioTabs:actionsHeader")}
                    </div>
                  </div>
                </span>
                <div className="max-h-[500px] overflow-auto">
                  <List
                    rowComponent={OpenOrdersRow}
                    rowCount={openOrders.length}
                    rowHeight={80}
                    rowProps={{}}
                  />
                </div>
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
              disabled={openOrdersLoading}
              aria-busy={openOrdersLoading}
            >
              {t("PortfolioTabs:refreshOpenOrdersButton")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
