import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import AssetFlag from "@/components/common/AssetFlag.tsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";

import {
  Hash,
  Layers,
  Image,
  Settings,
  Send,
  Gem,
  Percent,
  Tag,
  Info,
} from "lucide-react";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNodeUrl } from "@/stores/node.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import {
  getPermissions,
  getFlags,
  humanReadableFloat,
  blockchainFloat,
  getFlagBooleans,
} from "@/lib/common.js";

import {
  usePermissionFlagCascade,
  useDescriptionSerializer,
  useDebouncedFormInputs,
  NFTSection,
  PermissionsFlagsPanel,
  ExtensionsSection,
  AuthorityListsSection,
  MarketFilteringSection,
} from "@/components/asset-form/index.js";
import SmartcoinOptionsSection from "@/components/Smartcoin/SmartcoinOptionsSection.jsx";

const STEP_COLORS = {
  1: { icon: "bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))] ring-[hsl(var(--accent-1)/0.3)]", badge: "bg-[hsl(var(--accent-1)/0.15)] text-[hsl(var(--accent-1-fg))]", border: "border-[hsl(var(--accent-1)/0.2)]" },
  2: { icon: "bg-[hsl(var(--accent-3)/0.15)] text-[hsl(var(--accent-3-fg))] ring-[hsl(var(--accent-3)/0.3)]", badge: "bg-[hsl(var(--accent-3)/0.15)] text-[hsl(var(--accent-3-fg))]", border: "border-[hsl(var(--accent-3)/0.2)]" },
  3: { icon: "bg-[hsl(var(--accent-warning)/0.15)] text-[hsl(var(--accent-warning-fg))] ring-[hsl(var(--accent-warning)/0.3)]", badge: "bg-[hsl(var(--accent-warning)/0.15)] text-[hsl(var(--accent-warning-fg))]", border: "border-[hsl(var(--accent-warning)/0.2)]" },
  4: { icon: "bg-[hsl(var(--accent-success)/0.15)] text-[hsl(var(--accent-success-fg))] ring-[hsl(var(--accent-success)/0.3)]", badge: "bg-[hsl(var(--accent-success)/0.15)] text-[hsl(var(--accent-success-fg))]", border: "border-[hsl(var(--accent-success)/0.2)]" },
  5: { icon: "bg-[hsl(var(--accent-danger)/0.15)] text-[hsl(var(--accent-danger-fg))] ring-[hsl(var(--accent-danger)/0.3)]", badge: "bg-[hsl(var(--accent-danger)/0.15)] text-[hsl(var(--accent-danger-fg))]", border: "border-[hsl(var(--accent-danger)/0.2)]" },
  6: { icon: "bg-[hsl(var(--accent-2)/0.15)] text-[hsl(var(--accent-2-fg))] ring-[hsl(var(--accent-2)/0.3)]", badge: "bg-[hsl(var(--accent-2)/0.15)] text-[hsl(var(--accent-2-fg))]", border: "border-[hsl(var(--accent-2)/0.2)]" },
};

function SectionHeader({ icon: Icon, title, description, step, optional, right }) {
  const colors = STEP_COLORS[step] || STEP_COLORS[1];
  return (
    <div className="flex items-start gap-4 border-b border-border px-6 sm:px-8 py-5">
      <div className={"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 " + colors.icon}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {step && (
            <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + colors.badge}>
              Step {step}
              {optional ? " · Optional" : ""}
            </span>
          )}
        </div>
        <h3 className="mt-0.5 text-base font-semibold leading-tight text-foreground">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {right && (
        <div className="shrink-0 ml-auto">{right}</div>
      )}
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && (
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={"mt-0.5 truncate text-sm text-foreground " + (mono ? "font-mono" : "")}>
          {value || <span className="text-muted-foreground/40">--</span>}
        </div>
      </div>
    </div>
  );
}

function getImages(nft_object) {
  if (!nft_object) return [];
  const object_keys = Object.keys(nft_object);
  if (
    object_keys.find((x) => x.includes("media_") && x.includes("_multihashes"))
  ) {
    return (
      object_keys
        .filter((key) => key.includes("media_") && key.includes("_multihashes"))
        .map((key) => {
          const current = nft_object[key];
          const type = key.split("_")[1].toUpperCase();
          return current.map((image) => ({ url: image.url, type }));
        })
        .flat() || []
    );
  }

  return (
    object_keys
      .filter((key) => key.includes("media_") && !key.includes("_multihash"))
      .map((key) => {
        const current = nft_object[key];
        const type = key.split("_")[1].toUpperCase();
        return { url: current, type };
      })
      .flat() || []
  );
}

