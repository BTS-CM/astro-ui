import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  memo,
} from "react";
import { List } from "react-window";

const CreditOffersCommonRow = memo(function CreditOffersCommonRow({ style, res, foundAsset, assets, t, usr, onDeleteRequest }) {
  const collateralSymbols =
    res.acceptable_collateral && res.acceptable_collateral.length
      ? res.acceptable_collateral
          .map((asset) => asset[0])
          .map((x) => assets.find((y) => y.id === x)?.symbol ?? x)
      : [];
  const visibleCollateral = collateralSymbols.slice(0, 5);
  const hiddenCollateralCount = collateralSymbols.length - visibleCollateral.length;
  const isExpired = new Date(res.auto_disable_time) < new Date();
  const hasOngoingDeals = res.current_balance !== res.total_balance;
  const canDelete =
    usr && usr.id === res.owner_account && (isExpired || !hasOngoingDeals);
  const validityHours = hoursTillExpiration(res.auto_disable_time);
  return (
    <div style={{ ...style }} key={`acard-${res.id}`}>
      <div className="ml-2 mr-2 relative overflow-hidden rounded-xl border border-[hsl(var(--accent-1)/0.15)] bg-card/60 backdrop-blur-xl shadow-md shadow-[color:hsl(var(--accent-1)/0.1)] hover:border-[hsl(var(--accent-1)/0.25)] hover:shadow-[color:hsl(var(--accent-1)/0.15)] transition-all duration-300">
        <div className="p-3 pb-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
              <FileText className="h-4 w-4 dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]" />
            </span>
            <h3 className="text-sm font-semibold leading-none tracking-tight bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent">
              {t("CreditBorrow:common.offer")}
              {" #"}
              {res.id.replace("1.21.", "")}
              {" - "}
              {t("CreditOffers:card.lending")}
              <b>
                {` ${humanReadableFloat(
                  res.current_balance,
                  foundAsset.precision
                )} ${foundAsset.symbol} (${res.asset_type})`}
              </b>
              {" - "}
              {t("CreditOffers:card.charging")}{" "}
              <b>{`${res.fee_rate / 10000}%`}</b>{" "}
              {t("CreditOffers:card.feeWord")}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {t("CreditOffers:card.acceptedCollateral")}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            {assets && assets.length ? (
              <>
                {visibleCollateral.map((symbol) => (
                  <span
                    key={`${res.id}-${symbol}`}
                    className="inline-flex items-center rounded-md border border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.08)] px-1.5 py-0.5 text-[11px] font-medium text-foreground/80"
                  >
                    {symbol}
                  </span>
                ))}
                {hiddenCollateralCount > 0 ? (
                  <span
                    title={collateralSymbols.join(", ")}
                    className="inline-flex cursor-default items-center rounded-md border border-[hsl(var(--accent-1)/0.25)] bg-[hsl(var(--accent-1)/0.08)] px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                  >
                    {t("CreditOffers:card.more", {
                      count: hiddenCollateralCount,
                    })}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("CreditBorrow:common.loading")}
              </span>
            )}
          </div>
        </div>
        <div className="px-3 pb-3">
          <p className="text-sm text-muted-foreground mt-1">
            {t("CreditOffers:card.details")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mt-1">
            <div className="col-span-1">
              {t("CreditBorrow:common.min", {
                amount: humanReadableFloat(
                  res.min_deal_amount,
                  foundAsset.precision
                ),
                asset: foundAsset.symbol,
              })}
            </div>
            <div className="col-span-1">
              {t("CreditBorrow:common.repayPeriod", {
                repayPeriod: (res.max_duration_seconds / 60 / 60).toFixed(
                  res.max_duration_seconds / 60 / 60 < 1 ? 2 : 0
                ),
              })}
            </div>
            <div className="col-span-1">
              {validityHours < 0
                ? t("CreditOffers:card.expired")
                : t("CreditBorrow:common.validity", {
                    validity: validityHours,
                  })}
            </div>
          </div>
        </div>
        <div className="px-3 pb-5 flex gap-2">
          <a href={`/lend.html?id=${res.id}`}>
            <Button className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:shadow-[color:hsl(var(--accent-1)/0.4)] active:scale-95 transition-all duration-200 cursor-pointer">
              {t(
                `CreditBorrow:common.${
                  usr.id === res.owner_account ? "edit" : "view"
                }`,
                {
                  offerID: res.id.replace("1.21.", ""),
                }
              )}
            </Button>
          </a>
          {canDelete ? (
            <Button
              variant="outline"
              className="border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] hover:bg-[hsl(var(--accent-1)/0.1)]"
              onClick={(event) => {
                event.preventDefault();
                onDeleteRequest(res.id);
              }}
            >
              {t("CreditOffers:card.delete")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
});

const CreditOffersRow = memo(function CreditOffersRow({ index, style, offers, assets, t, usr, onDeleteRequest }) {
  const res = offers[index];
  if (!res) return null;
  const foundAsset = assets.find((x) => x.id === res.asset_type);
  if (!foundAsset) return null;
  return <CreditOffersCommonRow style={style} res={res} foundAsset={foundAsset} assets={assets} t={t} usr={usr} onDeleteRequest={onDeleteRequest} />;
});
import { useTranslation } from "react-i18next";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import { Coins, FileText, ShieldAlert, Eye } from "lucide-react";
import { useStore } from "@nanostores/react";

import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";

import {} from "@/components/ui/card";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createCreditOfferByOwnerStore } from "@/nanoeffects/CreditOffersByOwner.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { humanReadableFloat } from "@/lib/common.js";

function hoursTillExpiration(expirationTime) {
  var expirationDate = new Date(expirationTime);
  var currentDate = new Date();
  var difference = expirationDate - currentDate;
  var hours = Math.round(difference / 1000 / 60 / 60);
  return hours;
}

export default function CreditOffers(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );

  const currentNode = useStore($currentNode);

  const { _assetsBTS, _assetsTEST } = properties;

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

  const [allOffers, setAllOffers] = useState([]);
  const [showExpired, setShowExpired] = useState(false);
  const [deleteOfferId, setDeleteOfferId] = useState(null);

  useEffect(() => {
    async function fetchUserOffers() {
      if (usr && usr.id) {
        const userOffersStore = createCreditOfferByOwnerStore([
          _chain,
          usr.id,
          currentNode ? currentNode.url : null,
        ]);

        userOffersStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            setAllOffers(data);
          }
        });
      }
    }

    fetchUserOffers();
  }, [_chain, usr, currentNode]);

  const offers = useMemo(() => {
    if (_chain && allOffers && allOffers.length) {
      let currentOffers = allOffers;

      if (!showExpired) {
        currentOffers = currentOffers.filter(
          (x) => hoursTillExpiration(x.auto_disable_time) >= 0
        );
      }

      return currentOffers;
    }
    return [];
  }, [allOffers, _chain, showExpired]);

  const creditOffersRowProps = useMemo(() => ({ offers, assets, t, usr, onDeleteRequest: setDeleteOfferId }), [offers, assets, t, usr]);

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full lg:w-1/2">
        <div className="grid grid-cols-1 gap-3">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-[color:hsl(var(--accent-1)/0.2)]">
            <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-2)/0.2)] blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br from-[hsl(var(--accent-2)/0.2)] to-[hsl(var(--accent-1)/0.2)] blur-3xl" />
            <div className="h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-1)/0.7)] via-[hsl(var(--accent-2)/0.7)] to-[hsl(var(--accent-1)/0.7)]" />
            <div className="flex flex-row justify-between items-center p-4 pb-0">
              <div>
                <h2 className="text-lg font-semibold tracking-tight bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] bg-clip-text text-transparent flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                    <FileText className="h-4.5 w-4.5" />
                  </span>
                  {t("CreditOffers:card.title")}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("CreditOffers:card.description")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {offers && offers.length ? (
                  <a href="/lend.html">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] hover:bg-[hsl(var(--accent-1)/0.1)]"
                    >
                      + {t("CreditOffers:card.create")}
                    </Button>
                  </a>
                ) : null}
                <Button
                  variant="outline"
                  size="icon"
                  className="border-[hsl(var(--accent-1)/0.2)] bg-[hsl(var(--accent-1)/0.05)] hover:bg-[hsl(var(--accent-1)/0.1)]"
                  onClick={() => setShowExpired(!showExpired)}
                  title={
                    showExpired
                      ? t("CreditBorrow:card.hideExpired")
                      : t("CreditBorrow:card.showExpired")
                  }
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 pt-2">
              <>
                {offers && offers.length ? (
                  <div className="w-full mt-3 h-[500px]">
                    <List
                      rowComponent={CreditOffersRow}
                      rowCount={offers.length}
                      rowHeight={225}
                      rowProps={creditOffersRowProps}
                      height={500}
                      width="100%"
                    />
                  </div>
                ) : null}
                {offers && !offers.length ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">❕</EmptyMedia>
                      <EmptyTitle>
                        {t("CreditOffers:card.noResults")}
                      </EmptyTitle>
                      <EmptyDescription>
                        {t("CreditOffers:card.noResultsDesc")}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <a href="/lend.html">
                        <Button className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] text-[hsl(var(--accent-1-gradFg))] shadow-md shadow-[color:hsl(var(--accent-1)/0.2)] hover:from-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))] hover:shadow-[color:hsl(var(--accent-1)/0.4)] active:scale-95 transition-all duration-200 cursor-pointer">
                          {t("CreditOffers:card.create")}
                        </Button>
                      </a>
                    </EmptyContent>
                  </Empty>
                ) : null}
              </>
            </div>
          </div>
        </div>
      </div>

      {deleteOfferId && usr && usr.id ? (
        <DeepLinkDialog
          trxJSON={[
            {
              owner_account: usr.id,
              offer_id: deleteOfferId,
              extensions: [],
            },
          ]}
          operationNames={["credit_offer_delete"]}
          username={usr.username}
          usrChain={_chain}
          userID={usr.id}
          dismissCallback={() => setDeleteOfferId(null)}
          headerText={t("CreditOffers:card.deleteHeader", {
            offerID: deleteOfferId.replace("1.21.", ""),
          })}
        />
      ) : null}
    </>
  );
}
