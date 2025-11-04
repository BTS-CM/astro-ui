import React, { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlassIcon,
  AvatarIcon,
  CheckIcon,
  FaceIcon,
} from "@radix-ui/react-icons";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex as toHex, utf8ToBytes } from "@noble/hashes/utils.js";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "@/components/Avatar.tsx";

import { $userStorage } from "@/stores/users.ts";
import { $favouriteUsers } from "@/stores/favourites.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { getAccountBalances } from "@/nanoeffects/UserBalances.ts";

import AccountSearch from "@/components/AccountSearch.jsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import HoverInfo from "@/components/common/HoverInfo.tsx";

import {
  blockchainFloat,
  humanReadableFloat,
  getFlagBooleans,
} from "@/lib/common.js";

const CORE_PRECISION = 5;

const mapContacts = (contacts, chain) => {
  if (!contacts || !contacts.length) return [];
  return contacts.filter((user) => user.chain === chain);
};

function parseDescription(description) {
  if (!description) return { raw: "", parsed: null };

  if (typeof description === "string") {
    try {
      const parsed = JSON.parse(description);
      return { raw: description, parsed };
    } catch (e) {
      return { raw: description, parsed: null };
    }
  }

  return {
    raw: JSON.stringify(description),
    parsed: description,
  };
}

