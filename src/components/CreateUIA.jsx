import React, { useState, useEffect, useSyncExternalStore, useMemo, useCallback } from "react";
import { useStore } from '@nanostores/react';
import { FixedSizeList as List } from "react-window";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
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

import HoverInfo from "@/components/common/HoverInfo.tsx";
import AssetPermission from "@/components/common/AssetPermission.tsx";
import AssetFlag from "@/components/common/AssetFlag.tsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx"

import AccountSearch from "@/components/AccountSearch.jsx";
import { Avatar } from "./Avatar.tsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import { $assetCacheBTS, $assetCacheTEST } from "@/stores/cache.ts";
import { $marketSearchCacheBTS, $marketSearchCacheTEST } from "@/stores/cache.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import {
    getPermissions,
    getFlags,
    debounce,
    humanReadableFloat,
    blockchainFloat,
    getFlagBooleans
} from "@/lib/common.js";

export default function UIA(properties) {
    const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
    const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);
    const currentNode = useStore($currentNode);

    const _assetsBTS = useSyncExternalStore($assetCacheBTS.subscribe, $assetCacheBTS.get, () => true);
    const _assetsTEST = useSyncExternalStore(
      $assetCacheTEST.subscribe,
      $assetCacheTEST.get,
      () => true
    );
    
    const _marketSearchBTS = useSyncExternalStore(
      $marketSearchCacheBTS.subscribe,
      $marketSearchCacheBTS.get,
      () => true
    );
  
    const _marketSearchTEST = useSyncExternalStore(
      $marketSearchCacheTEST.subscribe,
      $marketSearchCacheTEST.get,
      () => true
    );
    
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
    
    useInitCache(_chain ?? "bitshares", ["assets", "marketSearch"]);  

    const assets = useMemo(() => {
        if (_chain && (_assetsBTS || _assetsTEST)) {
          return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
        }
        return [];
    }, [_assetsBTS, _assetsTEST, _chain]);

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
    const [enabledFeeSharingWhitelist, setEnabledFeeSharingWhitelist] = useState(false); // whitelist_market_fee_sharing
    const [enabledTakerFee, setEnabledTakerFee] = useState(false); // taker_fee_percent

    const [referrerReward, setReferrerReward] = useState(0); // reward_percent
    const [feeSharingWhitelist, setFeeSharingWhitelist] = useState([]); // whitelist_market_fee_sharing
    const [takerFee, setTakerFee] = useState(0); // taker_fee_percent

    useEffect(() => {
        if (!permWhiteList) {
            setFlagWhiteList(false);
        }
    }, [permWhiteList]);

    useEffect(() => {
        if (!permTransferRestricted) {
            setFlagTransferRestricted(false);
        }
    }, [permTransferRestricted]);

    useEffect(() => {
        if (!permDisableConfidential) {
            setFlagDisableConfidential(false);
        }
    }, [permDisableConfidential]);

    useEffect(() => {
        if (!permChargeMarketFee) {
            setFlagChargeMarketFee(false);
        }
    }, [permChargeMarketFee]);

    useEffect(() => {
        if (!permOverrideAuthority) {
            setFlagOverrideAuthority(false);
        }
    }, [permOverrideAuthority]);

    const [showDialog, setShowDialog] = useState(false);

    const issuer_permissions = useMemo(() => {
        return getPermissions(
            {
                // user configurable
                white_list: permWhiteList,
                transfer_restricted: permTransferRestricted,
                disable_confidential: permDisableConfidential,
                charge_market_fee: permChargeMarketFee,
                override_authority: permOverrideAuthority
            },
            true
        );
    }, [
        permWhiteList,
        permTransferRestricted,
        permDisableConfidential,
        permChargeMarketFee,
        permOverrideAuthority
    ]);

    const flags = useMemo(() => {
        return getFlags({
            // user configurable
            white_list: flagWhiteList,
            transfer_restricted: flagTransferRestricted,
            disable_confidential: flagDisableConfidential,
            charge_market_fee: flagChargeMarketFee,
            override_authority: flagOverrideAuthority
        });
    }, [
        flagWhiteList,
        flagTransferRestricted,
        flagDisableConfidential,
        flagChargeMarketFee,
        flagOverrideAuthority
    ]);

    const [market, setMarket] = useState("BTS"); // preferred market
    const [commission, setCommission] = useState(0); // market_fee_percent
    const [maxCommission, setMaxCommission] = useState(0); // max_market_fee
    const [cerBaseAmount, setCerBaseAmount] = useState(1);
    const [cerQuoteAmount, setCerQuoteAmount] = useState(1);

    // Asset Update extensions
    /*
      {
         /// After BSIP48, the precision of an asset can be updated if no supply is available
         /// @note The parties involved still need to be careful
         fc::optional<uint8_t> new_precision;
         /// After BSIP48, if this option is set to true, the asset's core_exchange_rate won't be updated.
         /// This is especially useful for committee-owned bitassets which can not be updated quickly.
         fc::optional<bool> skip_core_exchange_rate;
      };
    */

    const description = useMemo(() => {
        return JSON.stringify({ main: desc, short_name: shortName, market });
    }, [desc, market, shortName]);

    const [editing, setEditing] = useState(false); // editing mode
    const [existingAssetID, setExistingAssetID] = useState(); // existing asset ID

    const trx = useMemo(() => {
        let _extensions = {};
        if (enabledReferrerReward) {
            _extensions.reward_percent = referrerReward ? referrerReward * 100 : 0;
        }
        if (enabledFeeSharingWhitelist) {
            _extensions.whitelist_market_fee_sharing = feeSharingWhitelist.map((x) => x.id);
        }
        if (enabledTakerFee) {
            _extensions.taker_fee_percent = takerFee ? takerFee * 100 : 0;
        }

        let _trxContents = { issuer: usr.id, extensions: {}};

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
                    asset_id: "1.3.0"
                },
                quote: {
                    amount: blockchainFloat(cerQuoteAmount, precision),
                    asset_id: existingAssetID ?? "1.3.1"
                }
            },
            whitelist_authorities: flagWhiteList && whitelistAuthorities && whitelistAuthorities.length
                                    ? whitelistAuthorities.map((x) => x.id)
                                    : [],
            blacklist_authorities: flagWhiteList && blacklistAuthorities && blacklistAuthorities.length
                                    ? blacklistAuthorities.map((x) => x.id)
                                    : [],
            whitelist_markets: allowedMarkets.map((x) => {
                const asset = assets.find((y) => y.id === x);
                return asset ? asset.id : null;
            }).filter((x) => x),
            blacklist_markets: bannedMarkets.map((x) => {
                const asset = assets.find((y) => y.id === x);
                return asset ? asset.id : null;
            }).filter((x) => x),
            extensions: _extensions
        };

        if (editing) {
            _trxContents["asset_to_update"] = existingAssetID;
        } else {
            _trxContents["symbol"] = symbol;
            _trxContents["precision"] = precision;
            _trxContents["is_prediction_market"] = false;
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
        editing
    ]);

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

    const [whitelistMarketFeeSharingDialogOpen, setWhitelistMarketFeeSharingDialogOpen] = useState(false);
    const [whitelistAuthorityDialogOpen, setWhitelistAuthorityDialogOpen] = useState(false);
    const [blacklistAuthorityDialogOpen, setBlacklistAuthorityDialogOpen] = useState(false);

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
                                    {
                                        currentAsset
                                            ? `${currentAsset.symbol} (${currentAsset.id})`
                                            : res
                                    }
                                </div>
                                <div className="text-sm">
                                    {t("Smartcoins:createdBy")} {issuer && issuer.u ? issuer.u : currentAsset.issuer}
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
                                    {
                                        currentAsset
                                            ? `${currentAsset.symbol} (${currentAsset.id})`
                                            : res
                                    }
                                </div>
                                <div className="text-sm">
                                    {t("Smartcoins:createdBy")} {issuer && issuer.u ? issuer.u : currentAsset.issuer}
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
                        size={40} name={res.name} extra="Borrower"
                        expression={{ eye: "normal", mouth: "open" }}
                        colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
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
                                const _update = feeSharingWhitelist.filter((x) => x.id !== res.id);
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
                        size={40} name={res.name} extra="Borrower"
                        expression={{ eye: "normal", mouth: "open" }}
                        colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
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
                            const _update = whitelistAuthorities.filter((x) => x.id !== res.id);
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
                        size={40} name={res.name ? res.name : ""} extra="Borrower"
                        expression={{ eye: "normal", mouth: "open" }}
                        colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                    />
                    </span>
                    <span className="col-span-9 ml-3">
                        {
                            res.name
                                ? `#${index + 1}: ${res.name} (${res.id})`
                                : `#${index + 1}: ${res.id}`
                        }
                    </span>
                    <span className="col-span-1">
                    <Button
                        variant="outline"
                        className="mr-2"
                        onClick={(e) => {
                            e.preventDefault();
                            const _update = blacklistAuthorities.filter((x) => x.id !== res.id);
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
    }

    const [permanentlyDisabledCMF, setPermanentlyDisabledCMF] = useState(false);
    const [permanentlyDisabledDC, setPermanentlyDisabledDC] = useState(false);
    const [permanentlyDisabledOA, setPermanentlyDisabledOA] = useState(false);
    const [permanentlyDisabledTR, setPermanentlyDisabledTR] = useState(false);
    const [permanentlyDisabledWL, setPermanentlyDisabledWL] = useState(false);
    useEffect(() => {
        const urlSearchParams = new URLSearchParams(window.location.search);
        const params = Object.fromEntries(urlSearchParams.entries());
    
        async function fetching() {
            const _store = createObjectStore([_chain, JSON.stringify([params.id]), currentNode ? currentNode.url : null]);
    
            _store.subscribe(({ data, error, loading }) => {
                if (data && !error && !loading) {
                    const propsAsset = data && data.length ? data[0] : null;
                    if (!propsAsset || propsAsset && propsAsset.bitasset_data_id) {
                        return;
                    }
                    setEditing(true);
                    setExistingAssetID(propsAsset.id);

                    setSymbol(propsAsset.symbol);
                    setPrecision(propsAsset.precision);
                    setMaxSupply(humanReadableFloat(propsAsset.options.max_supply, propsAsset.precision));

                    const desc = propsAsset.options.description;
                    const parsedJSON = desc && desc.length && desc.includes("main")
                        ? JSON.parse(desc)
                        : null;
                    setShortName(parsedJSON && parsedJSON.short_name ? parsedJSON.short_name : "");
                    setDesc(parsedJSON && parsedJSON.main ? parsedJSON.main : "");
                    setMarket(parsedJSON && parsedJSON.market ? parsedJSON.market : "");
                    setCommission(propsAsset.options.market_fee_percent / 100);
                    setMaxCommission(humanReadableFloat(propsAsset.options.max_market_fee, propsAsset.precision));

                    setAllowedMarketsEnabled(propsAsset.options.whitelist_markets.length > 0);
                    setBannedMarketsEnabled(propsAsset.options.blacklist_markets.length > 0);
                    setAllowedMarkets(propsAsset.options.whitelist_markets);
                    setBannedMarkets(propsAsset.options.blacklist_markets);
                    setWhitelistAuthorities(propsAsset.options.whitelist_authorities.map((x) => {
                        return {
                            id: x,
                            name: ""
                        }
                    }));
                    setBlacklistAuthorities(propsAsset.options.blacklist_authorities.map((x) => {
                        return {
                            id: x,
                            name: ""
                        }
                    }));

                    const _flags = getFlagBooleans(propsAsset.options.flags);
                    const _issuer_permissions = getFlagBooleans(propsAsset.options.issuer_permissions);

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
                        setReferrerReward(propsAsset.options.extensions.reward_percent / 100);
                    }

                    if (propsAsset.options.extensions.whitelist_market_fee_sharing) {
                        setEnabledFeeSharingWhitelist(true);
                        setFeeSharingWhitelist(propsAsset.options.extensions.whitelist_market_fee_sharing);
                    }

                    if (propsAsset.options.extensions.taker_fee_percent) {
                        setEnabledTakerFee(true);
                        setTakerFee(propsAsset.options.extensions.taker_fee_percent / 100);
                    }

                    setCerBaseAmount(
                        humanReadableFloat(propsAsset.options.core_exchange_rate.base.amount, 5)
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
            <div className="container mx-auto mt-5 mb-5">
                <div className="grid grid-cols-1 gap-3">
                    <Card>
                        <CardHeader className="pb-1">
                            <CardTitle>🍬 {t(!editing ? "CreateUIA:card.title_create" : "CreateUIA:card.title_edit")}</CardTitle>
                            <CardDescription>{t("CreateUIA:card.description")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2">
                                <div className="col-span-2">
                                    <HoverInfo
                                        content={t("AssetCommon:asset_details.title_content")}
                                        header={t("AssetCommon:asset_details.title")}
                                        type="header"
                                    />
                                    
                                    <div className="grid grid-cols-3 gap-5">
                                        <div>
                                            <HoverInfo
                                                content={t("AssetCommon:asset_details.symbol.header_content")}
                                                header={t("AssetCommon:asset_details.symbol.header")}
                                            />
                                            {
                                                !editing
                                                    ? <Input
                                                        placeholder={t("AssetCommon:asset_details.symbol.placeholder")}
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
                                                    : <Input
                                                        placeholder={symbol}
                                                        type="text"
                                                        disabled
                                                        className="mt-1"
                                                    />
                                            }
                                            
                                        </div>
                                        
                                        <div>
                                            <HoverInfo
                                                content={t("AssetCommon:asset_details.max_supply.header_content")}
                                                header={t("AssetCommon:asset_details.max_supply.header")}
                                            />
                                            <Input
                                                placeholder={t("AssetCommon:asset_details.max_supply.placeholder")}
                                                value={maxSupply}
                                                type="number"
                                                onInput={(e) => {
                                                    const input = parseInt(e.currentTarget.value);
                                                    if (input >= 0) {
                                                        setMaxSupply(parseInt(e.currentTarget.value))
                                                    } else {
                                                        setMaxSupply(0);
                                                    }
                                                }}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <HoverInfo
                                                content={t("AssetCommon:asset_details.precision.header_content")}
                                                header={t("AssetCommon:asset_details.precision.header")}
                                            />
                                            {
                                                !editing
                                                ? <Input
                                                    placeholder={t("AssetCommon:asset_details.precision.placeholder")}
                                                    value={precision}
                                                    type="number"
                                                    onInput={(e) => {
                                                        const input = parseInt(e.currentTarget.value);
                                                        if (input >= 0 && input <= 8) {
                                                            setPrecision(parseInt(e.currentTarget.value))
                                                        } else if (input < 0) {
                                                            setPrecision(0);
                                                        } else {
                                                            setPrecision(8);
                                                        }
                                                    }}
                                                    className="mt-1"
                                                />
                                                : <Input
                                                    placeholder={precision}
                                                    type="number"
                                                    disabled
                                                    className="mt-1"
                                                />
                                            }
                                        </div>
                                    </div>

                                    <HoverInfo
                                        content={t("AssetCommon:asset_details.description.header_content")}
                                        header={t("AssetCommon:asset_details.description.header")}
                                    />
                                    <Textarea
                                        placeholder={t("AssetCommon:asset_details.description.placeholder")}
                                        value={desc}
                                        onInput={(e) => setDesc(e.currentTarget.value)}
                                        className="mt-1"
                                    />

                                    <div className="grid grid-cols-2 gap-5 mb-3">
                                        <div>
                                            <HoverInfo
                                                content={t("AssetCommon:asset_details.shortName.header_content")}
                                                header={t("AssetCommon:asset_details.shortName.header")}
                                            />
                                            <Input
                                                placeholder={t("AssetCommon:asset_details.shortName.placeholder")}
                                                value={shortName}
                                                type="text"
                                                onInput={(e) => setShortName(e.currentTarget.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <HoverInfo
                                                content={t("AssetCommon:asset_details.preferredMarket.header_content")}
                                                header={t("AssetCommon:asset_details.preferredMarket.header")}
                                            />
                                            <div className="grid grid-cols-2 gap-3 mt-1">
                                                <Input
                                                    placeholder={market}
                                                    disabled
                                                    type="text"
                                                />
                                                <AssetDropDown
                                                    assetSymbol={""}
                                                    assetData={null}
                                                    storeCallback={setMarket}
                                                    otherAsset={null}
                                                    marketSearch={marketSearch}
                                                    type={"backing"}
                                                    chain={usr && usr.chain ? usr.chain : "bitshares"}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-5 mb-3">
                                        <div>
                                            <HoverInfo
                                                content={t("AssetCommon:cer.quote_asset_amount.header_content")}
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
                                                content={t("AssetCommon:cer.base_asset_amount.header_content", {symbol: "BTS"})}
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
                                                content={t("AssetCommon:cer.calculated_cer_price.header_content")}
                                                header={t("AssetCommon:cer.calculated_cer_price.header")}
                                            />
                                            <Input
                                                placeholder={
                                                    `${
                                                        (cerQuoteAmount / cerBaseAmount).toFixed(precision)
                                                    } ${usr.chain === "bitshares" ? "BTS" : "TEST"}`
                                                }
                                                type="text"
                                                className="mt-1"
                                                disabled
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-5 mt-4">
                                        <AssetFlag
                                            alreadyDisabled={false}
                                            id={"allowed_markets"}
                                            allowedText={t("AssetCommon:extensions.allowed_markets.enabled")}
                                            enabledInfo={t("AssetCommon:extensions.allowed_markets.enabledInfo")}
                                            disabledText={t("AssetCommon:extensions.allowed_markets.disabled")}
                                            disabledInfo={t("AssetCommon:extensions.allowed_markets.disabledInfo")}
                                            permission={true}
                                            flag={allowedMarketsEnabled}
                                            setFlag={setAllowedMarketsEnabled}
                                        />
                                        {
                                            allowedMarketsEnabled
                                                ? <AssetDropDown
                                                    assetSymbol={""}
                                                    assetData={null}
                                                    storeCallback={(input) => {
                                                        if (!allowedMarkets.includes(input) && !bannedMarkets.includes(input)) {
                                                            const _foundAsset = assets.find((x) => x.symbol === input);
                                                            setAllowedMarkets([...allowedMarkets, _foundAsset.id]);
                                                        }
                                                    }}
                                                    otherAsset={null}
                                                    marketSearch={marketSearch}
                                                    type={"backing"}
                                                    chain={usr && usr.chain ? usr.chain : "bitshares"}
                                                />
                                                : null
                                        }
                                    </div>
                                    {
                                        allowedMarketsEnabled
                                            ?   <div className="mt-3 border border-grey rounded">
                                                    <List
                                                        height={210}
                                                        itemCount={allowedMarkets.length}
                                                        itemSize={90}
                                                        className="w-full"
                                                    >
                                                        {allowedMarketsRow}
                                                    </List>
                                                </div>
                                            : null
                                    }
                                    <div className="grid grid-cols-2 gap-5 mt-4">
                                        <AssetFlag
                                            alreadyDisabled={false}
                                            id={"banned_markets"}
                                            allowedText={t("AssetCommon:extensions.banned_markets.enabled")}
                                            enabledInfo={t("AssetCommon:extensions.banned_markets.enabledInfo")}
                                            disabledText={t("AssetCommon:extensions.banned_markets.disabled")}
                                            disabledInfo={t("AssetCommon:extensions.banned_markets.disabledInfo")}
                                            permission={true}
                                            flag={bannedMarketsEnabled}
                                            setFlag={setBannedMarketsEnabled}
                                        />
                                        {
                                            bannedMarketsEnabled
                                            ?   <AssetDropDown
                                                    assetSymbol={""}
                                                    assetData={null}
                                                    storeCallback={(input) => {
                                                        if (!bannedMarkets.includes(input) && !allowedMarkets.includes(input)) {
                                                            const _foundAsset = assets.find((x) => x.symbol === input);
                                                            setBannedMarkets([...bannedMarkets, _foundAsset.id]);
                                                        }
                                                    }}
                                                    otherAsset={null}
                                                    marketSearch={marketSearch}
                                                    type={"backing"}
                                                    chain={usr && usr.chain ? usr.chain : "bitshares"}
                                                />
                                                : null
                                        }
                                    </div>
                                    {
                                        bannedMarketsEnabled
                                            ? <div className="mt-2 border border-grey rounded">
                                                <List
                                                    height={210}
                                                    itemCount={bannedMarkets.length}
                                                    itemSize={90}
                                                    className="w-full"
                                                >
                                                    {bannedMarketsRow}
                                                </List>
                                              </div>
                                            : null
                                    }
                                    <Separator className="my-4 mt-5" />
                                </div>
                                <div className="col-span-2">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <HoverInfo
                                                content={t("AssetCommon:permissions.header_content")}
                                                header={t("AssetCommon:permissions.header")}
                                                type="header"
                                            />
                                            <AssetPermission
                                                alreadyDisabled={permanentlyDisabledCMF}
                                                id={"charge_market_fee"}
                                                allowedText={t("AssetCommon:permissions.charge_market_fee.about")}
                                                enabledInfo={t("AssetCommon:permissions.charge_market_fee.enabledInfo")}
                                                disabledText={t("AssetCommon:permissions.charge_market_fee.about")}
                                                disabledInfo={t("AssetCommon:permissions.charge_market_fee.disabledInfo")}
                                                permission={permChargeMarketFee}
                                                setPermission={setPermChargeMarketFee}
                                                flag={flagChargeMarketFee}
                                                setFlag={setFlagChargeMarketFee}
                                            />
                                            <AssetPermission
                                                alreadyDisabled={permanentlyDisabledWL}
                                                id={"white_list"}
                                                allowedText={t("AssetCommon:permissions.white_list.about")}
                                                enabledInfo={t("AssetCommon:permissions.white_list.enabledInfo")}
                                                disabledText={t("AssetCommon:permissions.white_list.about")}
                                                disabledInfo={t("AssetCommon:permissions.white_list.disabledInfo")}
                                                permission={permWhiteList}
                                                setPermission={setPermWhiteList}
                                                flag={flagWhiteList}
                                                setFlag={setFlagWhiteList}
                                            />
                                            <AssetPermission
                                                alreadyDisabled={permanentlyDisabledTR}
                                                id={"transfer_restricted"}
                                                allowedText={t("AssetCommon:permissions.transfer_restricted.about")}
                                                enabledInfo={t("AssetCommon:permissions.transfer_restricted.enabledInfo")}
                                                disabledText={t("AssetCommon:permissions.transfer_restricted.about")}
                                                disabledInfo={t("AssetCommon:permissions.transfer_restricted.disabledInfo")}
                                                permission={permTransferRestricted}
                                                setPermission={setPermTransferRestricted}
                                                flag={flagTransferRestricted}
                                                setFlag={setFlagTransferRestricted}
                                            />
                                            <AssetPermission
                                                alreadyDisabled={permanentlyDisabledDC}
                                                id={"disable_confidential"}
                                                allowedText={t("AssetCommon:permissions.disable_confidential.about")}
                                                enabledInfo={t("AssetCommon:permissions.disable_confidential.enabledInfo")}
                                                disabledText={t("AssetCommon:permissions.disable_confidential.about")}
                                                disabledInfo={t("AssetCommon:permissions.disable_confidential.disabledInfo")}
                                                permission={permDisableConfidential}
                                                setPermission={setPermDisableConfidential}
                                                flag={flagDisableConfidential}
                                                setFlag={setFlagDisableConfidential}
                                            />
                                            <AssetPermission
                                                alreadyDisabled={permanentlyDisabledOA}
                                                id={"override_authority"}
                                                allowedText={t("AssetCommon:permissions.override_authority.about")}
                                                enabledInfo={t("AssetCommon:permissions.override_authority.enabledInfo")}
                                                disabledText={t("AssetCommon:permissions.override_authority.about")}
                                                disabledInfo={t("AssetCommon:permissions.override_authority.disabledInfo")}
                                                permission={permOverrideAuthority}
                                                setPermission={setPermOverrideAuthority}
                                                flag={flagOverrideAuthority}
                                                setFlag={setFlagOverrideAuthority}
                                            />
                                        </div>

                                        <div>
                                            <HoverInfo
                                                content={t("AssetCommon:flags.header_content")}
                                                header={t("AssetCommon:flags.header")}
                                                type="header"
                                            />
                                            <AssetFlag
                                                alreadyDisabled={permanentlyDisabledCMF}
                                                id={"charge_market_fee_flag"}
                                                allowedText={t("AssetCommon:flags.charge_market_fee.about")}
                                                enabledInfo={t("AssetCommon:flags.charge_market_fee.enabledInfo")}
                                                disabledText={t("AssetCommon:flags.charge_market_fee.about")}
                                                disabledInfo={t("AssetCommon:flags.charge_market_fee.disabledInfo")}
                                                permission={permChargeMarketFee}
                                                flag={flagChargeMarketFee}
                                                setFlag={setFlagChargeMarketFee}
                                            />
                                            <AssetFlag
                                                alreadyDisabled={permanentlyDisabledWL}
                                                id={"white_list_flag"}
                                                allowedText={t("AssetCommon:flags.white_list.about")}
                                                enabledInfo={t("AssetCommon:flags.white_list.enabledInfo")}
                                                disabledText={t("AssetCommon:flags.white_list.about")}
                                                disabledInfo={t("AssetCommon:flags.white_list.disabledInfo")}
                                                permission={permWhiteList}
                                                flag={flagWhiteList}
                                                setFlag={setFlagWhiteList}
                                            />
                                            <AssetFlag
                                                alreadyDisabled={permanentlyDisabledTR}
                                                id={"transfer_restricted_flag"}
                                                allowedText={t("AssetCommon:flags.transfer_restricted.about")}
                                                enabledInfo={t("AssetCommon:flags.transfer_restricted.enabledInfo")}
                                                disabledText={t("AssetCommon:flags.transfer_restricted.about")}
                                                disabledInfo={t("AssetCommon:flags.transfer_restricted.disabledInfo")}
                                                permission={permTransferRestricted}
                                                flag={flagTransferRestricted}
                                                setFlag={setFlagTransferRestricted}
                                            />
                                            <AssetFlag
                                                alreadyDisabled={permanentlyDisabledDC}
                                                id={"disable_confidential_flag"}
                                                allowedText={t("AssetCommon:flags.disable_confidential.about")}
                                                enabledInfo={t("AssetCommon:flags.disable_confidential.enabledInfo")}
                                                disabledText={t("AssetCommon:flags.disable_confidential.about")}
                                                disabledInfo={t("AssetCommon:flags.disable_confidential.disabledInfo")}
                                                permission={permDisableConfidential}
                                                flag={flagDisableConfidential}
                                                setFlag={setFlagDisableConfidential}
                                            />
                                            <AssetFlag
                                                alreadyDisabled={permanentlyDisabledOA}
                                                id={"override_authority_flag"}
                                                allowedText={t("AssetCommon:flags.override_authority.about")}
                                                enabledInfo={t("AssetCommon:flags.override_authority.enabledInfo")}
                                                disabledText={t("AssetCommon:flags.override_authority.about")}
                                                disabledInfo={t("AssetCommon:flags.override_authority.disabledInfo")}
                                                permission={permOverrideAuthority}
                                                flag={flagOverrideAuthority}
                                                setFlag={setFlagOverrideAuthority}
                                            />
                                        </div>
                                    </div>
                                    <Separator className="my-4 mt-5" />
                                </div>
                                {
                                    flagChargeMarketFee
                                        ? <div className="col-span-2 mb-4">
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
                                                            debouncedPercent(e.currentTarget.value, setCommission);
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <HoverInfo
                                                        content={t("AssetCommon:max_market_fee.header_content")}
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
                                                            debouncedMax(e.currentTarget.value, setMaxCommission);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <AssetFlag
                                                alreadyDisabled={false}
                                                id={"reward_percent"}
                                                allowedText={t("AssetCommon:extensions.reward_percent.enabled")}
                                                enabledInfo={t("AssetCommon:extensions.reward_percent.enabledInfo")}
                                                disabledText={t("AssetCommon:extensions.reward_percent.disabled")}
                                                disabledInfo={t("AssetCommon:extensions.reward_percent.disabledInfo")}
                                                permission={true}
                                                flag={enabledReferrerReward}
                                                setFlag={setEnabledReferrerReward}
                                            />

                                            {
                                                enabledReferrerReward
                                                ? <>
                                                    <HoverInfo
                                                        content={t("AssetCommon:extensions.reward_percent.header_content")}
                                                        header={t("AssetCommon:extensions.reward_percent.header")}
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
                                                            debouncedPercent(e.currentTarget.value, setReferrerReward);
                                                        }}
                                                    />
                                                </>
                                                : null
                                            }

                                            <AssetFlag
                                                alreadyDisabled={false}
                                                id={"whitelist_market_fee_sharing"}
                                                allowedText={t("AssetCommon:extensions.whitelist_market_fee_sharing.enabled")}
                                                enabledInfo={t("AssetCommon:extensions.whitelist_market_fee_sharing.enabledInfo")}
                                                disabledText={t("AssetCommon:extensions.whitelist_market_fee_sharing.disabled")}
                                                disabledInfo={t("AssetCommon:extensions.whitelist_market_fee_sharing.disabledInfo")}
                                                permission={true}
                                                flag={enabledFeeSharingWhitelist}
                                                setFlag={setEnabledFeeSharingWhitelist}
                                            />

                                            {
                                                enabledFeeSharingWhitelist
                                                ? <>
                                                    <HoverInfo
                                                        content={t("AssetCommon:extensions.whitelist_market_fee_sharing.header_content")}
                                                        header={t("AssetCommon:extensions.whitelist_market_fee_sharing.header")}
                                                    />
                                                    <div className="grid grid-cols-12 mt-1">
                                                        <span className="col-span-9 border border-grey rounded">
                                                            <List
                                                                height={210}
                                                                itemCount={feeSharingWhitelist.length}
                                                                itemSize={100}
                                                                className="w-full"
                                                            >
                                                                {feeSharingWhitelistRow}
                                                            </List>
                                                        </span>
                                                        <span className="col-span-3 ml-3 text-center">
                                                            <Dialog
                                                                open={whitelistMarketFeeSharingDialogOpen}
                                                                onOpenChange={(open) => {
                                                                    setWhitelistMarketFeeSharingDialogOpen(open);
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
                                                                        chain={usr && usr.chain ? usr.chain : "bitshares"}
                                                                        excludedUsers={
                                                                            usr && usr.username && usr.username.length ? [usr] : []
                                                                        }
                                                                        setChosenAccount={(_account) => {
                                                                            if (
                                                                                _account &&
                                                                                !feeSharingWhitelist.find((_usr) => _usr.id === _account.id)
                                                                            ) {
                                                                                setFeeSharingWhitelist(
                                                                                    feeSharingWhitelist && feeSharingWhitelist.length
                                                                                        ? [...feeSharingWhitelist, _account]
                                                                                        : [_account]
                                                                                );
                                                                            }
                                                                            setWhitelistMarketFeeSharingDialogOpen(false);
                                                                        }}
                                                                    />
                                                                </DialogContent>
                                                            </Dialog>
                                                        </span>
                                                    </div>
                                                </>
                                                : null
                                            }

                                            <AssetFlag
                                                alreadyDisabled={false}
                                                id={"taker_fee_percent"}
                                                allowedText={t("AssetCommon:extensions.taker_fee_percent.enabled")}
                                                enabledInfo={t("AssetCommon:extensions.taker_fee_percent.enabledInfo")}
                                                disabledText={t("AssetCommon:extensions.taker_fee_percent.disabled")}
                                                disabledInfo={t("AssetCommon:extensions.taker_fee_percent.disabledInfo")}
                                                permission={true}
                                                flag={enabledTakerFee}
                                                setFlag={setEnabledTakerFee}
                                            />

                                            {
                                                enabledTakerFee
                                                ? <>
                                                    <HoverInfo
                                                        content={t("AssetCommon:extensions.taker_fee_percent.header_content")}
                                                        header={t("AssetCommon:extensions.taker_fee_percent.header")}
                                                    />
                                                    <Input
                                                        placeholder={t("AssetCommon:extensions.taker_fee_percent.placeholder")}
                                                        value={takerFee}
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        pattern="^\d*(\.\d{0,2})?$"
                                                        onInput={(e) => {
                                                            setTakerFee(e.currentTarget.value);
                                                            debouncedPercent(e.currentTarget.value, setTakerFee);
                                                        }}
                                                    />
                                                </>
                                                : null
                                            }
                                        </div>
                                        : null
                                }
                                
                                {
                                    flagWhiteList
                                        ? <div className="col-span-2 mb-3">
                                            <HoverInfo
                                                content={t("AssetCommon:whitelist.header_content")}
                                                header={t("AssetCommon:whitelist.header")}
                                                type="header"
                                            />
                                            <div className="grid grid-cols-12 mt-1">
                                                <span className="col-span-9 border border-grey rounded">
                                                    <List
                                                        height={210}
                                                        itemCount={whitelistAuthorities.length}
                                                        itemSize={100}
                                                        className="w-full"
                                                    >
                                                        {whitelistAuthorityRow}
                                                    </List>
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
                                                                chain={usr && usr.chain ? usr.chain : "bitshares"}
                                                                excludedUsers={
                                                                    usr && usr.username && usr.username.length ? [usr] : []
                                                                }
                                                                setChosenAccount={(_account) => {
                                                                    if (
                                                                        _account &&
                                                                        !whitelistAuthorities.find((_usr) => _usr.id === _account.id)
                                                                    ) {
                                                                        setWhitelistAuthorities(
                                                                            whitelistAuthorities && whitelistAuthorities.length
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
                                        : null
                                }
                                {
                                    flagWhiteList
                                        ? <div className="col-span-2 mb-3">
                                            <HoverInfo
                                                content={t("AssetCommon:blacklist.header_content")}
                                                header={t("AssetCommon:blacklist.header")}
                                                type="header"
                                            />
                                            <div className="grid grid-cols-12 mt-1">
                                                <span className="col-span-9 border border-grey rounded">
                                                    <List
                                                        height={210}
                                                        itemCount={blacklistAuthorities.length}
                                                        itemSize={75}
                                                        className="w-full"
                                                    >
                                                        {blacklistAuthorityRow}
                                                    </List>
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
                                                                chain={usr && usr.chain ? usr.chain : "bitshares"}
                                                                excludedUsers={
                                                                    usr && usr.username && usr.username.length ? [usr] : []
                                                                }
                                                                setChosenAccount={(_account) => {
                                                                    if (
                                                                        _account &&
                                                                        !blacklistAuthorities.find((_usr) => _usr.id === _account.id)
                                                                    ) {
                                                                        setBlacklistAuthorities(
                                                                            blacklistAuthorities && blacklistAuthorities.length
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
                                        : null
                                }
                                <div className="col-span-2">
                                    <Button
                                        className="h-8"
                                        onClick={() => {
                                            setShowDialog(true)
                                        }}
                                    >
                                        {t("CreateUIA:buttons.submit")}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            {
                showDialog
                    ? <DeepLinkDialog
                        operationNames={editing ? ["asset_update"] : ["asset_create"]}
                        username={usr.username}
                        usrChain={usr.chain}
                        userID={usr.id}
                        dismissCallback={setShowDialog}
                        key={`${editing ? "Editing" : "Creating"}UIA-${usr.id}-${symbol}`}
                        headerText={t("CreateUIA:dialogContent.headerText", { symbol })}
                        trxJSON={[trx]}
                    />
                    : null
            }
        </>
    );
}