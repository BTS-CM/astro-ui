import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
  EmptyDescription,
} from "@/components/ui/empty";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createIssuedAssetsStore } from "@/nanoeffects/IssuedAssets.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import { $currentUser, $userStorage } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { debounce } from "@/lib/common.js";

export default function IssuedAssets(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const { _assetsBTS, _assetsTEST, _marketSearchBTS, _marketSearchTEST } =
    properties;

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const marketSearch = useMemo(() => {
    if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
      return usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);

  const [issuedAssets, setIssuedAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createIssuedAssetsStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setLoading(false);
          setIssuedAssets(data);
        }
      });
    }

    if (usr && usr.id && currentNode && currentNode.url) {
      setLoading(true);
      fetching();
    }
  }, [usr, currentNode]);

  const relevantAssets = useMemo(() => {
    if (!issuedAssets || !issuedAssets.length) {
      return [];
    }

    return issuedAssets.filter(
      (asset) => !asset.bitasset_data_id && !asset.for_liquidity_pool // no smartcoins/pmas & no existing pool share assets!
    );
  }, [issuedAssets]);

  const [dynamicData, setDynamicData] = useState([]);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        usr.chain,
        JSON.stringify(
          relevantAssets.map((asset) => asset.dynamic_asset_data_id)
        ),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const filteredData = Array.isArray(data)
            ? data.filter((d) => {
                const confidential = Number(d?.confidential_supply ?? 0);
                const current = Number(d?.current_supply ?? 0);
                return confidential === 0 && current === 0;
              })
            : [];

          setDynamicData(filteredData);
        }
      });
    }

    if (relevantAssets && relevantAssets.length) {
      fetching();
    }
  }, [relevantAssets]);

  const eligibleAssets = useMemo(() => {
    if (!relevantAssets || !relevantAssets.length) {
      return [];
    }

    const dynamicDataIds = dynamicData.map((d) => d.id.replace("2.3.", "1.3."));

    return relevantAssets.filter((asset) => dynamicDataIds.includes(asset.id));
  }, [dynamicData, relevantAssets]);

  const [balances, setBalances] = useState();
  useEffect(() => {
    async function fetchBalances() {
      if (usr && usr.id && currentNode && assets && assets.length) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNode ? currentNode.url : null,
        ]);

        userBalancesStore.subscribe(({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setBalances(filteredData);
          }
        });
      }
    }

    fetchBalances();
  }, [usr, assets, currentNode]);

  const [selectedAsset, setSelectedAsset] = useState(null);
  const AssetRow = ({ index, style }) => {
    const issuedAsset = eligibleAssets[index];
    if (!issuedAsset) {
      return null;
    }

    return (
      <div style={{ ...style }} key={`acard-${issuedAsset.id}`}>
        <Card
          className={`ml-2 mr-2 cursor-pointer ${
            selectedAsset && selectedAsset !== issuedAsset.id
              ? "bg-gray-300"
              : ""
          }`}
          onClick={() => setSelectedAsset(issuedAsset.id)}
        >
          <CardHeader className="pb-1">
            <CardTitle className="pb-4">
              {selectedAsset && selectedAsset === issuedAsset.id ? "✔️ " : ""}
              {`${issuedAsset.symbol} (${issuedAsset.id})`}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  };

  const [takerFeePercent, setTakerFeePercent] = useState(0);
  const [withdrawalFeePercent, setWithdrawalFeePercent] = useState(0);
  const [assetA, setAssetA] = useState(null);
  const [assetB, setAssetB] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  const assetAData = useMemo(() => {
    if (assets && assetA) {
      return assets.find((asset) => asset.symbol === assetA);
    }
    return null;
  }, [assets, assetA]);

  const assetBData = useMemo(() => {
    if (assets && assetB) {
      return assets.find((asset) => asset.symbol === assetB);
    }
    return null;
  }, [assets, assetB]);

  const debouncedPercent = useCallback(
    debounce((input, setCommissionFunction) => {
      let parsedInput = parseFloat(input);
      if (isNaN(parsedInput) || parsedInput <= 0) {
        setCommissionFunction(0);
        return;
      }

      const split = parsedInput.toString().split(".");
      if (split.length > 1) {
        const decimals = split[1].length;
        if (decimals > 2) {
          parsedInput = parseFloat(parsedInput.toFixed(2));
        }
      }

      if (parsedInput > 100) {
        setCommissionFunction(100);
      } else if (parsedInput < 0.01) {
        setCommissionFunction(0.01);
      } else {
        setCommissionFunction(parsedInput);
      }
    }, 500),
    []
  );

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full lg:w-3/4">
        <Card>
          <CardHeader>
            <CardTitle>{t("CreatePool:title")}</CardTitle>
            <CardDescription>{t("CreatePool:description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              {eligibleAssets.length > 0 ? (
                <h5 className="mb-2 text-center">
                  {t("IssuedAssets:listingUIA", {
                    count: eligibleAssets.length,
                  })}
                </h5>
              ) : null}
              {loading ? (
                <div className="text-center mt-5">
                  {t("CreditBorrow:common.loading")}
                </div>
              ) : null}
              {!loading && (!eligibleAssets || !eligibleAssets.length) ? (
                <Empty className="mt-5">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">❔</EmptyMedia>
                    <EmptyTitle>{t("IssuedAssets:noUIA")}</EmptyTitle>
                    <EmptyDescription>
                      {t("CreatePool:noEligibleAssets")}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button asChild>
                      <a href="/create_uia/index.html">
                        {t("PageHeader:create_uia")}
                      </a>
                    </Button>
                  </EmptyContent>
                </Empty>
              ) : (
                <>
                  <Card>
                    <CardContent>
                      <div className="w-full max-h-[350px] min-h-[350px] overflow-auto">
                        <List
                          rowComponent={AssetRow}
                          rowCount={eligibleAssets.length}
                          rowHeight={75}
                          rowProps={{}}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
            {!loading && eligibleAssets && eligibleAssets.length ? (
              <div className="grid grid-cols-1 gap-5 mb-3 mt-5">
                <div>
                  <HoverInfo
                    header={t("CreatePool:taker_fee_header")}
                    content={t("CreatePool:taker_fee_content")}
                  />
                  <Input
                    placeholder={0}
                    value={takerFeePercent}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    pattern="^\d*(\.\d{0,2})?$"
                    onInput={(e) => {
                      setTakerFeePercent(e.currentTarget.value);
                      debouncedPercent(
                        e.currentTarget.value,
                        setTakerFeePercent
                      );
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <HoverInfo
                    header={t("CreatePool:withdrawal_fee_header")}
                    content={t("CreatePool:withdrawal_fee_content")}
                  />
                  <Input
                    placeholder={0}
                    value={withdrawalFeePercent}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    pattern="^\d*(\.\d{0,2})?$"
                    onInput={(e) => {
                      setWithdrawalFeePercent(e.currentTarget.value);
                      debouncedPercent(
                        e.currentTarget.value,
                        setWithdrawalFeePercent
                      );
                    }}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <HoverInfo
                      header={t("CreatePool:assetA")}
                      content={t("CreatePool:assetA_description")}
                    />
                  </div>
                  <Input
                    disabled
                    value={
                      assetAData
                        ? `${assetAData.symbol} (${assetAData.id})`
                        : assetA
                    }
                    type="text"
                  />
                  <AssetDropDown
                    assetSymbol={assetA ?? ""}
                    assetData={assetAData}
                    storeCallback={setAssetA}
                    otherAsset={assetB}
                    marketSearch={marketSearch}
                    type={"quote"}
                    chain={usr && usr.chain ? usr.chain : "bitshares"}
                    balances={balances}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <HoverInfo
                      header={t("CreatePool:assetB")}
                      content={t("CreatePool:assetB_description")}
                    />
                  </div>
                  <Input
                    disabled
                    value={
                      assetBData
                        ? `${assetBData.symbol} (${assetBData.id})`
                        : assetB
                    }
                    type="text"
                  />
                  <AssetDropDown
                    assetSymbol={assetB ?? ""}
                    assetData={assetBData}
                    storeCallback={setAssetB}
                    otherAsset={assetA}
                    marketSearch={marketSearch}
                    type={"base"}
                    chain={usr && usr.chain ? usr.chain : "bitshares"}
                    balances={balances}
                  />
                </div>
                <div>
                  {assetA && assetB && selectedAsset ? (
                    <Button
                      className="h-8"
                      onClick={() => {
                        setShowDialog(true);
                      }}
                    >
                      {t("CreatePrediction:buttons.submit")}
                    </Button>
                  ) : (
                    <Button className="h-8" disabled>
                      {t("CreatePrediction:buttons.submit")}
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
      {showDialog ? (
        <DeepLinkDialog
          operationNames={["liquidity_pool_create"]}
          username={usr && usr.username ? usr.username : ""}
          usrChain={usr && usr.chain ? usr.chain : "bitshares"}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={`CreatingPool`}
          headerText={t("CreatePool:deeplinkDialogTitle")}
          trxJSON={[
            {
              account: usr.id,
              asset_a: assetAData.id,
              asset_b: assetBData.id,
              share_asset: selectedAsset,
              taker_fee_percent: takerFeePercent,
              withdrawal_fee_percent: withdrawalFeePercent,
              extensions: {},
            },
          ]}
        />
      ) : null}
    </>
  );
}
