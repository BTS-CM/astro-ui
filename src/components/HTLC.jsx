import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useStore } from "@nanostores/react";
import { List } from "react-window";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // For Redeem Preimage input
import { Label } from "@/components/ui/label"; // For Redeem/Extend input labels

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { createHTLCStore } from "@/nanoeffects/HTLC.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { humanReadableFloat, blockchainFloat } from "@/lib/common";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import HtlcCreateDialog from "./HtlcCreateDialog.jsx"; // New component for creation form
import ExternalLink from "./common/ExternalLink.jsx";

const claimPeriods = {
  "1hour": 3600,
  "12hours": 43200,
  "1day": 86400,
  "7days": 604800,
  "30days": 2592000,
};

// Helper function to get the hash algorithm name
const getHashAlgorithmName = (hashType) => {
  switch (hashType) {
    case 2:
      return "sha256";
    case 0:
      return "ripemd160";
    default:
      return null;
  }
};

function calculateHash(algorithm, preimage) {
  try {
    if (algorithm === "sha256") {
      return toHex(sha256(new TextEncoder().encode(preimage)));
    } else if (algorithm === "ripemd160") {
      return toHex(ripemd160(new TextEncoder().encode(preimage)));
    }
    return null;
  } catch (error) {
    console.error("Error calculating hash:", error);
    return null;
  }
}

// Helper function to format expiration date
const formatExpiration = (expiration) => {
  try {
    return new Date(expiration).toLocaleString();
  } catch {
    return "Invalid date";
  }
};

