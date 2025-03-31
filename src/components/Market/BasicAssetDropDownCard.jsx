import React, { useState, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { GearIcon } from "@radix-ui/react-icons";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { $favouriteAssets } from "@/stores/favourites.ts";

/**
 * Creating a basic asset dropdown component
 * @param {String} assetSymbol current asset symbol
 * @param {Function} storeCallback setState
 * @param {String} otherAsset market pair asset
 * @returns {JSX.Element}
 */
export default function BasicAssetDropDown(properties) {
  const {
    assetSymbol,
    assetData,
    storeCallback,
    otherAsset,
    marketSearch,
    type,
    size,
    chain,
    borrowPositions,
    usrBalances,
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState(type === "quote" ? "balance" : "borrowed");
  const favouriteAssets = useStore($favouriteAssets);

  const [featuredMode, setFeaturedMode] = useState("bitAssets");
  const featuredAssets = useMemo(() => {
    if (!chain || !marketSearch || !marketSearch.length) {
      return [];
    }
    let _featuredSymbols = [];
    let _featuredIssuers = [];
    if (featuredMode === "bitAssets") {
      _featuredSymbols = [];
      _featuredIssuers = ["committee-account"];
    } else if (featuredMode === "HONEST") {
      _featuredSymbols = ["HONEST.", "honest."];
      _featuredIssuers = ["honest-quorum"];
    } else if (featuredMode === "XBTS") {
      _featuredSymbols = ["XBTSX.", "xbtsx."];
      _featuredIssuers = [];
    } else if (featuredMode === "BTWTY") {
      _featuredSymbols = ["BTWTY.", "btwty."];
      _featuredIssuers = [];
    } else if (featuredMode === "ARTCASA") {
      _featuredSymbols = ["ARTCASA.", "artcasa."];
      _featuredIssuers = ["artcasa-fine"];
    } else if (featuredMode === "NFTEA") {
      _featuredSymbols = ["NFTEA.", "nftea."];
      _featuredIssuers = ["nftprofessional1"];
    }

    let _featuredAssets = marketSearch.filter((asset) => {
      if (chain === "bitshares") {
        if (_featuredIssuers.includes(asset.u.split(" ")[0])) {
          return true;
        }
        if (_featuredSymbols.some((str) => asset.s.includes(str))) {
          return true;
        }
      }
      return false;
    });

    return _featuredAssets;
  }, [assetSymbol, otherAsset, marketSearch, chain, featuredMode]);

  const _favouriteAssets = useMemo(() => {
    if (!chain || !favouriteAssets) {
      return [];
    }

    const _chainAssets = favouriteAssets[chain];

    if (!assetSymbol && !otherAsset) {
      return _chainAssets;
    }

    return _chainAssets.filter((asset) =>
      assetSymbol && otherAsset
        ? asset.symbol !== assetSymbol && asset.symbol !== otherAsset
        : asset.symbol !== assetSymbol
    );
  }, [favouriteAssets, assetSymbol, otherAsset, chain]);

  const Row = ({ index, style }) => {
    let res;
    if (mode === "featured") {
      res = featuredAssets[index];
    } else if (mode === "favourites") {
      res = _favouriteAssets[index];
    } else if (mode === "borrowed") {
      const uniqueBorrowPositions = [];
      const seenAssetTypes = new Set();
      borrowPositions.forEach((position) => {
        if (!seenAssetTypes.has(position.asset_id)) {
          uniqueBorrowPositions.push(position);
          seenAssetTypes.add(position.asset_id);
        }
      });

      res = uniqueBorrowPositions[index];
    } else if (mode === "balance") {
      res = usrBalances[index];
    }

    if (!res || !marketSearch) {
      return;
    }

    return (
      <div style={{ ...style, marginBottom: "10px", paddingRight: "10px" }}>
        <Card
          key={`acard-${res.id}`}
          style={{ marginBottom: "2px" }}
          onClick={() => {
            setTimeout(() => {
              if (mode === "featured") {
                storeCallback(res.s);
              } else if (mode === "favourites") {
                storeCallback(res.symbol);
              } else if (mode === "borrowed" || mode === "balance") {
                const _asset = marketSearch.find(
                  (asset) => asset.id === res.asset_id
                );
                storeCallback(_asset ? _asset.s : "");
              }
            }, 0);
            setDialogOpen(false);
          }}
        >
          <CardHeader className="p-3">
            <CardTitle className="h-3">
              {mode === "featured" ? `${res.s} (${res.id})` : null}
              {mode === "favourites" ? `${res.symbol} (${res.id})` : null}
              {mode === "borrowed" ||
              (mode === "balance" && marketSearch && marketSearch.length && res)
                ? `${
                    marketSearch.find((asset) => asset.id === res.asset_id).s
                  } (${res.asset_id})`
                : null}
            </CardTitle>
            <CardDescription>
              {mode === "featured"
                ? t("AssetDropDownCard:issued", { user: res.u })
                : null}
              {mode === "favourites"
                ? t("AssetDropDownCard:issued", { user: res.issuer })
                : null}
              {mode === "borrowed" || mode === "balance"
                ? t("AssetDropDownCard:issued", {
                    user: marketSearch.find(
                      (asset) => asset.id === res.asset_id
                    ).u,
                  })
                : null}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
      }}
    >
      <DialogTrigger asChild>
        {size && size === "cog" ? (
          <GearIcon onClick={() => setDialogOpen(true)} />
        ) : (
          <Button
            variant={
              type === "base" || type === "backing" ? "outline" : "primary"
            }
            className={`${size && size === "small" ? "h-7 " : ""}p-3 ${
              type === "quote" ? "bg-black hover:bg-gray-700 text-white" : ""
            } hover:shadow-lg`}
            onClick={() => setDialogOpen(true)}
          >
            {!assetSymbol ? t("AssetDropDownCard:select") : null}
            {!size && assetSymbol ? t("AssetDropDownCard:change") : null}
            {size && assetSymbol && assetSymbol.length < 12
              ? assetSymbol
              : null}
            {size && assetSymbol && assetSymbol.length >= 12
              ? assetData.id
              : null}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-white">
        <DialogHeader>
          <DialogTitle>
            <h3 className="text-2xl font-extrabold tracking-tight">
              {assetSymbol
                ? t("AssetDropDownCard:replacing", { assetSymbol: assetSymbol })
                : t("AssetDropDownCard:selecting")}
            </h3>
          </DialogTitle>
        </DialogHeader>
        <>
          <div className="grid grid-cols-4 gap-1">
            <Button
              variant={mode === "borrowed" ? "" : "outline"}
              size="sm"
              onClick={() => setMode("borrowed")}
            >
              {t("AssetDropDownCard:borrowed")}
            </Button>
            <Button
              variant={mode === "balance" ? "" : "outline"}
              size="sm"
              onClick={() => setMode("balance")}
            >
              {t("AssetDropDownCard:balance")}
            </Button>
            <Button
              variant={mode === "featured" ? "" : "outline"}
              size="sm"
              onClick={() => setMode("featured")}
            >
              {t("AssetDropDownCard:featured")}
            </Button>
            <Button
              variant={mode === "favourites" ? "" : "outline"}
              size="sm"
              onClick={() => setMode("favourites")}
            >
              {t("AssetDropDownCard:favourites")}
            </Button>
          </div>

          {mode === "borrowed" ? (
            <>
              <h4 className="text-md font-bold tracking-tight">
                {t("AssetDropDownCard:borrowed")}
              </h4>
              {borrowPositions && borrowPositions.length ? (
                <>
                  <List
                    height={350}
                    itemCount={borrowPositions.length}
                    itemSize={70}
                    className="w-full"
                  >
                    {Row}
                  </List>
                </>
              ) : (
                "No borrowed assets..."
              )}
            </>
          ) : null}

          {mode === "balance" ? (
            <>
              <h4 className="text-md font-bold tracking-tight">
                {t("AssetDropDownCard:balance")}
              </h4>
              {usrBalances && usrBalances.length ? (
                <>
                  <List
                    height={350}
                    itemCount={usrBalances.length}
                    itemSize={70}
                    className="w-full"
                  >
                    {Row}
                  </List>
                </>
              ) : (
                "No balance assets..."
              )}
            </>
          ) : null}

          {mode === "featured" ? (
            <>
              <h4 className="text-md font-bold tracking-tight">
                {!type ? t("AssetDropDownCard:noType") : null}
                {type && type === "base"
                  ? t("AssetDropDownCard:baseType")
                  : null}
                {type && type === "quote"
                  ? t("AssetDropDownCard:quoteType")
                  : null}
                {type && type === "backing"
                  ? t("AssetDropDownCard:backingType")
                  : null}
              </h4>
              <div className="grid grid-cols-6 gap-1">
                <Button
                  variant={featuredMode === "bitAssets" ? "" : "outline"}
                  size="sm"
                  onClick={() => setFeaturedMode("bitAssets")}
                >
                  bitAssets
                </Button>
                <Button
                  variant={featuredMode === "HONEST" ? "" : "outline"}
                  size="sm"
                  onClick={() => setFeaturedMode("HONEST")}
                >
                  HONEST
                </Button>
                <Button
                  variant={featuredMode === "XBTS" ? "" : "outline"}
                  size="sm"
                  onClick={() => setFeaturedMode("XBTS")}
                >
                  XBTS
                </Button>
                <Button
                  variant={featuredMode === "BTWTY" ? "" : "outline"}
                  size="sm"
                  onClick={() => setFeaturedMode("BTWTY")}
                >
                  BTWTY
                </Button>
                <Button
                  variant={featuredMode === "ARTCASA" ? "" : "outline"}
                  size="sm"
                  onClick={() => setFeaturedMode("ARTCASA")}
                >
                  ARTCASA
                </Button>
                <Button
                  variant={featuredMode === "NFTEA" ? "" : "outline"}
                  size="sm"
                  onClick={() => setFeaturedMode("NFTEA")}
                >
                  NFTEA
                </Button>
              </div>
              {featuredAssets && featuredAssets.length ? (
                <>
                  <List
                    height={350}
                    itemCount={featuredAssets.length}
                    itemSize={70}
                    className="w-full"
                  >
                    {Row}
                  </List>
                </>
              ) : (
                "No featured assets..."
              )}
            </>
          ) : null}

          {mode === "favourites" ? (
            <>
              <h4 className="text-md font-bold tracking-tight">
                {!type ? t("AssetDropDownCard:noType") : null}
                {type && type === "base"
                  ? t("AssetDropDownCard:baseType")
                  : null}
                {type && type === "quote"
                  ? t("AssetDropDownCard:quoteType")
                  : null}
                {type && type === "backing"
                  ? t("AssetDropDownCard:backingType")
                  : null}
              </h4>
              {_favouriteAssets && _favouriteAssets.length ? (
                <>
                  <List
                    height={350}
                    itemCount={_favouriteAssets.length}
                    itemSize={70}
                    className="w-full"
                  >
                    {Row}
                  </List>
                </>
              ) : (
                "No favourite assets..."
              )}
            </>
          ) : null}
        </>
      </DialogContent>
    </Dialog>
  );
}
