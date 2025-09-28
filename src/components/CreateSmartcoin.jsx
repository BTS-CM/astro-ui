import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
  useCallback,
} from "react";
import { useStore } from "@nanostores/react";
import { List } from "react-window";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import AssetPermission from "@/components/common/AssetPermission.tsx";
import AssetFlag from "@/components/common/AssetFlag.tsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";

import AccountSearch from "@/components/AccountSearch.jsx";
import { Avatar } from "./Avatar.tsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";

import {
  getPermissions,
  getFlags,
  debounce,
  humanReadableFloat,
  blockchainFloat,
  getFlagBooleans,
} from "@/lib/common.js";
import ExternalLink from "./common/ExternalLink.jsx";

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
  const currentNode = useStore($currentNode);

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
    let unsubscribeUserBalances;

    if (usr && usr.id && currentNode && assets && assets.length) {
      const userBalancesStore = createUserBalancesStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      unsubscribeUserBalances = userBalancesStore.subscribe(
        ({ data, error, loading }) => {
          if (data && !error && !loading) {
            const filteredData = data.filter((balance) =>
              assets.find((x) => x.id === balance.asset_id)
            );
            setBalances(filteredData);
          }
        }
      );
    }

    return () => {
      if (unsubscribeUserBalances) unsubscribeUserBalances();
    };
  }, [usr, assets, currentNode, balanceCounter]);

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

  // Enable-bit effects
  useEffect(() => {
    if (!permWhiteList) setFlagWhiteList(false);
  }, [permWhiteList]);

  useEffect(() => {
    if (!permTransferRestricted) setFlagTransferRestricted(false);
  }, [permTransferRestricted]);

  useEffect(() => {
    if (!permDisableConfidential) setFlagDisableConfidential(false);
  }, [permDisableConfidential]);

  useEffect(() => {
    if (!permChargeMarketFee) setFlagChargeMarketFee(false);
  }, [permChargeMarketFee]);

  useEffect(() => {
    if (!permOverrideAuthority) setFlagOverrideAuthority(false);
  }, [permOverrideAuthority]);

  useEffect(() => {
    if (!permWitnessFedAsset) setFlagWitnessFedAsset(false);
  }, [permWitnessFedAsset]);

  useEffect(() => {
    if (!permCommitteeFedAsset) setFlagCommitteeFedAsset(false);
  }, [permCommitteeFedAsset]);

  useEffect(() => {
    if (flagWitnessFedAsset) setFlagCommitteeFedAsset(false); // if witness fed selected, disable committee fed
  }, [flagWitnessFedAsset]);

  useEffect(() => {
    if (flagCommitteeFedAsset) setFlagWitnessFedAsset(false); // if committee fed selected, disable witness fed
  }, [flagCommitteeFedAsset]);
  // End of Enable-bit effects

  // Disable-bit effects
  useEffect(() => {
    if (permLockMaxSupply) setFlagLockMaxSupply(false);
  }, [permLockMaxSupply]);

  useEffect(() => {
    if (permDisableNewSupply) setFlagDisableNewSupply(false);
  }, [permDisableNewSupply]);

  useEffect(() => {
    if (permDisableCollateralBidding) setFlagDisableCollateralBidding(false);
  }, [permDisableCollateralBidding]);
  // End of Disable-bit effects

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

  const description = useMemo(() => {
    let _description = { main: desc, short_name: shortName, market };

    if (enabledNFT) {
      const nft_object = {
        acknowledgements: acknowledgements,
        artist: artist,
        attestation: attestation,
        encoding: "ipfs",
        holder_license: holderLicense,
        license: license,
        narrative: narrative,
        title: title,
        tags: tags,
        type: type,
      };

      nftMedia.forEach((image) => {
        // Supports png, jpeg & gif, following the NFT spec
        const imageType = image.type;
        if (!nft_object[`media_${imageType}_multihash`]) {
          // only the first image is used for the main image
          nft_object[`media_${imageType}_multihash`] = image.url;
        }

        const sameTypeFiles = nftMedia.filter((img) => img.type === imageType);
        if (sameTypeFiles && sameTypeFiles.length > 1) {
          if (!nft_object[`media_${imageType}_multihashes`]) {
            // initialise the ipfs multihashes array
            nft_object[`media_${imageType}_multihashes`] = [
              {
                url: image.url,
              },
            ];
          } else {
            // add the image to the ipfs multihashes array
            nft_object[`media_${imageType}_multihashes`].push({
              url: image.url,
            });
          }
        }
      });

      _description["nft_object"] = nft_object;
    }

    return JSON.stringify(_description);
  }, [
    // NFT dependencies
    enabledNFT,
    acknowledgements,
    artist,
    attestation,
    holderLicense,
    license,
    narrative,
    title,
    tags,
    type,
    nftMedia,
    // Asset dependencies
    desc,
    market,
    shortName,
  ]);

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
        currentNode ? currentNode.url : null,
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

  const debouncedMax = useCallback(
    debounce((input, setMaxCommissionFunction) => {
      let parsedInput = parseFloat(input);
      if (isNaN(parsedInput) || parsedInput <= 0 || commission <= 0) {
        setMaxCommissionFunction(0);
        return;
      }

      const maximum = maxSupply * (commission / 100);
      if (parsedInput > maximum) {
        setMaxCommissionFunction(maximum);
      }
    }, 500),
    [commission, maxSupply]
  );

  const debouncedPercent = useCallback(
    debounce((input, setCommissionFunction, maxPercentage) => {
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

      if (parsedInput > maxPercentage) {
        setCommissionFunction(maxPercentage);
      } else if (parsedInput < 0.01) {
        setCommissionFunction(0.01);
      } else {
        setCommissionFunction(parsedInput);
      }
    }, 500),
    []
  );

  const [
    whitelistMarketFeeSharingDialogOpen,
    setWhitelistMarketFeeSharingDialogOpen,
  ] = useState(false);
  const [whitelistAuthorityDialogOpen, setWhitelistAuthorityDialogOpen] =
    useState(false);
  const [blacklistAuthorityDialogOpen, setBlacklistAuthorityDialogOpen] =
    useState(false);

  const allowedMarketsRow = ({ index, style }) => {
    let res = allowedMarkets[index];
    if (!res) {
      return null;
    }

    const currentAsset = assets.find((x) => x.id === res);
    const issuer = marketSearch.find((x) => x.id === res);

    return (
      <div style={{ ...style }} key={`acard-${res}`}>
        <Card className="ml-2 mr-2 mt-1">
          <CardHeader className="pb-3 pt-3">
            <span className="grid grid-cols-12">
              <span className="col-span-11">
                <div className="">
                  {currentAsset
                    ? `${currentAsset.symbol} (${currentAsset.id})`
                    : res}
                </div>
                <div className="text-sm">
                  {t("Smartcoins:createdBy")}{" "}
                  {issuer && issuer.u ? issuer.u : currentAsset.issuer}
                </div>
              </span>
              <span className="col-span-1">
                <Button
                  variant="outline"
                  className="mr-2 mt-2"
                  onClick={(e) => {
                    e.preventDefault();
                    const _update = allowedMarkets.filter((x) => x !== res);
                    setAllowedMarkets(_update);
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

  const bannedMarketsRow = ({ index, style }) => {
    let res = bannedMarkets[index];
    if (!res) {
      return null;
    }

    const currentAsset = assets.find((x) => x.id === res);
    const issuer = marketSearch.find((x) => x.id === res);

    return (
      <div style={{ ...style }} key={`acard-${res}`}>
        <Card className="ml-2 mr-2 mt-1">
          <CardHeader className="pb-3 pt-3">
            <span className="grid grid-cols-12">
              <span className="col-span-11">
                <div className="">
                  {currentAsset
                    ? `${currentAsset.symbol} (${currentAsset.id})`
                    : res}
                </div>
                <div className="text-sm">
                  {t("Smartcoins:createdBy")}{" "}
                  {issuer && issuer.u ? issuer.u : currentAsset.issuer}
                </div>
              </span>
              <span className="col-span-1">
                <Button
                  variant="outline"
                  className="mr-2 mt-2"
                  onClick={(e) => {
                    e.preventDefault();
                    const _update = bannedMarkets.filter((x) => x !== res);
                    setBannedMarkets(_update);
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

  const feeSharingWhitelistRow = ({ index, style }) => {
    let res = feeSharingWhitelist[index];
    if (!res) {
      return null;
    }

    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="ml-2 mr-2 mt-1">
          <CardHeader className="pb-3 pt-3">
            <span className="grid grid-cols-12">
              <span className="col-span-1">
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
              <span className="col-span-10 ml-3">
                #{index + 1}: {res.name} ({res.id})
              </span>
              <span className="col-span-1">
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={(e) => {
                    e.preventDefault();
                    const _update = feeSharingWhitelist.filter(
                      (x) => x.id !== res.id
                    );
                    setFeeSharingWhitelist(_update);
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

  const whitelistAuthorityRow = ({ index, style }) => {
    let res = whitelistAuthorities[index];
    if (!res) {
      return null;
    }

    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="ml-2 mr-2 mt-1">
          <CardHeader className="pb-3 pt-3">
            <span className="grid grid-cols-12">
              <span className="col-span-1">
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
              <span className="col-span-10 ml-3">
                #{index + 1}: {res.name} ({res.id})
              </span>
              <span className="col-span-1">
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={(e) => {
                    e.preventDefault();
                    const _update = whitelistAuthorities.filter(
                      (x) => x.id !== res.id
                    );
                    setWhitelistAuthorities(_update);
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

  const blacklistAuthorityRow = ({ index, style }) => {
    let res = blacklistAuthorities[index];
    if (!res) {
      return null;
    }

    return (
      <div style={{ ...style }} key={`acard-${res.id}`}>
        <Card className="ml-2 mr-2 mt-1">
          <CardHeader className="pb-3 pt-3">
            <span className="grid grid-cols-12">
              <span className="col-span-1">
                <Avatar
                  size={40}
                  name={res.name ? res.name : ""}
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
              <span className="col-span-9 ml-3">
                {res.name
                  ? `#${index + 1}: ${res.name} (${res.id})`
                  : `#${index + 1}: ${res.id}`}
              </span>
              <span className="col-span-1">
                <Button
                  variant="outline"
                  className="mr-2"
                  onClick={(e) => {
                    e.preventDefault();
                    const _update = blacklistAuthorities.filter(
                      (x) => x.id !== res.id
                    );
                    setBlacklistAuthorities(_update);
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
        currentNode ? currentNode.url : null,
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

  const MediaRow = ({ index, style }) => {
    if (!nftMedia || !nftMedia.length || !nftMedia[index]) {
      return;
    }

    let res = nftMedia[index];

    return (
      <div
        style={{ ...style }}
        key={`dialogrow-${index}`}
        className="grid grid-cols-4"
      >
        <div className="col-span-1">{res.type}</div>
        <div className="col-span-1">
          <Dialog>
            <DialogTrigger>
              <Button className="h-5" variant="outline">
                Full URL
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white w-full max-w-4xl bg-gray-100">
              <DialogHeader>
                <DialogTitle>Full IPFS URL</DialogTitle>
              </DialogHeader>
              <p>{res.url}</p>
            </DialogContent>
          </Dialog>
        </div>
        <div className="col-span-1">{res.url.split("/").pop()}</div>
        <div className="col-span-1">
          <Button
            variant="outline"
            className="w-5 h-5"
            onClick={() => {
              setNFTMedia(nftMedia.filter((x) => x.url !== res.url));
            }}
          >
            ❌
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader className="pb-5">
              <CardTitle>
                💷{" "}
                {t(
                  !editing
                    ? "CreateSmartcoin:card.title_create"
                    : "CreateSmartcoin:card.title_edit"
                )}
              </CardTitle>
              <CardDescription>
                {t("CreateSmartcoin:card.description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2">
                <div className="col-span-2">
                  {!editing ? (
                    <HoverInfo
                      content={t("AssetCommon:asset_details.title_content")}
                      header={t("AssetCommon:asset_details.title")}
                      type="header"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <HoverInfo
                        content={t("AssetCommon:asset_details.title_content")}
                        header={t("AssetCommon:asset_details.title")}
                        type="header"
                      />
                      <div className="text-right mb-1">
                        {!hasEditedAssetOptions ? (
                          <Button
                            variant="outline"
                            onClick={() => setHasEditedAssetOptions(true)}
                            className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0"
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
                    <span>
                      <div className={`grid grid-cols-3 gap-5`}>
                        <div>
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
                                  setSymbol(value);
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

                        <div>
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
                        <div>
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
                        className="mt-1"
                      />

                      <div className="grid grid-cols-2 gap-5 mb-3">
                        <div>
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
                        <div>
                          <HoverInfo
                            content={t(
                              "AssetCommon:asset_details.preferredMarket.header_content"
                            )}
                            header={t(
                              "AssetCommon:asset_details.preferredMarket.header"
                            )}
                          />
                          <div className="grid grid-cols-2 gap-3 mt-1">
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

                      <div className="grid grid-cols-3 gap-5 mb-3">
                        <div>
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
                        <div>
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
                        <div>
                          <HoverInfo
                            content={t(
                              "AssetCommon:cer.calculated_cer_price.header_content"
                            )}
                            header={t(
                              "AssetCommon:cer.calculated_cer_price.header"
                            )}
                          />
                          <Input
                            placeholder={`${(
                              cerQuoteAmount / cerBaseAmount
                            ).toFixed(precision)} ${
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

                      <div className="grid grid-cols-2 gap-5 mt-2">
                        <AssetFlag
                          alreadyDisabled={false}
                          id={"allowed_markets"}
                          allowedText={t(
                            "AssetCommon:extensions.allowed_markets.enabled"
                          )}
                          enabledInfo={t(
                            "AssetCommon:extensions.allowed_markets.enabledInfo"
                          )}
                          disabledText={t(
                            "AssetCommon:extensions.allowed_markets.disabled"
                          )}
                          disabledInfo={t(
                            "AssetCommon:extensions.allowed_markets.disabledInfo"
                          )}
                          permission={true}
                          flag={allowedMarketsEnabled}
                          setFlag={setAllowedMarketsEnabled}
                        />
                        {allowedMarketsEnabled ? (
                          <AssetDropDown
                            assetSymbol={""}
                            assetData={null}
                            storeCallback={(input) => {
                              if (
                                !allowedMarkets.includes(input) &&
                                !bannedMarkets.includes(input)
                              ) {
                                const _foundAsset = assets.find(
                                  (x) => x.symbol === input
                                );
                                setAllowedMarkets([
                                  ...allowedMarkets,
                                  _foundAsset.id,
                                ]);
                              }
                            }}
                            otherAsset={null}
                            marketSearch={marketSearch}
                            type={"backing"}
                            chain={usr && usr.chain ? usr.chain : "bitshares"}
                            balances={balances}
                          />
                        ) : null}
                      </div>
                      {allowedMarketsEnabled ? (
                        <div className="mt-3 border border-gray-300 rounded">
                          <List
                            height={210}
                            rowComponent={allowedMarketsRow}
                            rowCount={allowedMarkets.length}
                            rowHeight={90}
                            rowProps={{}}
                            className="w-full"
                          />
                        </div>
                      ) : null}
                      <div className="grid grid-cols-2 gap-5 mt-2">
                        <AssetFlag
                          alreadyDisabled={false}
                          id={"banned_markets"}
                          allowedText={t(
                            "AssetCommon:extensions.banned_markets.enabled"
                          )}
                          enabledInfo={t(
                            "AssetCommon:extensions.banned_markets.enabledInfo"
                          )}
                          disabledText={t(
                            "AssetCommon:extensions.banned_markets.disabled"
                          )}
                          disabledInfo={t(
                            "AssetCommon:extensions.banned_markets.disabledInfo"
                          )}
                          permission={true}
                          flag={bannedMarketsEnabled}
                          setFlag={setBannedMarketsEnabled}
                        />
                        {bannedMarketsEnabled ? (
                          <AssetDropDown
                            assetSymbol={""}
                            assetData={null}
                            storeCallback={(input) => {
                              if (
                                !bannedMarkets.includes(input) &&
                                !allowedMarkets.includes(input)
                              ) {
                                const _foundAsset = assets.find(
                                  (x) => x.symbol === input
                                );
                                setBannedMarkets([
                                  ...bannedMarkets,
                                  _foundAsset.id,
                                ]);
                              }
                            }}
                            otherAsset={null}
                            marketSearch={marketSearch}
                            type={"backing"}
                            chain={usr && usr.chain ? usr.chain : "bitshares"}
                            balances={balances}
                          />
                        ) : null}
                      </div>
                      {bannedMarketsEnabled ? (
                        <div className="mt-2 border border-gray-300 rounded">
                          <List
                            height={210}
                            rowComponent={bannedMarketsRow}
                            rowCount={bannedMarkets.length}
                            rowHeight={90}
                            rowProps={{}}
                            className="w-full"
                          />
                        </div>
                      ) : null}
                      <Separator className="my-4 mt-5" />

                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <HoverInfo
                            content={t(
                              "AssetCommon:permissions.header_content"
                            )}
                            header={t("AssetCommon:permissions.header")}
                            type="header"
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledCMF
                            }
                            id={"charge_market_fee"}
                            allowedText={t(
                              "AssetCommon:permissions.charge_market_fee.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.charge_market_fee.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.charge_market_fee.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.charge_market_fee.disabledInfo"
                            )}
                            permission={permChargeMarketFee}
                            setPermission={setPermChargeMarketFee}
                            flag={flagChargeMarketFee}
                            setFlag={setFlagChargeMarketFee}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledWL
                            }
                            id={"white_list"}
                            allowedText={t(
                              "AssetCommon:permissions.white_list.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.white_list.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.white_list.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.white_list.disabledInfo"
                            )}
                            permission={permWhiteList}
                            setPermission={setPermWhiteList}
                            flag={flagWhiteList}
                            setFlag={setFlagWhiteList}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledTR
                            }
                            id={"transfer_restricted"}
                            allowedText={t(
                              "AssetCommon:permissions.transfer_restricted.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.transfer_restricted.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.transfer_restricted.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.transfer_restricted.disabledInfo"
                            )}
                            permission={permTransferRestricted}
                            setPermission={setPermTransferRestricted}
                            flag={flagTransferRestricted}
                            setFlag={setFlagTransferRestricted}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledDC
                            }
                            id={"disable_confidential"}
                            allowedText={t(
                              "AssetCommon:permissions.disable_confidential.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.disable_confidential.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.disable_confidential.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.disable_confidential.disabledInfo"
                            )}
                            permission={permDisableConfidential}
                            setPermission={setPermDisableConfidential}
                            flag={flagDisableConfidential}
                            setFlag={setFlagDisableConfidential}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledOA
                            }
                            id={"override_authority"}
                            allowedText={t(
                              "AssetCommon:permissions.override_authority.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.override_authority.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.override_authority.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.override_authority.disabledInfo"
                            )}
                            permission={permOverrideAuthority}
                            setPermission={setPermOverrideAuthority}
                            flag={flagOverrideAuthority}
                            setFlag={setFlagOverrideAuthority}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledDFS
                            }
                            id={"disable_force_settle"}
                            allowedText={t(
                              "AssetCommon:permissions.disable_force_settle.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.disable_force_settle.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.disable_force_settle.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.disable_force_settle.disabledInfo"
                            )}
                            permission={permDisableForceSettle}
                            setPermission={setPermDisableForceSettle}
                            flag={flagDisableForceSettle}
                            setFlag={setFlagDisableForceSettle}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledGS
                            }
                            id={"global_settle"}
                            allowedText={t(
                              "AssetCommon:permissions.global_settle.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.global_settle.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.global_settle.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.global_settle.disabledInfo"
                            )}
                            permission={permGlobalSettle}
                            setPermission={setPermGlobalSettle}
                            flag={null}
                            setFlag={null}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledWFA
                            }
                            id={"witness_fed_asset"}
                            allowedText={t(
                              "AssetCommon:permissions.witness_fed_asset.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.witness_fed_asset.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.witness_fed_asset.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.witness_fed_asset.disabledInfo"
                            )}
                            permission={permWitnessFedAsset}
                            setPermission={setPermWitnessFedAsset}
                            flag={flagWitnessFedAsset}
                            setFlag={setFlagWitnessFedAsset}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledCFA
                            }
                            id={"committee_fed_asset"}
                            allowedText={t(
                              "AssetCommon:permissions.committee_fed_asset.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.committee_fed_asset.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.committee_fed_asset.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.committee_fed_asset.disabledInfo"
                            )}
                            permission={permCommitteeFedAsset}
                            setPermission={setPermCommitteeFedAsset}
                            flag={flagCommitteeFedAsset}
                            setFlag={setFlagCommitteeFedAsset}
                          />
                          <div className="grid grid-cols-3 gap-5 mt-1 mb-1">
                            <Separator className="mt-3 w-1/2 mx-auto text-center" />
                            <Separator className="mt-3 w-1/2 mx-auto text-center" />
                            <Separator className="mt-3 w-1/2 mx-auto text-center" />
                          </div>
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledLMS
                            }
                            id={"lock_max_supply"}
                            allowedText={t(
                              "AssetCommon:permissions.lock_max_supply.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.lock_max_supply.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.lock_max_supply.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.lock_max_supply.disabledInfo"
                            )}
                            permission={permLockMaxSupply}
                            setPermission={setPermLockMaxSupply}
                            flag={flagLockMaxSupply}
                            setFlag={setFlagLockMaxSupply}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledDNS
                            }
                            id={"disable_new_supply"}
                            allowedText={t(
                              "AssetCommon:permissions.disable_new_supply.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.disable_new_supply.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.disable_new_supply.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.disable_new_supply.disabledInfo"
                            )}
                            permission={permDisableNewSupply}
                            setPermission={setPermDisableNewSupply}
                            flag={flagDisableNewSupply}
                            setFlag={setFlagDisableNewSupply}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledDCB
                            }
                            id={"disable_collateral_bidding"}
                            allowedText={t(
                              "AssetCommon:permissions.disable_collateral_bidding.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.disable_collateral_bidding.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.disable_collateral_bidding.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.disable_collateral_bidding.disabledInfo"
                            )}
                            permission={permDisableCollateralBidding}
                            setPermission={setPermDisableCollateralBidding}
                            flag={flagDisableCollateralBidding}
                            setFlag={setFlagDisableCollateralBidding}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledDMCR
                            }
                            id={"disable_mcr_update"}
                            allowedText={t(
                              "AssetCommon:permissions.disable_mcr_update.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.disable_mcr_update.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.disable_mcr_update.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.disable_mcr_update.disabledInfo"
                            )}
                            permission={permDisableMCRUpdate}
                            setPermission={setPermDisableMCRUpdate}
                            flag={null}
                            setFlag={null}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledDICR
                            }
                            id={"disable_icr_update"}
                            allowedText={t(
                              "AssetCommon:permissions.disable_icr_update.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.disable_icr_update.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.disable_icr_update.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.disable_icr_update.disabledInfo"
                            )}
                            permission={permDisableICRUpdate}
                            setPermission={setPermDisableICRUpdate}
                            flag={null}
                            setFlag={null}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledDMSSR
                            }
                            id={"disable_mssr_update"}
                            allowedText={t(
                              "AssetCommon:permissions.disable_mssr_update.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.disable_mssr_update.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.disable_mssr_update.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.disable_mssr_update.disabledInfo"
                            )}
                            permission={permDisableMSSRUpdate}
                            setPermission={setPermDisableMSSRUpdate}
                            flag={null}
                            setFlag={null}
                          />
                          <AssetPermission
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledDBSRM
                            }
                            id={"disable_bsrm_update"}
                            allowedText={t(
                              "AssetCommon:permissions.disable_bsrm_update.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:permissions.disable_bsrm_update.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:permissions.disable_bsrm_update.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:permissions.disable_bsrm_update.disabledInfo"
                            )}
                            permission={permDisableBSRMUpdate}
                            setPermission={setPermDisableBSRMUpdate}
                            flag={null}
                            setFlag={null}
                          />
                        </div>

                        <div>
                          <HoverInfo
                            content={t("AssetCommon:flags.header_content")}
                            header={t("AssetCommon:flags.header")}
                            type="header"
                          />
                          <AssetFlag
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledCMF
                            }
                            id={"charge_market_fee_flag"}
                            allowedText={t(
                              "AssetCommon:flags.charge_market_fee.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:flags.charge_market_fee.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:flags.charge_market_fee.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:flags.charge_market_fee.disabledInfo"
                            )}
                            permission={permChargeMarketFee}
                            flag={flagChargeMarketFee}
                            setFlag={setFlagChargeMarketFee}
                          />
                          <AssetFlag
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledWL
                            }
                            id={"white_list_flag"}
                            allowedText={t(
                              "AssetCommon:flags.white_list.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:flags.white_list.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:flags.white_list.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:flags.white_list.disabledInfo"
                            )}
                            permission={permWhiteList}
                            flag={flagWhiteList}
                            setFlag={setFlagWhiteList}
                          />
                          <AssetFlag
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledTR
                            }
                            id={"transfer_restricted_flag"}
                            allowedText={t(
                              "AssetCommon:flags.transfer_restricted.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:flags.transfer_restricted.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:flags.transfer_restricted.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:flags.transfer_restricted.disabledInfo"
                            )}
                            permission={permTransferRestricted}
                            flag={flagTransferRestricted}
                            setFlag={setFlagTransferRestricted}
                          />
                          <AssetFlag
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledDC
                            }
                            id={"disable_confidential_flag"}
                            allowedText={t(
                              "AssetCommon:flags.disable_confidential.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:flags.disable_confidential.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:flags.disable_confidential.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:flags.disable_confidential.disabledInfo"
                            )}
                            permission={permDisableConfidential}
                            flag={flagDisableConfidential}
                            setFlag={setFlagDisableConfidential}
                          />
                          <AssetFlag
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledOA
                            }
                            id={"override_authority_flag"}
                            allowedText={t(
                              "AssetCommon:flags.override_authority.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:flags.override_authority.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:flags.override_authority.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:flags.override_authority.disabledInfo"
                            )}
                            permission={permOverrideAuthority}
                            flag={flagOverrideAuthority}
                            setFlag={setFlagOverrideAuthority}
                          />
                          <AssetFlag
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledDFS
                            }
                            id={"disable_force_settle_flag"}
                            allowedText={t(
                              "AssetCommon:flags.disable_force_settle.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:flags.disable_force_settle.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:flags.disable_force_settle.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:flags.disable_force_settle.disabledInfo"
                            )}
                            permission={permDisableForceSettle}
                            flag={flagDisableForceSettle}
                            setFlag={setFlagDisableForceSettle}
                          />
                          <br />
                          <AssetFlag
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledWFA
                            }
                            id={"witness_fed_asset_flag"}
                            allowedText={t(
                              "AssetCommon:flags.witness_fed_asset.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:flags.witness_fed_asset.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:flags.witness_fed_asset.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:flags.witness_fed_asset.disabledInfo"
                            )}
                            permission={permWitnessFedAsset}
                            flag={flagWitnessFedAsset}
                            setFlag={setFlagWitnessFedAsset}
                          />
                          <AssetFlag
                            alreadyDisabled={
                              existingSupply > 0 && permanentlyDisabledCFA
                            }
                            id={"committee_fed_asset_flag"}
                            allowedText={t(
                              "AssetCommon:flags.committee_fed_asset.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:flags.committee_fed_asset.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:flags.committee_fed_asset.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:flags.committee_fed_asset.disabledInfo"
                            )}
                            permission={permCommitteeFedAsset}
                            flag={flagCommitteeFedAsset}
                            setFlag={setFlagCommitteeFedAsset}
                          />
                          <div className="grid grid-cols-3 gap-5 mt-1 mb-1">
                            <Separator className="mt-3 w-1/2 mx-auto text-center" />
                            <Separator className="mt-3 w-1/2 mx-auto text-center" />
                            <Separator className="mt-3 w-1/2 mx-auto text-center" />
                          </div>
                          <AssetFlag
                            alreadyDisabled={
                              existingSupply > 0 && !permanentlyDisabledLMS
                            }
                            id={"lock_max_supply_flag"}
                            allowedText={t(
                              "AssetCommon:flags.lock_max_supply.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:flags.lock_max_supply.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:flags.lock_max_supply.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:flags.lock_max_supply.disabledInfo"
                            )}
                            permission={!permLockMaxSupply}
                            flag={flagLockMaxSupply}
                            setFlag={setFlagLockMaxSupply}
                          />
                          <AssetFlag
                            alreadyDisabled={
                              existingSupply > 0 && !permanentlyDisabledDNS
                            }
                            id={"disable_new_supply_flag"}
                            allowedText={t(
                              "AssetCommon:flags.disable_new_supply.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:flags.disable_new_supply.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:flags.disable_new_supply.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:flags.disable_new_supply.disabledInfo"
                            )}
                            permission={!permDisableNewSupply}
                            flag={flagDisableNewSupply}
                            setFlag={setFlagDisableNewSupply}
                          />
                          <AssetFlag
                            alreadyDisabled={
                              existingSupply > 0 && !permanentlyDisabledDCB
                            }
                            id={"disable_collateral_bidding_flag"}
                            allowedText={t(
                              "AssetCommon:flags.disable_collateral_bidding.about"
                            )}
                            enabledInfo={t(
                              "AssetCommon:flags.disable_collateral_bidding.enabledInfo"
                            )}
                            disabledText={t(
                              "AssetCommon:flags.disable_collateral_bidding.about"
                            )}
                            disabledInfo={t(
                              "AssetCommon:flags.disable_collateral_bidding.disabledInfo"
                            )}
                            permission={!permDisableCollateralBidding}
                            flag={flagDisableCollateralBidding}
                            setFlag={setFlagDisableCollateralBidding}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-5 mt-2">
                        <div className="text-md text-gray-300">
                          Issuer Permissions: {issuer_permissions}{" "}
                          {existingAssetData
                            ? `(${existingAssetData.options.issuer_permissions})`
                            : null}
                        </div>
                        <div className="text-md text-gray-300">
                          Asset Flags: {flags}{" "}
                          {existingAssetData
                            ? `(${existingAssetData.options.flags})`
                            : null}
                        </div>
                      </div>
                    </span>
                  ) : null}

                  {flagChargeMarketFee &&
                  (!editing || (editing && hasEditedAssetOptions)) ? (
                    <div className="col-span-2 mb-4">
                      <Separator className="my-4 mt-5" />
                      <HoverInfo
                        content={t("AssetCommon:extensions.header_content")}
                        header={t("AssetCommon:extensions.header")}
                        type="header"
                      />
                      <div className="grid grid-cols-2 gap-5 mb-2">
                        <div>
                          <HoverInfo
                            content={t("AssetCommon:market_fee.header_content")}
                            header={t("AssetCommon:market_fee.header")}
                          />
                          <Input
                            value={commission}
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            onInput={(e) => {
                              setCommission(e.currentTarget.value);
                              debouncedPercent(
                                e.currentTarget.value,
                                setCommission,
                                100
                              );
                            }}
                          />
                        </div>
                        <div>
                          <HoverInfo
                            content={t(
                              "AssetCommon:max_market_fee.header_content"
                            )}
                            header={t("AssetCommon:max_market_fee.header")}
                          />
                          <Input
                            placeholder={0}
                            value={maxCommission}
                            type="number"
                            min="0"
                            pattern="^\d*(\.\d{0,2})?$"
                            onInput={(e) => {
                              setMaxCommission(e.currentTarget.value);
                              debouncedMax(
                                e.currentTarget.value,
                                setMaxCommission
                              );
                            }}
                          />
                        </div>
                      </div>
                      <AssetFlag
                        alreadyDisabled={false}
                        id={"reward_percent"}
                        allowedText={t(
                          "AssetCommon:extensions.reward_percent.enabled"
                        )}
                        enabledInfo={t(
                          "AssetCommon:extensions.reward_percent.enabledInfo"
                        )}
                        disabledText={t(
                          "AssetCommon:extensions.reward_percent.disabled"
                        )}
                        disabledInfo={t(
                          "AssetCommon:extensions.reward_percent.disabledInfo"
                        )}
                        permission={true}
                        flag={enabledReferrerReward}
                        setFlag={setEnabledReferrerReward}
                      />

                      {enabledReferrerReward ? (
                        <>
                          <HoverInfo
                            content={t(
                              "AssetCommon:extensions.reward_percent.header_content"
                            )}
                            header={t(
                              "AssetCommon:extensions.reward_percent.header"
                            )}
                          />
                          <Input
                            placeholder={0}
                            value={referrerReward}
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            pattern="^\d*(\.\d{0,2})?$"
                            onInput={(e) => {
                              setReferrerReward(e.currentTarget.value);
                              debouncedPercent(
                                e.currentTarget.value,
                                setReferrerReward,
                                100
                              );
                            }}
                          />
                        </>
                      ) : null}

                      <AssetFlag
                        alreadyDisabled={false}
                        id={"whitelist_market_fee_sharing"}
                        allowedText={t(
                          "AssetCommon:extensions.whitelist_market_fee_sharing.enabled"
                        )}
                        enabledInfo={t(
                          "AssetCommon:extensions.whitelist_market_fee_sharing.enabledInfo"
                        )}
                        disabledText={t(
                          "AssetCommon:extensions.whitelist_market_fee_sharing.disabled"
                        )}
                        disabledInfo={t(
                          "AssetCommon:extensions.whitelist_market_fee_sharing.disabledInfo"
                        )}
                        permission={true}
                        flag={enabledFeeSharingWhitelist}
                        setFlag={setEnabledFeeSharingWhitelist}
                      />

                      {enabledFeeSharingWhitelist ? (
                        <>
                          <HoverInfo
                            content={t(
                              "AssetCommon:extensions.whitelist_market_fee_sharing.header_content"
                            )}
                            header={t(
                              "AssetCommon:extensions.whitelist_market_fee_sharing.header"
                            )}
                          />
                          <div className="grid grid-cols-12 mt-1">
                            <span className="col-span-9 border border-gray-300 rounded">
                              <List
                                height={210}
                                rowComponent={feeSharingWhitelistRow}
                                rowCount={feeSharingWhitelist.length}
                                rowHeight={100}
                                rowProps={{}}
                                className="w-full"
                              />
                            </span>
                            <span className="col-span-3 ml-3 text-center">
                              <Dialog
                                open={whitelistMarketFeeSharingDialogOpen}
                                onOpenChange={(open) => {
                                  setWhitelistMarketFeeSharingDialogOpen(open);
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="ml-3 mt-1"
                                  >
                                    ➕ {t("CreditOfferEditor:addUser")}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[375px] bg-white">
                                  <DialogHeader>
                                    <DialogTitle>
                                      {!usr || !usr.chain
                                        ? t("Transfer:bitsharesAccountSearch")
                                        : null}
                                      {usr && usr.chain === "bitshares"
                                        ? t(
                                            "Transfer:bitsharesAccountSearchBTS"
                                          )
                                        : null}
                                      {usr && usr.chain !== "bitshares"
                                        ? t(
                                            "Transfer:bitsharesAccountSearchTEST"
                                          )
                                        : null}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <AccountSearch
                                    chain={
                                      usr && usr.chain ? usr.chain : "bitshares"
                                    }
                                    excludedUsers={[]}
                                    setChosenAccount={(_account) => {
                                      if (
                                        _account &&
                                        !feeSharingWhitelist.find(
                                          (_usr) => _usr.id === _account.id
                                        )
                                      ) {
                                        setFeeSharingWhitelist(
                                          feeSharingWhitelist &&
                                            feeSharingWhitelist.length
                                            ? [...feeSharingWhitelist, _account]
                                            : [_account]
                                        );
                                      }
                                      setWhitelistMarketFeeSharingDialogOpen(
                                        false
                                      );
                                    }}
                                  />
                                </DialogContent>
                              </Dialog>
                            </span>
                          </div>
                        </>
                      ) : null}

                      <AssetFlag
                        alreadyDisabled={false}
                        id={"taker_fee_percent"}
                        allowedText={t(
                          "AssetCommon:extensions.taker_fee_percent.enabled"
                        )}
                        enabledInfo={t(
                          "AssetCommon:extensions.taker_fee_percent.enabledInfo"
                        )}
                        disabledText={t(
                          "AssetCommon:extensions.taker_fee_percent.disabled"
                        )}
                        disabledInfo={t(
                          "AssetCommon:extensions.taker_fee_percent.disabledInfo"
                        )}
                        permission={true}
                        flag={enabledTakerFee}
                        setFlag={setEnabledTakerFee}
                      />

                      {enabledTakerFee ? (
                        <>
                          <HoverInfo
                            content={t(
                              "AssetCommon:extensions.taker_fee_percent.header_content"
                            )}
                            header={t(
                              "AssetCommon:extensions.taker_fee_percent.header"
                            )}
                          />
                          <Input
                            placeholder={t(
                              "AssetCommon:extensions.taker_fee_percent.placeholder"
                            )}
                            value={takerFee}
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            pattern="^\d*(\.\d{0,2})?$"
                            onInput={(e) => {
                              setTakerFee(e.currentTarget.value);
                              debouncedPercent(
                                e.currentTarget.value,
                                setTakerFee,
                                100
                              );
                            }}
                          />
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  {flagWhiteList &&
                  (!editing || (editing && hasEditedAssetOptions)) ? (
                    <div className="col-span-2 mb-3">
                      <HoverInfo
                        content={t("AssetCommon:whitelist.header_content")}
                        header={t("AssetCommon:whitelist.header")}
                        type="header"
                      />
                      <div className="grid grid-cols-12 mt-1">
                        <span className="col-span-9 border border-gray-300 rounded">
                          <List
                            height={210}
                            rowComponent={whitelistAuthorityRow}
                            rowCount={whitelistAuthorities.length}
                            rowHeight={100}
                            rowProps={{}}
                            className="w-full"
                          />
                        </span>
                        <span className="col-span-3 ml-3 text-center">
                          <Dialog
                            open={whitelistAuthorityDialogOpen}
                            onOpenChange={(open) => {
                              setWhitelistAuthorityDialogOpen(open);
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
                                  {!usr || !usr.chain
                                    ? t("Transfer:bitsharesAccountSearch")
                                    : null}
                                  {usr && usr.chain === "bitshares"
                                    ? t("Transfer:bitsharesAccountSearchBTS")
                                    : null}
                                  {usr && usr.chain !== "bitshares"
                                    ? t("Transfer:bitsharesAccountSearchTEST")
                                    : null}
                                </DialogTitle>
                              </DialogHeader>
                              <AccountSearch
                                chain={
                                  usr && usr.chain ? usr.chain : "bitshares"
                                }
                                excludedUsers={
                                  usr && usr.username && usr.username.length
                                    ? [usr]
                                    : []
                                }
                                setChosenAccount={(_account) => {
                                  if (
                                    _account &&
                                    !whitelistAuthorities.find(
                                      (_usr) => _usr.id === _account.id
                                    )
                                  ) {
                                    setWhitelistAuthorities(
                                      whitelistAuthorities &&
                                        whitelistAuthorities.length
                                        ? [...whitelistAuthorities, _account]
                                        : [_account]
                                    );
                                  }
                                  setWhitelistAuthorityDialogOpen(false);
                                }}
                              />
                            </DialogContent>
                          </Dialog>
                        </span>
                      </div>
                    </div>
                  ) : null}
                  {flagWhiteList &&
                  (!editing || (editing && hasEditedAssetOptions)) ? (
                    <div className="col-span-2 mb-3">
                      <HoverInfo
                        content={t("AssetCommon:blacklist.header_content")}
                        header={t("AssetCommon:blacklist.header")}
                        type="header"
                      />
                      <div className="grid grid-cols-12 mt-1">
                        <span className="col-span-9 border border-gray-300 rounded">
                          <List
                            height={210}
                            rowComponent={blacklistAuthorityRow}
                            rowCount={blacklistAuthorities.length}
                            rowHeight={75}
                            rowProps={{}}
                            className="w-full"
                          />
                        </span>
                        <span className="col-span-3 ml-3 text-center">
                          <Dialog
                            open={blacklistAuthorityDialogOpen}
                            onOpenChange={(open) => {
                              setBlacklistAuthorityDialogOpen(open);
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
                                  {!usr || !usr.chain
                                    ? t("Transfer:bitsharesAccountSearch")
                                    : null}
                                  {usr && usr.chain === "bitshares"
                                    ? t("Transfer:bitsharesAccountSearchBTS")
                                    : null}
                                  {usr && usr.chain !== "bitshares"
                                    ? t("Transfer:bitsharesAccountSearchTEST")
                                    : null}
                                </DialogTitle>
                              </DialogHeader>
                              <AccountSearch
                                chain={
                                  usr && usr.chain ? usr.chain : "bitshares"
                                }
                                excludedUsers={
                                  usr && usr.username && usr.username.length
                                    ? [usr]
                                    : []
                                }
                                setChosenAccount={(_account) => {
                                  if (
                                    _account &&
                                    !blacklistAuthorities.find(
                                      (_usr) => _usr.id === _account.id
                                    )
                                  ) {
                                    setBlacklistAuthorities(
                                      blacklistAuthorities &&
                                        blacklistAuthorities.length
                                        ? [...blacklistAuthorities, _account]
                                        : [_account]
                                    );
                                  }
                                  setBlacklistAuthorityDialogOpen(false);
                                }}
                              />
                            </DialogContent>
                          </Dialog>
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <Separator className="my-4 mt-5 mb-2" />
                </div>

                <div className="col-span-2">
                  {!editing ? (
                    <HoverInfo
                      content={t("CreateSmartcoin:title.header_content")}
                      header={t("CreateSmartcoin:title.header")}
                      type="header"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <HoverInfo
                        content={t("CreateSmartcoin:title.header_content")}
                        header={t("CreateSmartcoin:title.header")}
                        type="header"
                      />
                      <div
                        className={`text-right mb-${
                          !hasEditedBitassetOptions ? 5 : 1
                        }`}
                      >
                        {!hasEditedBitassetOptions ? (
                          <Button
                            variant="outline"
                            onClick={() => setHasEditedBitassetOptions(true)}
                            className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0"
                          >
                            {t("CreateSmartcoin:editSmartcoin.disabled")}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setHasEditedBitassetOptions(false)}
                          >
                            {t("CreateSmartcoin:editSmartcoin.enabled")}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {!editing || (editing && hasEditedBitassetOptions) ? (
                  <div className="col-span-2">
                    <HoverInfo
                      content={t(
                        "CreatePrediction:pma.backing_asset.header_content"
                      )}
                      header={t("CreatePrediction:pma.backing_asset.header")}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        disabled
                        value={
                          backingAssetData
                            ? `${backingAssetData.symbol} (${backingAssetData.id})`
                            : backingAsset
                        }
                        type="text"
                      />
                      {!editing ? (
                        <AssetDropDown
                          assetSymbol={backingAsset ?? ""}
                          assetData={null}
                          storeCallback={setBackingAsset}
                          otherAsset={null}
                          marketSearch={marketSearch}
                          type={"backing"}
                          chain={usr && usr.chain ? usr.chain : "bitshares"}
                          balances={balances}
                        />
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <HoverInfo
                          content={t(
                            "CreateSmartcoin:feed_lifetime.header_content"
                          )}
                          header={t("CreateSmartcoin:feed_lifetime.header")}
                        />
                        <Input
                          value={feedLifetimeSeconds}
                          type="number"
                          min="0"
                          className="mt-1"
                          onInput={(e) => {
                            setFeedLifetimeSeconds(e.currentTarget.value);
                            if (editing) setHasEditedBitassetOptions(true);
                          }}
                        />
                      </div>
                      <div>
                        <HoverInfo
                          content={t(
                            "CreateSmartcoin:minimum_feeds.header_content"
                          )}
                          header={t("CreateSmartcoin:minimum_feeds.header")}
                        />
                        <Input
                          value={minimumFeeds}
                          type="number"
                          min="1"
                          max="20"
                          className="mt-1"
                          onInput={(e) => {
                            setMinimumFeeds(parseInt(e.currentTarget.value));
                            if (editing) setHasEditedBitassetOptions(true);
                          }}
                        />
                      </div>
                      <div>
                        <HoverInfo
                          content={t(
                            "CreateSmartcoin:force_settlement_delay.header_content"
                          )}
                          header={t(
                            "CreateSmartcoin:force_settlement_delay.header"
                          )}
                        />
                        <Input
                          value={forceSettlementDelaySeconds}
                          type="number"
                          min="0"
                          className="mt-1"
                          onInput={(e) => {
                            setForceSettlementDelaySeconds(
                              e.currentTarget.value
                            );
                            if (editing) setHasEditedBitassetOptions(true);
                          }}
                        />
                      </div>
                      <div>
                        <HoverInfo
                          content={t(
                            "CreateSmartcoin:force_settlement_offset.header_content"
                          )}
                          header={t(
                            "CreateSmartcoin:force_settlement_offset.header"
                          )}
                        />
                        <Input
                          value={forceSettlementOffsetPercent}
                          type="number"
                          min="0"
                          max="100"
                          className="mt-1"
                          onInput={(e) => {
                            setForceSettlementOffsetPercent(
                              e.currentTarget.value
                            );
                            debouncedPercent(
                              e.currentTarget.value,
                              setForceSettlementOffsetPercent,
                              100
                            );
                            if (editing) setHasEditedBitassetOptions(true);
                          }}
                        />
                      </div>
                      <div>
                        <HoverInfo
                          content={t(
                            "CreateSmartcoin:maximum_force_settlement_volume.header_content"
                          )}
                          header={t(
                            "CreateSmartcoin:maximum_force_settlement_volume.header"
                          )}
                        />
                        <Input
                          value={maximumForceSettlementVolume}
                          type="number"
                          min="0"
                          className="mt-1"
                          onInput={(e) => {
                            setMaximumForceSettlementVolume(
                              e.currentTarget.value
                            );
                            if (editing) setHasEditedBitassetOptions(true);
                          }}
                        />
                      </div>
                      {!permDisableMCRUpdate ? (
                        <div className="col-span-2 w-1/2">
                          <HoverInfo
                            content={t("CreateSmartcoin:mcr.header_content")}
                            header={t("CreateSmartcoin:mcr.header")}
                          />
                          <Input
                            value={mcr}
                            type="number"
                            min="0"
                            max="4200"
                            className="mt-1"
                            onInput={(e) => {
                              setMcr(e.currentTarget.value);
                              debouncedPercent(
                                e.currentTarget.value,
                                setMcr,
                                4200
                              );
                              if (editing) setHasEditedBitassetOptions(true);
                            }}
                          />
                        </div>
                      ) : null}
                      {!permDisableICRUpdate ? (
                        <div className="col-span-2 w-1/2">
                          <HoverInfo
                            content={t("CreateSmartcoin:icr.header_content")}
                            header={t("CreateSmartcoin:icr.header")}
                          />
                          <Input
                            value={icr}
                            type="number"
                            min="0"
                            max="4200"
                            className="mt-1"
                            onInput={(e) => {
                              setIcr(e.currentTarget.value);
                              debouncedPercent(
                                e.currentTarget.value,
                                setIcr,
                                4200
                              );
                              if (editing) setHasEditedBitassetOptions(true);
                            }}
                          />
                        </div>
                      ) : null}
                      {!permDisableMSSRUpdate ? (
                        <div className="col-span-2 w-1/2">
                          <HoverInfo
                            content={t("CreateSmartcoin:mssr.header_content")}
                            header={t("CreateSmartcoin:mssr.header")}
                          />
                          <Input
                            value={mssr}
                            type="number"
                            min="0"
                            max="4200"
                            className="mt-1"
                            onInput={(e) => {
                              setMssr(e.currentTarget.value);
                              debouncedPercent(
                                e.currentTarget.value,
                                setMssr,
                                4200
                              );
                              if (editing) setHasEditedBitassetOptions(true);
                            }}
                          />
                        </div>
                      ) : null}
                      {!permDisableBSRMUpdate ? (
                        <div className="col-span-2">
                          <HoverInfo
                            content={t("CreateSmartcoin:bsrm.header_content")}
                            header={t("CreateSmartcoin:bsrm.header")}
                          />
                          <Select
                            onValueChange={(bsrmStrategy) => {
                              setBsrmStrategy(bsrmStrategy);
                              if (editing) setHasEditedBitassetOptions(true);
                            }}
                            value={bsrmStrategy}
                          >
                            <SelectTrigger className="mb-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              <SelectGroup>
                                <SelectItem value="0">
                                  {t("CreateSmartcoin:bsrm.select_0")}
                                </SelectItem>
                                <SelectItem value="1">
                                  {t("CreateSmartcoin:bsrm.select_1")}
                                </SelectItem>
                                <SelectItem value="2">
                                  {t("CreateSmartcoin:bsrm.select_2")}
                                </SelectItem>
                                <SelectItem value="3">
                                  {t("CreateSmartcoin:bsrm.select_3")}
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}

                      <span className="col-span-2 w-3/4">
                        <AssetFlag
                          alreadyDisabled={false}
                          id={"margin_call_fee_ratio"}
                          allowedText={t(
                            "CreateSmartcoin:extensions.margin_call_fee_ratio.enabled"
                          )}
                          enabledInfo={t(
                            "CreateSmartcoin:extensions.margin_call_fee_ratio.extensionInfo"
                          )}
                          disabledText={t(
                            "CreateSmartcoin:extensions.margin_call_fee_ratio.disabled"
                          )}
                          disabledInfo={t(
                            "CreateSmartcoin:extensions.margin_call_fee_ratio.extensionInfo"
                          )}
                          permission={true}
                          flag={mcfrExtensionEnabled}
                          setFlag={setMcfrExtensionEnabled}
                        />
                        {mcfrExtensionEnabled ? (
                          <div className="col-span-2">
                            <HoverInfo
                              content={t(
                                "CreateSmartcoin:extensions.margin_call_fee_ratio.header_content"
                              )}
                              header={t(
                                "CreateSmartcoin:extensions.margin_call_fee_ratio.header"
                              )}
                            />
                            <Input
                              value={marginCallFeeRatio}
                              type="number"
                              min="0"
                              max="100"
                              className="mt-1"
                              onInput={(e) => {
                                setMarginCallFeeRatio(e.currentTarget.value);
                                debouncedPercent(
                                  e.currentTarget.value,
                                  setMarginCallFeeRatio,
                                  100
                                );
                                if (editing) setHasEditedBitassetOptions(true);
                              }}
                            />
                          </div>
                        ) : null}
                      </span>

                      <span className="col-span-2 w-3/4">
                        <AssetFlag
                          alreadyDisabled={false}
                          id={"force_settle_fee"}
                          allowedText={t(
                            "CreateSmartcoin:extensions.force_settle_fee.enabled"
                          )}
                          enabledInfo={t(
                            "CreateSmartcoin:extensions.force_settle_fee.extensionInfo"
                          )}
                          disabledText={t(
                            "CreateSmartcoin:extensions.force_settle_fee.disabled"
                          )}
                          disabledInfo={t(
                            "CreateSmartcoin:extensions.force_settle_fee.extensionInfo"
                          )}
                          permission={true}
                          flag={fsfExtensionEnabled}
                          setFlag={setFsfExtensionEnabled}
                        />
                        {fsfExtensionEnabled ? (
                          <div className="col-span-2">
                            <HoverInfo
                              content={t(
                                "CreateSmartcoin:extensions.force_settle_fee.header_content"
                              )}
                              header={t(
                                "CreateSmartcoin:extensions.force_settle_fee.header"
                              )}
                            />
                            <Input
                              value={forceSettleFeePercent}
                              type="number"
                              min="0"
                              max="100"
                              className="mt-1"
                              onInput={(e) => {
                                setForceSettleFeePercent(e.currentTarget.value);
                                debouncedPercent(
                                  e.currentTarget.value,
                                  setForceSettleFeePercent,
                                  100
                                );
                                if (editing) setHasEditedBitassetOptions(true);
                              }}
                            />
                          </div>
                        ) : null}
                      </span>
                    </div>

                    <Separator className="my-4 mt-5" />
                  </div>
                ) : null}

                <div className="col-span-2 grid grid-cols-2">
                  <HoverInfo
                    content={t("AssetCommon:nft.main_header_content")}
                    header={t("AssetCommon:nft.main_header")}
                    type="header"
                  />
                  <div className={`text-right mb-${!enabledNFT ? 5 : 1}`}>
                    {!enabledNFT ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEnabledNFT(true);
                          setHasEditedAssetOptions(true);
                        }}
                        className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0"
                      >
                        {t("AssetCommon:nft.disabled")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEnabledNFT(false);
                          setHasEditedAssetOptions(true);
                        }}
                      >
                        {t("AssetCommon:nft.enabled")}
                      </Button>
                    )}
                  </div>
                </div>
                {enabledNFT ? (
                  <>
                    <div className="col-span-2 mb-3">
                      <Label>
                        {t("AssetCommon:nft.currentIPFSFiles", {
                          count: nftMedia.length,
                        })}
                      </Label>
                      <br />
                      <Label>{t("AssetCommon:nft.supportedFiletypes")}</Label>
                      <br />
                      <Dialog
                        onOpenChange={(open) => {
                          if (!open) {
                            setNewMediaUrl("");
                          }
                        }}
                      >
                        <DialogTrigger>
                          <Button className="h-8 mt-3" variant="outline">
                            {t("AssetCommon:nft.modifyMultimediaContents")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white w-full max-w-4xl bg-gray-100">
                          <DialogHeader>
                            <DialogTitle>
                              {t("AssetCommon:nft.modifyingMultimediaContents")}
                            </DialogTitle>
                          </DialogHeader>
                          <Card>
                            <CardHeader>
                              <CardTitle>
                                {t("AssetCommon:nft.currentIPFSMedia")}
                              </CardTitle>
                              <CardDescription>
                                {t("AssetCommon:nft.referencesIPFSObjects", {
                                  count: nftMedia.length,
                                })}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              {!nftMedia || !nftMedia.length ? (
                                <p>{t("AssetCommon:nft.noIPFSMediaFound")}</p>
                              ) : (
                                <>
                                  <div className="grid grid-cols-4">
                                    <div className="col-span-1">
                                      {t("AssetCommon:nft.type")}
                                    </div>
                                    <div className="col-span-1">
                                      {t("AssetCommon:nft.contentIdentifier")}
                                    </div>
                                    <div className="col-span-1">
                                      {t("AssetCommon:nft.filename")}
                                    </div>
                                    <div className="col-span-1">
                                      {t("AssetCommon:nft.delete")}
                                    </div>
                                  </div>
                                  <List
                                    width={"100%"}
                                    height={125}
                                    rowComponent={MediaRow}
                                    rowCount={nftMedia.length}
                                    rowHeight={25}
                                    rowProps={{}}
                                    className="w-full"
                                  />
                                </>
                              )}
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle>
                                {t("AssetCommon:nft.addNewIPFSMedia")}
                              </CardTitle>
                              <CardDescription>
                                {t("AssetCommon:nft.noIPFSGateway")}
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-4">
                                <div className="col-span-3 mr-3">
                                  <Input
                                    placeholder={t(
                                      "AssetCommon:nft.mediaURLPlaceholder"
                                    )}
                                    type="text"
                                    onInput={(e) =>
                                      setNewMediaUrl(e.currentTarget.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (
                                        e.key === "Enter" &&
                                        newMediaUrl &&
                                        newMediaType
                                      ) {
                                        const temp_urls = nftMedia.map(
                                          (x) => x.url
                                        );
                                        if (temp_urls.includes(newMediaUrl)) {
                                          console.log("Already exists");
                                          setNewMediaUrl("");
                                          return;
                                        }

                                        setNFTMedia(
                                          nftMedia && nftMedia.length
                                            ? [
                                                ...nftMedia,
                                                {
                                                  url: newMediaUrl,
                                                  type: newMediaType,
                                                },
                                              ]
                                            : [
                                                {
                                                  url: newMediaUrl,
                                                  type: newMediaType,
                                                },
                                              ]
                                        );
                                        setNewMediaUrl("");
                                      }
                                    }}
                                    value={newMediaUrl}
                                  />
                                </div>
                                <div className="col-span-1">
                                  <Select onValueChange={setNewMediaType}>
                                    <SelectTrigger className="w-[105px]">
                                      <SelectValue
                                        placeholder={t(
                                          "AssetCommon:nft.fileTypePlaceholder"
                                        )}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectLabel>
                                          {t("AssetCommon:nft.imageFormats")}
                                        </SelectLabel>
                                        <SelectItem value="PNG">PNG</SelectItem>
                                        <SelectItem value="WEBP">
                                          WEBP
                                        </SelectItem>
                                        <SelectItem value="JPEG">
                                          JPEG
                                        </SelectItem>
                                        <SelectItem value="GIF">GIF</SelectItem>
                                        <SelectItem value="TIFF">
                                          TIFF
                                        </SelectItem>
                                        <SelectItem value="BMP">BMP</SelectItem>
                                        <SelectLabel>
                                          {t("AssetCommon:nft.audioFormats")}
                                        </SelectLabel>
                                        <SelectItem value="MP3">MP3</SelectItem>
                                        <SelectItem value="MP4">MP4</SelectItem>
                                        <SelectItem value="M4A">M4A</SelectItem>
                                        <SelectItem value="OGG">OGG</SelectItem>
                                        <SelectItem value="FLAC">
                                          FLAC
                                        </SelectItem>
                                        <SelectItem value="WAV">WAV</SelectItem>
                                        <SelectItem value="WMA">WMA</SelectItem>
                                        <SelectItem value="AAC">AAC</SelectItem>
                                        <SelectLabel>
                                          {t("AssetCommon:nft.videoFormats")}
                                        </SelectLabel>
                                        <SelectItem value="WEBM">
                                          WEBM
                                        </SelectItem>
                                        <SelectItem value="MOV">MOV</SelectItem>
                                        <SelectItem value="QT">QT</SelectItem>
                                        <SelectItem value="AVI">AVI</SelectItem>
                                        <SelectItem value="WMV">WMV</SelectItem>
                                        <SelectItem value="MPEG">
                                          MPEG
                                        </SelectItem>
                                        <SelectLabel>
                                          {t("AssetCommon:nft.documentFormats")}
                                        </SelectLabel>
                                        <SelectItem value="PDF">PDF</SelectItem>
                                        <SelectItem value="DOCX">
                                          DOCX
                                        </SelectItem>
                                        <SelectItem value="ODT">ODT</SelectItem>
                                        <SelectItem value="XLSX">
                                          XLSX
                                        </SelectItem>
                                        <SelectItem value="ODS">ODS</SelectItem>
                                        <SelectItem value="PPTX">
                                          PPTX
                                        </SelectItem>
                                        <SelectItem value="TXT">TXT</SelectItem>
                                        <SelectLabel>
                                          {t("AssetCommon:nft.threeDFormats")}
                                        </SelectLabel>
                                        <SelectItem value="OBJ">OBJ</SelectItem>
                                        <SelectItem value="FBX">FBX</SelectItem>
                                        <SelectItem value="GLTF">
                                          GLTF
                                        </SelectItem>
                                        <SelectItem value="3DS">3DS</SelectItem>
                                        <SelectItem value="STL">STL</SelectItem>
                                        <SelectItem value="COLLADA">
                                          COLLADA
                                        </SelectItem>
                                        <SelectItem value="3MF">3MF</SelectItem>
                                        <SelectItem value="BLEND">
                                          BLEND
                                        </SelectItem>
                                        <SelectItem value="SKP">SKP</SelectItem>
                                        <SelectItem value="VOX">VOX</SelectItem>
                                      </SelectGroup>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="col-span-4">
                                  {newMediaType &&
                                  newMediaType.length &&
                                  newMediaUrl &&
                                  newMediaUrl.length ? (
                                    <Button
                                      className="mt-3"
                                      onClick={() => {
                                        const temp_urls = nftMedia.map(
                                          (x) => x.url
                                        );
                                        if (temp_urls.includes(newMediaUrl)) {
                                          console.log("Already exists");
                                          setNewMediaUrl("");
                                          return;
                                        }

                                        setNFTMedia([
                                          ...nftMedia,
                                          {
                                            url: newMediaUrl,
                                            type: newMediaType,
                                          },
                                        ]);
                                        setNewMediaUrl("");
                                      }}
                                    >
                                      {t("AssetCommon:nft.submit")}
                                    </Button>
                                  ) : (
                                    <Button className="mt-3" disabled>
                                      {t("AssetCommon:nft.submit")}
                                    </Button>
                                  )}
                                  <Dialog>
                                    <DialogTrigger>
                                      <Button className="mt-3 ml-3">
                                        {t(
                                          "AssetCommon:nft.ipfsHostingSolutions"
                                        )}
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="bg-white">
                                      <DialogHeader>
                                        <DialogTitle>
                                          {t(
                                            "AssetCommon:nft.ipfsHostingSolutions"
                                          )}
                                        </DialogTitle>
                                        <DialogDescription>
                                          {t(
                                            "AssetCommon:nft.ipfsHostingDescription"
                                          )}
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="grid grid-cols-3 gap-3">
                                        <ExternalLink
                                          classnamecontents="hover:text-purple-500"
                                          type="button"
                                          text={"Pinata.cloud"}
                                          hyperlink={
                                            "https://www.pinata.cloud/"
                                          }
                                        />
                                        <ExternalLink
                                          classnamecontents="hover:text-purple-500"
                                          type="button"
                                          text={"NFT.storage"}
                                          hyperlink={"https://nft.storage/"}
                                        />
                                        <ExternalLink
                                          classnamecontents="hover:text-purple-500"
                                          type="button"
                                          text={"Web3.storage"}
                                          hyperlink={"https://web3.storage/"}
                                        />
                                        <ExternalLink
                                          classnamecontents="hover:text-purple-500"
                                          type="button"
                                          text={"Fleek.co"}
                                          hyperlink={
                                            "https://fleek.co/ipfs-gateway/"
                                          }
                                        />
                                        <ExternalLink
                                          classnamecontents="hover:text-purple-500"
                                          type="button"
                                          text={"Infura.io"}
                                          hyperlink={
                                            "https://infura.io/product/ipfs"
                                          }
                                        />
                                        <ExternalLink
                                          classnamecontents="hover:text-purple-500"
                                          type="button"
                                          text={"StorJ"}
                                          hyperlink={
                                            "https://landing.storj.io/permanently-pin-with-storj-dcs"
                                          }
                                        />
                                        <ExternalLink
                                          classnamecontents="hover:text-purple-500"
                                          type="button"
                                          text={"Eternum.io"}
                                          hyperlink={"https://www.eternum.io/"}
                                        />
                                        <ExternalLink
                                          classnamecontents="hover:text-purple-500"
                                          type="button"
                                          text={"IPFS Docs"}
                                          hyperlink={
                                            "https://blog.ipfs.io/2021-04-05-storing-nfts-on-ipfs/"
                                          }
                                        />
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="col-span-2 mb-2">
                      <HoverInfo
                        content={t("AssetCommon:nft.header_content")}
                        header={t("AssetCommon:nft.header")}
                        type="header"
                      />
                      <div className="grid grid-cols-2 gap-5">
                        <div className="col-span-1">
                          <HoverInfo
                            content={t("AssetCommon:nft.NFTTitleContent")}
                            header={t("AssetCommon:nft.NFTTitleHeader")}
                          />
                          <Input
                            placeholder={t("AssetCommon:nft.TitlePlaceholder")}
                            value={title}
                            type="text"
                            onInput={(e) => setTitle(e.currentTarget.value)}
                          />
                          <HoverInfo
                            content={t("AssetCommon:nft.NFTArtistContent")}
                            header={t("AssetCommon:nft.NFTArtistHeader")}
                          />
                          <Input
                            placeholder={t("AssetCommon:nft.ArtistPlaceholder")}
                            value={artist}
                            type="text"
                            onInput={(e) => setArtist(e.currentTarget.value)}
                          />
                          <HoverInfo
                            content={t("AssetCommon:nft.NFTNarrativeContent")}
                            header={t("AssetCommon:nft.NFTNarrativeHeader")}
                          />
                          <Input
                            placeholder={t(
                              "AssetCommon:nft.NarrativePlaceholder"
                            )}
                            value={narrative}
                            type="text"
                            onInput={(e) => setNarrative(e.currentTarget.value)}
                          />
                          <HoverInfo
                            content={t("AssetCommon:nft.NFTTagsContent")}
                            header={t("AssetCommon:nft.NFTTagsHeader")}
                          />
                          <Input
                            placeholder={t("AssetCommon:nft.TagsPlaceholder")}
                            value={tags}
                            type="text"
                            onInput={(e) => setTags(e.currentTarget.value)}
                          />
                          <HoverInfo
                            content={t("AssetCommon:nft.NFTTypeContent")}
                            header={t("AssetCommon:nft.NFTTypeHeader")}
                          />
                          <Input
                            placeholder={t("AssetCommon:nft.TypePlaceholder")}
                            value={type}
                            type="text"
                            onInput={(e) => setType(e.currentTarget.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <HoverInfo
                            content={t("AssetCommon:nft.NFTAttestationContent")}
                            header={t("AssetCommon:nft.NFTAttestationHeader")}
                          />
                          <Input
                            placeholder={t(
                              "AssetCommon:nft.AttestationPlaceholder"
                            )}
                            value={attestation}
                            type="text"
                            onInput={(e) =>
                              setAttestation(e.currentTarget.value)
                            }
                          />
                          <HoverInfo
                            content={t(
                              "AssetCommon:nft.NFTAcknowledgementsContent"
                            )}
                            header={t(
                              "AssetCommon:nft.NFTAcknowledgementsHeader"
                            )}
                          />
                          <Input
                            placeholder={t(
                              "AssetCommon:nft.AcknowledgementsPlaceholder"
                            )}
                            value={acknowledgements}
                            type="text"
                            onInput={(e) =>
                              setAcknowledgements(e.currentTarget.value)
                            }
                          />
                          <HoverInfo
                            content={t(
                              "AssetCommon:nft.NFTHolderLicenseContent"
                            )}
                            header={t("AssetCommon:nft.NFTHolderLicenseHeader")}
                          />
                          <Input
                            placeholder={t(
                              "AssetCommon:nft.HolderLicensePlaceholder"
                            )}
                            value={holderLicense}
                            type="text"
                            onInput={(e) =>
                              setHolderLicense(e.currentTarget.value)
                            }
                          />
                          <HoverInfo
                            content={t("AssetCommon:nft.NFTLicenseContent")}
                            header={t("AssetCommon:nft.NFTLicenseHeader")}
                          />
                          <Input
                            placeholder={t(
                              "AssetCommon:nft.LicensePlaceholder"
                            )}
                            value={license}
                            type="text"
                            onInput={(e) => setLicense(e.currentTarget.value)}
                          />
                        </div>
                      </div>
                      <Separator className="my-4 mt-5" />
                    </div>
                  </>
                ) : null}

                <div className="col-span-2">
                  {editing &&
                  !hasEditedAssetOptions &&
                  !hasEditedBitassetOptions ? (
                    <Button className="h-8" disabled>
                      {t("CreateUIA:buttons.submit")}
                    </Button>
                  ) : (
                    <Button
                      className="h-8"
                      onClick={() => {
                        setShowDialog(true);
                      }}
                    >
                      {t("CreateUIA:buttons.submit")}
                    </Button>
                  )}
                </div>
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
