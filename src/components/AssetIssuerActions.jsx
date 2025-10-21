import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import HoverInfo from "@/components/common/HoverInfo.tsx";
import AccountSearch from "@/components/AccountSearch.jsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import { Avatar as Av, AvatarFallback } from "@/components/ui/avatar";
import { Avatar } from "@/components/Avatar.tsx";
import {
  MagnifyingGlassIcon,
  AvatarIcon,
  FaceIcon,
} from "@radix-ui/react-icons";
import { useStore } from "@nanostores/react";
import { $userStorage } from "@/stores/users.ts";
import { $favouriteUsers } from "@/stores/favourites.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
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
    chain,
    currentUser,
    node,
    dynamicAssetData,
    bitassetData,
    buttonVariant = "outline",
    buttonSize = "sm",
    className,
  } = props;

  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const storedUsers = useStore($userStorage);
  const favouriteUsersStore = useStore($favouriteUsers);

  const [dynamicData, setDynamicData] = useState(dynamicAssetData ?? null);
  const [bitassetDetails, setBitassetDetails] = useState(bitassetData ?? null);

  useEffect(() => {
    setDynamicData(dynamicAssetData ?? null);
  }, [dynamicAssetData]);

  useEffect(() => {
    setBitassetDetails(bitassetData ?? null);
  }, [bitassetData]);

  useEffect(() => {
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

    const unsubscribe = store.subscribe(({ data, error, loading }) => {
      if (!loading && !error && data && data.length) {
        setDynamicData(data[0]);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [asset?.dynamic_asset_data_id, chain, node?.url, dynamicAssetData]);

  useEffect(() => {
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

    const unsubscribe = store.subscribe(({ data, error, loading }) => {
      if (!loading && !error && data && data.length) {
        setBitassetDetails(data[0]);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
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

  if (manageHref) {
    dropdownItems.push({
      key: "manage",
      render: (
        <DropdownMenuItem asChild key="manage">
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
          <DropdownMenuItem key="global-settlement" disabled>
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
            onClick={() => setReserveAssetOpen(true)}
          >
            {t("IssuedAssets:reserveAsset")}
          </DropdownMenuItem>
        ),
      }
    );
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
    </>
  );
}

export default AssetIssuerActions;
