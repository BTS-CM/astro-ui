import {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
  memo,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { cn } from "@/lib/utils";

import {
  Card,
  CardContent,
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

import { Droplets, Layers, Coins, ArrowLeftRight, Percent, ArrowDownUp } from "lucide-react";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createIssuedAssetsStore } from "@/nanoeffects/IssuedAssets.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import { $currentUser, $userStorage } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { debounce, humanReadableFloat } from "@/lib/common.js";


const AssetRow = memo(function AssetRow({ index, style, eligibleAssets, selectedAsset, setSelectedAsset, t }) {
  const issuedAsset = eligibleAssets[index];
  if (!issuedAsset) {
    return null;
  }

  const maxSupply =
    issuedAsset.options && issuedAsset.options.max_supply
      ? humanReadableFloat(
          issuedAsset.options.max_supply,
          issuedAsset.precision
        ).toLocaleString(undefined, { maximumFractionDigits: 0 })
      : "0";

  return (
    <div style={{ ...style }} key={`acard-${issuedAsset.id}`}>
      <Card
        className={cn(
          "ml-2 mr-2 cursor-pointer transition-colors border-border hover:border-[hsl(var(--accent-1)/0.4)]",
          selectedAsset && selectedAsset !== issuedAsset.id
            ? "bg-accent"
            : "",
          selectedAsset && selectedAsset === issuedAsset.id
            ? "bg-[hsl(var(--accent-1)/0.1)] border-[hsl(var(--accent-1)/0.5)]"
            : ""
        )}
        onClick={() => setSelectedAsset(issuedAsset.id)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="pb-0">
              {selectedAsset && selectedAsset === issuedAsset.id ? (
                <span className="text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))]">
                  ✔️{" "}
                </span>
              ) : (
                ""
              )}
              {`${issuedAsset.symbol} (${issuedAsset.id})`}
            </CardTitle>
            <div className="text-xs font-medium text-muted-foreground/80 whitespace-nowrap text-right">
              {t("CreatePool:max_supply")}: {maxSupply} {issuedAsset.symbol}
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
});

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
  const assetRowProps = useMemo(() => ({ eligibleAssets, selectedAsset, setSelectedAsset, t }), [eligibleAssets, selectedAsset, setSelectedAsset, t]);

  const [takerFeePercent, setTakerFeePercent] = useState(0);
  const [withdrawalFeePercent, setWithdrawalFeePercent] = useState(0);
  const [assetA, setAssetA] = useState(null);
  const [assetB, setAssetB] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  // Edit mode: ?pool=1.19.x switches the page to edit the pool's fees
  // via liquidity_pool_update (only taker/withdrawal fees are mutable on chain).
  const [editPoolId, setEditPoolId] = useState(null);
  const [editPool, setEditPool] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(null);
  const isEditMode = useMemo(() => !!editPoolId, [editPoolId]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const poolParam = (params.get("pool") || "").trim();
      if (/^1\.19\.\d+$/.test(poolParam)) {
        setEditPoolId(poolParam);
      }
    } catch (e) {
      console.log(e);
    }
  }, []);

  useEffect(() => {
    if (!editPoolId) {
      return;
    }
    if (!currentNode || !currentNode.url) {
      return;
    }
    let cancelled = false;
    async function fetching() {
      setEditLoading(true);
      setEditError(null);
      try {
        const store = createObjectStore([
          _chain ?? "bitshares",
          JSON.stringify([editPoolId]),
          currentNode.url,
        ]);
        store.subscribe(({ data, error, loading }) => {
          if (cancelled || loading) {
            return;
          }
          setEditLoading(false);
          if (error || !data || !data[0] || data[0].id !== editPoolId) {
            setEditError("not_found");
            return;
          }
          const pool = data[0];
          setEditPool(pool);
          setTakerFeePercent((pool.taker_fee_percent ?? 0) / 100);
          setWithdrawalFeePercent((pool.withdrawal_fee_percent ?? 0) / 100);
        });
      } catch (e) {
        console.log(e);
        if (!cancelled) {
          setEditLoading(false);
          setEditError("not_found");
        }
      }
    }
    fetching();
    return () => {
      cancelled = true;
    };
  }, [editPoolId, _chain, currentNode]);

  const editPoolAssets = useMemo(() => {
    if (!editPool || !assets || !assets.length) {
      return null;
    }
    const findSymbol = (id) =>
      assets.find((a) => a.id === id)?.symbol ?? id;
    return {
      assetA: findSymbol(editPool.asset_a),
      assetB: findSymbol(editPool.asset_b),
      shareAsset: findSymbol(editPool.share_asset),
      shareAssetId: editPool.share_asset,
    };
  }, [editPool, assets]);

  const editPoolShareIssuer = useMemo(() => {
    if (!editPool || !assets || !assets.length) {
      return null;
    }
    return assets.find((a) => a.id === editPool.share_asset)?.issuer ?? null;
  }, [editPool, assets]);

  const originalTakerUnits = useMemo(
    () => (editPool ? editPool.taker_fee_percent ?? 0 : 0),
    [editPool]
  );
  const originalWithdrawalUnits = useMemo(
    () => (editPool ? editPool.withdrawal_fee_percent ?? 0 : 0),
    [editPool]
  );
  const newTakerUnits = useMemo(
    () => Math.round(Number(takerFeePercent || 0) * 100),
    [takerFeePercent]
  );
  const newWithdrawalUnits = useMemo(
    () => Math.round(Number(withdrawalFeePercent || 0) * 100),
    [withdrawalFeePercent]
  );
  const takerChanged = newTakerUnits !== originalTakerUnits;
  const withdrawalChanged = newWithdrawalUnits !== originalWithdrawalUnits;
  // Chain rules: withdrawal fee can only be updated to zero;
  // taker fee can only change once the on-chain withdrawal fee is zero.
  const takerLocked = originalWithdrawalUnits !== 0;
  const withdrawalValid = !withdrawalChanged || newWithdrawalUnits === 0;
  const takerValid = !takerChanged || !takerLocked;
  const hasPoolChanges = takerChanged || withdrawalChanged;
  const editFormValid =
    !!editPool && hasPoolChanges && withdrawalValid && takerValid;

  const updateTrxJSON = useMemo(() => {
    if (!editPool || !usr || !usr.id) {
      return [];
    }
    const op = {
      account: usr.id,
      pool: editPool.id,
      extensions: {},
    };
    if (takerChanged) {
      op.taker_fee_percent = newTakerUnits;
    }
    if (withdrawalChanged) {
      op.withdrawal_fee_percent = newWithdrawalUnits;
    }
    return [op];
  }, [editPool, usr, takerChanged, withdrawalChanged, newTakerUnits, newWithdrawalUnits]);

  const swapAssets = () => {
    const temp = assetA;
    setAssetA(assetB);
    setAssetB(temp);
  };

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

  const shareAsset = useMemo(() => {
    if (!eligibleAssets || !selectedAsset) {
      return null;
    }
    return eligibleAssets.find((asset) => asset.id === selectedAsset) || null;
  }, [eligibleAssets, selectedAsset]);

  const shareAssetMaxSupply = useMemo(() => {
    if (
      !shareAsset ||
      !shareAsset.options ||
      !shareAsset.options.max_supply
    ) {
      return null;
    }
    return humanReadableFloat(
      shareAsset.options.max_supply,
      shareAsset.precision
    ).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }, [shareAsset]);

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

  const StepHeader = ({ icon: Icon, step, title, description, done }) => (
    <div className="flex items-start gap-3 border-b border-border px-5 py-4 sm:px-6">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
          done
            ? "bg-[hsl(var(--accent-1)/0.2)] text-[hsl(var(--accent-1-fg))] ring-[hsl(var(--accent-1)/0.4)]"
            : "bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))] ring-[hsl(var(--accent-1)/0.3)]"
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </span>
      <div className="flex-1 min-w-0">
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]">
          {`Step ${step}`}
          {done ? (
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[hsl(var(--accent-1)/0.3)]">
              ✓
            </span>
          ) : null}
        </span>
        <h3 className="mt-0.5 text-base font-semibold leading-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-full max-w-4xl">
        <div className="relative overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-xl px-6 py-5 shadow-lg shadow-black/20 ring-1 dark:ring-white/[0.06] ring-border">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.7)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.1)] blur-3xl"
          />
          <div className="relative flex items-center gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.4)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-1)/0.3)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-1)/0.4)]">
              <Droplets className="h-6 w-6" strokeWidth={2.25} />
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                {isEditMode
                  ? t("CreatePool:edit_title", {
                      defaultValue: "Edit liquidity pool",
                    })
                  : t("CreatePool:title")}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {isEditMode
                  ? t("CreatePool:edit_description", {
                      defaultValue:
                        "Update the fee configuration of your existing liquidity pool. The trading assets and share asset cannot be changed.",
                    })
                  : t("CreatePool:description")}
              </p>
            </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-6">
            {isEditMode ? (
              <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {t("CreatePool:edit_pool_id", {
                      defaultValue: "Liquidity pool",
                    })}
                    : {editPoolId}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 pt-0">
                  {editLoading ? (
                    <div className="text-center mt-2">
                      {t("CreatePool:loading_pool", {
                        defaultValue: "Loading liquidity pool...",
                      })}
                    </div>
                  ) : editError || !editPool ? (
                    <p className="text-sm text-muted-foreground">
                      {t("CreatePool:pool_not_found", {
                        defaultValue:
                          "Liquidity pool not found. Check the pool ID in the URL.",
                      })}
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                            {t("CreatePool:summary_pair")}
                          </div>
                          <div className="font-mono text-sm tabular-nums text-foreground/85 truncate">
                            {editPoolAssets
                              ? `${editPoolAssets.assetA} / ${editPoolAssets.assetB}`
                              : `${editPool.asset_a} / ${editPool.asset_b}`}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                            {t("CreatePool:summary_share_asset")}
                          </div>
                          <div className="font-mono text-sm tabular-nums text-foreground/85 truncate">
                            {editPoolAssets
                              ? `${editPoolAssets.shareAsset} (${editPoolAssets.shareAssetId})`
                              : editPool.share_asset}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                            {t("CreatePool:current_taker_fee", {
                              defaultValue: "Current taker fee",
                            })}
                          </div>
                          <div className="font-mono text-sm tabular-nums text-foreground/85">
                            {`${originalTakerUnits / 100}%`}
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                            {t("CreatePool:current_withdrawal_fee", {
                              defaultValue: "Current withdrawal fee",
                            })}
                          </div>
                          <div className="font-mono text-sm tabular-nums text-foreground/85">
                            {`${originalWithdrawalUnits / 100}%`}
                          </div>
                        </div>
                      </div>
                      {editPoolShareIssuer &&
                      usr &&
                      usr.id &&
                      editPoolShareIssuer !== usr.id ? (
                        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                          {t("CreatePool:must_be_issuer", {
                            defaultValue: `Only the share asset issuer (${editPoolShareIssuer}) can update this pool's fees.`,
                            issuer: editPoolShareIssuer,
                          })}
                        </p>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}
            {!isEditMode ? (
            <>
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
              <StepHeader
                icon={Coins}
                step={1}
                title={t("CreatePool:step1_title")}
                description={t("CreatePool:step1_description")}
                done={!!selectedAsset}
              />
              <CardContent className="p-5 sm:p-6">
                {loading ? (
                  <div className="text-center mt-5">
                    {t("CreditBorrow:common.loading")}
                  </div>
                ) : !eligibleAssets || !eligibleAssets.length ? (
                  <Empty className="mt-2">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[hsl(var(--accent-1)/0.3)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.2)] to-[hsl(var(--accent-1)/0.2)] dark:text-[hsl(var(--accent-1-gradFg))] text-[hsl(var(--accent-1-gradFg))]">
                          <Droplets className="h-6 w-6" strokeWidth={1.75} />
                        </span>
                      </EmptyMedia>
                      <EmptyTitle>{t("IssuedAssets:noUIA")}</EmptyTitle>
                      <EmptyDescription>
                        {t("CreatePool:noEligibleAssets")}
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        asChild
                        variant="outline"
                        className="border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.1)] hover:bg-[hsl(var(--accent-1)/0.2)] hover:border-[hsl(var(--accent-1)/0.5)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]"
                      >
                        <a href="/create_uia.html">
                          {t("PageHeader:create_uia")}
                        </a>
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <>
                    <h5 className="mb-2 text-center">
                      {t("IssuedAssets:listingUIA", {
                        count: eligibleAssets.length,
                      })}
                    </h5>
                    <div className="w-full h-[350px] rounded-lg bg-card/30 border border-[hsl(var(--accent-1)/0.2)]">
                      <List
                        rowComponent={AssetRow}
                        rowCount={eligibleAssets.length}
                        rowHeight={75}
                        height={350}
                        width="100%"
                        rowProps={assetRowProps}
                      />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground/80 leading-relaxed">
                      {t("CreatePool:step1_max_supply_note")}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
              <StepHeader
                icon={ArrowLeftRight}
                step={2}
                title={t("CreatePool:step2_title")}
                description={t("CreatePool:step2_description")}
                done={!!(assetA && assetB)}
              />
              <CardContent className="p-5 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
                  <div>
                    <HoverInfo
                      header={t("CreatePool:assetA")}
                      content={t("CreatePool:assetA_description")}
                    />
                    <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-2 mt-1">
                      <AssetDropDown
                        assetSymbol={assetA ?? ""}
                        assetData={assetAData}
                        storeCallback={(sym) => {
                          if (sym && sym === assetB) {
                            return;
                          }
                          setAssetA(sym);
                        }}
                        otherAsset={assetB}
                        marketSearch={marketSearch}
                        type={"quote"}
                        size="small"
                        chain={usr && usr.chain ? usr.chain : "bitshares"}
                        balances={balances}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={swapAssets}
                    className="self-stretch flex items-center justify-center"
                    aria-label={t("CreatePool:swap_pair")}
                    title={t("CreatePool:swap_pair")}
                  >
                    <span className="inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-border bg-card/80 text-[hsl(var(--accent-1-fg))] dark:text-[hsl(var(--accent-1-fg))] hover:border-[hsl(var(--accent-1)/0.5)] hover:shadow-[0_0_24px_-6px_rgba(34,211,238,0.55)] transition-all group">
                      <ArrowDownUp className="h-4 w-4 group-hover:rotate-180 transition-transform duration-300" />
                    </span>
                  </button>

                  <div>
                    <HoverInfo
                      header={t("CreatePool:assetB")}
                      content={t("CreatePool:assetB_description")}
                    />
                    <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-2 mt-1">
                      <AssetDropDown
                        assetSymbol={assetB ?? ""}
                        assetData={assetBData}
                        storeCallback={(sym) => {
                          if (sym && sym === assetA) {
                            return;
                          }
                          setAssetB(sym);
                        }}
                        otherAsset={assetA}
                        marketSearch={marketSearch}
                        type={"base"}
                        size="small"
                        chain={usr && usr.chain ? usr.chain : "bitshares"}
                        balances={balances}
                      />
                    </div>
                  </div>
                </div>
                {assetA && assetB && assetA === assetB ? (
                  <p className="mt-3 text-xs font-medium text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))]">
                    ⚠ {t("CreatePool:duplicate_assets")}
                  </p>
                ) : null}
              </CardContent>
            </Card>
            </>
            ) : null}

            <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
              <StepHeader
                icon={Percent}
                step={3}
                title={t("CreatePool:step3_title")}
                description={t("CreatePool:step3_description")}
                done={isEditMode ? hasPoolChanges : !!(selectedAsset && assetA && assetB)}
              />
              <CardContent className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-3 sm:p-4">
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
                    disabled={isEditMode && (takerLocked || !editPool)}
                    onInput={(e) => {
                      setTakerFeePercent(e.currentTarget.value);
                      debouncedPercent(
                        e.currentTarget.value,
                        setTakerFeePercent
                      );
                    }}
                    className="mt-1 !bg-card/40 border-border focus-visible:!ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                  />
                  {isEditMode && takerLocked && editPool ? (
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {t("CreatePool:taker_locked", {
                        defaultValue:
                          "Taker fee can only be changed once the withdrawal fee is zero. Set the withdrawal fee to zero first.",
                      })}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-transparent p-3 sm:p-4">
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
                    disabled={isEditMode && !editPool}
                    onInput={(e) => {
                      setWithdrawalFeePercent(e.currentTarget.value);
                      debouncedPercent(
                        e.currentTarget.value,
                        setWithdrawalFeePercent
                      );
                    }}
                    className="mt-1 !bg-card/40 border-border focus-visible:!ring-[hsl(var(--accent-1)/0.4)] focus-visible:border-[hsl(var(--accent-1)/0.5)]"
                  />
                  {isEditMode && editPool ? (
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      {t("CreatePool:withdrawal_zero_only", {
                        defaultValue:
                          "Withdrawal fee can only be reduced to zero — it cannot be raised or set to another value.",
                      })}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {!isEditMode && selectedAsset && assetA && assetB && assetA !== assetB ? (
              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-[hsl(var(--accent-1)/0.04)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.15)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                    <Layers className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("CreatePool:summary_title")}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t("CreatePool:summary_ready")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                      {t("CreatePool:summary_share_asset")}
                    </div>
                    <div className="font-mono text-sm tabular-nums text-foreground/85 truncate">
                      {selectedAsset}
                    </div>
                    {shareAssetMaxSupply ? (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {t("CreatePool:max_supply")}: {shareAssetMaxSupply}{" "}
                        {shareAsset ? shareAsset.symbol : ""}
                      </div>
                    ) : null}
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                      {t("CreatePool:summary_pair")}
                    </div>
                    <div className="font-mono text-sm tabular-nums dark:text-[hsl(var(--accent-1-fg)/0.9)] text-[hsl(var(--accent-1-fg))] truncate">
                      {`${assetA} / ${assetB}`}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                      {t("CreatePool:summary_taker_fee")}
                    </div>
                    <div className="font-mono text-sm tabular-nums text-foreground/85">
                      {`${takerFeePercent}%`}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                      {t("CreatePool:summary_withdrawal_fee")}
                    </div>
                    <div className="font-mono text-sm tabular-nums text-foreground/85">
                      {`${withdrawalFeePercent}%`}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isEditMode && editPool && !editLoading && !editError ? (
              <div className="rounded-xl border border-[hsl(var(--accent-1)/0.2)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.06)] to-[hsl(var(--accent-1)/0.04)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-[hsl(var(--accent-1)/0.3)] bg-[hsl(var(--accent-1)/0.15)] dark:text-[hsl(var(--accent-1-fg))] text-[hsl(var(--accent-1-fg))]">
                    <Layers className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {t("CreatePool:summary_title")}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {t("CreatePool:summary_ready_update", {
                    defaultValue:
                      "Review the new fee configuration below before submitting.",
                  })}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                      {t("CreatePool:summary_taker_fee")}
                    </div>
                    <div className="font-mono text-sm tabular-nums text-foreground/85">
                      {`${originalTakerUnits / 100}% → ${takerFeePercent}%`}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-card/40 p-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mb-1">
                      {t("CreatePool:summary_withdrawal_fee")}
                    </div>
                    <div className="font-mono text-sm tabular-nums text-foreground/85">
                      {`${originalWithdrawalUnits / 100}% → ${withdrawalFeePercent}%`}
                    </div>
                  </div>
                </div>
                {!withdrawalValid ? (
                  <p className="mt-3 text-xs font-medium text-[hsl(var(--accent-danger-fg))] dark:text-[hsl(var(--accent-danger-fg))]">
                    {t("CreatePool:withdrawal_invalid", {
                      defaultValue:
                        "Invalid withdrawal fee: it can only be set to 0%.",
                    })}
                  </p>
                ) : null}
                {!hasPoolChanges ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t("CreatePool:no_changes", {
                      defaultValue: "No changes to submit yet.",
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <button
                type="button"
                disabled={
                  isEditMode
                    ? !editFormValid
                    : !(assetA && assetB && selectedAsset && assetA !== assetB)
                }
                onClick={() => {
                  setShowDialog(true);
                }}
                className={cn(
                  "w-full h-14 rounded-2xl font-semibold text-[hsl(var(--accent-1-gradFg))] flex items-center justify-center gap-2 text-base transition-all group",
                  (isEditMode ? editFormValid : assetA && assetB && selectedAsset)
                    ? "bg-gradient-to-r from-[hsl(var(--accent-1))] via-[hsl(var(--accent-1))] to-[hsl(var(--accent-2))] shadow-[0_8px_32px_-12px_rgba(6,182,212,0.7)] hover:shadow-[0_12px_40px_-12px_rgba(20,184,166,0.9)] hover:from-[hsl(var(--accent-1))] hover:via-[hsl(var(--accent-1))] hover:to-[hsl(var(--accent-2))]"
                    : "bg-card/60 border border-border/40 dark:border-white/5 text-muted-foreground cursor-not-allowed"
                )}
              >
                <Droplets
                  className="h-4 w-4 group-hover:scale-110 transition-transform"
                  strokeWidth={2.5}
                />
                {t("CreateUIA:buttons.submit")}
              </button>
            </div>
          </div>
      </div>
      {showDialog ? (
        <DeepLinkDialog
          operationNames={
            isEditMode ? ["liquidity_pool_update"] : ["liquidity_pool_create"]
          }
          username={usr && usr.username ? usr.username : ""}
          usrChain={usr && usr.chain ? usr.chain : "bitshares"}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={isEditMode ? `UpdatingPool-${editPoolId}` : `CreatingPool`}
          headerText={
            isEditMode
              ? `${t("CreatePool:deeplinkDialogTitleUpdate", {
                  defaultValue: "Updating Liquidity Pool",
                })}: ${editPoolId}`
              : t("CreatePool:deeplinkDialogTitle")
          }
          trxJSON={
            isEditMode
              ? updateTrxJSON
              : [
                  {
                    account: usr.id,
                    asset_a: assetAData.id,
                    asset_b: assetBData.id,
                    share_asset: selectedAsset,
                    taker_fee_percent: Math.round(
                      Number(takerFeePercent || 0) * 100
                    ),
                    withdrawal_fee_percent: Math.round(
                      Number(withdrawalFeePercent || 0) * 100
                    ),
                    extensions: {},
                  },
                ]
          }
        />
      ) : null}
    </>
  );
}
