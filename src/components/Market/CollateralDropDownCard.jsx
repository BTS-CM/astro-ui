import React, { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import Fuse from "fuse.js";
import { FixedSizeList as List } from "react-window";
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex as toHex } from '@noble/hashes/utils';
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { $blockList } from "@/stores/blocklist.ts";

/**
 * Creating an asset dropdown component
 * @param {String} assetSymbol current asset symbol
 * @param {Function} storeCallback setState
 * @param {String} otherAsset market pair asset
 * @returns {JSX.Element}
 */
export default function CollateralDropDownCard(properties) {
  const { chosenAssets, lendingAsset, marketSearch, storeCallback, chain } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const blocklist = useSyncExternalStore($blockList.subscribe, $blockList.get, () => true);

  const fuse = useMemo(() => {
    let marketSearchContents;

    if (!marketSearch || !marketSearch.length) {
      marketSearchContents = [];
    } else {
      marketSearchContents = marketSearch.filter(
        (asset) =>
          !chosenAssets.find((chosen) => chosen.symbol === asset.s) && asset.s !== lendingAsset
      );
    }
  
    if (chain === "bitshares" && blocklist && blocklist.users) {
      marketSearchContents = marketSearchContents.filter(
        (asset) => !blocklist.users.includes(
          toHex(sha256(asset.u.split(" ")[1].replace("(", "").replace(")", "")))
        ),
      );
    }

    return new Fuse(
      marketSearchContents,
      {
        includeScore: true,
        keys: [
          "id",
          "s", // symbol
          "u", // `name (id) (ltm?)`
        ],
      }
    );
  }, [chosenAssets, lendingAsset]);

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
    const res = thisResult[index];
    let _value = 0.0;
    return (
      <div style={{ ...style, marginBottom: "10px", paddingRight: "10px" }}>
        <Popover>
          <PopoverTrigger asChild>
            <Card key={`acard-${res.item.id}`} style={{ marginBottom: "2px" }}>
              <CardHeader className="p-3">
                <CardTitle className="h-3">
                  {res.item.s} ({res.item.id})
                </CardTitle>
                <CardDescription>
                  {t("AssetDropDownCard:issued", { user: res.item.u })}
                </CardDescription>
              </CardHeader>
            </Card>
          </PopoverTrigger>
          <PopoverContent>
            <Label>Provide price for {res.item.s}</Label>
            <Input
              name="price"
              className="mt-5"
              placeholder={_value}
              onChange={(event) => {
                const regex = /^[a-zA-Z0-9.-]*$/;
                if (regex.test(event.target.value)) {
                  _value = event.target.value;
                }
              }}
            />
            <Button
              onClick={() => {
                setTimeout(() => {
                  storeCallback(
                    chosenAssets.concat([
                      { symbol: res.item.s, price: _value, precision: res.item.p, id: res.item.id },
                    ])
                  );
                }, 0);
                setDialogOpen(false);
              }}
              className="mt-5"
            >
              Add asset
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

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
      {lendingAsset && marketSearch ? (
        <DialogTrigger asChild>
          <span
            onClick={() => {
              event.preventDefault();
            }}
            className="inline-block border border-grey rounded pl-4 pb-1 pr-4 text-lg"
          >
            <Label>➕ Add collateral</Label>
          </span>
        </DialogTrigger>
      ) : (
        <Label>⛔ No lending asset</Label>
      )}
      <DialogContent className="sm:max-w-[425px] bg-white">
        <>
          <h3 className="text-2xl font-extrabold tracking-tight">Which collateral asset?</h3>
          <h4 className="text-md font-bold tracking-tight">
            Please search for a new collateral asset below
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
      </DialogContent>
    </Dialog>
  );
}
