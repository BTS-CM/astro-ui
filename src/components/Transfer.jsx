import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

import {
  Avatar as Av,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useInitCache } from "../effects/Init.ts";
import { $currentUser } from "../stores/users.ts";

import {
  $assetCache,
  $marketSearchCache,
  $globalParamsCache,
  $poolCache,
} from "../stores/cache.ts";

import { humanReadableFloat, trimPrice, blockchainFloat } from "../lib/common";

import { createUserBalancesStore } from "../effects/Pools.ts";

import { Avatar } from "./Avatar.tsx";
import AccountSearch from "./AccountSearch.jsx";
import CurrentUser from "./common/CurrentUser.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import AssetDropDown from "./Market/AssetDropDownCard.jsx";

export default function Transfer(properties) {
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });

  const [showDialog, setShowDialog] = useState(false);

  const [senderUser, setSenderUser] = useState();
  const [targetUser, setTargetUser] = useState();
  const [selectedAsset, setSelectedAsset] = useState();
  const [transferAmount, setTransferAmount] = useState(0);
  const [memoContents, setMemoContents] = useState();

  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const assets = useSyncExternalStore(
    $assetCache.subscribe,
    $assetCache.get,
    () => true
  );

  const marketSearch = useSyncExternalStore(
    $marketSearchCache.subscribe,
    $marketSearchCache.get,
    () => true
  );

  const globalParams = useSyncExternalStore(
    $globalParamsCache.subscribe,
    $globalParamsCache.get,
    () => true
  );

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.parameters) {
      const current_fees = globalParams.parameters.current_fees.parameters;
      const foundFee = current_fees.find((x) => x[0] === 0);
      setFee(humanReadableFloat(foundFee[1].fee, 5));
    }
  }, [globalParams]);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares");

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id) {
      const userBalancesStore = createUserBalancesStore([usr.chain, usr.id]);

      unsubscribeUserBalances = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            setBalances(data);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, balanceCounter]);

  const [foundAsset, setFoundAsset] = useState();
  const found = useMemo(() => {
    if (selectedAsset) {
      return assets.filter((asset) => asset.symbol === selectedAsset);
    }
    return [];
  }, [selectedAsset, assets]);

  useEffect(() => {
    if (found && found.length) {
      setFoundAsset(found[0]);
    }
  }, [found]);

  const [targetUserDialogOpen, setTargetUserDialogOpen] = useState(false);

  useEffect(() => {
    if (senderUser) {
      // close dialog on sender account selection
      setSenderUser(false);
    }
  }, [senderUser]);

  useEffect(() => {
    if (targetUser) {
      // close dialog on target account selection
      setTargetUserDialogOpen(false);
    }
  }, [targetUser]);

  /*
    {selectedAsset && targetUser ? (
      <FormField
        control={form.control}
        name="memoField"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Optional memo</FormLabel>
            <FormControl
              onChange={(event) => {
                const input = event.target.value;
                setMemoContents(input);
              }}
            >
              <Input
                label={`Memo field`}
                value={memoContents}
                placeholder={memoContents}
                className="mb-1"
              />
            </FormControl>
            <FormDescription>
              An encrypted message for {targetUser.name}'s eyes
              only.
              <br /> Often used by exchanges and 3rd party
              services.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    ) : null}
  */

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Transfer assets</CardTitle>
              <CardDescription>
                <p>
                  Send funds from an account you control to another BitShares
                  account holder.
                </p>
                <p className="mt-1">
                  ⛔ Doesn't yet support a memo, so don't use this form when
                  transfering to external services.
                  <br />✅ Use for simple transfers between accounts.
                </p>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={() => {
                    setShowDialog(true);
                    event.preventDefault();
                  }}
                >
                  <FormField
                    control={form.control}
                    name="account"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sending account</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-8 gap-2">
                            <div className="col-span-1 ml-5">
                              <Avatar
                                size={40}
                                name={usr && usr.username ? usr.username : "x"}
                                extra="Sender"
                                expression={{
                                  eye: "normal",
                                  mouth: "open",
                                }}
                                colors={[
                                  "#92A1C6",
                                  "#146A7C",
                                  "#F0AB3D",
                                  "#C271B4",
                                  "#C20D90",
                                ]}
                              />
                            </div>
                            <div className="col-span-7">
                              <Input
                                disabled
                                placeholder="Bitshares account (1.2.x)"
                                className="mb-1 mt-1"
                                value={`${
                                  usr && usr.username ? usr.username : "?"
                                } (${usr && usr.id ? usr.id : "?"})`}
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          This is the account which will transfer the assets to
                          the target recipient.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetAccount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target account</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-8 mt-4">
                            <div className="col-span-1 ml-5">
                              {targetUser && targetUser.name ? (
                                <Avatar
                                  size={40}
                                  name={targetUser.name}
                                  extra="Target"
                                  expression={{
                                    eye: "normal",
                                    mouth: "open",
                                  }}
                                  colors={[
                                    "#92A1C6",
                                    "#146A7C",
                                    "#F0AB3D",
                                    "#C271B4",
                                    "#C20D90",
                                  ]}
                                />
                              ) : (
                                <Av>
                                  <AvatarFallback>?</AvatarFallback>
                                </Av>
                              )}
                            </div>
                            <div className="col-span-5">
                              <Input
                                disabled
                                placeholder={
                                  targetUser && targetUser.name
                                    ? `${targetUser.name} (${targetUser.id})`
                                    : "Bitshares account (1.2.x)"
                                }
                                className="mb-1 mt-1"
                              />
                            </div>
                            <div className="col-span-2">
                              <Dialog
                                open={targetUserDialogOpen}
                                onOpenChange={(open) => {
                                  setTargetUserDialogOpen(open);
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="ml-3 mt-1"
                                  >
                                    {targetUser
                                      ? "Change target"
                                      : "Provide target"}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[375px] bg-white">
                                  <DialogHeader>
                                    <DialogTitle>
                                      {!usr || !usr.chain
                                        ? "Bitshares account search"
                                        : null}
                                      {usr && usr.chain === "bitshares"
                                        ? "Bitshares (BTS) account search"
                                        : null}
                                      {usr && usr.chain !== "bitshares"
                                        ? "Bitshares testnet (TEST) account search"
                                        : null}
                                    </DialogTitle>
                                    <DialogDescription>
                                      Searching for an account to transfer
                                      assets to.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <AccountSearch
                                    chain={
                                      usr && usr.chain ? usr.chain : "bitshares"
                                    }
                                    excludedUsers={
                                      usr && usr.username && usr.username.length
                                        ? [usr]
                                        : []
                                    }
                                    setChosenAccount={setTargetUser}
                                  />
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          {!targetUser || !targetUser.name
                            ? "This is the account which will receive your transfer."
                            : `The user ${targetUser.name} will receive your transfer.`}
                        </FormDescription>
                        <FormMessage></FormMessage>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="targetAsset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asset to transfer</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-8 mt-4">
                            <div className="col-span-1 ml-5">
                              {!selectedAsset || !foundAsset ? (
                                <Av>
                                  <AvatarFallback>?</AvatarFallback>
                                </Av>
                              ) : null}
                              {foundAsset ? (
                                <Av onClick={() => console.log("Clicked")}>
                                  <AvatarFallback>
                                    <div className="text-sm">
                                      {foundAsset.bitasset_data_id
                                        ? "MPA"
                                        : "UIA"}
                                    </div>
                                  </AvatarFallback>
                                </Av>
                              ) : null}
                            </div>
                            <div className="col-span-5">
                              {!selectedAsset || !foundAsset ? (
                                <Input
                                  disabled
                                  placeholder="Bitshares asst (1.3.x)"
                                  className="mb-1 mt-1"
                                />
                              ) : null}
                              {foundAsset ? (
                                <Input
                                  disabled
                                  placeholder={`${foundAsset.symbol} (${foundAsset.id})`}
                                  className="mb-1 mt-1"
                                />
                              ) : null}
                            </div>
                            <div className="col-span-2 mt-1 ml-3">
                              <AssetDropDown
                                assetSymbol={selectedAsset ?? ""}
                                assetData={null}
                                storeCallback={setSelectedAsset}
                                otherAsset={null}
                                marketSearch={marketSearch}
                                type={null}
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          This is the asset which will be transferred to the
                          target account.
                        </FormDescription>
                        <FormMessage>
                          {foundAsset &&
                          balances &&
                          !balances
                            .map((x) => x.asset_id)
                            .includes(foundAsset.id)
                            ? `Unable to proceed, your account "${usr.username}" doesn't hold any of this asset.`
                            : null}
                        </FormMessage>
                      </FormItem>
                    )}
                  />

                  {selectedAsset && targetUser ? (
                    <FormField
                      control={form.control}
                      name="transferAmount"
                      render={({ field }) => (
                        <FormItem>
                          {console.log({ foundAsset, balances })}
                          <FormLabel>{`Amount of ${
                            selectedAsset ?? "???"
                          } available to transfer`}</FormLabel>
                          <FormControl>
                            <Input
                              disabled
                              label={`Amount available to transfer`}
                              value={
                                foundAsset &&
                                balances &&
                                balances.find(
                                  (x) => x.asset_id === foundAsset.id
                                )
                                  ? `${humanReadableFloat(
                                      balances.find(
                                        (x) => x.asset_id === foundAsset.id
                                      ).amount,
                                      foundAsset.precision
                                    )} ${foundAsset.symbol}`
                                  : "0"
                              }
                              className="mb-1"
                            />
                          </FormControl>
                          <FormDescription>
                            This is the maximum amount of {selectedAsset} you
                            can transfer.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

                  {selectedAsset && targetUser ? (
                    <FormField
                      control={form.control}
                      name="transferAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{`Amount of ${
                            selectedAsset ?? "???"
                          } to transfer`}</FormLabel>
                          <FormControl
                            onChange={(event) => {
                              const input = event.target.value;
                              const regex = /^[0-9]*\.?[0-9]*$/; // regular expression to match numbers and a single period
                              if (regex.test(input)) {
                                setTransferAmount(input);
                              }
                            }}
                          >
                            <Input
                              label={`Amount to transfer`}
                              value={transferAmount}
                              placeholder={transferAmount}
                              className="mb-1"
                            />
                          </FormControl>
                          <FormDescription>
                            How much you're going to send to the target account.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

                  {selectedAsset && targetUser ? (
                    <FormField
                      control={form.control}
                      name="networkFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Network fee</FormLabel>
                          <FormControl>
                            <Input
                              disabled
                              placeholder={`${fee} BTS`}
                              className="mb-3 mt-3"
                            />
                          </FormControl>
                          {usr.id === usr.referrer ? (
                            <FormMessage>
                              Rebate: {trimPrice(fee * 0.8, 5)} BTS (vesting)
                            </FormMessage>
                          ) : null}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}

                  {!transferAmount ? (
                    <Button
                      className="mt-5 mb-3"
                      variant="outline"
                      disabled
                      type="submit"
                    >
                      Submit
                    </Button>
                  ) : (
                    <Button
                      className="mt-5 mb-3"
                      variant="outline"
                      type="submit"
                    >
                      Submit
                    </Button>
                  )}
                </form>
              </Form>
              {showDialog ? (
                <DeepLinkDialog
                  operationName="transfer"
                  username={usr.username}
                  usrChain={usr.chain}
                  userID={usr.id}
                  dismissCallback={setShowDialog}
                  key={`Sending${transferAmount}${selectedAsset}to${targetUser.name}from${usr.username}`}
                  headerText={`Sending ${transferAmount} ${foundAsset.symbol} (${foundAsset.id}) to ${targetUser.name} from ${usr.username}`}
                  trxJSON={[
                    {
                      fee: {
                        amount: 0,
                        asset_id: "1.3.0",
                      },
                      from: usr.id,
                      to: targetUser.id,
                      amount: {
                        amount: blockchainFloat(
                          transferAmount,
                          foundAsset.precision
                        ).toFixed(0),
                        asset_id: foundAsset.id,
                      },
                      extensions: [],
                    },
                  ]}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-2 mt-5 gap-5">
          {targetUser && targetUser.name ? (
            <div className="col-span-1">
              <a
                href={`https://blocksights.info/#/accounts/${targetUser.name}`}
                target="_blank"
              >
                <Card>
                  <CardHeader className="pb-0 mb-0">
                    <CardTitle>Double check the above details!</CardTitle>
                    <CardDescription>
                      Avoid heartbreak, check your inputs!
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <ul className="ml-2 list-disc [&>li]:mt-2">
                      <li>
                        Before you proceed, please double check the form inputs.
                      </li>
                      <li>
                        Validate the entire Beet prompt contents before you
                        broadcast the transaction.
                      </li>
                      <li>
                        Click here to view {targetUser.name}'s account on the
                        Blocksights blockchain explorer.
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </a>
            </div>
          ) : null}
          {targetUser && targetUser.name ? (
            <div className="col-span-1">
              <Card>
                <CardHeader className="pb-0 mb-0">
                  <CardTitle>Beware! Don't fall for scams!</CardTitle>
                  <CardDescription>
                    Be vigilant against scammers!
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm">
                  <ul className="ml-2 list-disc [&>li]:mt-2">
                    <li>
                      Crypto exchanges will NEVER direct message you in with
                      special transfer instructions to follow for deposits nor
                      withdrawals.
                    </li>
                    <li>
                      Asset transfer operations are permanent and the majority
                      of assets are irrecoverable if erroneously transferred.
                    </li>
                    <li>
                      If something sounds too good to be true, then it likely
                      is, don't fall victim to scammers tricks.
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-1 mt-5">
          {usr && usr.username && usr.username.length ? (
            <CurrentUser usr={usr} />
          ) : null}
        </div>
      </div>
    </>
  );
}
