import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import { useStore } from "@nanostores/react";
import { FixedSizeList as List } from "react-window";

import { format, set } from "date-fns";
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

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { humanReadableFloat, blockchainFloat } from "@/lib/common";

import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createWithdrawPermissionsStore } from "@/nanoeffects/WithdrawPermissions.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";
import WithdrawDialog from "./WithdrawDialog.jsx";

export default function WithdrawPermissions(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);

  const [showDialog, setShowDialog] = useState(false);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

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

  const [accounts, setAccounts] = useState([]);
  useEffect(() => {
    if (
      usr && usr.chain && currentNode &&
      payerWithdrawalPermissions &&
      receivingWithdrawalPermissions
    ) {
      const allPermissions = [
        ...(payerWithdrawalPermissions || []),
        ...(receivingWithdrawalPermissions || []),
      ];

      const authorized_account = allPermissions.map((x) => x.authorized_account);
      const withdraw_from_account = allPermissions.map((x) => x.withdraw_from_account);
      const allAccounts = [...new Set([...authorized_account, ...withdraw_from_account])];

      const userStore = createObjectStore([
        usr.chain,
        JSON.stringify(allAccounts),
        currentNode ? currentNode.url : null,
      ]);

      userStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          console.log({accountData: data});
          setAccounts(data);
        }
      });
    }
  }, [
    usr,
    currentNode,
    payerWithdrawalPermissions,
    receivingWithdrawalPermissions
  ]);

  const PayingWithdrawPermissionRow = ({ index, style }) => {
    const currentWithdrawPermission = payerWithdrawalPermissions[index];
    const withdrawAsset = assets.find((x) => x.id === currentWithdrawPermission.withdrawal_limit.asset_id);
    const withdrawAmount = humanReadableFloat(currentWithdrawPermission.withdrawal_limit.amount, withdrawAsset.precision);

    const withdrawAccount = currentWithdrawPermission.authorized_account;
    const withdrawAccountData = accounts.find((x) => x.id === withdrawAccount);
    if (!withdrawAccountData) {
      return null;
    }

    const id = currentWithdrawPermission.id;

    const claimed_this_period = humanReadableFloat(currentWithdrawPermission.claimed_this_period, withdrawAsset.precision);

    const periodStartTime = currentWithdrawPermission.period_start_time;
    const withdrawal_period_sec = currentWithdrawPermission.withdrawal_period_sec / 1000;
    const withdrawalStartTime = (Date.now() - new Date(periodStartTime).getTime()) / 1000;
    const timeTillNextPeriod = ((withdrawal_period_sec - (withdrawalStartTime % withdrawal_period_sec)) % withdrawal_period_sec).toFixed(0);

    const formattedPeriodStartTime = format(new Date(currentWithdrawPermission.period_start_time), 'dd-MM-yyyy HH:mm:ss');
    const formattedExpiration = format(new Date(currentWithdrawPermission.expiration), 'dd-MM-yyyy HH:mm:ss');

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const remainingTime = (new Date(currentWithdrawPermission.expiration).getTime() - Date.now()) / 1000;
    const remainingPeriods = (remainingTime / (withdrawal_period_sec * 1000)).toFixed(3);
    const maximumClaimable = (withdrawAmount - claimed_this_period + ((remainingPeriods - 1) * withdrawAmount)).toFixed(withdrawAsset.precision);

    return (
      <div style={style}>
        <Card className="m-2 pt-5">
          <CardContent className="mb-0 pb-0">
            <div className="grid grid-cols-1 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><b>{t("WithdrawPermissions:id")}</b>: {id}</div>
                <div><b>{t("WithdrawPermissions:payer")}</b>: {withdrawAccount}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><b>{t("WithdrawPermissions:withdraw_period_amount")}</b>: {withdrawAmount} {withdrawAsset.symbol}</div>
                <div><b>{t("WithdrawPermissions:claimed")}</b>: {claimed_this_period} {withdrawAsset.symbol} ({claimed_this_period > 0 ? ((claimed_this_period / withdrawAmount) * 100).toFixed(3) : 0}%)</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><b>{t("WithdrawPermissions:period_start_time")}</b>: {formattedPeriodStartTime}</div>
                <div><b>{t("WithdrawPermissions:expiration")}</b>: {formattedExpiration}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><b>{t("WithdrawPermissions:withdrawal_period_sec")}</b>: {withdrawal_period_sec}s</div>
                <div><b>{t("WithdrawPermissions:time_remaining")}</b>: {timeTillNextPeriod}s</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><b>{t("WithdrawPermissions:remaining_periods")}</b>: {remainingPeriods}</div>
                <div><b>{t("WithdrawPermissions:maximum_claimable")}</b>:<br/>{maximumClaimable} {withdrawAsset.symbol}</div>
              </div>
              <div className="grid grid-cols-2 gap-5 mt-2 mb-3">
                <WithdrawDialog
                  usr={usr}
                  assets={assets}
                  marketSearch={marketSearch}
                  balances={balances}
                  showDialog={showEditDialog}
                  setShowDialog={setShowEditDialog}
                  mode="edit"
                  //
                  _existingWithdrawPermissionID={currentWithdrawPermission.id}
                  _targetUser={{id: withdrawAccount, name: withdrawAccountData.name}}
                  _selectedAsset={withdrawAsset.symbol}
                  _transferAmount={withdrawAmount}
                  _withdrawalPeriodSec={withdrawal_period_sec}
                  _periodsUntilExpiration={remainingPeriods}
                  _expiration={currentWithdrawPermission.expiration}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteDialogOpen(true);
                  }}
                >
                  {t("WithdrawPermissions:delete")}
                </Button>
              </div>
              {
                deleteDialogOpen
                  ? <DeepLinkDialog
                      operationNames={["withdraw_permission_delete"]}
                      username={usr && usr.username ? usr.username : ""}
                      usrChain={usr && usr.chain ? usr.chain : "bitshares"}
                      userID={usr.id}
                      dismissCallback={setDeleteDialogOpen}
                      key={`DeletingWithdrawPermission`}
                      headerText={t("WithdrawPermissions:deleteWithdrawPermissionHeader")}
                      trxJSON={[
                        {
                          withdraw_from_account: usr.id,
                          authorized_account: withdrawAccount,
                          withdrawal_permission: currentWithdrawPermission.id
                        },
                      ]}
                    />
                  : null
              }
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const ReceivingWithdrawPermissionRow = ({ index, style }) => {
    const currentWithdrawPermission = receivingWithdrawalPermissions[index];
    const withdrawAsset = assets.find((x) => x.id === currentWithdrawPermission.withdrawal_limit.asset_id);
    const withdrawAmount = humanReadableFloat(currentWithdrawPermission.withdrawal_limit.amount, withdrawAsset.precision);

    const payer = currentWithdrawPermission.withdraw_from_account;
    const id = currentWithdrawPermission.id;

    const claimed_this_period = humanReadableFloat(currentWithdrawPermission.claimed_this_period, withdrawAsset.precision);

    const periodStartTime = currentWithdrawPermission.period_start_time;
    const withdrawal_period_sec = currentWithdrawPermission.withdrawal_period_sec / 1000;
    const withdrawalStartTime = (Date.now() - new Date(periodStartTime).getTime()) / 1000;
    const timeTillNextPeriod = ((withdrawal_period_sec - (withdrawalStartTime % withdrawal_period_sec)) % withdrawal_period_sec).toFixed(0);

    const formattedPeriodStartTime = format(new Date(currentWithdrawPermission.period_start_time), 'dd-MM-yyyy HH:mm:ss');
    const formattedExpiration = format(new Date(currentWithdrawPermission.expiration), 'dd-MM-yyyy HH:mm:ss');

    const remainingTime = (new Date(currentWithdrawPermission.expiration).getTime() - Date.now()) / 1000;
    const remainingPeriods = (remainingTime / (withdrawal_period_sec * 1000)).toFixed(3);
    const maximumClaimable = (withdrawAmount - claimed_this_period + ((remainingPeriods - 1) * withdrawAmount)).toFixed(withdrawAsset.precision);

    const [openClaimDialog, setOpenClaimDialog] = useState(false);

    return (
      <div style={style}>
        <Card className="m-2">
          <CardContent>
            <div className="grid grid-cols-1 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><b>{t("WithdrawPermissions:id")}</b>: {id}</div>
                <div><b>{t("WithdrawPermissions:payer")}</b>: {payer}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><b>{t("WithdrawPermissions:withdraw_period_amount")}</b>: {withdrawAmount} {withdrawAsset.symbol}</div>
                <div><b>{t("WithdrawPermissions:claimed")}</b>: {claimed_this_period} {withdrawAsset.symbol} ({claimed_this_period > 0 ? ((claimed_this_period / withdrawAmount) * 100).toFixed(3) : 0}%)</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><b>{t("WithdrawPermissions:period_start_time")}</b>:<br/>{formattedPeriodStartTime}</div>
                <div><b>{t("WithdrawPermissions:expiration")}</b>:<br/>{formattedExpiration}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><b>{t("WithdrawPermissions:withdrawal_period_sec")}</b>: {withdrawal_period_sec}s</div>
                <div><b>{t("WithdrawPermissions:time_remaining")}</b>: {timeTillNextPeriod}s</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><b>{t("WithdrawPermissions:remaining_periods")}</b>: {remainingPeriods}</div>
                <div><b>{t("WithdrawPermissions:maximum_claimable")}</b>:<br/>{maximumClaimable} {withdrawAsset.symbol}</div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setOpenClaimDialog(true);
                }}
                className="w-1/4 mt-2"
              >
                {t("WithdrawPermissions:claim")}
              </Button>
              {
                openClaimDialog
                  ? <DeepLinkDialog
                      operationNames={["withdraw_permission_claim"]}
                      username={usr && usr.username ? usr.username : ""}
                      usrChain={usr && usr.chain ? usr.chain : "bitshares"}
                      userID={usr.id}
                      dismissCallback={setOpenClaimDialog}
                      key={`ClaimingWithdrawPermission`}
                      headerText={t("WithdrawPermissions:claimWithdrawPermissionHeader")}
                      trxJSON={[
                        {
                          fee: {
                            amount: 0,
                            asset_id: "1.3.0",
                          },
                          withdraw_permission: id,
                          withdraw_from_account: payer,
                          withdraw_to_account: usr.id,
                          amount_to_withdraw: {
                            amount: blockchainFloat(withdrawAmount, withdrawAsset.precision),
                            asset_id: withdrawAsset.id,
                          },
                        },
                      ]}
                    />
                  : null
              }
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

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
                    showDialog={showCreateDialog}
                    setShowDialog={setShowCreateDialog}
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
