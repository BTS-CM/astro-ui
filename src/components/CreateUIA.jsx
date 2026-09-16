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
  Card,
  CardContent,
} from "@/components/ui/card";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";

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

import SectionHeader from "@/components/asset-form/SectionHeader.jsx";

import {
  Hash,
  ShieldCheck,
  Settings,
  Image,
  Gem,
  Send,
} from "lucide-react";

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

export default function UIA(properties) {
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
  const [permWhiteList, setPermWhiteList] = useState(true);
  const [permTransferRestricted, setPermTransferRestricted] = useState(true);
  const [permDisableConfidential, setPermDisableConfidential] = useState(true);
  const [permChargeMarketFee, setPermChargeMarketFee] = useState(true);
  const [permOverrideAuthority, setPermOverrideAuthority] = useState(true);

  // Initializing flags
  const [flagWhiteList, setFlagWhiteList] = useState(false);
  const [flagTransferRestricted, setFlagTransferRestricted] = useState(false);
  const [flagDisableConfidential, setFlagDisableConfidential] = useState(false);
  const [flagChargeMarketFee, setFlagChargeMarketFee] = useState(false);
  const [flagOverrideAuthority, setFlagOverrideAuthority] = useState(false);

  const [whitelistAuthorities, setWhitelistAuthorities] = useState([]); // whitelist_authorities
  const [blacklistAuthorities, setBlacklistAuthorities] = useState([]); // blacklist_authorities

  // Extensions
  const [enabledReferrerReward, setEnabledReferrerReward] = useState(false); // reward_percent
  const [enabledFeeSharingWhitelist, setEnabledFeeSharingWhitelist] =
    useState(false); // whitelist_market_fee_sharing
  const [enabledTakerFee, setEnabledTakerFee] = useState(false); // taker_fee_percent

  const [referrerReward, setReferrerReward] = useState(0); // reward_percent
  const [feeSharingWhitelist, setFeeSharingWhitelist] = useState([]); // whitelist_market_fee_sharing
  const [takerFee, setTakerFee] = useState(0); // taker_fee_percent

  usePermissionFlagCascade([
    { perm: permWhiteList, setFlag: setFlagWhiteList },
    { perm: permTransferRestricted, setFlag: setFlagTransferRestricted },
    { perm: permDisableConfidential, setFlag: setFlagDisableConfidential },
    { perm: permChargeMarketFee, setFlag: setFlagChargeMarketFee },
    { perm: permOverrideAuthority, setFlag: setFlagOverrideAuthority },
  ]);

  const [showDialog, setShowDialog] = useState(false);

  const issuer_permissions = useMemo(() => {
    return getPermissions(
      {
        // user configurable
        white_list: permWhiteList,
        transfer_restricted: permTransferRestricted,
        disable_confidential: permDisableConfidential,
        charge_market_fee: permChargeMarketFee,
        override_authority: permOverrideAuthority,
      },
      true
    );
  }, [
    permWhiteList,
    permTransferRestricted,
    permDisableConfidential,
    permChargeMarketFee,
    permOverrideAuthority,
  ]);

  const flags = useMemo(() => {
    return getFlags({
      // user configurable
      white_list: flagWhiteList,
      transfer_restricted: flagTransferRestricted,
      disable_confidential: flagDisableConfidential,
      charge_market_fee: flagChargeMarketFee,
      override_authority: flagOverrideAuthority,
    });
  }, [
    flagWhiteList,
    flagTransferRestricted,
    flagDisableConfidential,
    flagChargeMarketFee,
    flagOverrideAuthority,
  ]);

  const [market, setMarket] = useState("BTS"); // preferred market
  const [commission, setCommission] = useState(0); // market_fee_percent
  const [maxCommission, setMaxCommission] = useState(0); // max_market_fee
  const [cerBaseAmount, setCerBaseAmount] = useState(1);
  const [cerQuoteAmount, setCerQuoteAmount] = useState(1);

  // NFT info
  const [enabledNFT, setEnabledNFT] = useState(false);

  // Extensions (market filtering + authorities + fee extensions)
  const [enabledExtensions, setEnabledExtensions] = useState(false);
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
  const [existingAssetID, setExistingAssetID] = useState(); // existing asset ID

  const trx = useMemo(() => {
    let _extensions = {};
    if (enabledReferrerReward) {
      _extensions.reward_percent = referrerReward ? referrerReward * 100 : 0;
    }
    if (enabledFeeSharingWhitelist) {
      _extensions.whitelist_market_fee_sharing = feeSharingWhitelist.map(
        (x) => x.id
      );
    }
    if (enabledTakerFee) {
      _extensions.taker_fee_percent = takerFee ? takerFee * 100 : 0;
    }

    let _trxContents = { issuer: usr.id, extensions: {} };

    _trxContents[editing ? "new_options" : "common_options"] = {
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
          asset_id: existingAssetID ?? "1.3.1",
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
      extensions: _extensions,
    };

    if (editing) {
      _trxContents["asset_to_update"] = existingAssetID;
    } else {
      _trxContents["symbol"] = symbol;
      _trxContents["precision"] = precision;
    }

    return _trxContents;
  }, [
    usr,
    assets,
    symbol,
    precision,
    description,
    maxSupply,
    commission,
    maxCommission,
    issuer_permissions,
    flags,
    flagWhiteList,
    whitelistAuthorities,
    blacklistAuthorities,
    allowedMarkets,
    bannedMarkets,
    cerBaseAmount,
    cerQuoteAmount,
    enabledReferrerReward,
    enabledFeeSharingWhitelist,
    enabledTakerFee,
    referrerReward,
    feeSharingWhitelist,
    takerFee,
    existingAssetID,
    editing,
  ]);

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

  const [permanentlyDisabledCMF, setPermanentlyDisabledCMF] = useState(false);
  const [permanentlyDisabledDC, setPermanentlyDisabledDC] = useState(false);
  const [permanentlyDisabledOA, setPermanentlyDisabledOA] = useState(false);
  const [permanentlyDisabledTR, setPermanentlyDisabledTR] = useState(false);
  const [permanentlyDisabledWL, setPermanentlyDisabledWL] = useState(false);
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
          if (!propsAsset || (propsAsset && propsAsset.bitasset_data_id)) {
            return;
          }
          setEditing(true);
          setExistingAssetID(propsAsset.id);

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

          // NFT logic
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
          // End of NFT logic

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

          if (_issuer_permissions.charge_market_fee) {
            setPermChargeMarketFee(true);
          } else {
            setPermChargeMarketFee(false);
            setPermanentlyDisabledCMF(true);
          }
          if (_issuer_permissions.disable_confidential) {
            setPermDisableConfidential(true);
          } else {
            setPermDisableConfidential(false);
            setPermanentlyDisabledDC(true);
          }
          if (_issuer_permissions.override_authority) {
            setPermOverrideAuthority(true);
          } else {
            setPermOverrideAuthority(false);
            setPermanentlyDisabledOA(true);
          }
          if (_issuer_permissions.transfer_restricted) {
            setPermTransferRestricted(true);
          } else {
            setPermTransferRestricted(false);
            setPermanentlyDisabledTR(true);
          }
          if (_issuer_permissions.white_list) {
            setPermWhiteList(true);
          } else {
            setPermWhiteList(false);
            setPermanentlyDisabledWL(true);
          }

          if (_flags.charge_market_fee) {
            setFlagChargeMarketFee(true);
          } else {
            setFlagChargeMarketFee(false);
          }
          if (_flags.disable_confidential) {
            setFlagDisableConfidential(true);
          } else {
            setFlagDisableConfidential(false);
          }
          if (_flags.override_authority) {
            setFlagOverrideAuthority(true);
          } else {
            setFlagOverrideAuthority(false);
          }
          if (_flags.transfer_restricted) {
            setFlagTransferRestricted(true);
          } else {
            setFlagTransferRestricted(false);
          }
          if (_flags.white_list) {
            setFlagWhiteList(true);
          } else {
            setFlagWhiteList(false);
          }

          if (propsAsset.options.extensions.reward_percent) {
            setEnabledReferrerReward(true);
            setReferrerReward(
              propsAsset.options.extensions.reward_percent / 100
            );
          }

          if (propsAsset.options.extensions.whitelist_market_fee_sharing) {
            setEnabledFeeSharingWhitelist(true);
            setFeeSharingWhitelist(
              propsAsset.options.extensions.whitelist_market_fee_sharing
            );
          }

          if (propsAsset.options.extensions.taker_fee_percent) {
            setEnabledTakerFee(true);
            setTakerFee(propsAsset.options.extensions.taker_fee_percent / 100);
          }

          // Detect if extensions should be enabled based on existing flags/markets
          if (
            _flags.charge_market_fee ||
            _flags.white_list ||
            (propsAsset.options.whitelist_markets && propsAsset.options.whitelist_markets.length > 0) ||
            (propsAsset.options.blacklist_markets && propsAsset.options.blacklist_markets.length > 0)
          ) {
            setEnabledExtensions(true);
          }

          // Detect if NFT should be enabled based on description containing nft_object
          if (propsAsset.options.description && propsAsset.options.description.includes("nft_object")) {
            setEnabledNFT(true);
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
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-2)/0.7)] to-transparent" />
            <span aria-hidden="true" className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-2)/0.15)] blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-3)/0.12)] blur-3xl" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--accent-2)/0.30)] to-[hsl(var(--accent-3)/0.30)] border border-[hsl(var(--accent-2)/0.40)] text-[hsl(var(--accent-2-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-2)/0.4)]">
                <Gem className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {t(
                    !editing
                      ? "CreateUIA:card.title_create"
                      : "CreateUIA:card.title_edit"
                  )}
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("CreateUIA:card.description")}
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
            <CardContent className="p-6">
                  <HoverInfo
                    content={t("AssetCommon:asset_details.title_content")}
                    header={t("AssetCommon:asset_details.title")}
                    type="header"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <HoverInfo
                        content={t(
                          "AssetCommon:asset_details.symbol.header_content"
                        )}
                        header={t("AssetCommon:asset_details.symbol.header")}
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
                    </div>
                    <div>
                      <HoverInfo
                        content={t(
                          "AssetCommon:asset_details.precision.header_content"
                        )}
                        header={t("AssetCommon:asset_details.precision.header")}
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
                      ) : (
                        <Input
                          placeholder={precision}
                          type="number"
                          disabled
                          className="mt-1"
                        />
                      )}
                    </div>
                  </div>

                  <HoverInfo
                    content={t(
                      "AssetCommon:asset_details.description.header_content"
                    )}
                    header={t("AssetCommon:asset_details.description.header")}
                  />
                  <Textarea
                    placeholder={t(
                      "AssetCommon:asset_details.description.placeholder"
                    )}
                    value={desc}
                    onInput={(e) => setDesc(e.currentTarget.value)}
                    className="mt-1"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-3">
                    <div>
                      <HoverInfo
                        content={t(
                          "AssetCommon:asset_details.shortName.header_content"
                        )}
                        header={t("AssetCommon:asset_details.shortName.header")}
                      />
                      <Input
                        placeholder={t(
                          "AssetCommon:asset_details.shortName.placeholder"
                        )}
                        value={shortName}
                        type="text"
                        onInput={(e) => setShortName(e.currentTarget.value)}
                        className="mt-1"
                      />
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-3">
                    <div>
                      <HoverInfo
                        content={t(
                          "AssetCommon:cer.quote_asset_amount.header_content"
                        )}
                        header={t("AssetCommon:cer.quote_asset_amount.header")}
                      />
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
                    </div>
                    <div>
                      <HoverInfo
                        content={t(
                          "AssetCommon:cer.base_asset_amount.header_content",
                          {
                            symbol: "BTS",
                          }
                        )}
                        header={t("AssetCommon:cer.base_asset_amount.header")}
                      />
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
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20">
            <SectionHeader
              icon={ShieldCheck}
              title={t("AssetCommon:permissions.header")}
              description={t("AssetCommon:permissions.header_content")}
              step={2}
            />
            <CardContent className="p-6">
                 <PermissionsFlagsPanel
                   permissions={[
                     { id: "charge_market_fee", alreadyDisabled: permanentlyDisabledCMF, perm: permChargeMarketFee, setPerm: setPermChargeMarketFee, flag: flagChargeMarketFee, setFlag: setFlagChargeMarketFee },
                     { id: "white_list", alreadyDisabled: permanentlyDisabledWL, perm: permWhiteList, setPerm: setPermWhiteList, flag: flagWhiteList, setFlag: setFlagWhiteList },
                     { id: "transfer_restricted", alreadyDisabled: permanentlyDisabledTR, perm: permTransferRestricted, setPerm: setPermTransferRestricted, flag: flagTransferRestricted, setFlag: setFlagTransferRestricted },
                     { id: "disable_confidential", alreadyDisabled: permanentlyDisabledDC, perm: permDisableConfidential, setPerm: setPermDisableConfidential, flag: flagDisableConfidential, setFlag: setFlagDisableConfidential },
                     { id: "override_authority", alreadyDisabled: permanentlyDisabledOA, perm: permOverrideAuthority, setPerm: setPermOverrideAuthority, flag: flagOverrideAuthority, setFlag: setFlagOverrideAuthority },
                   ]}
                    flags={[
                      { id: "charge_market_fee_flag", key: "charge_market_fee", alreadyDisabled: permanentlyDisabledCMF, flag: flagChargeMarketFee, setFlag: setFlagChargeMarketFee, permission: permChargeMarketFee },
                      { id: "white_list_flag", key: "white_list", alreadyDisabled: permanentlyDisabledWL, flag: flagWhiteList, setFlag: setFlagWhiteList, permission: permWhiteList },
                      { id: "transfer_restricted_flag", key: "transfer_restricted", alreadyDisabled: permanentlyDisabledTR, flag: flagTransferRestricted, setFlag: setFlagTransferRestricted, permission: permTransferRestricted },
                      { id: "disable_confidential_flag", key: "disable_confidential", alreadyDisabled: permanentlyDisabledDC, flag: flagDisableConfidential, setFlag: setFlagDisableConfidential, permission: permDisableConfidential },
                      { id: "override_authority_flag", key: "override_authority", alreadyDisabled: permanentlyDisabledOA, flag: flagOverrideAuthority, setFlag: setFlagOverrideAuthority, permission: permOverrideAuthority },
                    ]}
                   issuerPermissions={issuer_permissions}
                   flagsValue={flags}
                 />
            </CardContent>
          </Card>

          <Card
            className={
              "overflow-hidden border-border bg-card/60 backdrop-blur-xl shadow-lg shadow-black/20 transition-colors " +
              (enabledExtensions ? "ring-1 ring-[hsl(var(--accent-1)/0.3)]" : "")
            }
          >
            <SectionHeader
              icon={Settings}
              title={t("AssetCommon:extensions.header")}
              description={t("AssetCommon:extensions.header_content")}
              step={3}
              optional
              right={
                <Switch
                  checked={enabledExtensions}
                  onCheckedChange={setEnabledExtensions}
                  className="mt-1 shrink-0 data-[state=checked]:bg-[hsl(var(--accent-1))] data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-white/[0.12] [&>span]:bg-white"
                />
              }
            />
            {enabledExtensions && (
              <CardContent className="space-y-6 p-6">
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
              </CardContent>
            )}
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
              <CardContent className="p-6">
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
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  className="h-10 px-8 bg-gradient-to-r from-[hsl(var(--accent-2))] to-[hsl(var(--accent-3))] hover:from-[hsl(var(--accent-2))] hover:to-[hsl(var(--accent-3))] text-white dark:text-white shadow-md shadow-[color:hsl(var(--accent-2)/0.30)]"
                  onClick={() => {
                    setShowDialog(true);
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {t("CreateUIA:buttons.submit")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {showDialog ? (
        <DeepLinkDialog
          operationNames={editing ? ["asset_update"] : ["asset_create"]}
          username={usr.username}
          usrChain={usr.chain}
          userID={usr.id}
          dismissCallback={setShowDialog}
          key={`${editing ? "Editing" : "Creating"}UIA-${usr.id}-${symbol}`}
          headerText={t("CreateUIA:dialogContent.headerText", { symbol })}
          trxJSON={[trx]}
        />
      ) : null}
    </>
  );
}
