import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useStore } from "@nanostores/react";
import { FixedSizeList as List } from "react-window";

import { CalendarIcon } from "@radix-ui/react-icons";
import { format, set } from "date-fns";
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
import HoverInfo from "@/components/common/HoverInfo.tsx";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Avatar as Av, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { humanReadableFloat, trimPrice, blockchainFloat } from "@/lib/common";
import { cn } from "@/lib/utils";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createWithdrawPermissionsStore } from "@/nanoeffects/WithdrawPermissions.ts";

import { Avatar } from "./Avatar.tsx";
import AccountSearch from "./AccountSearch.jsx";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import WithdrawDialog from "./WithdrawDialog.jsx";

import AssetDropDown from "./Market/AssetDropDownCard.jsx";

export default function WithdrawPermissions(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const form = useForm({
    defaultValues: {
      account: "",
    },
  });
  const currentNode = useStore($currentNode);

  const [showDialog, setShowDialog] = useState(false);

  const [senderUser, setSenderUser] = useState();
  const [targetUser, setTargetUser] = useState();
  const [selectedAsset, setSelectedAsset] = useState();
  const [transferAmount, setTransferAmount] = useState(0);
  const [reviewPeriodSeconds, setReviewPeriodSeconds] = useState(60000);

  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

  const {
    _marketSearchBTS,
    _marketSearchTEST,
    _assetsBTS,
    _assetsTEST,
    _globalParamsBTS,
    _globalParamsTEST
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

  const [fee, setFee] = useState(0);
  useEffect(() => {
    if (globalParams && globalParams.length) {
      const foundFee = globalParams.find((x) => x.id === 0);
      const finalFee = humanReadableFloat(foundFee.data.fee, 5);
      setFee(finalFee);
    }
  }, [globalParams]);

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
  useEffect(() => {
    let unsubscribeUserBalances;

    if (usr && usr.id && currentNode && assets && assets.length) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      unsubscribeUserBalances = userBalancesStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const filteredData = data.filter((balance) =>
            assets.find((x) => x.id === balance.asset_id)
          );
          console.log({ filteredData })
          setBalances(filteredData);
        }
      });
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, assets, currentNode, balanceCounter]);

  /*
  const [bothUsers, setBothUsers] = useState(false);
  useEffect(() => {
    if (usr && usr.chain && currentNode && targetUser) {
      const userStore = createObjectStore([
        usr.chain,
        JSON.stringify([
          ...new Set([
            usr.id,
            targetUser.id,
          ])
        ]),
        currentNode ? currentNode.url : null,
      ]);
      userStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setBothUsers(data);
        }
      });
    }
  }, [usr, currentNode, targetUser]);
  */

  const [payerWithdrawalPermissions, setPayerWithdrawalPermissions] = useState();
  const [receivingWithdrawalPermissions, setReceivingWithdrawalPermissions] = useState();
  useEffect(() => {
    if (usr && usr.chain && currentNode) {
      const withdrawPermissionsStore = createWithdrawPermissionsStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);
      withdrawPermissionsStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          console.log({ data });
          if (data.recieving) {
            setReceivingWithdrawalPermissions(data.recieving);
          }
          if (data.paying) {
            setPayerWithdrawalPermissions(data.paying);
          }
        }

        if (error) {
          console.log({error})
        }
      })
    }
  }, [usr, currentNode]);
          
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
  
  // Proposal dialog state
  const [expiryType, setExpiryType] = useState("1hr");
  const [expiry, setExpiry] = useState(() => {
    const now = new Date();
    const oneHour = 60 * 60 * 1000;
    return new Date(now.getTime() + oneHour);
  });

  const [date, setDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Solely for the calendar component to display a date string

  useEffect(() => {
    if (expiryType === "specific" && date) {
      setExpiry(date);
    }
  }, [expiryType, date]);

  const PayingWithdrawPermissionRow = ({ index, style }) => {
    
    return (
      <div>
        withdraw permission
      </div>
    )
  };
  
  const ReceivingWithdrawPermissionRow = ({ index, style }) => {
    
    return (
      <div>
        withdraw permission
      </div>
    )
  };

  const [openCreateWithdrawPermission, setOpenCreateWithdrawPermission] = useState(false);
  const [withdrawalPeriodSec, setWithdrawalPeriodSec] = useState(1);
  const [periodsUntilExpiration, setPeriodsUntilExpiration] = useState(1);

  const periodStartTime = useMemo(() => {
    if (!expiry) {
      return null;
    }

    const secondsSinceEpoch = Math.floor(expiry.getTime() / 1000);
    return secondsSinceEpoch;
  }, [expiry]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("WithdrawPermissions:title")}</CardTitle>
              <CardDescription>
                <p>{t("WithdrawPermissions:description")}</p>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12">
                  <HoverInfo
                    content={t("WithdrawPermissions:outbound_description")}
                    header={t("WithdrawPermissions:outbound")}
                    type="header"
                  />
                </div>
                <div className="col-span-9 border border-gray-300 rounded">
                  {
                    payerWithdrawalPermissions && payerWithdrawalPermissions.length
                      ? <List
                        itemSize={35}
                        itemCount={payerWithdrawalPermissions ? payerWithdrawalPermissions.length : 0}
                        className="w-full"
                        height={400}
                      >
                        {PayingWithdrawPermissionRow}
                      </List>
                      : <p>{t("WithdrawPermissions:not_sending_anything")}</p>
                  }
                </div>
                <div className="col-span-3">
                  <WithdrawDialog
                    usr={usr}
                    assets={assets}
                    marketSearch={marketSearch}
                    balances={balances}
                    showDialog={showDialog}
                    setShowDialog={setShowDialog}
                    mode="create"
                  />
                </div>
                <div className="col-span-12 mt-2">
                  <HoverInfo
                    content={t("WithdrawPermissions:inbound_description")}
                    header={t("WithdrawPermissions:inbound")}
                    type="header"
                  />
                </div>
                <div className="col-span-12 border border-gray-300 rounded">
                  {
                    receivingWithdrawalPermissions && receivingWithdrawalPermissions.length
                      ? <List
                        itemSize={35}
                        itemCount={receivingWithdrawalPermissions ? receivingWithdrawalPermissions.length : 0}
                        className="w-full"
                        height={400}
                      >
                        {ReceivingWithdrawPermissionRow}
                      </List>
                      : <p>{t("WithdrawPermissions:not_receiving_anything")}</p>
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
