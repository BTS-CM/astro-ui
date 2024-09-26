import React, { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import Fuse from "fuse.js";
import { FixedSizeList as List } from "react-window";
import { useStore } from '@nanostores/react';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex as toHex } from '@noble/hashes/utils';
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

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

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { $favouriteAssets } from "@/stores/favourites.ts"
import { $blockList } from "@/stores/blocklist.ts";

/**
 * Creating an asset dropdown component
 * @param {String} assetSymbol current asset symbol
 * @param {Function} storeCallback setState
 * @param {String} otherAsset market pair asset
 * @returns {JSX.Element}
 */
export default function AssetDropDown(properties) {
  const { 
    assetSymbol,
    assetData,
    storeCallback,
    otherAsset,
    marketSearch,
    type,
    size,
    chain,
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const blocklist = useSyncExternalStore($blockList.subscribe, $blockList.get, () => true);

  let marketSearchContents;
  if (!marketSearch || !marketSearch.length) {
    marketSearchContents = [];
  } else {
    marketSearchContents = otherAsset
      ? marketSearch.filter((asset) => asset.s !== otherAsset && asset.s !== assetSymbol)
      : marketSearch.filter((asset) => asset.s !== assetSymbol);
  }

  if (chain === "bitshares" && blocklist && blocklist.users) {
    marketSearchContents = marketSearchContents.filter(
      (asset) => !blocklist.users.includes(
        toHex(sha256(asset.u.split(" ")[1].replace("(", "").replace(")", "")))
      ),
    );
  }

  const fuse = new Fuse(marketSearchContents, {
    includeScore: true,
    keys: [
      "id",
      "s", // symbol
      "u", // `name (id) (ltm?)`
    ],
  });

  const [thisInput, setThisInput] = useState();
  const [thisResult, setThisResult] = useState();
  const [dialogOpen, setDialogOpen] = useState(false);
  useEffect(() => {
    if (thisInput) {
      const result = fuse.search(thisInput);
      setThisResult(result);
    }
  }, [thisInput]);

  const Row = ({ index, style }) => {
    const res = mode === "search"
      ? thisResult[index]
      : relevantAssets[index];
    return (
      <div style={{ ...style, marginBottom: "10px", paddingRight: "10px" }}>
        <Card
          key={
            mode === "search"
            ? `acard-${res.item.id}`
            : `acard-${res.id}`
          }
          style={{ marginBottom: "2px" }}
          onClick={() => {
            setTimeout(() => {
              storeCallback(
                mode === "search"
                  ? res.item.s
                  : res.symbol,
              );
            }, 0);
            setDialogOpen(false);
          }}
        >
          <CardHeader className="p-3">
            <CardTitle className="h-3">
              {
                mode === "search"
                ? `${res.item.s} (${res.item.id})`
                : `${res.symbol} (${res.id})`
              }
            </CardTitle>
            <CardDescription>
              {t(
                "AssetDropDownCard:issued",
                { user: mode === "search" ? res.item.u : res.issuer }
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  };

  const [mode, setMode] = useState("search");

  const favouriteAssets = useStore($favouriteAssets);

  const relevantAssets = useMemo(() => {
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
        if (!open) {
          setThisResult();
        }
        setDialogOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={type === "base" || type === "backing" ? "outline" : "primary"}
          className={`${size && size === "small" ? "h-7 " : ""}p-3 ${type === "quote" ? "bg-black hover:bg-gray-700 text-white" : ""} hover:shadow-lg`}
          onClick={() => setDialogOpen(true)}
        >
          {!assetSymbol ? t("AssetDropDownCard:select") : null}
          {!size && assetSymbol ? t("AssetDropDownCard:change") : null}
          {size && assetSymbol && assetSymbol.length < 12 ? assetSymbol : null}
          {size && assetSymbol && assetSymbol.length >= 12 ? assetData.id : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <>
          <h3 className="text-2xl font-extrabold tracking-tight">
            {assetSymbol
              ? t("AssetDropDownCard:replacing", { assetSymbol: assetSymbol })
              : t("AssetDropDownCard:selecting")}
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === "search" ? "" : "outline"}
              size="sm"
              onClick={() => setMode("search")}
            >
              {t("AssetDropDownCard:search")}
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
            mode === "search"
            ? <>
                <h4 className="text-md font-bold tracking-tight">
                  {!type ? t("AssetDropDownCard:noType") : null}
                  {type && type === "base" ? t("AssetDropDownCard:baseType") : null}
                  {type && type === "quote" ? t("AssetDropDownCard:quoteType") : null}
                  {type && type === "backing" ? t("AssetDropDownCard:backingType") : null}
                </h4>
                <Input
                  name="assetSearch"
                  placeholder={t("AssetDropDownCard:search")}
                  onChange={(event) => {
                    setThisInput(event.target.value);
                  }}
                />
                {thisResult && thisResult.length ? (
                  <>
                    <List height={200} itemCount={thisResult.length} itemSize={70} className="w-full">
                      {Row}
                    </List>
                  </>
                ) : null}
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
                {relevantAssets && relevantAssets.length ? (
                  <>
                    <List height={200} itemCount={relevantAssets.length} itemSize={70} className="w-full">
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
