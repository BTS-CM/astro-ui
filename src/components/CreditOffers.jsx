import React, { useSyncExternalStore, useMemo } from "react";
import { List } from "react-window";
import { useTranslation } from "react-i18next";

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

import { useInitCache } from "@/nanoeffects/Init.ts";

import { $currentUser } from "@/stores/users.ts";

import { humanReadableFloat } from "@/lib/common.js";
import ExternalLink from "./common/ExternalLink.jsx";

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

  const { _assetsBTS, _assetsTEST, _offersBTS, _offersTEST } = properties;

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

  const offers = useMemo(() => {
    if (_chain && (_offersBTS || _offersTEST)) {
      return _chain === "bitshares"
        ? _offersBTS.filter(
            (x) =>
              hoursTillExpiration(x.auto_disable_time) >= 0 &&
              x.owner_account === usr.id
          )
        : _offersTEST.filter(
            (x) =>
              hoursTillExpiration(x.auto_disable_time) >= 0 &&
              x.owner_account === usr.id
          );
    }
    return [];
  }, [_offersBTS, _offersTEST, _chain, usr]);

  function CommonRow({ index, style, res, foundAsset }) {
    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="ml-2 mr-2">
          <CardHeader className="pb-1">
            <CardTitle>
              {t("CreditBorrow:common.offer")}
              {" #"}
              <ExternalLink
                classnamecontents="hover:text-purple-500"
                type="text"
                text={res.id.replace("1.21.", "")}
                hyperlink={`https://blocksights.info/#/credit-offers/${res.id.replace(
                  "1.21.",
                  ""
                )}${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
              />{" "}
              {t("CreditBorrow:common.by")}{" "}
              <ExternalLink
                classnamecontents="hover:text-purple-500"
                type="text"
                text={res.owner_name}
                hyperlink={`https://blocksights.info/#/accounts/${
                  res.owner_name
                }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
              />{" "}
              (
              <ExternalLink
                classnamecontents="hover:text-purple-500"
                type="text"
                text={res.owner_account}
                hyperlink={`https://blocksights.info/#/accounts/${
                  res.owner_account
                }${usr.chain === "bitshares" ? "" : "?network=testnet"}`}
              />
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
            <div className="grid grid-cols-2 gap-2">
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
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{t("CreditOffers:card.title")}</CardTitle>
              <CardDescription>
                {t("CreditOffers:card.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <>
                {offers && offers.length ? (
                  <List
                    height={500}
                    rowComponent={Row}
                    rowCount={offers.length}
                    rowHeight={225}
                    rowProps={{}}
                    className="w-full mt-3"
                  />
                ) : null}
                {offers && !offers.length
                  ? t("CreditOffers:card.noResults")
                  : null}
              </>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
