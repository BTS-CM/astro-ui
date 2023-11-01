import React, { useState, useEffect } from "react";
import Fuse from "fuse.js";
import { FixedSizeList as List } from "react-window";

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
  } = properties;

  let marketSearchContents;
  if (!marketSearch || !marketSearch.length) {
    marketSearchContents = [];
  } else {
    marketSearchContents = otherAsset
      ? marketSearch.filter(
          (asset) => asset.s !== otherAsset && asset.s !== assetSymbol
        )
      : marketSearch.filter((asset) => asset.s !== assetSymbol);
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
    const res = thisResult[index];
    return (
      <div style={{ ...style, marginBottom: "10px", paddingRight: "10px" }}>
        <Card
          key={`acard-${res.item.id}`}
          style={{ marginBottom: "2px" }}
          onClick={() => {
            setTimeout(() => {
              storeCallback(res.item.s);
            }, 0);
            setDialogOpen(false);
          }}
        >
          <CardHeader className="p-3">
            <CardTitle className="h-3">
              {res.item.s} ({res.item.id})
            </CardTitle>
            <CardDescription>Issued by {res.item.u}</CardDescription>
          </CardHeader>
        </Card>
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
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={`${size && size === "small" ? "h-5 " : ""}p-3`}
          onClick={() => setDialogOpen(true)}
        >
          {!assetSymbol ? "Select an asset" : null}
          {!size && assetSymbol ? "Change asset" : null}
          {size && assetSymbol && assetSymbol.length < 12 ? assetSymbol : null}
          {size && assetSymbol && assetSymbol.length >= 12
            ? assetData.id
            : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        <>
          <h3 className="text-2xl font-extrabold tracking-tight">
            {assetSymbol ? `Replacing ${assetSymbol}` : `Selecting a new asset`}
          </h3>
          <h4 className="text-md font-bold tracking-tight">
            {!type ? `Please search for an asset below` : null}
            {type && type === "base" ? `Please select a new base asset` : null}
            {type && type === "quote"
              ? `Please select a new quote asset`
              : null}
          </h4>
          <Input
            name="assetSearch"
            placeholder="Search for an asset"
            onChange={(event) => {
              setThisInput(event.target.value);
            }}
          />
          {thisResult && thisResult.length ? (
            <>
              <List
                height={200}
                itemCount={thisResult.length}
                itemSize={70}
                className="w-full"
              >
                {Row}
              </List>
            </>
          ) : null}
        </>
      </DialogContent>
    </Dialog>
  );
}
