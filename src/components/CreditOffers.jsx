import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { List } from "react-window";
import { useTranslation } from "react-i18next";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";
import { useStore } from "@nanostores/react";

import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  function CommonRow({ index, style, res, foundAsset }) {
    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="ml-2 mr-2">
          <CardHeader className="pb-1">
            <CardTitle>
              {t("CreditBorrow:common.offer")}
              {" #"}
              {res.id.replace("1.21.", "")}
              {" "}
              {t("CreditBorrow:common.by")}{" "}
              {res.owner_name}
              {" "}
              (
              {res.owner_account}
              )
            </CardTitle>
            <CardDescription>
              {t("CreditBorrow:common.offering")}
              <b>
                {` ${humanReadableFloat(
                  res.current_balance,
                  foundAsset.precision
                )} ${foundAsset.symbol} (${res.asset_type})`}
              </b>
              <br />
              {t("CreditBorrow:common.accepting")}
              <b>
                {assets && assets.length
                  ? ` ${res.acceptable_collateral
                      .map((asset) => asset[0])
                      .map((x) => {
                        return assets.find((y) => y.id === x)?.symbol;
                      })
                      .map((x) => x)
                      .join(", ")}`
                  : t("CreditBorrow:common.loading")}
              </b>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm pb-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="col-span-1">
                {t("CreditBorrow:common.fee", { fee: res.fee_rate / 10000 })}
                <br />
                {t("CreditBorrow:common.repayPeriod", {
                  repayPeriod: (res.max_duration_seconds / 60 / 60).toFixed(
                    res.max_duration_seconds / 60 / 60 < 1 ? 2 : 0
                  ),
                })}
              </div>
              <div className="col-span-1">
                {t("CreditBorrow:common.validity", {
                  validity: hoursTillExpiration(res.auto_disable_time),
                })}
                <br />
                {t("CreditBorrow:common.min", {
                  amount: humanReadableFloat(
                    res.min_deal_amount,
                    foundAsset.precision
                  ),
                  asset: foundAsset.symbol,
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter className="pb-5">
            <a href={`/lend/index.html?id=${res.id}`}>
              <Button>
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
          </CardFooter>
        </Card>
      </div>
    );
  }

  const Row = ({ index, style }) => {
    let res = offers[index];

    const foundAsset = assets.find((x) => x.id === res.asset_type);

    if (!res || !foundAsset) {
      return null;
    }

    return (
      <CommonRow
        index={index}
        style={style}
        res={res}
        foundAsset={foundAsset}
      />
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full lg:w-1/2">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <div className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle>{t("CreditOffers:card.title")}</CardTitle>
                  <CardDescription>
                    {t("CreditOffers:card.description")}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowExpired(!showExpired)}
                  title={
                    showExpired
                      ? t("CreditBorrow:card.hideExpired")
                      : t("CreditBorrow:card.showExpired")
                  }
                >
                  {showExpired ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <>
                {offers && offers.length ? (
                  <div className="w-full mt-3 max-h-[500px] overflow-auto">
                    <List
                      rowComponent={Row}
                      rowCount={offers.length}
                      rowHeight={225}
                      rowProps={{}}
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
                      <a href="/lend/index.html">
                        <Button>{t("CreditOffers:card.create")}</Button>
                      </a>
                    </EmptyContent>
                  </Empty>
                ) : null}
              </>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