function AssetIssuerActions(props) {
  const {
    asset,
    assets,
    chain,
    currentUser,
    node,
    dynamicAssetData,
    bitassetData,
    priceFeederAccounts,
    buttonVariant = "outline",
    buttonSize = "sm",
    className,
  } = props;

  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const storedUsers = useStore($userStorage);
  const favouriteUsersStore = useStore($favouriteUsers);

  const [dynamicData, setDynamicData] = useState(dynamicAssetData ?? null);
  const [bitassetDetails, setBitassetDetails] = useState(bitassetData ?? null);

  const [priceFeedPublishersOpen, setPriceFeedPublishersOpen] = useState(false);
  const [
    priceFeedPublishersDeeplinkDialog,
    setPriceFeedPublishersDeeplinkDialog,
  ] = useState(false);
  const [priceSearchDialog, setPriceSearchDialog] = useState(false);

  const [deletePoolOpen, setDeletePoolOpen] = useState(false);
  const [deletePoolDeeplinkOpen, setDeletePoolDeeplinkOpen] = useState(false);

  const [priceFeedPublishers, setPriceFeedPublishers] = useState([]);
  useEffect(() => {
    if (bitassetDetails && priceFeederAccounts && priceFeederAccounts.length) {
      const publishers = bitassetDetails.feeds
        .map((x) => x[0])
        .map((x) => priceFeederAccounts.find((y) => y.id === x));
      setPriceFeedPublishers(publishers);
    }
  }, [bitassetDetails, priceFeederAccounts]);

  const [globalSettleOpen, setGlobalSettleOpen] = useState(false);
  const [globalSettleDeeplinkDialog, setGlobalSettleDeeplinkDialog] =
    useState(false);

  const [priceFeederIndex, setPriceFeederIndex] = useState(0);
  const [globalSettlementMode, setGlobalSettlementMode] = useState("median");

  const globalSettleObject = useMemo(() => {
    if (!bitassetData) {
      return null;
    }

    switch (globalSettlementMode) {
      case "median":
        return bitassetData.median_feed.settlement_price;
      case "current":
        return bitassetData.current_feed.settlement_price;
      case "price_feed":
        return bitassetData.feeds[priceFeederIndex][1][1].settlement_price;
    }
  }, [globalSettlementMode, bitassetData, priceFeederIndex]);

  const _flags = getFlagBooleans(asset.options.flags);
  const _issuer_permissions = getFlagBooleans(asset.options.issuer_permissions);

  const collateralAsset = useMemo(() => {
    if (bitassetData) {
      return assets.find(
        (x) => x.id === bitassetData.options.short_backing_asset
      );
    }
  }, [bitassetData]);

  const currentFeedSettlementPrice = useMemo(() => {
    if (!globalSettleObject || !collateralAsset || !asset) {
      return 0;
    }

    if (globalSettleObject) {
      return parseFloat(
        (
          humanReadableFloat(
            parseInt(globalSettleObject.quote.amount),
            collateralAsset.precision
          ) /
          humanReadableFloat(
            parseInt(globalSettleObject.base.amount),
            asset.precision
          )
        ).toFixed(collateralAsset.precision)
      );
    }
  }, [collateralAsset, asset, globalSettleObject]);

  const PriceFeedRow = ({ index: x, style: rowStyle }) => {
    const priceFeed = bitassetData.feeds[x];
    if (
      !priceFeed ||
      !priceFeed[1] ||
      !priceFeed[1][1] ||
      !priceFeed[1][1].settlement_price
    ) {
      console.error("Error: Invalid priceFeed structure", { priceFeed, x });
      return null;
    }

    const hexID = toHex(sha256(utf8ToBytes(priceFeed[0])));
    const settlementPrice = parseFloat(
      (
        humanReadableFloat(
          parseInt(priceFeed[1][1].settlement_price.quote.amount),
          collateralAsset.precision
        ) /
        humanReadableFloat(
          parseInt(priceFeed[1][1].settlement_price.base.amount),
          asset.precision
        )
      ).toFixed(collateralAsset.precision)
    );

    const feedPublishTime = new Date(priceFeed[1][0]);
    const hoursSincePublished = Math.floor(
      (new Date().getTime() - feedPublishTime.getTime()) / (1000 * 60 * 60)
    );

    const foundFeeder = priceFeederAccounts.find(
      (account) => account.id === priceFeed[0]
    );

    return (
      <div
        style={{ ...rowStyle }}
        key={`priceFeedRow-${hexID}`}
        onClick={() => {
          setPriceFeederIndex(x);
        }}
      >
        <Card className="ml-2 mr-2">
          <div className="flex items-center">
            {x === priceFeederIndex ? (
              <div className="ml-5">
                <CheckIcon />
              </div>
            ) : null}
            <CardHeader className="pb-1 pt-1">
              <CardTitle>
                <div className="flex items-center">
                  {foundFeeder ? foundFeeder.name : null} ({priceFeed[0]})
                  {" - "}
                  {settlementPrice} {collateralAsset.symbol}/{asset.symbol}
                </div>
              </CardTitle>
              <CardDescription>
                {t("IssuedAssets:publishTime", {
                  hours: hoursSincePublished,
                })}
              </CardDescription>
            </CardHeader>
          </div>
        </Card>
      </div>
    );
  };

  const PriceFeederRow = ({ index, style }) => {
    let res = priceFeedPublishers[index];
    if (!res) {
      return null;
    }

    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="ml-2 mr-2 mt-1">
          <CardHeader className="pb-3 pt-3">
            <span className="flex items-center w-full">
              <span className="flex-shrink-0">
                <Avatar
                  size={40}
                  name={res.name}
                  extra="Borrower"
                  expression={{ eye: "normal", mouth: "open" }}
                  colors={[
                    "#92A1C6",
                    "#146A7C",
                    "#F0AB3D",
                    "#C271B4",
                    "#C20D90",
                  ]}
                />
              </span>
              <span className="flex-grow ml-3">
                #{index + 1}: {res.name} ({res.id})
              </span>
              <span className="flex-shrink-0">
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={(e) => {
                    e.preventDefault();
                    const _update = priceFeedPublishers.filter(
                      (x) => x.id !== res.id
                    );
                    setPriceFeedPublishers(_update);
                  }}
                >
                  ❌
                </Button>
              </span>
            </span>
          </CardHeader>
        </Card>
      </div>
    );
  };

  /*
  const UserRow = ({ index: x, style: rowStyle }) => {
    const user = users[x];
    if (!user) {
      return null;
    }

    return (
      <div
        style={{ ...rowStyle }}
        key={`acard-${user.id}`}
        onClick={() => {
          setTargetUser({
            name: user.username,
            id: user.id,
            chain: user.chain,
          });
          setSelectUserDialogOpen(false);
          setNewIssuerUserOpen(false);
        }}
      >
        <Card className="ml-2 mr-2">
          <CardHeader className="pb-5">
            <CardTitle>
              <div style={{ display: "flex", alignItems: "center" }}>
                <Avatar
                  size={40}
                  name={user.username}
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
                <span style={{ marginLeft: "10px" }}>
                  {user.username} ({user.id})
                </span>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  };
  */

  /*
  useEffect(() => {
    setDynamicData(dynamicAssetData ?? null);
  }, [dynamicAssetData]);

  useEffect(() => {
    setBitassetDetails(bitassetData ?? null);
  }, [bitassetData]);
  */

  useEffect(() => {
    async function fetchDynamicAssetData() {
      if (dynamicAssetData || !asset?.dynamic_asset_data_id) {
        return;
      }
      if (!node?.url) {
        return;
      }

      const store = createObjectStore([
        chain,
        JSON.stringify([asset.dynamic_asset_data_id]),
        node.url,
      ]);

      store.subscribe(({ data, error, loading }) => {
        if (!loading && !error && data && data.length) {
          setDynamicData(data[0]);
        }
      });
    }

    if (!dynamicAssetData) {
      fetchDynamicAssetData();
    }
  }, [asset?.dynamic_asset_data_id, chain, node?.url, dynamicAssetData]);

  useEffect(() => {
    async function fetchBitassetDetails() {
      if (bitassetData || !asset?.bitasset_data_id) {
        return;
      }
      if (!node?.url) {
        return;
      }

      const store = createObjectStore([
        chain,
        JSON.stringify([asset.bitasset_data_id]),
        node.url,
      ]);

      store.subscribe(({ data, error, loading }) => {
        if (!loading && !error && data && data.length) {
          setBitassetDetails(data[0]);
        }
      });
    }

    if (!bitassetData) {
      fetchBitassetDetails();
    }
  }, [asset?.bitasset_data_id, chain, node?.url, bitassetData]);

  const contacts = useMemo(() => {
    if (!storedUsers) return [];
    const all = storedUsers.users ?? [];
    return mapContacts(all, chain);
  }, [storedUsers, chain]);

  const { raw: rawDescription } = useMemo(
    () => parseDescription(asset?.options?.description),
    [asset?.options?.description]
  );

  const isPrediction = useMemo(() => {
    if (!asset?.bitasset_data_id || !rawDescription) return false;
    return (
      rawDescription.includes("condition") && rawDescription.includes("expiry")
    );
  }, [asset?.bitasset_data_id, rawDescription]);

  const isNFT = useMemo(() => {
    if (!rawDescription) return false;
    return rawDescription.includes("nft_object");
  }, [rawDescription]);

  const isSmartcoin = useMemo(() => {
    if (!asset?.bitasset_data_id) return false;
    return !isPrediction;
  }, [asset?.bitasset_data_id, isPrediction]);

  const isUIA = useMemo(() => {
    return !isSmartcoin && !isPrediction && !isNFT;
  }, [isSmartcoin, isPrediction, isNFT]);

  const manageHref = useMemo(() => {
    if (isSmartcoin || (isNFT && asset?.bitasset_data_id)) {
      return `/create_smartcoin/index.html?id=${asset?.id}`;
    }
    if (isUIA || isNFT) {
      return `/create_uia/index.html?id=${asset?.id}`;
    }
    return null;
  }, [asset?.id, isSmartcoin, isNFT, isUIA]);

  const issuerPermissions = useMemo(() => {
    return getFlagBooleans(asset?.options?.issuer_permissions ?? 0);
  }, [asset?.options?.issuer_permissions]);

  // Active flags set on the asset
  const assetFlags = useMemo(() => {
    return getFlagBooleans(asset?.options?.flags ?? 0);
  }, [asset?.options?.flags]);

  // Robust numeric check for override_authority active flag
  const hasOverrideAuthority = useMemo(() => {
    const mask = Number(asset?.options?.flags ?? 0);
    // 0x04 is override_authority
    return (mask & 0x04) > 0;
  }, [asset?.options?.flags]);

  const [fundFeePoolDialogOpen, setFundFeePoolDialogOpen] = useState(false);
  const [fundFeePoolAmount, setFundFeePoolAmount] = useState("");
  const [fundFeePoolDeeplinkOpen, setFundFeePoolDeeplinkOpen] = useState(false);

  const [claimFeePoolOpen, setClaimFeePoolOpen] = useState(false);
  const [claimFeePoolAmount, setClaimFeePoolAmount] = useState("");
  const [claimFeePoolDeeplinkOpen, setClaimFeePoolDeeplinkOpen] =
    useState(false);

  const [claimAssetFeesOpen, setClaimAssetFeesOpen] = useState(false);
  const [claimAssetFeesAmount, setClaimAssetFeesAmount] = useState("");
  const [claimAssetFeesDeeplinkOpen, setClaimAssetFeesDeeplinkOpen] =
    useState(false);

  const [issueAssetOpen, setIssueAssetOpen] = useState(false);
  const [issueAmount, setIssueAmount] = useState("");
  const [issueTarget, setIssueTarget] = useState(null);
  const [issueSearchOpen, setIssueSearchOpen] = useState(false);
  const [issueContactsOpen, setIssueContactsOpen] = useState(false);
  const [issueFavouritesOpen, setIssueFavouritesOpen] = useState(false);
  const [issueDeeplinkOpen, setIssueDeeplinkOpen] = useState(false);

  const [reserveAssetOpen, setReserveAssetOpen] = useState(false);
  const [reserveAmount, setReserveAmount] = useState("");
  const [reserveDeeplinkOpen, setReserveDeeplinkOpen] = useState(false);

  const [updateIssuerOpen, setUpdateIssuerOpen] = useState(false);
  const [updateIssuerTarget, setUpdateIssuerTarget] = useState(null);
  const [updateIssuerSearchOpen, setUpdateIssuerSearchOpen] = useState(false);
  const [updateIssuerContactsOpen, setUpdateIssuerContactsOpen] =
    useState(false);
  const [updateIssuerFavouritesOpen, setUpdateIssuerFavouritesOpen] =
    useState(false);
  const [updateIssuerDeeplinkOpen, setUpdateIssuerDeeplinkOpen] =
    useState(false);

  // Override transfer state
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideTargetId, setOverrideTargetId] = useState("");
  const [overrideBalanceRaw, setOverrideBalanceRaw] = useState(0); // blockchain units
  const [overrideBalance, setOverrideBalance] = useState(0); // human units
  const [overrideAmount, setOverrideAmount] = useState("");
  const [overrideDLOpen, setOverrideDLOpen] = useState(false);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState("");
  const [overrideSearchOpen, setOverrideSearchOpen] = useState(false);
  const [overrideFavouritesOpen, setOverrideFavouritesOpen] = useState(false);
  const [overrideContactsOpen, setOverrideContactsOpen] = useState(false);

  // keep a simple derived id for existing logic
  useEffect(() => {
    setOverrideTargetId(overrideTarget?.id ?? "");
  }, [overrideTarget]);

  useEffect(() => {
    async function loadOverrideBalance() {
      if (!(overrideOpen && overrideTargetId && chain)) return;

      setOverrideLoading(true);
      setOverrideError("");

      try {
        const data = await getAccountBalances(
          chain,
          overrideTargetId,
          node && node.url ? node.url : null
        );

        setOverrideLoading(false);

        if (!Array.isArray(data)) {
          setOverrideError(
            t("Common:failedToFetch", {
              defaultValue: "Failed to fetch balances",
            })
          );
          setOverrideBalanceRaw(0);
          setOverrideBalance(0);
          return;
        }

        const bal = data.find((b) => b.asset_id === asset?.id);
        if (bal) {
          const raw = parseInt(bal.amount ?? 0, 10);
          const human = humanReadableFloat(raw, asset?.precision ?? 0);
          setOverrideBalanceRaw(raw);
          setOverrideBalance(human);
          if (overrideAmount && Number(overrideAmount) > human) {
            setOverrideAmount(String(human));
          }
        } else {
          setOverrideBalanceRaw(0);
          setOverrideBalance(0);
          setOverrideError(
            t("IssuedAssets:noAssetInBalance", {
              defaultValue: "This account does not hold this asset.",
            })
          );
        }
      } catch (e) {
        setOverrideLoading(false);
        setOverrideError(
          t("Common:failedToFetch", {
            defaultValue: "Failed to fetch balances",
          })
        );
        setOverrideBalanceRaw(0);
        setOverrideBalance(0);
      }
    }

    loadOverrideBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideOpen, overrideTargetId, chain, node?.url]);

  const coreSymbol = chain === "bitshares" ? "BTS" : "TEST";

  const currentSupply = useMemo(() => {
    if (!dynamicData) return 0;
    return humanReadableFloat(
      dynamicData.current_supply ?? 0,
      asset?.precision ?? 0
    );
  }, [dynamicData, asset?.precision]);

  const feePoolBalance = useMemo(() => {
    if (!dynamicData) return 0;
    return humanReadableFloat(dynamicData.fee_pool ?? 0, CORE_PRECISION);
  }, [dynamicData]);

  const accumulatedFees = useMemo(() => {
    if (!dynamicData) return 0;
    return humanReadableFloat(
      dynamicData.accumulated_fees ?? 0,
      CORE_PRECISION
    );
  }, [dynamicData]);

  const issuerActionsDisabled = useMemo(() => {
    if (!currentUser?.id || !asset?.issuer) return true;
    return (
      currentUser.id !== asset.issuer ||
      (currentUser.chain && currentUser.chain !== chain)
    );
  }, [currentUser?.id, currentUser?.chain, asset?.issuer, chain]);

  if (isPrediction || issuerActionsDisabled) {
    return null;
  }

  const renderContacts = (onSelect) => {
    if (!contacts.length) {
      return (
        <p className="text-sm text-muted-foreground">
          {t("IssuedAssets:noUsers")}
        </p>
      );
    }

    return (
      <div className="w-full max-h-[420px] overflow-auto space-y-2">
        {contacts.map((user) => (
          <button
            key={user.id}
            type="button"
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100"
            onClick={() => onSelect(user)}
          >
            <Avatar
              size={36}
              name={user.username}
              extra="Target"
              expression={{ eye: "normal", mouth: "open" }}
              colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
            />
            <span className="text-sm font-medium text-slate-900">
              {user.username} ({user.id})
            </span>
          </button>
        ))}
      </div>
    );
  };

  const dropdownItems = [];

  if (
    bitassetData &&
    (!_issuer_permissions.hasOwnProperty("witness_fed_asset") ||
      (_issuer_permissions.hasOwnProperty("witness_fed_asset") &&
        !_flags.hasOwnProperty("witness_fed_asset"))) &&
    (!_issuer_permissions.hasOwnProperty("committee_fed_asset") ||
      (_issuer_permissions.hasOwnProperty("committee_fed_asset") &&
        !_flags.hasOwnProperty("committee_fed_asset")))
  ) {
    dropdownItems.push({
      key: "priceFeedPubishers",
      render: (
        <DropdownMenuItem
          onClick={() => {
            setPriceFeedPublishersOpen(true);
          }}
          className="hover:shadow-inner"
        >
          {t(`Predictions:pricefeeder`)}
        </DropdownMenuItem>
      ),
    });
  }

  if (asset && asset.for_liquidity_pool && dynamicAssetData) {
    if (
      dynamicAssetData.current_supply ||
      dynamicAssetData.confidential_supply
    ) {
      dropdownItems.push({
        key: "delete-pool-disabled",
        render: (
          <DropdownMenuItem disabled>
            {t(`IssuedAssets:deletePool`)}
          </DropdownMenuItem>
        ),
      });
    } else {
      dropdownItems.push({
        key: "delete-pool-disabled",
        render: (
          <DropdownMenuItem
            onClick={() => {
              setDeletePoolOpen(true);
            }}
            className="hover:shadow-inner"
          >
            {t(`IssuedAssets:deletePool`)}
          </DropdownMenuItem>
        ),
      });
    }
  }

  if (manageHref) {
    dropdownItems.push({
      key: "manage",
      render: (
        <DropdownMenuItem className="hover:shadow-inner" asChild key="manage">
          <a href={manageHref}>{t("IssuedAssets:manageUIA")}</a>
        </DropdownMenuItem>
      ),
    });
  }

  dropdownItems.push(
    {
      key: "fund-fee-pool",
      render: (
        <DropdownMenuItem
          key="fund-fee-pool"
          className="hover:shadow-inner"
          onClick={() => setFundFeePoolDialogOpen(true)}
        >
          {t("IssuedAssets:fundFeePool")}
        </DropdownMenuItem>
      ),
    },
    {
      key: "claim-fee-pool",
      render: (
        <DropdownMenuItem
          key="claim-fee-pool"
          className="hover:shadow-inner"
          onClick={() => setClaimFeePoolOpen(true)}
        >
          {t("IssuedAssets:claimFeePool")}
        </DropdownMenuItem>
      ),
    },
    {
      key: "claim-asset-fees",
      render: (
        <DropdownMenuItem
          key="claim-asset-fees"
          className="hover:shadow-inner"
          onClick={() => setClaimAssetFeesOpen(true)}
        >
          {t("IssuedAssets:claimAssetFees")}
        </DropdownMenuItem>
      ),
    },
    {
      key: "update-issuer",
      render: (
        <DropdownMenuItem
          key="update-issuer"
          className="hover:shadow-inner"
          onClick={() => setUpdateIssuerOpen(true)}
        >
          {t("IssuedAssets:updateIssuer")}
        </DropdownMenuItem>
      ),
    }
  );

  if (isSmartcoin && bitassetDetails) {
    const canGlobalSettle =
      issuerPermissions.global_settle &&
      parseInt(
        bitassetDetails?.current_feed?.settlement_price?.quote?.amount ?? 0,
        10
      ) > 0 &&
      parseInt(
        bitassetDetails?.current_feed?.settlement_price?.base?.amount ?? 0,
        10
      ) > 0;
    if (canGlobalSettle) {
      dropdownItems.push({
        key: "global-settlement-disabled",
        render: (
          <DropdownMenuItem
            key="global-settlement"
            className="hover:shadow-inner"
            onClick={() => setGlobalSettleOpen(true)}
          >
            {t("IssuedAssets:globalSettlement")}
          </DropdownMenuItem>
        ),
      });
    }
  }

  if (isUIA || (isNFT && !asset?.bitasset_data_id)) {
    dropdownItems.push(
      {
        key: "issue-asset",
        render: (
          <DropdownMenuItem
            key="issue-asset"
            className="hover:shadow-inner"
            onClick={() => setIssueAssetOpen(true)}
          >
            {t("IssuedAssets:issueAsset")}
          </DropdownMenuItem>
        ),
      },
      {
        key: "reserve-asset",
        render: (
          <DropdownMenuItem
            key="reserve-asset"
            className="hover:shadow-inner"
            onClick={() => setReserveAssetOpen(true)}
          >
            {t("IssuedAssets:reserveAsset")}
          </DropdownMenuItem>
        ),
      }
    );
  }

  // Add override transfer only if flag enabled
  // Display only when the override_authority flag is actually ENABLED on the asset
  if (
    (isUIA || isNFT) &&
    hasOverrideAuthority &&
    issuerPermissions?.override_authority
  ) {
    dropdownItems.push({
      key: "override-transfer",
      render: (
        <DropdownMenuItem
          key="override-transfer"
          className="hover:shadow-inner"
          onClick={() => setOverrideOpen(true)}
        >
          {t("IssuedAssets:overrideTransfer", {
            defaultValue: "Override transfer",
          })}
        </DropdownMenuItem>
      ),
    });
  }

  if (!dropdownItems.length) {
    return null;
  }

  const favouriteUsersByChain = useMemo(() => {
    if (!favouriteUsersStore) return [];
    return favouriteUsersStore[chain] ?? [];
  }, [favouriteUsersStore, chain]);

  const renderFavourites = (onSelect) => {
    if (!favouriteUsersByChain.length) {
      return (
        <p className="text-sm text-muted-foreground">
          {t("Favourites:usersEmptyDescription")}
        </p>
      );
    }

    return (
      <div className="w-full max-h-[420px] overflow-auto space-y-2">
        {favouriteUsersByChain.map((user) => (
          <button
            key={user.id}
            type="button"
            className="flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-slate-100"
            onClick={() => onSelect(user)}
          >
            <Avatar
              size={36}
              name={user.name}
              extra="Favourite"
              expression={{ eye: "normal", mouth: "open" }}
              colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
            />
            <span className="text-sm font-medium text-slate-900">
              {user.name} ({user.id})
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className={className}
            variant={buttonVariant}
            size={buttonSize}
          >
            {t("IssuedAssets:issuerActions")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {dropdownItems.map((item) => item.render)}
        </DropdownMenuContent>
      </DropdownMenu>

      {deletePoolOpen ? (
        <Dialog open={deletePoolOpen} onOpenChange={setDeletePoolOpen}>
          <DialogContent className="sm:max-w-[550px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {t("IssuedAssets:deletePool")}: {asset?.symbol} (
                {asset.for_liquidity_pool})
              </DialogTitle>
            </DialogHeader>

            <HoverInfo
              content={t("CustomPoolOverview:poolId")}
              header={t("CustomPoolOverview:poolId")}
              type="header"
            />
            <Input
              value={`${asset.for_liquidity_pool}`}
              readOnly
              className="mt-2"
            />

            <Button
              className="mt-3 w-1/3"
              onClick={() => setDeletePoolDeeplinkOpen(true)}
            >
              {t("IssuedAssets:deletePool")}
            </Button>

            {deletePoolDeeplinkOpen ? (
              <DeepLinkDialog
                operationNames={["liquidity_pool_delete"]}
                username={currentUser?.username}
                usrChain={chain}
                userID={currentUser?.id}
                dismissCallback={setDeletePoolDeeplinkOpen}
                key={`deletePool-${asset?.for_liquidity_pool}`}
                headerText={`${t("CustomPoolOverview:poolId")}: ${
                  asset.for_liquidity_pool
                }`}
                trxJSON={[
                  {
                    account: currentUser?.id,
                    pool: asset.for_liquidity_pool,
                    extensions: {},
                  },
                ]}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      {fundFeePoolDialogOpen ? (
        <Dialog
          open={fundFeePoolDialogOpen}
          onOpenChange={setFundFeePoolDialogOpen}
        >
          <DialogContent className="sm:max-w-[550px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {t("IssuedAssets:fundFeePool")}: {asset?.symbol} ({coreSymbol})
              </DialogTitle>
              <DialogDescription>
                {t("IssuedAssets:fundFeePoolInfo")}
              </DialogDescription>
            </DialogHeader>

            <HoverInfo
              content={t("IssuedAssets:currentFeePoolFundInfo")}
              header={t("IssuedAssets:currentFeePoolFund")}
              type="header"
            />
            <Input
              value={`${feePoolBalance} ${coreSymbol}`}
              readOnly
              className="mt-2"
            />

            <HoverInfo
              content={t("IssuedAssets:feePoolAmountInfo")}
              header={t("IssuedAssets:feePoolAmount")}
              type="header"
            />
            <Input
              type="number"
              value={fundFeePoolAmount}
              onChange={(event) => setFundFeePoolAmount(event.target.value)}
            />

            <Button
              className="mt-3 w-1/3"
              onClick={() => setFundFeePoolDeeplinkOpen(true)}
              disabled={!fundFeePoolAmount}
            >
              {t("IssuedAssets:fundFeePool")}
            </Button>

            {fundFeePoolDeeplinkOpen ? (
              <DeepLinkDialog
                operationNames={["asset_fund_fee_pool"]}
                username={currentUser?.username}
                usrChain={chain}
                userID={currentUser?.id}
                dismissCallback={setFundFeePoolDeeplinkOpen}
                key={`fundFeePool-${asset?.id}`}
                headerText={t("IssuedAssets:feeFundHeader", {
                  amount: fundFeePoolAmount,
                  asset: coreSymbol,
                })}
                trxJSON={[
                  {
                    from_account: currentUser?.id,
                    asset_id: asset?.id,
                    amount: blockchainFloat(
                      Number(fundFeePoolAmount || 0),
                      asset?.precision ?? 0
                    ),
                    extensions: {},
                  },
                ]}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      {claimFeePoolOpen ? (
        <Dialog open={claimFeePoolOpen} onOpenChange={setClaimFeePoolOpen}>
          <DialogContent className="sm:max-w-[550px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {t("IssuedAssets:claimFeePool")}: {asset?.symbol} ({coreSymbol})
              </DialogTitle>
              <DialogDescription>
                {t("IssuedAssets:claimFeePoolInfo")}
              </DialogDescription>
            </DialogHeader>

            <HoverInfo
              content={t("IssuedAssets:fundFeePoolInfo")}
              header={t("IssuedAssets:fundFeePool")}
              type="header"
            />
            <Input
              value={`${feePoolBalance} ${coreSymbol}`}
              readOnly
              className="mt-2"
            />

            <HoverInfo
              content={t("IssuedAssets:poolFeeClaimAmountInfo")}
              header={t("IssuedAssets:poolFeeClaimAmount")}
              type="header"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                value={claimFeePoolAmount}
                onChange={(event) => setClaimFeePoolAmount(event.target.value)}
                className="col-span-2"
              />
              <Button
                variant="outline"
                onClick={() => setClaimFeePoolAmount(String(feePoolBalance))}
              >
                {t("IssuedAssets:claimAllFees")}
              </Button>
            </div>

            <Button
              className="mt-3 w-1/3"
              onClick={() => setClaimFeePoolDeeplinkOpen(true)}
              disabled={!claimFeePoolAmount}
            >
              {t("IssuedAssets:claimFeePool")}
            </Button>

            {claimFeePoolDeeplinkOpen ? (
              <DeepLinkDialog
                operationNames={["asset_claim_pool"]}
                username={currentUser?.username}
                usrChain={chain}
                userID={currentUser?.id}
                dismissCallback={setClaimFeePoolDeeplinkOpen}
                key={`claimFeePool-${asset?.id}`}
                headerText={t("IssuedAssets:feePoolClaimHeader", {
                  amount: claimFeePoolAmount,
                  symbol: coreSymbol,
                  asset: asset?.symbol,
                })}
                trxJSON={[
                  {
                    issuer: currentUser?.id,
                    asset_id: asset?.id,
                    amount_to_claim: {
                      amount: blockchainFloat(
                        Number(claimFeePoolAmount || 0),
                        CORE_PRECISION
                      ),
                      asset_id: "1.3.0",
                    },
                    extensions: {},
                  },
                ]}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      {claimAssetFeesOpen ? (
        <Dialog open={claimAssetFeesOpen} onOpenChange={setClaimAssetFeesOpen}>
          <DialogContent className="sm:max-w-[550px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {t("IssuedAssets:claimAssetFees")}: {asset?.symbol} (
                {coreSymbol})
              </DialogTitle>
              <DialogDescription>
                {t("IssuedAssets:claimAssetFeesInfo")}
              </DialogDescription>
            </DialogHeader>

            <HoverInfo
              content={t("IssuedAssets:accumulatedFeesInfo")}
              header={t("IssuedAssets:accumulatedFees")}
              type="header"
            />
            <Input
              value={`${accumulatedFees} ${coreSymbol}`}
              readOnly
              className="mt-2"
            />

            <HoverInfo
              content={t("IssuedAssets:feesToClaimInfo")}
              header={t("IssuedAssets:feesToClaim")}
              type="header"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                value={claimAssetFeesAmount}
                onChange={(event) =>
                  setClaimAssetFeesAmount(event.target.value)
                }
                className="col-span-2"
              />
              <Button
                variant="outline"
                onClick={() => setClaimAssetFeesAmount(String(accumulatedFees))}
              >
                {t("IssuedAssets:claimAllFees")}
              </Button>
            </div>

            <Button
              className="mt-3 w-1/3"
              onClick={() => setClaimAssetFeesDeeplinkOpen(true)}
              disabled={!claimAssetFeesAmount}
            >
              {t("IssuedAssets:claimAssetFees")}
            </Button>

            {claimAssetFeesDeeplinkOpen ? (
              <DeepLinkDialog
                operationNames={["asset_claim_fees"]}
                username={currentUser?.username}
                usrChain={chain}
                userID={currentUser?.id}
                dismissCallback={setClaimAssetFeesDeeplinkOpen}
                key={`claimAssetFees-${asset?.id}`}
                headerText={t("IssuedAssets:assetFeeClaimHeader", {
                  amount: claimAssetFeesAmount,
                  symbol: asset?.symbol,
                  asset: coreSymbol,
                })}
                trxJSON={[
                  {
                    issuer: currentUser?.id,
                    amount_to_claim: {
                      amount: blockchainFloat(
                        Number(claimAssetFeesAmount || 0),
                        CORE_PRECISION
                      ),
                      asset_id: asset?.id,
                    },
                    extensions: {},
                  },
                ]}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      {priceFeedPublishersOpen ? (
        <Dialog
          open={priceFeedPublishersOpen}
          onOpenChange={(open) => {
            setPriceFeedPublishersOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-[600px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {t(`Predictions:priceFeederDialog.title`)}
              </DialogTitle>
              <DialogDescription>
                {t(`Predictions:priceFeederDialog.description`)}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-2">
              <HoverInfo
                content={t("issuedAssets:priceFeedersInfo")}
                header={t("issuedAssets:priceFeeders", {
                  symbol: asset.symbol,
                })}
                type="header"
              />
              <div className="grid grid-cols-12 mt-1">
                <span className="col-span-9 border border-gray-300 rounded">
                  <div className="w-full max-h-[210px] overflow-auto">
                    <List
                      rowComponent={PriceFeederRow}
                      rowCount={priceFeedPublishers.length}
                      rowHeight={80}
                      rowProps={{}}
                    />
                  </div>
                </span>
                <span className="col-span-3 ml-3 text-center">
                  <Dialog
                    open={priceSearchDialog}
                    onOpenChange={(open) => {
                      setPriceSearchDialog(open);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" className="ml-3 mt-1">
                        ➕ {t("CreditOfferEditor:addUser")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[375px] bg-white">
                      <DialogHeader>
                        <DialogTitle>
                          {!currentUser || !currentUser.chain
                            ? t("Transfer:bitsharesAccountSearch")
                            : null}
                          {currentUser && currentUser.chain === "bitshares"
                            ? t("Transfer:bitsharesAccountSearchBTS")
                            : null}
                          {currentUser && currentUser.chain !== "bitshares"
                            ? t("Transfer:bitsharesAccountSearchTEST")
                            : null}
                        </DialogTitle>
                      </DialogHeader>
                      <AccountSearch
                        chain={
                          currentUser && currentUser.chain
                            ? currentUser.chain
                            : "bitshares"
                        }
                        excludedUsers={[]}
                        setChosenAccount={(_account) => {
                          if (
                            _account &&
                            !priceFeedPublishers.find(
                              (_usr) => _usr.id === _account.id
                            )
                          ) {
                            setPriceFeedPublishers(
                              priceFeedPublishers && priceFeedPublishers.length
                                ? [...priceFeedPublishers, _account]
                                : [_account]
                            );
                          }
                          setPriceSearchDialog(false);
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="h-6 mt-1 w-1/2"
                  onClick={() => {
                    setPriceFeedPublishersDeeplinkDialog(true);
                  }}
                >
                  {t("Predictions:submit")}
                </Button>
              </div>
            </div>
            {priceFeedPublishersDeeplinkDialog ? (
              <DeepLinkDialog
                operationNames={["asset_update_feed_producers"]}
                username={currentUser.username}
                usrChain={currentUser.chain}
                userID={currentUser.id}
                dismissCallback={setPriceFeedPublishersDeeplinkDialog}
                key={`deeplink-pricefeeddialog-${asset.id}`}
                headerText={t(`Predictions:dialogContent.header_pricefeeder`)}
                trxJSON={[
                  {
                    issuer: currentUser.id,
                    asset_to_update: asset.id,
                    new_feed_producers: priceFeedPublishers.map(
                      (_usr) => _usr.id
                    ),
                  },
                ]}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      {issueAssetOpen ? (
        <Dialog open={issueAssetOpen} onOpenChange={setIssueAssetOpen}>
          <DialogContent className="sm:max-w-[550px] bg-white">
            <DialogHeader>
              <DialogTitle>{t("IssuedAssets:issueAsset")}</DialogTitle>
              <DialogDescription>
                {t("IssuedAssets:issueAssetDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-8 gap-2">
              <div className="col-span-8">
                <HoverInfo
                  content={t("IssuedAssets:targetUserInfo")}
                  header={t("IssuedAssets:targetUser")}
                  type="header"
                />
              </div>
              <div className="col-span-1">
                {issueTarget ? (
                  <Avatar
                    size={40}
                    name={issueTarget.name}
                    extra="Target"
                    expression={{ eye: "normal", mouth: "open" }}
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
              <div className="col-span-4">
                <Input
                  disabled
                  placeholder={
                    issueTarget
                      ? `${issueTarget.name} (${issueTarget.id})`
                      : "Bitshares account (1.2.x)"
                  }
                  className="mb-1 mt-1"
                />
              </div>
              <div className="col-span-3 flex gap-2">
                <Dialog
                  open={issueSearchOpen}
                  onOpenChange={setIssueSearchOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-1">
                      <MagnifyingGlassIcon />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[375px] bg-white">
                    <DialogHeader>
                      <DialogTitle>
                        {chain === "bitshares"
                          ? t("Transfer:bitsharesAccountSearchBTS")
                          : t("Transfer:bitsharesAccountSearchTEST")}
                      </DialogTitle>
                    </DialogHeader>
                    <AccountSearch
                      chain={chain}
                      excludedUsers={[]}
                      setChosenAccount={(account) => {
                        setIssueTarget({ name: account.name, id: account.id });
                        setIssueSearchOpen(false);
                      }}
                    />
                  </DialogContent>
                </Dialog>
                <Dialog
                  open={issueFavouritesOpen}
                  onOpenChange={setIssueFavouritesOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-1">
                      <FaceIcon />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[375px] bg-white">
                    <DialogHeader>
                      <DialogTitle>{t("Favourites:usersHeader")}</DialogTitle>
                      <DialogDescription>
                        {t("Favourites:usersEmptyDescription")}
                      </DialogDescription>
                    </DialogHeader>
                    {renderFavourites((user) => {
                      setIssueTarget({ name: user.name, id: user.id });
                      setIssueFavouritesOpen(false);
                    })}
                  </DialogContent>
                </Dialog>
                <Dialog
                  open={issueContactsOpen}
                  onOpenChange={setIssueContactsOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-1">
                      <AvatarIcon />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[375px] bg-white">
                    <DialogHeader>
                      <DialogTitle>{t("IssuedAssets:contactList")}</DialogTitle>
                      <DialogDescription>
                        {t("IssuedAssets:contactListInfo")}
                      </DialogDescription>
                    </DialogHeader>
                    {renderContacts((user) => {
                      setIssueTarget({ name: user.username, id: user.id });
                      setIssueContactsOpen(false);
                    })}
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <HoverInfo
              content={t("IssuedAssets:issueAmountInfo")}
              header={t("IssuedAssets:issueAmount")}
              type="header"
            />
            <Input
              type="number"
              value={issueAmount}
              onChange={(event) => setIssueAmount(event.target.value)}
              className="mt-2"
            />

            <HoverInfo
              content={t("IssuedAssets:currentSupplyInfo")}
              header={t("IssuedAssets:currentSupply")}
              type="header"
            />
            <Input
              value={`${currentSupply} ${asset?.symbol}`}
              readOnly
              className="mt-2"
            />

            <Button
              className="mt-3 w-1/3"
              onClick={() => setIssueDeeplinkOpen(true)}
              disabled={!issueTarget || !issueAmount}
            >
              {t("IssuedAssets:issueAsset")}
            </Button>

            {issueDeeplinkOpen ? (
              <DeepLinkDialog
                operationNames={["asset_issue"]}
                username={currentUser?.username}
                usrChain={chain}
                userID={currentUser?.id}
                dismissCallback={setIssueDeeplinkOpen}
                key={`issueAsset-${asset?.id}`}
                headerText={t("IssuedAssets:issueHeader", {
                  amount: issueAmount,
                  asset: asset?.symbol,
                  account: issueTarget?.name,
                })}
                trxJSON={[
                  {
                    issuer: currentUser?.id,
                    asset_to_issue: {
                      amount: blockchainFloat(
                        Number(issueAmount || 0),
                        asset?.precision ?? 0
                      ),
                      asset_id: asset?.id,
                    },
                    issue_to_account: issueTarget?.id,
                    memo: null,
                    extensions: {},
                  },
                ]}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      {reserveAssetOpen ? (
        <Dialog open={reserveAssetOpen} onOpenChange={setReserveAssetOpen}>
          <DialogContent className="sm:max-w-[550px] bg-white">
            <DialogHeader>
              <DialogTitle>{t("IssuedAssets:reserveAsset")}</DialogTitle>
              <DialogDescription>
                {t("IssuedAssets:reserveAssetInfo")}
              </DialogDescription>
            </DialogHeader>

            <HoverInfo
              content={t("IssuedAssets:reserveAmountInfo")}
              header={t("IssuedAssets:reserveAmount")}
              type="header"
            />
            <Input
              type="number"
              value={reserveAmount}
              onChange={(event) => setReserveAmount(event.target.value)}
            />

            <HoverInfo
              content={t("IssuedAssets:currentSupplyInfo")}
              header={t("IssuedAssets:currentSupply")}
              type="header"
            />
            <Input
              value={`${currentSupply} ${asset?.symbol}`}
              readOnly
              className="mt-2"
            />

            <Button
              className="mt-3 w-1/3"
              onClick={() => setReserveDeeplinkOpen(true)}
              disabled={!reserveAmount}
            >
              {t("IssuedAssets:reserveAsset")}
            </Button>

            {reserveDeeplinkOpen ? (
              <DeepLinkDialog
                operationNames={["asset_reserve"]}
                username={currentUser?.username}
                usrChain={chain}
                userID={currentUser?.id}
                dismissCallback={setReserveDeeplinkOpen}
                key={`reserveAsset-${asset?.id}`}
                headerText={t("IssuedAssets:reserveHeader", {
                  amount: reserveAmount,
                  asset: asset?.symbol,
                })}
                trxJSON={[
                  {
                    payer: currentUser?.id,
                    amount_to_reserve: {
                      amount: blockchainFloat(
                        Number(reserveAmount || 0),
                        asset?.precision ?? 0
                      ),
                      asset_id: asset?.id,
                    },
                    extensions: {},
                  },
                ]}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      {globalSettleOpen ? (
        <Dialog
          open={globalSettleOpen}
          onOpenChange={(open) => {
            setGlobalSettleOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-[550px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {t("IssuedAssets:updateIssuer")}: {asset.symbol} ({asset.id})
              </DialogTitle>
              <DialogDescription>
                {t("IssuedAssets:updateIssuerInfo")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => {
                    setGlobalSettlementMode("median");
                  }}
                  variant={globalSettlementMode === "median" ? "" : "outline"}
                >
                  {t("IssuedAssets:medianFeedPrice")}
                </Button>
                <Button
                  onClick={() => {
                    setGlobalSettlementMode("current");
                  }}
                  variant={globalSettlementMode === "current" ? "" : "outline"}
                >
                  {t("IssuedAssets:currentFeedPrice")}
                </Button>
                {bitassetData &&
                bitassetData.feeds &&
                bitassetData.feeds.length ? (
                  <Button
                    onClick={() => {
                      setGlobalSettlementMode("price_feed");
                    }}
                    variant={
                      globalSettlementMode === "price_feed" ? "" : "outline"
                    }
                  >
                    {t("IssuedAssets:specificPriceFeed")}
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-2">
                {bitassetData &&
                bitassetData.feeds &&
                bitassetData.feeds.length &&
                globalSettlementMode === "price_feed" ? (
                  <>
                    <HoverInfo
                      content={t("IssuedAssets:chooseSpecificFeedInfo")}
                      header={t("IssuedAssets:chooseSpecificFeed")}
                      type="header"
                    />
                    <div className="w-full rounded border border-black pt-1 max-h-[150px] overflow-auto">
                      <List
                        rowComponent={PriceFeedRow}
                        rowCount={bitassetData.feeds.length}
                        rowHeight={60}
                        rowProps={{}}
                      />
                    </div>
                  </>
                ) : null}
                <div>
                  <HoverInfo
                    content={t("IssuedAssets:currentSettlementPriceInfo")}
                    header={t("IssuedAssets:currentSettlementPrice")}
                    type="header"
                  />
                  <Input
                    value={`${
                      parseFloat(currentFeedSettlementPrice) > 0
                        ? currentFeedSettlementPrice
                        : "??? ⚠️"
                    } ${collateralAsset.symbol}/${asset.symbol}`}
                    readOnly={true}
                    className="mt-2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <HoverInfo
                      content={t("IssuedAssets:quoteInfo")}
                      header={t("IssuedAssets:quote")}
                      type="header"
                    />
                    <Input
                      value={`${humanReadableFloat(
                        parseInt(globalSettleObject.quote.amount),
                        collateralAsset.precision
                      )} ${collateralAsset.symbol} (${collateralAsset.id})`}
                      readOnly={true}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <HoverInfo
                      content={t("IssuedAssets:baseInfo")}
                      header={t("IssuedAssets:base")}
                      type="header"
                    />
                    <Input
                      value={`${humanReadableFloat(
                        parseInt(parseInt(globalSettleObject.base.amount)),
                        asset.precision
                      )} ${asset.symbol} (${asset.id})`}
                      readOnly={true}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </div>
            <Button
              className="w-1/2 mt-2"
              onClick={() => {
                setGlobalSettleDeeplinkDialog(true);
              }}
            >
              {t("IssuedAssets:globallySettle")}
            </Button>
            {globalSettleDeeplinkDialog ? (
              <DeepLinkDialog
                operationNames={["asset_global_settle"]}
                username={currentUser.username}
                usrChain={currentUser.chain}
                userID={currentUser.id}
                dismissCallback={setGlobalSettleDeeplinkDialog}
                key={`globallySettlingAsset_${asset.id}`}
                headerText={t("IssuedAssets:globalSettlementHeader", {
                  asset: asset.symbol,
                  mode: globalSettlementMode,
                })}
                trxJSON={[
                  {
                    issuer: currentUser.id,
                    asset_to_settle: asset.id,
                    settle_price: globalSettleObject,
                    extensions: {},
                  },
                ]}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      {updateIssuerOpen ? (
        <Dialog open={updateIssuerOpen} onOpenChange={setUpdateIssuerOpen}>
          <DialogContent className="sm:max-w-[550px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {t("IssuedAssets:updateIssuer")}: {asset?.symbol} ({asset?.id})
              </DialogTitle>
              <DialogDescription>
                {t("IssuedAssets:updateIssuerInfo")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <HoverInfo
                  content={t("IssuedAssets:currentIssuerInfo")}
                  header={t("IssuedAssets:currentIssuer")}
                  type="header"
                />
                <Input
                  value={`${currentUser?.username ?? ""} (${
                    currentUser?.id ?? ""
                  })`}
                  readOnly
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-8 gap-2">
                <div className="col-span-8">
                  <HoverInfo
                    content={t("IssuedAssets:newIssuerInfo")}
                    header={t("IssuedAssets:newIssuer")}
                    type="header"
                  />
                </div>
                <div className="col-span-1">
                  {updateIssuerTarget ? (
                    <Avatar
                      size={40}
                      name={updateIssuerTarget.name}
                      extra="Target"
                      expression={{ eye: "normal", mouth: "open" }}
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
                <div className="col-span-4">
                  <Input
                    disabled
                    placeholder={
                      updateIssuerTarget
                        ? `${updateIssuerTarget.name} (${updateIssuerTarget.id})`
                        : "Bitshares account (1.2.x)"
                    }
                    className="mb-1 mt-1"
                  />
                </div>
                <div className="col-span-3 flex gap-2">
                  <Dialog
                    open={updateIssuerSearchOpen}
                    onOpenChange={setUpdateIssuerSearchOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" className="mt-1">
                        <MagnifyingGlassIcon />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[375px] bg-white">
                      <DialogHeader>
                        <DialogTitle>
                          {chain === "bitshares"
                            ? t("AccountLists:bitsharesAccountSearchBTS")
                            : t("AccountLists:bitsharesAccountSearchTEST")}
                        </DialogTitle>
                        <DialogDescription>
                          {t("AccountLists:searchingForAccount")}
                        </DialogDescription>
                      </DialogHeader>
                      <AccountSearch
                        chain={chain}
                        excludedUsers={[]}
                        setChosenAccount={(account) => {
                          setUpdateIssuerTarget({
                            name: account.name,
                            id: account.id,
                          });
                          setUpdateIssuerSearchOpen(false);
                        }}
                        skipCheck={false}
                      />
                    </DialogContent>
                  </Dialog>
                  <Dialog
                    open={updateIssuerFavouritesOpen}
                    onOpenChange={setUpdateIssuerFavouritesOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" className="mt-1">
                        <FaceIcon />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[375px] bg-white">
                      <DialogHeader>
                        <DialogTitle>{t("Favourites:usersHeader")}</DialogTitle>
                        <DialogDescription>
                          {t("Favourites:usersEmptyDescription")}
                        </DialogDescription>
                      </DialogHeader>
                      {renderFavourites((user) => {
                        setUpdateIssuerTarget({ name: user.name, id: user.id });
                        setUpdateIssuerFavouritesOpen(false);
                      })}
                    </DialogContent>
                  </Dialog>
                  <Dialog
                    open={updateIssuerContactsOpen}
                    onOpenChange={setUpdateIssuerContactsOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline" className="mt-1">
                        <AvatarIcon />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[375px] bg-white">
                      <DialogHeader>
                        <DialogTitle>
                          {t("IssuedAssets:contactList")}
                        </DialogTitle>
                        <DialogDescription>
                          {t("IssuedAssets:contactListInfo")}
                        </DialogDescription>
                      </DialogHeader>
                      {renderContacts((user) => {
                        setUpdateIssuerTarget({
                          name: user.username,
                          id: user.id,
                        });
                        setUpdateIssuerContactsOpen(false);
                      })}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            <Button
              className="mt-3 w-1/3"
              onClick={() => setUpdateIssuerDeeplinkOpen(true)}
              disabled={!updateIssuerTarget}
            >
              {t("IssuedAssets:updateIssuer")}
            </Button>

            {updateIssuerDeeplinkOpen ? (
              <DeepLinkDialog
                operationNames={["asset_update_issuer"]}
                username={currentUser?.username}
                usrChain={chain}
                userID={currentUser?.id}
                dismissCallback={setUpdateIssuerDeeplinkOpen}
                key={`updateIssuer-${asset?.id}`}
                headerText={t("IssuedAssets:updateIssuerHeader", {
                  asset: asset?.symbol,
                  currentIssuer: currentUser?.id,
                  newIssuer: updateIssuerTarget?.id,
                })}
                trxJSON={[
                  {
                    issuer: currentUser?.id,
                    new_issuer: updateIssuerTarget?.id,
                    asset_to_update: asset?.id,
                    extensions: {},
                  },
                ]}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      {overrideOpen ? (
        <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
          <DialogContent className="sm:max-w-[550px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {t("IssuedAssets:overrideTransfer", {
                  defaultValue: "Override transfer",
                })}
                : {asset?.symbol}
              </DialogTitle>
              <DialogDescription>
                {t("IssuedAssets:overrideTransferInfo", {
                  defaultValue:
                    "Recall tokens from a holder back to the issuer account. Provide a target account ID (1.2.x), then choose an amount up to their balance.",
                })}
              </DialogDescription>
            </DialogHeader>

            <HoverInfo
              content={t("IssuedAssets:overrideTargetInfo", {
                defaultValue:
                  "Choose the target account (1.2.x). We’ll auto-check balance.",
              })}
              header={t("IssuedAssets:targetUser", {
                defaultValue: "Target account",
              })}
              type="header"
            />
            <div className="grid grid-cols-8 gap-2 mt-2">
              <div className="col-span-1">
                {overrideTarget ? (
                  <Avatar
                    size={40}
                    name={overrideTarget.name}
                    extra="Target"
                    expression={{ eye: "normal", mouth: "open" }}
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
              <div className="col-span-4">
                <Input
                  disabled
                  placeholder={
                    overrideTarget
                      ? `${overrideTarget.name} (${overrideTarget.id})`
                      : "Bitshares account (1.2.x)"
                  }
                  className="mb-1 mt-1"
                />
              </div>
              <div className="col-span-3 flex gap-2">
                <Dialog
                  open={overrideSearchOpen}
                  onOpenChange={setOverrideSearchOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-1">
                      <MagnifyingGlassIcon />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[375px] bg-white">
                    <DialogHeader>
                      <DialogTitle>
                        {chain === "bitshares"
                          ? t("Transfer:bitsharesAccountSearchBTS")
                          : t("Transfer:bitsharesAccountSearchTEST")}
                      </DialogTitle>
                    </DialogHeader>
                    <AccountSearch
                      chain={chain}
                      excludedUsers={[]}
                      setChosenAccount={(account) => {
                        setOverrideTarget({
                          name: account.name,
                          id: account.id,
                        });
                        setOverrideSearchOpen(false);
                      }}
                    />
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={overrideFavouritesOpen}
                  onOpenChange={setOverrideFavouritesOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-1">
                      <FaceIcon />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[375px] bg-white">
                    <DialogHeader>
                      <DialogTitle>{t("Favourites:usersHeader")}</DialogTitle>
                      <DialogDescription>
                        {t("Favourites:usersEmptyDescription")}
                      </DialogDescription>
                    </DialogHeader>
                    {renderFavourites((user) => {
                      setOverrideTarget({ name: user.name, id: user.id });
                      setOverrideFavouritesOpen(false);
                    })}
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={overrideContactsOpen}
                  onOpenChange={setOverrideContactsOpen}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-1">
                      <AvatarIcon />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[375px] bg-white">
                    <DialogHeader>
                      <DialogTitle>{t("IssuedAssets:contactList")}</DialogTitle>
                      <DialogDescription>
                        {t("IssuedAssets:contactListInfo")}
                      </DialogDescription>
                    </DialogHeader>
                    {renderContacts((user) => {
                      setOverrideTarget({ name: user.username, id: user.id });
                      setOverrideContactsOpen(false);
                    })}
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {overrideError ? (
              <p className="text-sm text-red-600 mt-2">{overrideError}</p>
            ) : null}

            <div className="mt-3 space-y-2">
              <HoverInfo
                content={t("IssuedAssets:holderBalanceInfo", {
                  defaultValue: "Detected balance of the target in this asset",
                })}
                header={t("IssuedAssets:holderBalance", {
                  defaultValue: "Holder balance",
                })}
                type="header"
              />
              <Input value={`${overrideBalance} ${asset?.symbol}`} readOnly />
            </div>

            {overrideBalance > 0 ? (
              <>
                <HoverInfo
                  content={t("IssuedAssets:overrideAmountInfo", {
                    defaultValue:
                      "Amount to recall (must be <= holder balance)",
                  })}
                  header={t("IssuedAssets:amount", { defaultValue: "Amount" })}
                  type="header"
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Input
                    type="number"
                    value={overrideAmount}
                    onChange={(e) => setOverrideAmount(e.target.value)}
                    className="col-span-2"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setOverrideAmount(String(overrideBalance))}
                  >
                    {t("IssuedAssets:useMax", { defaultValue: "Use max" })}
                  </Button>
                </div>
              </>
            ) : null}

            <Button
              className="mt-3 w-1/3"
              onClick={() => setOverrideDLOpen(true)}
              disabled={
                !overrideTargetId ||
                !overrideAmount ||
                isNaN(Number(overrideAmount)) ||
                Number(overrideAmount) <= 0 ||
                Number(overrideAmount) > Number(overrideBalance)
              }
            >
              {t("IssuedAssets:overrideTransfer", {
                defaultValue: "Override transfer",
              })}
            </Button>

            {overrideDLOpen ? (
              <DeepLinkDialog
                operationNames={["override_transfer"]}
                username={currentUser?.username}
                usrChain={chain}
                userID={currentUser?.id}
                dismissCallback={setOverrideDLOpen}
                key={`overrideTransfer-${asset?.id}`}
                headerText={t("IssuedAssets:overrideHeader", {
                  defaultValue: "Recall {{amount}} {{symbol}} from {{account}}",
                  amount: overrideAmount,
                  symbol: asset?.symbol,
                  account: overrideTargetId,
                })}
                trxJSON={[
                  {
                    issuer: currentUser?.id,
                    from: overrideTargetId,
                    to: currentUser?.id,
                    amount: {
                      amount: blockchainFloat(
                        Number(overrideAmount || 0),
                        asset?.precision ?? 0
                      ),
                      asset_id: asset?.id,
                    },
                    extensions: {},
                  },
                ]}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

export default AssetIssuerActions;