export default function CreateSmartcoin(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNodeUrl = useStore($currentNodeUrl);

  const { _assetsBTS, _assetsTEST, _marketSearchBTS, _marketSearchTEST } =
    properties;

  const marketSearch = useMemo(() => {
    if (usr && usr.chain && (_marketSearchBTS || _marketSearchTEST)) {
      return usr.chain === "bitshares" ? _marketSearchBTS : _marketSearchTEST;
    }
    return [];
  }, [_marketSearchBTS, _marketSearchTEST, usr]);

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

  const [balanceCounter, setBalanceCoutner] = useState(0);
  const [balances, setBalances] = useState();
  useEffect(() => {
    async function fetchBalances() {
      if (usr && usr.id && currentNodeUrl && assets && assets.length) {
        const userBalancesStore = createUserBalancesStore([
          usr.chain,
          usr.id,
          currentNodeUrl || "",
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
  }, [usr, assets, currentNodeUrl, balanceCounter]);

  // Asset info
  const [shortName, setShortName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [desc, setDesc] = useState("");
  const [precision, setPrecision] = useState(5);
  const [maxSupply, setMaxSupply] = useState(1000000000);

  const [allowedMarketsEnabled, setAllowedMarketsEnabled] = useState(false); // asset allowlist
  const [allowedMarkets, setAllowedMarkets] = useState([]);
  const [bannedMarketsEnabled, setBannedMarketsEnabled] = useState(false); // asset blocklist
  const [bannedMarkets, setBannedMarkets] = useState([]);

  // Initializing permissions
  const [permWhiteList, setPermWhiteList] = useState(true); // white_list
  const [permTransferRestricted, setPermTransferRestricted] = useState(true); // transfer_restricted
  const [permDisableConfidential, setPermDisableConfidential] = useState(true); // disable_confidential
  const [permChargeMarketFee, setPermChargeMarketFee] = useState(true); // charge_market_fee
  const [permOverrideAuthority, setPermOverrideAuthority] = useState(true); // override_authority
  const [permWitnessFedAsset, setPermWitnessFedAsset] = useState(true); // whitelist_authorities
  const [permCommitteeFedAsset, setPermCommitteeFedAsset] = useState(true); // blacklist_authorities

  const [permDisableForceSettle, setPermDisableForceSettle] = useState(true); // disable_force_settle
  const [permGlobalSettle, setPermGlobalSettle] = useState(true); // global_settle

  const [permLockMaxSupply, setPermLockMaxSupply] = useState(false); // lock_max_supply
  const [permDisableNewSupply, setPermDisableNewSupply] = useState(false); // disable_new_supply
  const [permDisableMCRUpdate, setPermDisableMCRUpdate] = useState(false); // disable_mcr_update
  const [permDisableICRUpdate, setPermDisableICRUpdate] = useState(false); // disable_icr_update
  const [permDisableMSSRUpdate, setPermDisableMSSRUpdate] = useState(false); // disable_mssr_update
  const [permDisableBSRMUpdate, setPermDisableBSRMUpdate] = useState(false); // disable_bsrm_update
  const [permDisableCollateralBidding, setPermDisableCollateralBidding] =
    useState(false); // disable_collateral_bidding

  // Initializing flags
  const [flagWhiteList, setFlagWhiteList] = useState(false); // white_list
  const [flagTransferRestricted, setFlagTransferRestricted] = useState(false); // transfer_restricted
  const [flagDisableConfidential, setFlagDisableConfidential] = useState(false); // disable_confidential
  const [flagChargeMarketFee, setFlagChargeMarketFee] = useState(false); // charge_market_fee
  const [flagOverrideAuthority, setFlagOverrideAuthority] = useState(false); // override_authority
  const [whitelistAuthorities, setWhitelistAuthorities] = useState([]); // whitelist_authorities
  const [blacklistAuthorities, setBlacklistAuthorities] = useState([]); // blacklist_authorities

  // smartcoin options
  const [flagDisableForceSettle, setFlagDisableForceSettle] = useState(false); // disable_force_settle
  const [flagWitnessFedAsset, setFlagWitnessFedAsset] = useState(false); // witness_fed_asset
  const [flagCommitteeFedAsset, setFlagCommitteeFedAsset] = useState(false); // committee_fed_asset

  // Disable-bit based smartcoin options
  // static flags
  const [flagLockMaxSupply, setFlagLockMaxSupply] = useState(false); // lock_max_supply
  const [flagDisableNewSupply, setFlagDisableNewSupply] = useState(false); // disable_new_supply
  const [flagDisableCollateralBidding, setFlagDisableCollateralBidding] =
    useState(false); // disable_collateral_bidding

  // Disable-bit stablecoin option extension values
  const [mcr, setMcr] = useState(0); // maintenance_collateral_ratio
  const [icr, setIcr] = useState(0); // initial_collateral_ratio
  const [mssr, setMssr] = useState(0); // maximum_short_squeeze_ratio
  const [bsrmStrategy, setBsrmStrategy] = useState("0"); // black_swan_response_method

  // Extensions
  const [enabledReferrerReward, setEnabledReferrerReward] = useState(false); // reward_percent
  const [enabledFeeSharingWhitelist, setEnabledFeeSharingWhitelist] =
    useState(false); // whitelist_market_fee_sharing
  const [enabledTakerFee, setEnabledTakerFee] = useState(false); // taker_fee_percent

  const [referrerReward, setReferrerReward] = useState(0); // reward_percent
  const [feeSharingWhitelist, setFeeSharingWhitelist] = useState([]); // whitelist_market_fee_sharing
  const [takerFee, setTakerFee] = useState(0); // taker_fee_percent

  // Permission -> flag cascades (enable-bit, disable-bit, and mutual exclusions)
  usePermissionFlagCascade(
    [
      // Enable-bit cascades
      { perm: permWhiteList, setFlag: setFlagWhiteList },
      { perm: permTransferRestricted, setFlag: setFlagTransferRestricted },
      { perm: permDisableConfidential, setFlag: setFlagDisableConfidential },
      { perm: permChargeMarketFee, setFlag: setFlagChargeMarketFee },
      { perm: permOverrideAuthority, setFlag: setFlagOverrideAuthority },
      { perm: permWitnessFedAsset, setFlag: setFlagWitnessFedAsset },
      { perm: permCommitteeFedAsset, setFlag: setFlagCommitteeFedAsset },
      // Disable-bit cascades (inverted: perm ON -> flag OFF)
      { perm: permLockMaxSupply, setFlag: setFlagLockMaxSupply, isDisableBit: true },
      { perm: permDisableNewSupply, setFlag: setFlagDisableNewSupply, isDisableBit: true },
      { perm: permDisableCollateralBidding, setFlag: setFlagDisableCollateralBidding, isDisableBit: true },
    ],
    [
      // Mutual exclusions
      { flagA: flagWitnessFedAsset, setFlagB: setFlagCommitteeFedAsset },
      { flagA: flagCommitteeFedAsset, setFlagB: setFlagWitnessFedAsset },
    ]
  );

  const [showDialog, setShowDialog] = useState(false);

  const issuer_permissions = useMemo(() => {
    return getPermissions(
      {
        // enable-bits
        white_list: permWhiteList,
        transfer_restricted: permTransferRestricted,
        disable_confidential: permDisableConfidential,
        charge_market_fee: permChargeMarketFee,
        override_authority: permOverrideAuthority,
        witness_fed_asset: permWitnessFedAsset,
        committee_fed_asset: permCommitteeFedAsset,
        disable_force_settle: permDisableForceSettle,
        global_settle: permGlobalSettle,
        // disable-bits
        lock_max_supply: permLockMaxSupply,
        disable_new_supply: permDisableNewSupply,
        disable_mcr_update: permDisableMCRUpdate,
        disable_icr_update: permDisableICRUpdate,
        disable_mssr_update: permDisableMSSRUpdate,
        disable_bsrm_update: permDisableBSRMUpdate,
        disable_collateral_bidding: permDisableCollateralBidding,
      },
      true
    );
  }, [
    // enable-bits
    permWhiteList,
    permTransferRestricted,
    permDisableConfidential,
    permChargeMarketFee,
    permOverrideAuthority,
    permWitnessFedAsset,
    permCommitteeFedAsset,
    permDisableForceSettle,
    permGlobalSettle,
    // disable-bits
    permLockMaxSupply,
    permDisableNewSupply,
    permDisableMCRUpdate,
    permDisableICRUpdate,
    permDisableMSSRUpdate,
    permDisableBSRMUpdate,
    permDisableCollateralBidding,
  ]);

  const flags = useMemo(() => {
    return getFlags({
      // enable-bit feature flags
      white_list: flagWhiteList,
      transfer_restricted: flagTransferRestricted,
      disable_confidential: flagDisableConfidential,
      charge_market_fee: flagChargeMarketFee,
      override_authority: flagOverrideAuthority,
      witness_fed_asset: flagWitnessFedAsset,
      committee_fed_asset: flagCommitteeFedAsset,
      disable_force_settle: flagDisableForceSettle,
      // disable-bit feature flags
      lock_max_supply: flagLockMaxSupply,
      disable_new_supply: flagDisableNewSupply,
      disable_collateral_bidding: flagDisableCollateralBidding,
      // No further disable-bit flags - no flag effect
    });
  }, [
    // Enable-bit flags
    flagWhiteList,
    flagTransferRestricted,
    flagDisableConfidential,
    flagChargeMarketFee,
    flagOverrideAuthority,
    flagWitnessFedAsset,
    flagCommitteeFedAsset,
    flagDisableForceSettle,
    // Disable-bit flags
    flagLockMaxSupply,
    flagDisableNewSupply,
    flagDisableCollateralBidding,
  ]);

  const [market, setMarket] = useState("BTS"); // preferred market
  const [commission, setCommission] = useState(0); // market_fee_percent
  const [maxCommission, setMaxCommission] = useState(0); // max_market_fee
  const [cerBaseAmount, setCerBaseAmount] = useState(1);
  const [cerQuoteAmount, setCerQuoteAmount] = useState(1);

  // NFT info
  const [enabledNFT, setEnabledNFT] = useState(false);
  // Market fee extensions (optional card)
  const [enabledMarketFees, setEnabledMarketFees] = useState(false);
  const [acknowledgements, setAcknowledgements] = useState("");
  const [artist, setArtist] = useState("");
  const [attestation, setAttestation] = useState("");
  const [holderLicense, setHolderLicense] = useState("");
  const [license, setLicense] = useState("");
  const [narrative, setNarrative] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [type, setType] = useState("NFT/ART/VISUAL");

  const [nftMedia, setNFTMedia] = useState([]);
  const [newMediaType, setNewMediaType] = useState("");
  const [newMediaUrl, setNewMediaUrl] = useState("");

  // BSIP48 extensions to asset_update
  const [optedSkipCER, setOptedSkipCER] = useState(false); // skip_core_exchange_rate
  const [hasUpdatedPrecision, setHasUpdatedPrecision] = useState(false); // asset_update extension if supply == 0
  const [updatedPrecision, setUpdatedPrecision] = useState(); // new_precision

  // Bitasset options
  const [feedLifetimeSeconds, setFeedLifetimeSeconds] = useState(100000);
  const [minimumFeeds, setMinimumFeeds] = useState(1);
  const [forceSettlementDelaySeconds, setForceSettlementDelaySeconds] =
    useState(60);
  const [forceSettlementOffsetPercent, setForceSettlementOffsetPercent] =
    useState(0);
  const [maximumForceSettlementVolume, setMaximumForceSettlementVolume] =
    useState(5);

  const [backingAsset, setBackingAsset] = useState("1.3.0");
  const backingAssetData = useMemo(() => {
    if (assets && backingAsset) {
      return assets.find((asset) => asset.symbol === backingAsset);
    }
    return null;
  }, [assets, backingAsset]);

  // Bitasset option extensions - configurable
  const [mcfrExtensionEnabled, setMcfrExtensionEnabled] = useState(false); // margin_call_fee_ratio
  const [fsfExtensionEnabled, setFsfExtensionEnabled] = useState(false);
  const [marginCallFeeRatio, setMarginCallFeeRatio] = useState(0);
  const [forceSettleFeePercent, setForceSettleFeePercent] = useState(0);

  const description = useDescriptionSerializer({
    desc,
    shortName,
    market,
    enabledNFT,
    nftFields: {
      acknowledgements,
      artist,
      attestation,
      holderLicense,
      license,
      narrative,
      title,
      tags,
      type,
    },
    nftMedia,
  });

  const [editing, setEditing] = useState(false); // editing mode
  const [hasEditedAssetOptions, setHasEditedAssetOptions] = useState(false); // asset options edited
  const [hasEditedBitassetOptions, setHasEditedBitassetOptions] =
    useState(false); // bitasset options edited

  const [existingAssetData, setExistingAssetData] = useState(); // existing asset data
  const [dynamicData, setDynamicData] = useState(); // existing dynamic data

  const existingSupply = useMemo(() => {
    if (!existingAssetData || !dynamicData) {
      return 0;
    }
    const _current_supply = humanReadableFloat(
      dynamicData.current_supply,
      existingAssetData.precision
    );
    const _confidential_supply = humanReadableFloat(
      dynamicData.confidential_supply,
      existingAssetData.precision
    );
    return _current_supply + _confidential_supply;
  }, [existingAssetData, dynamicData]);

  useEffect(() => {
    async function fetching() {
      const _store = createObjectStore([
        _chain,
        JSON.stringify([
          existingAssetData.bitasset_data_id,
          existingAssetData.dynamic_asset_data_id,
        ]),
        currentNodeUrl || null,
      ]);

      _store.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          if (!data.length) {
            return;
          }
          let _bitassetData = data[0];
          let _dynamicData = data[1];
          if (!_bitassetData || !_dynamicData) {
            return;
          }
          //console.log({ _bitassetData, _dynamicData, existingAssetData });
          setDynamicData(_dynamicData);

          if (
            _bitassetData.options.extensions.hasOwnProperty(
              "force_settle_fee_percent"
            )
          ) {
            setFsfExtensionEnabled(true);
            setForceSettleFeePercent(
              _bitassetData.options.extensions.force_settle_fee_percent / 100
            );
          }

          if (
            _bitassetData.options.extensions.hasOwnProperty(
              "margin_call_fee_ratio"
            )
          ) {
            setMcfrExtensionEnabled(true);
            setMarginCallFeeRatio(
              _bitassetData.options.extensions.margin_call_fee_ratio / 100
            );
          }

          if (
            _bitassetData.options.extensions.hasOwnProperty(
              "initial_collateral_ratio"
            )
          ) {
            setIcr(
              _bitassetData.options.extensions.initial_collateral_ratio / 100
            );
          }

          if (
            _bitassetData.options.extensions.hasOwnProperty(
              "maintenance_collateral_ratio"
            )
          ) {
            setMcr(
              _bitassetData.options.extensions.maintenance_collateral_ratio /
                100
            );
          }

          if (
            _bitassetData.options.extensions.hasOwnProperty(
              "maximum_short_squeeze_ratio"
            )
          ) {
            setMssr(
              _bitassetData.options.extensions.maximum_short_squeeze_ratio / 100
            );
          }

          if (
            _bitassetData.options.extensions.hasOwnProperty(
              "black_swan_response_method"
            )
          ) {
            setBsrmStrategy(
              _bitassetData.options.extensions.black_swan_response_method.toString()
            );
          }

          setFeedLifetimeSeconds(_bitassetData.options.feed_lifetime_sec);
          setMinimumFeeds(_bitassetData.options.minimum_feeds);
          setForceSettlementDelaySeconds(
            _bitassetData.options.force_settlement_delay_sec
          );
          setForceSettlementOffsetPercent(
            _bitassetData.options.force_settlement_offset_percent / 100
          );
          setMaximumForceSettlementVolume(
            _bitassetData.options.maximum_force_settlement_volume
          );
          setBackingAsset(_bitassetData.options.short_backing_asset);
        }
      });
    }

    if (existingAssetData) {
      fetching();
    }
  }, [existingAssetData]);

  const trx = useMemo(() => {
    let bitassetExtensions = {};
    // enable-bits
    if (mcfrExtensionEnabled && marginCallFeeRatio > 0) {
      bitassetExtensions["margin_call_fee_ratio"] = marginCallFeeRatio * 100;
    }
    if (fsfExtensionEnabled && forceSettleFeePercent > 0) {
      bitassetExtensions["force_settle_fee_percent"] =
        forceSettleFeePercent * 100;
    }

    // disable-bits
    if (!permDisableICRUpdate && icr > 0) {
      bitassetExtensions["initial_collateral_ratio"] = icr * 100;
    }
    if (!permDisableMCRUpdate && mcr > 0) {
      bitassetExtensions["maintenance_collateral_ratio"] = mcr * 100;
    }
    if (!permDisableMSSRUpdate && mssr > 0) {
      bitassetExtensions["maximum_short_squeeze_ratio"] = mssr * 100;
    }
    if (!permDisableBSRMUpdate) {
      bitassetExtensions["black_swan_response_method"] = parseInt(bsrmStrategy);
    }

    let assetExtensions = {};
    if (enabledReferrerReward && referrerReward > 0) {
      assetExtensions.reward_percent = referrerReward * 100;
    }
    if (
      enabledFeeSharingWhitelist &&
      feeSharingWhitelist &&
      feeSharingWhitelist.length
    ) {
      assetExtensions.whitelist_market_fee_sharing = feeSharingWhitelist.map(
        (x) => x.id
      );
    }
    if (enabledTakerFee && takerFee > 0) {
      assetExtensions.taker_fee_percent = takerFee * 100;
    }

    let assetOptions = {
      // user configured
      description,
      max_supply: blockchainFloat(maxSupply, precision),
      market_fee_percent: commission ? commission * 100 : 0,
      max_market_fee: blockchainFloat(maxCommission, precision),
      issuer_permissions,
      flags,
      // static
      core_exchange_rate: {
        base: {
          amount: blockchainFloat(cerBaseAmount, 5),
          asset_id: "1.3.0",
        },
        quote: {
          amount: blockchainFloat(cerQuoteAmount, precision),
          asset_id: existingAssetData ? existingAssetData.id : "1.3.1",
        },
      },
      whitelist_authorities:
        flagWhiteList && whitelistAuthorities && whitelistAuthorities.length
          ? whitelistAuthorities.map((x) => x.id)
          : [],
      blacklist_authorities:
        flagWhiteList && blacklistAuthorities && blacklistAuthorities.length
          ? blacklistAuthorities.map((x) => x.id)
          : [],
      whitelist_markets: allowedMarkets
        .map((x) => {
          const asset = assets.find((y) => y.id === x);
          return asset ? asset.id : null;
        })
        .filter((x) => x),
      blacklist_markets: bannedMarkets
        .map((x) => {
          const asset = assets.find((y) => y.id === x);
          return asset ? asset.id : null;
        })
        .filter((x) => x),
      extensions: assetExtensions,
    };

    if (!editing) {
      // asset_create operation only
      let operation = {
        issuer: usr.id,
        symbol: symbol,
        precision: precision,
        common_options: assetOptions,
        bitasset_opts: {
          feed_lifetime_sec: feedLifetimeSeconds,
          minimum_feeds: minimumFeeds,
          force_settlement_delay_sec: forceSettlementDelaySeconds,
          force_settlement_offset_percent: forceSettlementOffsetPercent * 100,
          maximum_force_settlement_volume: maximumForceSettlementVolume,
          short_backing_asset: backingAssetData ? backingAssetData.id : "1.3.0",
          extensions: bitassetExtensions,
        },
        is_prediction_market: false,
        extensions: {},
      };

      return [operation];
    }

    let updateOperations = [];
    if (hasEditedAssetOptions) {
      // User has edited the asset options

      let updateExtensions = {};
      if (editing && optedSkipCER) {
        // update extension
        updateExtensions.skip_core_exchange_rate = true;
      }
      if (editing && hasUpdatedPrecision) {
        // update extension
        updateExtensions.new_precision = updatedPrecision;
      }

      let operation = {
        issuer: usr.id,
        asset_to_update: existingAssetData.id,
        new_options: assetOptions, // asset options
        extensions: updateExtensions,
      };

      updateOperations.push(operation);
    }

    if (hasEditedBitassetOptions) {
      // User has edited the smartcoin options
      let operation = {
        issuer: usr.id,
        asset_to_update: existingAssetData.id,
        new_options: {
          // bitasset options
          feed_lifetime_sec: feedLifetimeSeconds,
          minimum_feeds: minimumFeeds,
          force_settlement_delay_sec: forceSettlementDelaySeconds,
          force_settlement_offset_percent: forceSettlementOffsetPercent * 100,
          maximum_force_settlement_volume: maximumForceSettlementVolume,
          short_backing_asset: backingAssetData ? backingAssetData.id : "1.3.0",
          extensions: bitassetExtensions,
        },
        extensions: {},
      };

      updateOperations.push(operation);
    }

    return updateOperations;
  }, [
    // Static References
    usr,
    assets,
    existingAssetData,
    backingAssetData,
    editing,
    hasEditedAssetOptions,
    hasEditedBitassetOptions,
    // Asset Settings
    symbol,
    precision,
    description,
    maxSupply,
    issuer_permissions,
    flags,
    // Market Settings
    commission,
    maxCommission,
    flagWhiteList,
    whitelistAuthorities,
    blacklistAuthorities,
    allowedMarkets,
    bannedMarkets,
    cerBaseAmount,
    cerQuoteAmount,
    // Asset Extensions
    enabledReferrerReward,
    enabledFeeSharingWhitelist,
    enabledTakerFee,
    referrerReward,
    feeSharingWhitelist,
    takerFee,
    // Smartcoin settings
    feedLifetimeSeconds,
    minimumFeeds,
    forceSettlementDelaySeconds,
    forceSettlementOffsetPercent,
    maximumForceSettlementVolume,
    // Smartcoin extensions
    mcr,
    icr,
    mssr,
    bsrmStrategy,
  ]);

  const operationNames = useMemo(() => {
    if (!editing) {
      return ["asset_create"];
    }

    let names = [];
    if (hasEditedAssetOptions) {
      names.push("asset_update");
    }
    if (hasEditedBitassetOptions) {
      names.push("asset_update_bitasset");
    }

    return names;
  }, [trx, editing, hasEditedAssetOptions, hasEditedBitassetOptions]);

  const { debouncedPercent, debouncedMax } = useDebouncedFormInputs({
    commission,
    maxSupply,
  });

  const [
    whitelistMarketFeeSharingDialogOpen,
    setWhitelistMarketFeeSharingDialogOpen,
  ] = useState(false);
  const [whitelistAuthorityDialogOpen, setWhitelistAuthorityDialogOpen] =
    useState(false);
  const [blacklistAuthorityDialogOpen, setBlacklistAuthorityDialogOpen] =
    useState(false);

  // Enable bits
  const [permanentlyDisabledCMF, setPermanentlyDisabledCMF] = useState(false); // charge_market_fee
  const [permanentlyDisabledWL, setPermanentlyDisabledWL] = useState(false); // white_list
  const [permanentlyDisabledTR, setPermanentlyDisabledTR] = useState(false); // transfer_restricted
  const [permanentlyDisabledDC, setPermanentlyDisabledDC] = useState(false); // disable_confidential
  const [permanentlyDisabledOA, setPermanentlyDisabledOA] = useState(false); // override_authority
  const [permanentlyDisabledWFA, setPermanentlyDisabledWFA] = useState(false); // witness_fed_asset
  const [permanentlyDisabledCFA, setPermanentlyDisabledCFA] = useState(false); // committee_fed_asset
  const [permanentlyDisabledDFS, setPermanentlyDisabledDFS] = useState(false); // disable_force_settle
  const [permanentlyDisabledGS, setPermanentlyDisabledGS] = useState(false); // global_settle

  // Disable bits
  const [permanentlyDisabledLMS, setPermanentlyDisabledLMS] = useState(false); // lock_max_supply
  const [permanentlyDisabledDNS, setPermanentlyDisabledDNS] = useState(false); // disable_new_supply
  const [permanentlyDisabledDMCR, setPermanentlyDisabledDMCR] = useState(false); // disable_mcr_update
  const [permanentlyDisabledDICR, setPermanentlyDisabledDICR] = useState(false); // disable_icr_update
  const [permanentlyDisabledDMSSR, setPermanentlyDisabledDMSSR] =
    useState(false); // disable_mssr_update
  const [permanentlyDisabledDBSRM, setPermanentlyDisabledDBSRM] =
    useState(false); // disable_bsrm_update
  const [permanentlyDisabledDCB, setPermanentlyDisabledDCB] = useState(false); // disable_collateral_bidding

  // Fetching asset data
  useEffect(() => {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());

    async function fetching() {
      const _store = createObjectStore([
        _chain,
        JSON.stringify([params.id]),
        currentNodeUrl || null,
      ]);

      _store.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const propsAsset = data && data.length ? data[0] : null;
          if (!propsAsset || (propsAsset && !propsAsset.bitasset_data_id)) {
            console.log("Not a valid smartcoin asset!");
            return;
          }
          setEditing(true);
          setExistingAssetData(propsAsset);

          setSymbol(propsAsset.symbol);
          setPrecision(propsAsset.precision);
          setMaxSupply(
            humanReadableFloat(
              propsAsset.options.max_supply,
              propsAsset.precision
            )
          );

          const desc = propsAsset.options.description;
          let parsedJSON;
          if (desc && desc.length) {
            let _desc;
            try {
              _desc = JSON.parse(desc);
            } catch (e) {
              console.log({ e, id: propsAsset.id, desc });
            }
            if (_desc && _desc.hasOwnProperty("main")) {
              parsedJSON = _desc;
            }
          }

          if (parsedJSON && parsedJSON.hasOwnProperty("nft_object")) {
            const nft_object = parsedJSON.nft_object;

            if (nft_object) {
              setAcknowledgements(nft_object.acknowledgements);
              setArtist(nft_object.artist);
              setAttestation(nft_object.attestation);
              setHolderLicense(nft_object.holder_license);
              setLicense(nft_object.license);
              setNarrative(nft_object.narrative);
              setTitle(nft_object.title);
              setTags(nft_object.tags);
              setType(nft_object.type);

              setEnabledNFT(true);

              setNFTMedia(getImages(nft_object));
            }
          }

          setShortName(
            parsedJSON && parsedJSON.short_name ? parsedJSON.short_name : ""
          );
          setDesc(parsedJSON && parsedJSON.main ? parsedJSON.main : "");
          setMarket(parsedJSON && parsedJSON.market ? parsedJSON.market : "");
          setCommission(propsAsset.options.market_fee_percent / 100);
          setMaxCommission(
            humanReadableFloat(
              propsAsset.options.max_market_fee,
              propsAsset.precision
            )
          );

          setAllowedMarketsEnabled(
            propsAsset.options.whitelist_markets.length > 0
          );
          setBannedMarketsEnabled(
            propsAsset.options.blacklist_markets.length > 0
          );
          setAllowedMarkets(propsAsset.options.whitelist_markets);
          setBannedMarkets(propsAsset.options.blacklist_markets);
          setWhitelistAuthorities(
            propsAsset.options.whitelist_authorities.map((x) => {
              return {
                id: x,
                name: "",
              };
            })
          );
          setBlacklistAuthorities(
            propsAsset.options.blacklist_authorities.map((x) => {
              return {
                id: x,
                name: "",
              };
            })
          );

          const _flags = getFlagBooleans(propsAsset.options.flags);
          const _issuer_permissions = getFlagBooleans(
            propsAsset.options.issuer_permissions
          );

          // Enable-bit permissions
          if (_issuer_permissions.hasOwnProperty("charge_market_fee")) {
            setPermChargeMarketFee(true);
          } else {
            setPermChargeMarketFee(false);
            setPermanentlyDisabledCMF(true);
          }
          if (_issuer_permissions.hasOwnProperty("disable_confidential")) {
            setPermDisableConfidential(true);
          } else {
            setPermDisableConfidential(false);
            setPermanentlyDisabledDC(true);
          }
          if (_issuer_permissions.hasOwnProperty("override_authority")) {
            setPermOverrideAuthority(true);
          } else {
            setPermOverrideAuthority(false);
            setPermanentlyDisabledOA(true);
          }
          if (_issuer_permissions.hasOwnProperty("transfer_restricted")) {
            setPermTransferRestricted(true);
          } else {
            setPermTransferRestricted(false);
            setPermanentlyDisabledTR(true);
          }
          if (_issuer_permissions.hasOwnProperty("white_list")) {
            setPermWhiteList(true);
          } else {
            setPermWhiteList(false);
            setPermanentlyDisabledWL(true);
          }
          if (_issuer_permissions.hasOwnProperty("witness_fed_asset")) {
            setPermWitnessFedAsset(true);
          } else {
            setPermWitnessFedAsset(false);
            setPermanentlyDisabledWFA(true);
          }
          if (_issuer_permissions.hasOwnProperty("committee_fed_asset")) {
            setPermCommitteeFedAsset(true);
          } else {
            setPermCommitteeFedAsset(false);
            setPermanentlyDisabledCFA(true);
          }
          if (_issuer_permissions.hasOwnProperty("disable_force_settle")) {
            setPermDisableForceSettle(true);
          } else {
            setPermDisableForceSettle(false);
            setPermanentlyDisabledDFS(true);
          }
          if (_issuer_permissions.hasOwnProperty("global_settle")) {
            setPermGlobalSettle(true);
          } else {
            setPermGlobalSettle(false);
            setPermanentlyDisabledGS(true);
          }
          // End of enable-bit permissions

          // Disable-bit permissions
          if (_issuer_permissions.hasOwnProperty("lock_max_supply")) {
            setPermLockMaxSupply(true);
            setPermanentlyDisabledLMS(true);
          } else {
            setPermLockMaxSupply(false);
          }
          if (_issuer_permissions.hasOwnProperty("disable_new_supply")) {
            setPermDisableNewSupply(true);
            setPermanentlyDisabledDNS(true);
          } else {
            setPermDisableNewSupply(false);
          }
          if (_issuer_permissions.hasOwnProperty("disable_mcr_update")) {
            setPermDisableMCRUpdate(true);
            setPermanentlyDisabledDMCR(true);
          } else {
            setPermDisableMCRUpdate(false);
          }
          if (_issuer_permissions.hasOwnProperty("disable_icr_update")) {
            setPermDisableICRUpdate(true);
            setPermanentlyDisabledDICR(true);
          } else {
            setPermDisableICRUpdate(false);
          }
          if (_issuer_permissions.hasOwnProperty("disable_mssr_update")) {
            setPermDisableMSSRUpdate(true);
            setPermanentlyDisabledDMSSR(true);
          } else {
            setPermDisableMSSRUpdate(false);
          }
          if (_issuer_permissions.hasOwnProperty("disable_bsrm_update")) {
            setPermDisableBSRMUpdate(true);
            setPermanentlyDisabledDBSRM(true);
          } else {
            setPermDisableBSRMUpdate(false);
          }
          if (
            _issuer_permissions.hasOwnProperty("disable_collateral_bidding")
          ) {
            setPermDisableCollateralBidding(true);
            setPermanentlyDisabledDCB(true);
          } else {
            setPermDisableCollateralBidding(false);
          }
          // End of disable-bit permissions

          // Enable-bit feature flags
          if (_flags.hasOwnProperty("charge_market_fee")) {
            setFlagChargeMarketFee(true);
          }
          if (_flags.hasOwnProperty("disable_confidential")) {
            setFlagDisableConfidential(true);
          }
          if (_flags.hasOwnProperty("override_authority")) {
            setFlagOverrideAuthority(true);
          }
          if (_flags.hasOwnProperty("transfer_restricted")) {
            setFlagTransferRestricted(true);
          }
          if (_flags.hasOwnProperty("white_list")) {
            setFlagWhiteList(true);
          }
          if (_flags.hasOwnProperty("witness_fed_asset")) {
            setFlagWitnessFedAsset(true);
          }
          if (_flags.hasOwnProperty("committee_fed_asset")) {
            setFlagCommitteeFedAsset(true);
          }
          if (_flags.hasOwnProperty("disable_force_settle")) {
            setFlagDisableForceSettle(true);
          }
          // End of Enable-bit flags

          // Disable-bit feature flags
          if (_flags.hasOwnProperty("lock_max_supply")) {
            setFlagLockMaxSupply(true);
          }
          if (_flags.hasOwnProperty("disable_new_supply")) {
            setFlagDisableNewSupply(true);
          }
          if (_flags.hasOwnProperty("disable_collateral_bidding")) {
            setFlagDisableCollateralBidding(true);
          }
          // End of Disable-bit flags

          const _existingAssetExtensions = propsAsset.options.extensions;
          if (_existingAssetExtensions.hasOwnProperty("reward_percent")) {
            setEnabledReferrerReward(true);
            setReferrerReward(_existingAssetExtensions.reward_percent / 100);
          }

          if (
            _existingAssetExtensions.hasOwnProperty(
              "whitelist_market_fee_sharing"
            )
          ) {
            setEnabledFeeSharingWhitelist(true);
            setFeeSharingWhitelist(
              _existingAssetExtensions.whitelist_market_fee_sharing
            );
          }

          if (_existingAssetExtensions.hasOwnProperty("taker_fee_percent")) {
            setEnabledTakerFee(true);
            setTakerFee(_existingAssetExtensions.taker_fee_percent / 100);
          }

          // Detect if market fee extensions should be enabled based on existing flags/markets
          if (
            _flags.charge_market_fee ||
            _flags.white_list ||
            (propsAsset.options.whitelist_markets && propsAsset.options.whitelist_markets.length > 0) ||
            (propsAsset.options.blacklist_markets && propsAsset.options.blacklist_markets.length > 0)
          ) {
            setEnabledMarketFees(true);
          }

          if (
            _existingAssetExtensions.hasOwnProperty("skip_core_exchange_rate")
          ) {
            setOptedSkipCER(true);
          }

          setCerBaseAmount(
            humanReadableFloat(
              propsAsset.options.core_exchange_rate.base.amount,
              5
            )
          );
          setCerQuoteAmount(
            humanReadableFloat(
              propsAsset.options.core_exchange_rate.quote.amount,
              propsAsset.precision
            )
          );
        }
      });
    }

    if (params.id && params.id.startsWith("1.3.")) {
      fetching(params.id);
    }
  }, []);

  return (
    <>
      <div className="min-h-screen pb-16">
        <div className="container mx-auto max-w-4xl px-4 pt-6 sm:pt-8">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl px-6 py-5 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-warning)/0.7)] to-transparent" />
            <span aria-hidden="true" className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-warning)/0.15)] blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-1)/0.12)] blur-3xl" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-warning)/0.30)] to-[hsl(var(--accent-1)/0.30)] border border-[hsl(var(--accent-warning)/0.40)] text-[hsl(var(--accent-warning-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-warning)/0.4)]">
                <Gem className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {t(
                    !editing
                      ? "CreateSmartcoin:card.title_create"
                      : "CreateSmartcoin:card.title_edit"
                  )}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("CreateSmartcoin:card.description")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-4xl space-y-6 px-4 py-6">
          <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
            <SectionHeader
              icon={Hash}
              title={t("AssetCommon:asset_details.title")}
              description={t("AssetCommon:asset_details.title_content")}
              step={1}
            />
            <CardContent className="p-6 sm:p-8">
              <div className="space-y-8">
              {editing && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <HoverInfo
                        content={t("AssetCommon:asset_details.title_content")}
                        header={t("AssetCommon:asset_details.title")}
                        type="header"
                      />
                      <div className="text-right">
                        {!hasEditedAssetOptions ? (
                          <Button
                            variant="outline"
                            onClick={() => setHasEditedAssetOptions(true)}
                            className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-background rounded-md group-hover:bg-opacity-0"
                          >
                            {t("CreateSmartcoin:editAsset.disabled")}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setHasEditedAssetOptions(false)}
                          >
                            {t("CreateSmartcoin:editAsset.enabled")}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {!editing || (editing && hasEditedAssetOptions) ? (
                    <span className="block space-y-8">
                      <div className={`grid grid-cols-1 md:grid-cols-3 gap-6`}>
                        <div className="space-y-2">
                          <HoverInfo
                            content={t(
                              "AssetCommon:asset_details.symbol.header_content"
                            )}
                            header={t(
                              "AssetCommon:asset_details.symbol.header"
                            )}
                          />
                          {!editing ? (
                            <Input
                              placeholder={t(
                                "AssetCommon:asset_details.symbol.placeholder"
                              )}
                              value={symbol}
                              type="text"
                              onInput={(e) => {
                                const value = e.currentTarget.value;
                                const regex = /^[a-zA-Z0-9]*\.?[a-zA-Z0-9]*$/;
                                if (regex.test(value)) {
                                  setSymbol(value.toUpperCase());
                                }
                              }}
                              maxLength={16}
                              className="mt-1"
                            />
                          ) : (
                            <Input
                              placeholder={symbol}
                              type="text"
                              disabled
                              className="mt-1"
                            />
                          )}
                        </div>

                        <div className="space-y-2">
                          <HoverInfo
                            content={t(
                              "AssetCommon:asset_details.max_supply.header_content"
                            )}
                            header={t(
                              "AssetCommon:asset_details.max_supply.header"
                            )}
                          />
                          {!permLockMaxSupply && !flagLockMaxSupply ? (
                            <Input
                              placeholder={t(
                                "AssetCommon:asset_details.max_supply.placeholder"
                              )}
                              value={maxSupply}
                              type="number"
                              onInput={(e) => {
                                const input = parseInt(e.currentTarget.value);
                                if (input >= 0) {
                                  setMaxSupply(parseInt(e.currentTarget.value));
                                } else {
                                  setMaxSupply(0);
                                }
                              }}
                              className="mt-1"
                            />
                          ) : (
                            <Input
                              placeholder={maxSupply}
                              type="number"
                              disabled
                              className="mt-1"
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          <HoverInfo
                            content={t(
                              "AssetCommon:asset_details.precision.header_content"
                            )}
                            header={t(
                              "AssetCommon:asset_details.precision.header"
                            )}
                          />
                          {!editing ? (
                            <Input
                              placeholder={t(
                                "AssetCommon:asset_details.precision.placeholder"
                              )}
                              value={precision}
                              type="number"
                              onInput={(e) => {
                                const input = parseInt(e.currentTarget.value);
                                if (input >= 0 && input <= 8) {
                                  setPrecision(parseInt(e.currentTarget.value));
                                } else if (input < 0) {
                                  setPrecision(0);
                                } else {
                                  setPrecision(8);
                                }
                              }}
                              className="mt-1"
                            />
                          ) : null}
                          {editing && existingSupply > 0 ? (
                            <Input
                              placeholder={precision}
                              type="number"
                              disabled
                              className="mt-1"
                            />
                          ) : null}
                          {editing && existingSupply === 0 ? (
                            <Input
                              placeholder={t(
                                "AssetCommon:asset_details.precision.placeholder"
                              )}
                              value={precision}
                              type="number"
                              onInput={(e) => {
                                const input = parseInt(e.currentTarget.value);
                                if (input >= 0 && input <= 8) {
                                  setUpdatedPrecision(
                                    parseInt(e.currentTarget.value)
                                  );
                                } else if (input < 0) {
                                  setUpdatedPrecision(0);
                                } else {
                                  setUpdatedPrecision(8);
                                }
                                setHasUpdatedPrecision(true);
                              }}
                              className="mt-1"
                            />
                          ) : null}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <HoverInfo
                          content={t(
                            "AssetCommon:asset_details.description.header_content"
                          )}
                          header={t(
                            "AssetCommon:asset_details.description.header"
                          )}
                        />
                        <Textarea
                          placeholder={t(
                            "AssetCommon:asset_details.description.placeholder"
                          )}
                          value={desc}
                          onInput={(e) => {
                            setDesc(e.currentTarget.value);
                          }}
                          className="min-h-28"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <HoverInfo
                            content={t(
                              "AssetCommon:asset_details.shortName.header_content"
                            )}
                            header={t(
                              "AssetCommon:asset_details.shortName.header"
                            )}
                          />
                          {!editing ? (
                            <Input
                              placeholder={t(
                                "AssetCommon:asset_details.shortName.placeholder"
                              )}
                              value={shortName}
                              type="text"
                              onInput={(e) =>
                                setShortName(e.currentTarget.value)
                              }
                              className="mt-1"
                            />
                          ) : (
                            <Input
                              placeholder={shortName}
                              type="text"
                              disabled
                              className="mt-1"
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          <HoverInfo
                            content={t(
                              "AssetCommon:asset_details.preferredMarket.header_content"
                            )}
                            header={t(
                              "AssetCommon:asset_details.preferredMarket.header"
                            )}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <Input placeholder={market} disabled type="text" />
                            <AssetDropDown
                              assetSymbol={""}
                              assetData={null}
                              storeCallback={setMarket}
                              otherAsset={null}
                              marketSearch={marketSearch}
                              type={"backing"}
                              chain={usr && usr.chain ? usr.chain : "bitshares"}
                              balances={balances}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <HoverInfo
                            content={t(
                              "AssetCommon:cer.quote_asset_amount.header_content"
                            )}
                            header={t(
                              "AssetCommon:cer.quote_asset_amount.header"
                            )}
                          />
                          {!optedSkipCER ? (
                            <Input
                              placeholder={0}
                              value={cerQuoteAmount}
                              type="number"
                              min="0"
                              onInput={(e) => {
                                setCerQuoteAmount(e.currentTarget.value);
                              }}
                              className="mt-1"
                            />
                          ) : (
                            <Input
                              placeholder={cerQuoteAmount}
                              type="number"
                              disabled
                              className="mt-1"
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          <HoverInfo
                            content={t(
                              "AssetCommon:cer.base_asset_amount.header_content",
                              {
                                symbol: "BTS",
                              }
                            )}
                            header={t(
                              "AssetCommon:cer.base_asset_amount.header"
                            )}
                          />
                          {!optedSkipCER ? (
                            <Input
                              placeholder={0}
                              value={cerBaseAmount}
                              type="number"
                              min="0"
                              onInput={(e) => {
                                setCerBaseAmount(e.currentTarget.value);
                              }}
                              className="mt-1"
                            />
                          ) : (
                            <Input
                              placeholder={cerBaseAmount}
                              type="number"
                              disabled
                              className="mt-1"
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          <HoverInfo
                            content={t(
                              "AssetCommon:cer.calculated_cer_price.header_content"
                            )}
                            header={t(
                              "AssetCommon:cer.calculated_cer_price.header"
                            )}
                          />
                          <Input
                            placeholder={`${
                              Number(cerBaseAmount) > 0 &&
                              isFinite(cerQuoteAmount / cerBaseAmount)
                                ? (cerQuoteAmount / cerBaseAmount).toFixed(precision)
                                : "—"
                            } ${
                              usr.chain === "bitshares" ? "BTS" : "TEST"
                            }`}
                            type="text"
                            className="mt-1"
                            disabled
                          />
                        </div>
                      </div>

                      {editing ? (
                        <div className="col-span-2 w-1/2">
                          <AssetFlag
                            alreadyDisabled={false}
                            id={"skipCER"}
                            allowedText={t(
                              "AssetCommon:extensions.skipCER.enabled"
                            )}
                            enabledInfo={t(
                              "AssetCommon:extensions.skipCER.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:extensions.skipCER.disabled"
                            )}
                            disabledInfo={t(
                              "AssetCommon:extensions.skipCER.disabledInfo"
                            )}
                            permission={true}
                            flag={optedSkipCER}
                            setFlag={setOptedSkipCER}
                          />
                        </div>
                      ) : null}

                      <PermissionsFlagsPanel
                        permissions={[
                          { id: "charge_market_fee", alreadyDisabled: existingSupply > 0 && permanentlyDisabledCMF, perm: permChargeMarketFee, setPerm: setPermChargeMarketFee, flag: flagChargeMarketFee, setFlag: setFlagChargeMarketFee },
                          { id: "white_list", alreadyDisabled: existingSupply > 0 && permanentlyDisabledWL, perm: permWhiteList, setPerm: setPermWhiteList, flag: flagWhiteList, setFlag: setFlagWhiteList },
                          { id: "transfer_restricted", alreadyDisabled: existingSupply > 0 && permanentlyDisabledTR, perm: permTransferRestricted, setPerm: setPermTransferRestricted, flag: flagTransferRestricted, setFlag: setFlagTransferRestricted },
                          { id: "disable_confidential", alreadyDisabled: existingSupply > 0 && permanentlyDisabledDC, perm: permDisableConfidential, setPerm: setPermDisableConfidential, flag: flagDisableConfidential, setFlag: setFlagDisableConfidential },
                          { id: "override_authority", alreadyDisabled: existingSupply > 0 && permanentlyDisabledOA, perm: permOverrideAuthority, setPerm: setPermOverrideAuthority, flag: flagOverrideAuthority, setFlag: setFlagOverrideAuthority },
                          { id: "disable_force_settle", alreadyDisabled: existingSupply > 0 && permanentlyDisabledDFS, perm: permDisableForceSettle, setPerm: setPermDisableForceSettle, flag: flagDisableForceSettle, setFlag: setFlagDisableForceSettle },
                          { id: "global_settle", alreadyDisabled: existingSupply > 0 && permanentlyDisabledGS, perm: permGlobalSettle, setPerm: setPermGlobalSettle, flag: null, setFlag: null },
                          { id: "witness_fed_asset", alreadyDisabled: existingSupply > 0 && permanentlyDisabledWFA, perm: permWitnessFedAsset, setPerm: setPermWitnessFedAsset, flag: flagWitnessFedAsset, setFlag: setFlagWitnessFedAsset },
                          { id: "committee_fed_asset", alreadyDisabled: existingSupply > 0 && permanentlyDisabledCFA, perm: permCommitteeFedAsset, setPerm: setPermCommitteeFedAsset, flag: flagCommitteeFedAsset, setFlag: setFlagCommitteeFedAsset },
                          { id: "lock_max_supply", alreadyDisabled: existingSupply > 0 && permanentlyDisabledLMS, perm: permLockMaxSupply, setPerm: setPermLockMaxSupply, flag: flagLockMaxSupply, setFlag: setFlagLockMaxSupply },
                          { id: "disable_new_supply", alreadyDisabled: existingSupply > 0 && permanentlyDisabledDNS, perm: permDisableNewSupply, setPerm: setPermDisableNewSupply, flag: flagDisableNewSupply, setFlag: setFlagDisableNewSupply },
                          { id: "disable_collateral_bidding", alreadyDisabled: existingSupply > 0 && permanentlyDisabledDCB, perm: permDisableCollateralBidding, setPerm: setPermDisableCollateralBidding, flag: flagDisableCollateralBidding, setFlag: setFlagDisableCollateralBidding },
                          { id: "disable_mcr_update", alreadyDisabled: existingSupply > 0 && permanentlyDisabledDMCR, perm: permDisableMCRUpdate, setPerm: setPermDisableMCRUpdate, flag: null, setFlag: null },
                          { id: "disable_icr_update", alreadyDisabled: existingSupply > 0 && permanentlyDisabledDICR, perm: permDisableICRUpdate, setPerm: setPermDisableICRUpdate, flag: null, setFlag: null },
                          { id: "disable_mssr_update", alreadyDisabled: existingSupply > 0 && permanentlyDisabledDMSSR, perm: permDisableMSSRUpdate, setPerm: setPermDisableMSSRUpdate, flag: null, setFlag: null },
                          { id: "disable_bsrm_update", alreadyDisabled: existingSupply > 0 && permanentlyDisabledDBSRM, perm: permDisableBSRMUpdate, setPerm: setPermDisableBSRMUpdate, flag: null, setFlag: null },
                        ]}
                        flags={[
                          { id: "charge_market_fee_flag", key: "charge_market_fee", alreadyDisabled: existingSupply > 0 && permanentlyDisabledCMF, flag: flagChargeMarketFee, setFlag: setFlagChargeMarketFee, permission: permChargeMarketFee },
                          { id: "white_list_flag", key: "white_list", alreadyDisabled: existingSupply > 0 && permanentlyDisabledWL, flag: flagWhiteList, setFlag: setFlagWhiteList, permission: permWhiteList },
                          { id: "transfer_restricted_flag", key: "transfer_restricted", alreadyDisabled: existingSupply > 0 && permanentlyDisabledTR, flag: flagTransferRestricted, setFlag: setFlagTransferRestricted, permission: permTransferRestricted },
                          { id: "disable_confidential_flag", key: "disable_confidential", alreadyDisabled: existingSupply > 0 && permanentlyDisabledDC, flag: flagDisableConfidential, setFlag: setFlagDisableConfidential, permission: permDisableConfidential },
                          { id: "override_authority_flag", key: "override_authority", alreadyDisabled: existingSupply > 0 && permanentlyDisabledOA, flag: flagOverrideAuthority, setFlag: setFlagOverrideAuthority, permission: permOverrideAuthority },
                          { id: "disable_force_settle_flag", key: "disable_force_settle", alreadyDisabled: existingSupply > 0 && permanentlyDisabledDFS, flag: flagDisableForceSettle, setFlag: setFlagDisableForceSettle, permission: permDisableForceSettle },
                          { id: "witness_fed_asset_flag", key: "witness_fed_asset", alreadyDisabled: existingSupply > 0 && permanentlyDisabledWFA, flag: flagWitnessFedAsset, setFlag: setFlagWitnessFedAsset, permission: permWitnessFedAsset },
                          { id: "committee_fed_asset_flag", key: "committee_fed_asset", alreadyDisabled: existingSupply > 0 && permanentlyDisabledCFA, flag: flagCommitteeFedAsset, setFlag: setFlagCommitteeFedAsset, permission: permCommitteeFedAsset },
                          { id: "lock_max_supply_flag", key: "lock_max_supply", alreadyDisabled: existingSupply > 0 && !permanentlyDisabledLMS, flag: flagLockMaxSupply, setFlag: setFlagLockMaxSupply, permission: !permLockMaxSupply },
                          { id: "disable_new_supply_flag", key: "disable_new_supply", alreadyDisabled: existingSupply > 0 && !permanentlyDisabledDNS, flag: flagDisableNewSupply, setFlag: setFlagDisableNewSupply, permission: !permDisableNewSupply },
                          { id: "disable_collateral_bidding_flag", key: "disable_collateral_bidding", alreadyDisabled: existingSupply > 0 && !permanentlyDisabledDCB, flag: flagDisableCollateralBidding, setFlag: setFlagDisableCollateralBidding, permission: !permDisableCollateralBidding },
                        ]}
                        issuerPermissions={issuer_permissions}
                        flagsValue={flags}
                        existingAssetData={existingAssetData}
                      />

                      <AuthorityListsSection
                        flagWhiteList={flagWhiteList}
                        whitelistAuthorities={whitelistAuthorities}
                        setWhitelistAuthorities={setWhitelistAuthorities}
                        blacklistAuthorities={blacklistAuthorities}
                        setBlacklistAuthorities={setBlacklistAuthorities}
                        whitelistAuthorityDialogOpen={whitelistAuthorityDialogOpen}
                        setWhitelistAuthorityDialogOpen={setWhitelistAuthorityDialogOpen}
                        blacklistAuthorityDialogOpen={blacklistAuthorityDialogOpen}
                        setBlacklistAuthorityDialogOpen={setBlacklistAuthorityDialogOpen}
                        usr={usr}
                      />

                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card
            className={
              "overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20 transition-colors " +
              (enabledMarketFees ? "ring-1 ring-[hsl(var(--accent-1)/0.3)]" : "")
            }
          >
            <SectionHeader
              icon={Settings}
              title={t("AssetCommon:extensions.header")}
              description={t("AssetCommon:extensions.header_content")}
              step={2}
              optional
              right={
                <Switch
                  checked={enabledMarketFees}
                  onCheckedChange={setEnabledMarketFees}
                  className="mt-1 shrink-0 data-[state=checked]:bg-[hsl(var(--accent-1))] data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-white/[0.12] [&>span]:bg-white"
                />
              }
            />
            {enabledMarketFees && (!editing || (editing && hasEditedAssetOptions)) && (
              <CardContent className="space-y-6 p-6 sm:p-8">
                <MarketFilteringSection
                  allowedMarketsEnabled={allowedMarketsEnabled}
                  setAllowedMarketsEnabled={setAllowedMarketsEnabled}
                  allowedMarkets={allowedMarkets}
                  setAllowedMarkets={setAllowedMarkets}
                  bannedMarketsEnabled={bannedMarketsEnabled}
                  setBannedMarketsEnabled={setBannedMarketsEnabled}
                  bannedMarkets={bannedMarkets}
                  setBannedMarkets={setBannedMarkets}
                  assets={assets}
                  marketSearch={marketSearch}
                  usr={usr}
                  balances={balances}
                />

                <ExtensionsSection
                  flagChargeMarketFee={flagChargeMarketFee}
                  commission={commission}
                  setCommission={setCommission}
                  maxCommission={maxCommission}
                  setMaxCommission={setMaxCommission}
                  enabledReferrerReward={enabledReferrerReward}
                  setEnabledReferrerReward={setEnabledReferrerReward}
                  referrerReward={referrerReward}
                  setReferrerReward={setReferrerReward}
                  enabledFeeSharingWhitelist={enabledFeeSharingWhitelist}
                  setEnabledFeeSharingWhitelist={setEnabledFeeSharingWhitelist}
                  feeSharingWhitelist={feeSharingWhitelist}
                  setFeeSharingWhitelist={setFeeSharingWhitelist}
                  whitelistMarketFeeSharingDialogOpen={whitelistMarketFeeSharingDialogOpen}
                  setWhitelistMarketFeeSharingDialogOpen={setWhitelistMarketFeeSharingDialogOpen}
                  enabledTakerFee={enabledTakerFee}
                  setEnabledTakerFee={setEnabledTakerFee}
                  takerFee={takerFee}
                  setTakerFee={setTakerFee}
                  debouncedPercent={debouncedPercent}
                  debouncedMax={debouncedMax}
                  usr={usr}
                />
              </CardContent>
            )}
          </Card>

          <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
            <SectionHeader
              icon={Layers}
              title={t("CreateSmartcoin:title.header")}
              description={t("CreateSmartcoin:title.header_content")}
              step={3}
            />
            <CardContent className="p-6 sm:p-8">
              <SmartcoinOptionsSection
                  editing={editing}
                  hasEditedBitassetOptions={hasEditedBitassetOptions}
                  setHasEditedBitassetOptions={setHasEditedBitassetOptions}
                  backingAsset={backingAsset}
                  setBackingAsset={setBackingAsset}
                  backingAssetData={backingAssetData}
                  feedLifetimeSeconds={feedLifetimeSeconds}
                  setFeedLifetimeSeconds={setFeedLifetimeSeconds}
                  minimumFeeds={minimumFeeds}
                  setMinimumFeeds={setMinimumFeeds}
                  forceSettlementDelaySeconds={forceSettlementDelaySeconds}
                  setForceSettlementDelaySeconds={setForceSettlementDelaySeconds}
                  forceSettlementOffsetPercent={forceSettlementOffsetPercent}
                  setForceSettlementOffsetPercent={setForceSettlementOffsetPercent}
                  maximumForceSettlementVolume={maximumForceSettlementVolume}
                  setMaximumForceSettlementVolume={setMaximumForceSettlementVolume}
                  mcr={mcr}
                  setMcr={setMcr}
                  icr={icr}
                  setIcr={setIcr}
                  mssr={mssr}
                  setMssr={setMssr}
                  bsrmStrategy={bsrmStrategy}
                  setBsrmStrategy={setBsrmStrategy}
                  permDisableMCRUpdate={permDisableMCRUpdate}
                  permDisableICRUpdate={permDisableICRUpdate}
                  permDisableMSSRUpdate={permDisableMSSRUpdate}
                  permDisableBSRMUpdate={permDisableBSRMUpdate}
                  mcfrExtensionEnabled={mcfrExtensionEnabled}
                  setMcfrExtensionEnabled={setMcfrExtensionEnabled}
                  marginCallFeeRatio={marginCallFeeRatio}
                  setMarginCallFeeRatio={setMarginCallFeeRatio}
                  fsfExtensionEnabled={fsfExtensionEnabled}
                  setFsfExtensionEnabled={setFsfExtensionEnabled}
                  forceSettleFeePercent={forceSettleFeePercent}
                  setForceSettleFeePercent={setForceSettleFeePercent}
                  debouncedPercent={debouncedPercent}
                  marketSearch={marketSearch}
                  usr={usr}
                  balances={balances}
                />
            </CardContent>
          </Card>

          <Card
            className={
              "overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20 transition-colors " +
              (enabledNFT ? "ring-1 ring-[hsl(var(--accent-warning)/0.3)]" : "")
            }
          >
            <SectionHeader
              icon={Image}
              title={t("AssetCommon:nft.main_header")}
              description={t("AssetCommon:nft.main_header_content")}
              step={4}
              optional
              right={
                <Switch
                  checked={enabledNFT}
                  onCheckedChange={setEnabledNFT}
                  className="mt-1 shrink-0 data-[state=checked]:bg-[hsl(var(--accent-warning))] data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-white/[0.12] [&>span]:bg-white"
                />
              }
            />
            {enabledNFT && (
            <CardContent className="p-6 sm:p-8">
              <NFTSection
                  enabledNFT={enabledNFT}
                  hideToggle
                  setEnabledNFT={setEnabledNFT}
                  nftMedia={nftMedia}
                  setNFTMedia={setNFTMedia}
                  newMediaType={newMediaType}
                  setNewMediaType={setNewMediaType}
                  newMediaUrl={newMediaUrl}
                  setNewMediaUrl={setNewMediaUrl}
                  title={title}
                  setTitle={setTitle}
                  artist={artist}
                  setArtist={setArtist}
                  narrative={narrative}
                  setNarrative={setNarrative}
                  tags={tags}
                  setTags={setTags}
                  type={type}
                  setType={setType}
                  attestation={attestation}
                  setAttestation={setAttestation}
                  acknowledgements={acknowledgements}
                  setAcknowledgements={setAcknowledgements}
                  holderLicense={holderLicense}
                  setHolderLicense={setHolderLicense}
                  license={license}
                  setLicense={setLicense}
                />
            </CardContent>
            )}
          </Card>

          <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("CreateSmartcoin:card.description")}
                </p>
                {editing &&
                !hasEditedAssetOptions &&
                !hasEditedBitassetOptions ? (
                  <Button className="h-10 px-8 bg-gradient-to-r from-[hsl(var(--accent-warning))] to-[hsl(var(--accent-1))] hover:from-[hsl(var(--accent-warning))] hover:to-[hsl(var(--accent-1))] text-white dark:text-white shadow-md shadow-[color:hsl(var(--accent-1)/0.25)]" disabled>
                    <Send className="mr-2 h-4 w-4" />
                    {t("CreateUIA:buttons.submit")}
                  </Button>
                ) : (
                  <Button
                    className="h-10 px-8 bg-gradient-to-r from-[hsl(var(--accent-warning))] to-[hsl(var(--accent-1))] hover:from-[hsl(var(--accent-warning))] hover:to-[hsl(var(--accent-1))] text-white dark:text-white shadow-md shadow-[color:hsl(var(--accent-1)/0.25)]"
                    onClick={() => {
                      setShowDialog(true);
                    }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {t("CreateUIA:buttons.submit")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {showDialog ? (
        <DeepLinkDialog
          operationNames={operationNames}
          username={usr.username}
          usrChain={usr.chain}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={`${editing ? "Editing" : "Creating"}_Smartcoin-${
            usr.id
          }-${symbol}`}
          headerText={t(
            `CreateSmartcoin:dialogContent.${
              editing ? "editHeader" : "createHeader"
            }`,
            { symbol }
          )}
          trxJSON={trx}
        />
      ) : null}
    </>
  );
}
