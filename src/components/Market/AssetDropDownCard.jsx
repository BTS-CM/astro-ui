import React, { useState, useEffect } from "react";
import Fuse from 'fuse.js';
import { FixedSizeList as List } from 'react-window';

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
  
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * Creating an asset dropdown component
 * @param {String} assetSymbol current asset symbol
 * @param {Function} storeCallback setState
 * @param {String} otherAsset market pair asset
 * @returns {JSX.Element}
 */
export default function AssetDropDown(properties) {
    const { assetSymbol, assetData, storeCallback, otherAsset, marketSearch, type } = properties;

    const fuse = new Fuse(
      marketSearch.filter((asset) => (asset.s !== otherAsset && asset.s !== assetSymbol)),
      {
        includeScore: true,
        keys: [
            'id',
            's', // symbol
            'u'  // `name (id) (ltm?)`
        ]
      }
    );
    
    const [thisInput, setThisInput] = useState()
    const [thisResult, setThisResult] = useState()
    const [dialogOpen, setDialogOpen] = useState(false);
    useEffect(() => {
      if (thisInput) {
        const result = fuse.search(thisInput)
        setThisResult(result)
      }
    }, [thisInput])
    
    const Row = ({ index, style }) => {
        const res = thisResult[index];
        return (
            <div style={{ ...style, marginBottom: "10px", paddingRight: "10px" }}>
                <Card
                    key={`acard-${res.item.id}`}
                    style={{ marginBottom: "2px" }}
                    onClick={() => {
                        storeCallback(res.item.s);
                        setDialogOpen(false);
                    }}
                >
                <CardHeader className="p-3">
                    <CardTitle className="h-3">
                        {res.item.s} ({res.item.id})
                    </CardTitle>
                    <CardDescription>
                        Issued by {res.item.u}
                    </CardDescription>
                </CardHeader>
                </Card>
            </div>
        )
    };

    return assetSymbol && assetData
      ? (
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                setThisResult();
              }
                
              setDialogOpen(open)
            }}
          >
            <DialogTrigger asChild>
              <HoverCard>
                <HoverCardTrigger asChild style={{ position: 'relative' }}>
                  <Button variant="outline" className="h-5 p-3" onClick={() => setDialogOpen(true)}>
                    {assetSymbol.length < 12 ? assetSymbol : assetData.id}
                  </Button>
                </HoverCardTrigger>

                <HoverCardContent className="w-60 text-md text-center">
                  {assetSymbol} ({assetData.id})
                </HoverCardContent>
              </HoverCard>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white">
              <>
                <h3 className="text-2xl font-extrabold tracking-tight">
                  Replacing {assetSymbol}
                </h3>
                <h4 className="text-md font-bold tracking-tight">
                  {
                    type === "base"
                      ? `Please select a new base asset`
                      : `Please select a new quote asset`
                  }
                </h4>
                <Input
                  name="assetSearch"
                  placeholder="Search for an asset"
                  onChange={(event) => {
                    console.log("input changed");
                    setThisInput(event.target.value);
                  }}
                />
                {
                  thisResult && thisResult.length
                    ? (
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
                    )
                    : null
                }
              </>
            </DialogContent>
        </Dialog>
      )
      : null;
  }