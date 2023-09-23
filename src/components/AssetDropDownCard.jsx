import React, { useState, useEffect } from "react";
import Fuse from 'fuse.js'
import { FixedSizeList as List } from 'react-window';

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"


/**
 * Creating an asset dropdown component
 * @param {String} assetSymbol current asset symbol
 * @param {Function} storeCallback setState
 * @param {String} otherAsset market pair asset
 * @returns {JSX.Element}
 */
export default function AssetDropDown(properties) {
    const { assetSymbol, storeCallback, otherAsset, marketSearch } = properties;

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

    return assetSymbol
      ? (
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
                setDialogOpen(open)
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" className="h-5 mt-1 p-3" onClick={() => setDialogOpen(true)}>
                {assetSymbol}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-white">
            <>
              <h3 className="scroll-m-20 text-2xl font-extrabold tracking-tight">
                Replacing {assetSymbol}
              </h3>
              <Input
                name="assetSearch"
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