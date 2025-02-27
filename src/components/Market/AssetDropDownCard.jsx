import React, { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import Fuse from "fuse.js";
import { FixedSizeList as List } from "react-window";
import { useStore } from '@nanostores/react';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex as toHex } from '@noble/hashes/utils';
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
    chain
  } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const blocklist = useSyncExternalStore($blockList.subscribe, $blockList.get, () => true);

  const marketSearchContents = useMemo(() => {
    if (!marketSearch || !marketSearch.length) {
      return [];
    } else {
      let currentContents = otherAsset
        ? marketSearch.filter((asset) => asset.s !== otherAsset && asset.s !== assetSymbol)
        : marketSearch.filter((asset) => asset.s !== assetSymbol);

      if (chain === "bitshares" && blocklist && blocklist.users) {
        currentContents = currentContents.filter(
          (asset) => !blocklist.users.includes(
            toHex(sha256(asset.u.split(" ")[1].replace("(", "").replace(")", "")))
          ),
        );
      }

      return currentContents;
    }
  }, [marketSearch, blocklist, chain]);

  const fuse = useMemo(() => new Fuse(marketSearchContents, {
    includeScore: true,
    keys: [
      "id",
      "s", // symbol
      "u", // `name (id) (ltm?)`
    ],
  }), [marketSearchContents]);

  const [thisInput, setThisInput] = useState();
  const [thisResult, setThisResult] = useState();
  const [dialogOpen, setDialogOpen] = useState(false);
  useEffect(() => {
    if (thisInput) {
      const result = fuse.search(thisInput);
      setThisResult(result);
    }
  }, [thisInput, fuse]);

  const Row = ({ index, style }) => {
    let res;
    if (mode === "search") {
      res = thisResult[index].item;
    } else if (mode === "featured") {
      res = featuredAssets[index];
    } else if (mode === "favourites") {
      res = relevantAssets[index];
    }
    
    return (
      <div style={{ ...style, marginBottom: "10px", paddingRight: "10px" }}>
        <Card
          key={`acard-${res.id}`}
          style={{ marginBottom: "2px" }}
          onClick={() => {
            setTimeout(() => {
              if (mode === "search" || mode === "featured") {
                storeCallback(res.s);
              } else if (mode === "favourites") {
                storeCallback(res.symbol);
              }
            }, 0);
            setDialogOpen(false);
          }}
        >
          <CardHeader className="p-3">
            <CardTitle className="h-3">
              {
                mode === "search" || mode === "featured"
                ? `${res.s} (${res.id})`
                : null
              }
              {
                mode === "favourites"
                ? `${res.symbol} (${res.id})`
                : null
              }
            </CardTitle>
            <CardDescription>
              {
                mode === "search" || mode === "featured"
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
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  };

  const [mode, setMode] = useState("search");

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
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={mode === "search" ? "" : "outline"}
              size="sm"
              onClick={() => setMode("search")}
            >
              {t("AssetDropDownCard:search")}
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
                    <List height={350} itemCount={thisResult.length} itemSize={70} className="w-full">
                      {Row}
                    </List>
                  </>
                ) : null}
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
                    <List height={350} itemCount={featuredAssets.length} itemSize={70} className="w-full">
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
                {relevantAssets && relevantAssets.length ? (
                  <>
                    <List height={350} itemCount={relevantAssets.length} itemSize={70} className="w-full">
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
