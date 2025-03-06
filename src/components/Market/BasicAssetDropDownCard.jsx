import React, { useState, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import { useStore } from '@nanostores/react';
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
import { $favouriteAssets } from "@/stores/favourites.ts"

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
    usrBalances
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const marketSearchContents = useMemo(() => {
    if (!marketSearch || !marketSearch.length) {
      return [];
    } else {
      let currentContents = otherAsset
        ? marketSearch.filter((asset) => asset.s !== otherAsset && asset.s !== assetSymbol)
        : marketSearch.filter((asset) => asset.s !== assetSymbol);

      return currentContents;
    }
  }, [marketSearch, chain]);

  const [dialogOpen, setDialogOpen] = useState(false);

  const Row = ({ index, style }) => {
    let res;
    if (mode === "featured") {
      res = featuredAssets[index];
    } else if (mode === "favourites") {
      res = _favouriteAssets[index];
    } else if (mode === "borrowed") {
      res = borrowPositions[index];
    } else if (mode === "balance") {
      res = usrBalances[index];
    }

    // borrowPositions: [{id: '1.20.5', asset_id: '1.3.5286', borrow_amount: 3000, fee_rate: 300}]
    // usrBalances: [{amount: '72281224658', asset_id: '1.3.0'}]
    
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
                storeCallback(
                  marketSearchContents.find((asset) => asset.id === res.asset_id).s
                );
              }
            }, 0);
            setDialogOpen(false);
          }}
        >
          <CardHeader className="p-3">
            <CardTitle className="h-3">
              {
                mode === "featured"
                  ? `${res.s} (${res.id})`
                  : null
              }
              {
                mode === "favourites"
                  ? `${res.symbol} (${res.id})`
                  : null
              }
              {
                mode === "borrowed" || mode === "balance"
                  ? `${marketSearchContents.find((asset) => asset.id === res.asset_id).s} (${res.asset_id})`
                  : null
              }
            </CardTitle>
            <CardDescription>
              {
                mode === "featured"
                  ? t(
                      "AssetDropDownCard:issued",
                      { user: res.u }
                    )
                  : null
              }
              {
                mode === "favourites"
                  ? t(
                      "AssetDropDownCard:issued",
                      { user: res.issuer }
                    )
                  : null
              }
              {
                mode === "borrowed" || mode === "balance"
                  ? t(
                      "AssetDropDownCard:issued",
                      { user: marketSearchContents.find((asset) => asset.id === res.asset_id).u }
                    )
                  : null
              }
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  };

  const [mode, setMode] = useState("featured");

  const favouriteAssets = useStore($favouriteAssets);

  const featuredAssets = useMemo(() => {
    if (!chain || !marketSearchContents) {
      return [];
    }
    const _featuredSymbols = ["XBTSX.", "xbtsx.", "BTWTY.", "btwty.", "HONEST.", "honest.", "NFTEA.", "nftea."];
    const _featuredIssuers = ["committee-account", "honest-quorum", "nftprofessional1"];

    let _featuredAssets = marketSearchContents.filter(
      (asset) => {
        if (chain === "bitshares") {
          if (_featuredIssuers.includes(asset.u.split(" ")[0])) {
            return true;
          }
          if (_featuredSymbols.some(str => asset.s.includes(str))) {
            return true;
          }
        }
        return false
      }
    );

    return _featuredAssets;
  }, [assetSymbol, otherAsset, marketSearchContents, chain]);

  const _favouriteAssets = useMemo(() => {
    if (!chain || !favouriteAssets) {
      return [];
    }
    
    const _chainAssets = favouriteAssets[chain];

    if (!assetSymbol && !otherAsset) {
      return _chainAssets;
    }

    return _chainAssets.filter(
      (asset) => assetSymbol && otherAsset
        ? asset.symbol !== assetSymbol && asset.symbol !== otherAsset
        : asset.symbol !== assetSymbol
    );
  }, [favouriteAssets, assetSymbol, otherAsset, chain]);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
      }}
    >
      <DialogTrigger asChild>
        {
          size && size === "cog"
            ? <GearIcon onClick={() => setDialogOpen(true)} />
            : <Button
                variant={type === "base" || type === "backing" ? "outline" : "primary"}
                className={`${size && size === "small" ? "h-7 " : ""}p-3 ${type === "quote" ? "bg-black hover:bg-gray-700 text-white" : ""} hover:shadow-lg`}
                onClick={() => setDialogOpen(true)}
              >
                {!assetSymbol ? t("AssetDropDownCard:select") : null}
                {!size && assetSymbol ? t("AssetDropDownCard:change") : null}
                {size && assetSymbol && assetSymbol.length < 12 ? assetSymbol : null}
                {size && assetSymbol && assetSymbol.length >= 12 ? assetData.id : null}
              </Button>
        }
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

          {
            mode === "borrowed"
            ? <>
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
                ) : "No borrowed assets..."}
              </>
            : null
          }

          {
            mode === "balance"
            ? <>
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
                ) : "No balance assets..."}
              </>
            : null
          }

          {
            mode === "featured"
            ? <>
                <h4 className="text-md font-bold tracking-tight">
                  {!type ? t("AssetDropDownCard:noType") : null}
                  {type && type === "base" ? t("AssetDropDownCard:baseType") : null}
                  {type && type === "quote" ? t("AssetDropDownCard:quoteType") : null}
                  {type && type === "backing" ? t("AssetDropDownCard:backingType") : null}
                </h4>
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
                ) : "No featured assets..."}

            </>
            : null
          }

          {
            mode === "favourites"
            ? <>
                <h4 className="text-md font-bold tracking-tight">
                  {!type ? t("AssetDropDownCard:noType") : null}
                  {type && type === "base" ? t("AssetDropDownCard:baseType") : null}
                  {type && type === "quote" ? t("AssetDropDownCard:quoteType") : null}
                  {type && type === "backing" ? t("AssetDropDownCard:backingType") : null}
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
                ) : "No favourite assets..."}
                
              </>
            : null
          }
        </>
      </DialogContent>
    </Dialog>
  );
}
