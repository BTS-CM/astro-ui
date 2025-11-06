import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useStore } from "@nanostores/react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import HoverInfo from "@/components/common/HoverInfo.tsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $inventoryStorage } from "@/stores/inventory";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LTM(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  const { _assetsBTS, _assetsTEST } = properties;

  const assets = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain === "bitshares" ? _assetsBTS || [] : _assetsTEST || [];
    }
    return [];
  }, [usr, _assetsBTS, _assetsTEST]);

  const inventory = useStore($inventoryStorage);
  const items = (inventory && inventory.items) || [];

  const [identifier, setIdentifier] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [note, setNote] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [generatedCode, setGeneratedCode] = useState("");

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Invoice generator</CardTitle>
              <CardDescription>
                Select items, provide details then generate an invoice code for
                payers to use.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2"></div>
            </CardContent>
            <CardFooter>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>generate invoice</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[720px] sm:min-w-[720px] bg-white">
                  <DialogHeader>
                    <DialogTitle>Generated Invoice</DialogTitle>
                    <DialogDescription>
                      Provide the customer the following invoice code to pay the
                      invoice.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 gap-2">
                    <HoverInfo
                      content={
                        "This is the account which will receieve funds from the invoice paying user."
                      }
                      header={"Recipient Account"}
                      type="header"
                    />
                    <Input
                      value={`${usr ? `${usr.username} (${usr.id})` : ""}`}
                      readOnly
                      className="mt-2"
                    />
                    <HoverInfo
                      content={
                        "The identifier needs to be used as the memo/message when the request is paid."
                      }
                      header={"Identifier"}
                      type="header"
                    />
                    <Input
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="mt-2"
                    />
                    <HoverInfo
                      content={
                        "You can define an arbitrary plaintext name for yourself to indicate who is being paid. Must not be a BitShares account name."
                      }
                      header={"Recipient Name"}
                      type="header"
                    />
                    <Input
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="mt-2"
                    />
                    <HoverInfo
                      content={
                        "You can attach a note to this payment request, this can be any additional information."
                      }
                      header={"Note"}
                      type="header"
                    />
                    <Textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="mt-2"
                    />

                    {items && items.length ? (
                      <div className="grid grid-cols-4">
                        <div className="col-span-3">
                          <Card>
                            <CardHeader>
                              <CardTitle>Inventory Items</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="border">
                                {/* Chosen Inventory items list goes here - react window list */}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline">Add item</Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[720px] sm:min-w-[720px] bg-white">
                            <DialogHeader>
                              <DialogTitle>Select Item</DialogTitle>
                              <DialogDescription>
                                {/* Text input search using fuse.js to search through inventory items - reducing the item selection list elements */}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1 gap-2">
                              {/* Item selection list goes here  - react window list */}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ) : (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <IconFolderCode />
                          </EmptyMedia>
                          <EmptyTitle>No Projects Yet</EmptyTitle>
                          <EmptyDescription>
                            You haven&apos;t created any projects yet. Get
                            started by creating your first project.
                          </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          <div className="text-center">
                            <Button>Create Project</Button>
                          </div>
                        </EmptyContent>
                      </Empty>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