export default function Htlc(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const {
    _marketSearchBTS,
    _marketSearchTEST,
    _assetsBTS,
    _assetsTEST,
    _globalParamsBTS,
    _globalParamsTEST,
  } = properties;

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (_chain && (_marketSearchBTS || _marketSearchTEST)) {
      return _chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, _chain]);

  const globalParams = useMemo(() => {
    if (_chain && (_globalParamsBTS || _globalParamsTEST)) {
      return _chain === "bitshares" ? _globalParamsBTS : _globalParamsTEST;
    }
    return [];
  }, [_globalParamsBTS, _globalParamsTEST, _chain]);

  // Fetching HTLC data
  const [senderHtlcs, setSenderHtlcs] = useState([]);
  const [receiverHtlcs, setReceiverHtlcs] = useState([]);
  useEffect(() => {
    let unsubscribe;
    if (usr && usr.chain && usr.id && currentNode && currentNode.url) {
      const htlcStore = createHTLCStore([usr.chain, usr.id, currentNode.url]);
      unsubscribe = htlcStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setSenderHtlcs(data.sender || []);
          setReceiverHtlcs(data.receiver || []);
        } else if (error) {
          console.error("Error fetching HTLCs:", error);
          setSenderHtlcs([]);
          setReceiverHtlcs([]);
        }
      });
    } else {
      setSenderHtlcs([]);
      setReceiverHtlcs([]);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [usr, currentNode]);

  // Fetching account names for HTLC participants
  const [htlcAccounts, setHtlcAccounts] = useState({});
  useEffect(() => {
    let unsubscribe;
    const allAccountIds = new Set([
      ...senderHtlcs.map((h) => h.transfer.to),
      ...receiverHtlcs.map((h) => h.transfer.from),
    ]);

    const uniqueAccountIds = Array.from(allAccountIds);

    if (
      usr &&
      usr.chain &&
      uniqueAccountIds.length > 0 &&
      currentNode &&
      currentNode.url
    ) {
      const neededIds = uniqueAccountIds.filter((id) => !htlcAccounts[id]);
      if (neededIds.length > 0) {
        const objectStore = createObjectStore([
          usr.chain,
          JSON.stringify(neededIds),
          currentNode.url,
        ]);
        unsubscribe = objectStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const newAccounts = {};
            data.forEach((acc) => {
              if (acc) {
                newAccounts[acc.id] = acc.name;
              }
            });
            setHtlcAccounts((prev) => ({ ...prev, ...newAccounts }));
          } else if (error) {
            console.error("Error fetching HTLC account names:", error);
          }
        });
      }
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [usr, senderHtlcs, receiverHtlcs, currentNode, htlcAccounts]); // Added htlcAccounts dependency

  // Sender HTLC Row
  const SenderHtlcRow = ({ index, style }) => {
    const htlc = senderHtlcs[index];
    const {
      id,
      transfer: { to, amount, asset_id },
      conditions: {
        hash_lock: { preimage_hash, preimage_size },
        time_lock: { expiration },
      },
    } = htlc;

    const toAccountName = htlcAccounts[to] || to;
    const asset = assets.find((a) => a.id === asset_id);
    const formattedAmount = asset
      ? humanReadableFloat(amount, asset.precision)
      : amount;
    const hashAlgorithm = getHashAlgorithmName(preimage_hash[0]);
    const hashValue = preimage_hash[1];
    const formattedExpiration = formatExpiration(expiration);

    const [extendDialogOpen, setExtendDialogOpen] = useState(false);
    const [secondsToAdd, setSecondsToAdd] = useState(claimPeriods["1day"]);
    const [showExtendDeeplink, setShowExtendDeeplink] = useState(false);

    return (
      <div style={style}>
        <Card className="m-2">
          <CardContent className="pt-3 pb-1 text-sm">
            <div className="grid grid-cols-6 gap-1 items-center">
              <div className="col-span-1">
                <ExternalLink
                  classnamecontents="text-blue-500"
                  type="text"
                  text={id}
                  hyperlink={`https://blocksights.info/#/objects/${id}${
                    usr.chain === "bitshares" ? "" : "?network=testnet"
                  }`}
                />
              </div>
              <div className="col-span-1">{toAccountName}</div>
              <div className="col-span-1">
                {formattedAmount} {asset?.symbol ?? asset_id}
              </div>
              <div className="col-span-1 break-all">
                <HoverInfo
                  content={hashValue}
                  header={`${hashAlgorithm} - Size: ${preimage_size}`}
                  type={null}
                />
              </div>
              <div className="col-span-1">{formattedExpiration}</div>
              <div className="col-span-1 text-right pr-2">
                <Dialog
                  open={extendDialogOpen}
                  onOpenChange={setExtendDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      {t("HTLC:extendButton")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-white">
                    <DialogHeader>
                      <DialogTitle>
                        {t("HTLC:extendDialogTitle", { id })}
                      </DialogTitle>
                      <DialogDescription>
                        {t("HTLC:extendDialogDesc")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <Label htmlFor="secondsToAdd">
                        {t("HTLC:secondsToAddLabel")}
                      </Label>
                      <Input
                        id="secondsToAdd"
                        type="number"
                        value={secondsToAdd}
                        min="60"
                        onChange={(e) =>
                          setSecondsToAdd(parseInt(e.target.value, 10))
                        }
                      />
                    </div>
                    <Button
                      onClick={() => setShowExtendDeeplink(true)}
                      disabled={!secondsToAdd || secondsToAdd < 60}
                    >
                      {t("HTLC:extendButton")}
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
        {showExtendDeeplink && (
          <DeepLinkDialog
            operationNames={["htlc_extend"]}
            username={usr.username}
            usrChain={_chain}
            userID={usr.id}
            dismissCallback={() => {
              setShowExtendDeeplink(false);
              setExtendDialogOpen(false);
            }}
            headerText={t("HTLC:extendDeeplinkHeader", {
              id,
              seconds: secondsToAdd,
            })}
            trxJSON={[
              {
                htlc_id: id,
                update_issuer: usr.id,
                seconds_to_add: secondsToAdd,
                extensions: {},
              },
            ]}
          />
        )}
      </div>
    );
  };

  // Receiver HTLC Row
  const ReceiverHtlcRow = ({ index, style }) => {
    const htlc = receiverHtlcs[index];
    const {
      id,
      transfer: { from, amount, asset_id },
      conditions: {
        hash_lock: { preimage_hash, preimage_size },
        time_lock: { expiration },
      },
    } = htlc;

    const [redeemDialogOpen, setRedeemDialogOpen] = useState(false);
    const [preimageInput, setPreimageInput] = useState("");
    const [showRedeemDeeplink, setShowRedeemDeeplink] = useState(false);

    const fromAccountName = htlcAccounts[from] || from;
    const asset = assets.find((a) => a.id === asset_id);
    const formattedAmount = asset
      ? humanReadableFloat(amount, asset.precision)
      : amount;
    const hashAlgorithm = getHashAlgorithmName(preimage_hash[0]);
    const hashValue = preimage_hash[1];
    const formattedExpiration = formatExpiration(expiration);

    // For calculating the correct preimage to redeem
    const _preimageInput = useMemo(() => {
      if (!preimageInput || !hashAlgorithm) {
        return null;
      }

      let _initialHash;
      try {
        _initialHash = calculateHash(hashAlgorithm, preimageInput);
      } catch (error) {
        console.log({ error });
      }

      let _hexifiedHash;
      try {
        _hexifiedHash = toHex(utf8ToBytes(_initialHash));
      } catch (error) {
        console.log({ error });
      }

      return _hexifiedHash;
    }, [preimageInput, hashAlgorithm]);

    // For checking you've got the right preimage
    const _calculatedHash = useMemo(() => {
      if (!preimageInput || !hashAlgorithm) {
        return null;
      }

      let _initialHash;
      try {
        _initialHash = calculateHash(hashAlgorithm, preimageInput);
      } catch (error) {
        console.log({ error });
      }

      let _hash;
      try {
        _hash = calculateHash(hashAlgorithm, _initialHash);
      } catch (error) {
        console.log({ error });
      }

      return _hash;
    }, [preimageInput, hashAlgorithm]);

    return (
      <div style={style}>
        <Card className="m-2">
          <CardContent className="pt-3 pb-1 text-sm">
            <div className="grid grid-cols-6 gap-1 items-center">
              <div className="col-span-1">
                <ExternalLink
                  classnamecontents="text-blue-500"
                  type="text"
                  text={id}
                  hyperlink={`https://blocksights.info/#/objects/${id}${
                    usr.chain === "bitshares" ? "" : "?network=testnet"
                  }`}
                />
              </div>
              <div className="col-span-1">{fromAccountName}</div>
              <div className="col-span-1">
                {formattedAmount} {asset?.symbol ?? asset_id}
              </div>
              <div className="col-span-1 break-all">
                <HoverInfo
                  content={hashValue}
                  header={`${hashAlgorithm} - Size: ${preimage_size}`}
                  type={null}
                />
              </div>
              <div className="col-span-1">{formattedExpiration}</div>
              <div className="col-span-1 text-right pr-2">
                <Dialog
                  open={redeemDialogOpen}
                  onOpenChange={setRedeemDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      {t("HTLC:redeemButton")}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-white">
                    <DialogHeader>
                      <DialogTitle>
                        {t("HTLC:redeemDialogTitle", { id })}
                      </DialogTitle>
                      <DialogDescription>
                        {t("HTLC:redeemDialogDesc")}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <Label htmlFor="preimage">
                        {t("HTLC:preimageLabel")}
                      </Label>
                      <Input
                        id="preimage"
                        type="text"
                        placeholder={t("HTLC:preimagePlaceholder")}
                        value={preimageInput}
                        onChange={(e) => setPreimageInput(e.target.value)}
                      />
                      {preimageInput && preimageInput.length && (
                        <div className="text-sm">
                          <p>
                            <strong>{t("HTLC:calculatedHash")}:</strong>{" "}
                            <code className="break-all">
                              {_calculatedHash ?? "Calculating..."}
                            </code>
                            <strong>{t("HTLC:referenceHash")}:</strong>{" "}
                            <code className="break-all">{hashValue}</code>
                          </p>
                          <p>
                            <strong>{t("HTLC:hashMatch")}:</strong>{" "}
                            {_calculatedHash === hashValue ? (
                              <span>✔️</span>
                            ) : (
                              <span>❌</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                    {preimageInput &&
                    preimageInput.length &&
                    _calculatedHash === hashValue ? (
                      <Button onClick={() => setShowRedeemDeeplink(true)}>
                        {t("HTLC:redeemButton")}
                      </Button>
                    ) : (
                      <Button disabled>{t("HTLC:redeemButton")}</Button>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
        {showRedeemDeeplink && (
          <DeepLinkDialog
            operationNames={["htlc_redeem"]}
            username={usr.username}
            usrChain={_chain}
            userID={usr.id}
            dismissCallback={() => {
              setShowRedeemDeeplink(false);
              setRedeemDialogOpen(false);
            }}
            headerText={t("HTLC:redeemDeeplinkHeader", { id })}
            trxJSON={[
              {
                htlc_id: id,
                redeemer: usr.id,
                preimage: _preimageInput,
                extensions: {},
              },
            ]}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("HTLC:title")}</CardTitle>
              <CardDescription>{t("HTLC:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Sender HTLCs */}
              <div className="grid grid-cols-1 gap-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <HoverInfo
                    content={t("HTLC:senderDesc")}
                    header={t("HTLC:senderHeader")}
                    type="header"
                  />
                  <div className="text-right">
                    <Button
                      className="w-1/2"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      {t("HTLC:createButton")}
                    </Button>
                  </div>
                </div>
                <div className="border border-gray-300 rounded min-h-[200px]">
                  {senderHtlcs && senderHtlcs.length > 0 ? (
                    <>
                      <div className="grid grid-cols-6 gap-1 p-2 bg-gray-100 text-xs font-semibold">
                        <div>{t("HTLC:idColumn")}</div>
                        <div>{t("HTLC:toColumn")}</div>
                        <div>{t("HTLC:amountColumn")}</div>
                        <div>{t("HTLC:hashColumn")}</div>
                        <div>{t("HTLC:expiresColumn")}</div>
                        <div className="text-right pr-2">
                          {t("HTLC:actionsColumn")}
                        </div>
                      </div>
                      <List
                        rowHeight={75}
                        rowComponent={SenderHtlcRow}
                        rowCount={senderHtlcs.length}
                        className="w-full"
                        rowProps={{}}
                        height={500} // Dynamic height
                      />
                    </>
                  ) : (
                    <p className="p-4 text-center text-gray-500">
                      {t("HTLC:noSenderHtlc")}
                    </p>
                  )}
                </div>
              </div>

              {/* Receiver HTLCs */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12">
                  <HoverInfo
                    content={t("HTLC:receiverDesc")}
                    header={t("HTLC:receiverHeader")}
                    type="header"
                  />
                </div>
                <div className="col-span-12 border border-gray-300 rounded min-h-[200px]">
                  {receiverHtlcs && receiverHtlcs.length > 0 ? (
                    <>
                      <div className="grid grid-cols-6 gap-1 p-2 bg-gray-100 text-xs font-semibold">
                        <div>{t("HTLC:idColumn")}</div>
                        <div>{t("HTLC:fromColumn")}</div>
                        <div>{t("HTLC:amountColumn")}</div>
                        <div>{t("HTLC:hashColumn")}</div>
                        <div>{t("HTLC:expiresColumn")}</div>
                        <div className="text-right pr-2">
                          {t("HTLC:actionsColumn")}
                        </div>
                      </div>
                      <List
                        rowHeight={75}
                        rowComponent={ReceiverHtlcRow}
                        rowCount={receiverHtlcs.length}
                        className="w-full"
                        rowProps={{}}
                        height={500}
                      />
                    </>
                  ) : (
                    <p className="p-4 text-center text-gray-500">
                      {t("HTLC:noReceiverHtlc")}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create HTLC Dialog */}
        {showCreateDialog ? (
          <HtlcCreateDialog
            usr={usr}
            assets={assets}
            marketSearch={marketSearch}
            globalParams={globalParams}
            showDialog={showCreateDialog}
            setShowDialog={setShowCreateDialog}
          />
        ) : null}
      </div>
    </>
  );
}
