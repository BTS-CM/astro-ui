import React, { useState, useEffect, useSyncExternalStore, useMemo, useCallback } from "react";
import { useStore } from '@nanostores/react';
import { FixedSizeList as List } from "react-window";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { DateTimePicker, TimePicker } from '@/components/ui/datetime-picker';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
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

import HoverInfo from "@/components/common/HoverInfo.tsx";
import AssetPermission from "@/components/common/AssetPermission.tsx";
import AssetFlag from "@/components/common/AssetFlag.tsx";
import DeepLinkDialog from "@/components/common/DeepLinkDialog.jsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx"

import AccountSearch from "@/components/AccountSearch.jsx";
import { Avatar } from "./Avatar.tsx";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { $currentUser } from "@/stores/users.ts";
import { $assetCacheBTS, $assetCacheTEST } from "@/stores/cache.ts";
import { getPermissions, getFlags, debounce, humanReadableFloat } from "@/lib/common.js";
import { $marketSearchCacheBTS, $marketSearchCacheTEST } from "@/stores/cache.ts";

import { blockchainFloat } from "@/bts/common";

export default function Prediction(properties) {
    const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
    const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);

    const _assetsBTS = useSyncExternalStore($assetCacheBTS.subscribe, $assetCacheBTS.get, () => true);
    const _assetsTEST = useSyncExternalStore(
      $assetCacheTEST.subscribe,
      $assetCacheTEST.get,
      () => true
    );
    const _chain = useMemo(() => {
        if (usr && usr.chain) {
          return usr.chain;
        }
        return "bitshares";
    }, [usr]);
    
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

    // Prediction market info
    const [condition, setCondition] = useState("");
    const [date, setDate] = useState();
    const [backingAsset, setBackingAsset] = useState(usr.chain === "bitshares" ? "BTS" : "TEST");
    const [commission, setCommission] = useState(0);

    const backingAssetData = useMemo(() => {
        if (assets && backingAsset) {
            return assets.find((asset) => asset.symbol === backingAsset);
        }
        return null;
    }, [assets, backingAsset]);

    // Initializing permissions
    const [permWhiteList, setPermWhiteList] = useState(true);
    const [permTransferRestricted, setPermTransferRestricted] = useState(true);
    const [permDisableConfidential, setPermDisableConfidential] = useState(true);
    const [permWitnessFedAsset, setPermWitnessFedAsset] = useState(true);
    const [permCommitteeFedAsset, setPermCommitteeFedAsset] = useState(true);

    // Initializing flags
    const [flagWhiteList, setFlagWhiteList] = useState(false);
    const [flagTransferRestricted, setFlagTransferRestricted] = useState(false);
    const [flagDisableConfidential, setFlagDisableConfidential] = useState(false);
    const [flagWitnessFedAsset, setFlagWitnessFedAsset] = useState(false);
    const [flagCommitteeFedAsset, setFlagCommitteeFedAsset] = useState(false);

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
        if (!permWitnessFedAsset) {
            setFlagWitnessFedAsset(false);
        }
    }, [permWitnessFedAsset]);

    useEffect(() => {
        if (!permCommitteeFedAsset) {
            setFlagCommitteeFedAsset(false);
        }
    }, [permCommitteeFedAsset]);

    useEffect(() => {
        if (flagWitnessFedAsset) {
            setFlagCommitteeFedAsset(false) // if witness fed selected, disable committee fed
        }
    }, [flagWitnessFedAsset]);

    useEffect(() => {
        if (flagCommitteeFedAsset) {
            setFlagWitnessFedAsset(false) // if committee fed selected, disable witness fed
        }
    }, [flagCommitteeFedAsset]);

    const [showDialog, setShowDialog] = useState(false);

    const issuer_permissions = useMemo(() => {
        return getPermissions(
            {
                // user configurable
                white_list: permWhiteList,
                transfer_restricted: permTransferRestricted,
                disable_confidential: permDisableConfidential,
                // static
                charge_market_fee: true,
                override_authority: false,
                disable_force_settle: true,
                global_settle: true,
                // optional
                witness_fed_asset: permWitnessFedAsset,
                committee_fed_asset: permCommitteeFedAsset,
            },
            true
        );
    }, [
        permWhiteList,
        permTransferRestricted,
        permDisableConfidential,
        permWitnessFedAsset,
        permCommitteeFedAsset
    ]);

    const flags = useMemo(() => {
        return getFlags({
            // user configurable
            white_list: flagWhiteList,
            transfer_restricted: flagTransferRestricted,
            disable_confidential: flagDisableConfidential,
            // static
            charge_market_fee: true,
            override_authority: false,
            disable_force_settle: true,
            global_settle: false,
            // optional
            witness_fed_asset: flagWitnessFedAsset,
            committee_fed_asset: flagCommitteeFedAsset,
        });
    }, [
        flagWhiteList,
        flagTransferRestricted,
        flagDisableConfidential,
        flagWitnessFedAsset,
        flagCommitteeFedAsset
    ]);

    const description = useMemo(() => {
        return JSON.stringify({
            main: desc,
            market: backingAsset,
            condition: condition,
            short_name: shortName,
            expiry: date ? date.toISOString() : "",
        });
    }, [desc, condition, backingAsset, shortName, date]);

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

        return {
            issuer: usr.id,
            symbol: symbol,
            precision: precision,
            common_options: {
                // user configured
                description,
                max_supply: blockchainFloat(maxSupply, precision), 
                market_fee_percent: commission ? commission * 100 : 0,
                max_market_fee: blockchainFloat(maxSupply, precision),
                issuer_permissions,
                flags,
                // static
                core_exchange_rate: {
                    base: {
                        amount: blockchainFloat(1, backingAssetData ? backingAssetData.precision : 5),
                        asset_id: backingAssetData ? backingAssetData.id : "1.3.0"
                    },
                    quote: {
                        amount: blockchainFloat(1, precision),
                        asset_id: "1.3.1"
                    }
                },
                whitelist_authorities: flagWhiteList && whitelistAuthorities && whitelistAuthorities.length
                                        ? whitelistAuthorities.map((x) => x.id)
                                        : [],
                blacklist_authorities: flagWhiteList && blacklistAuthorities && blacklistAuthorities.length
                                        ? blacklistAuthorities.map((x) => x.id)
                                        : [],
                whitelist_markets: [],
                blacklist_markets: [],
                extensions: _extensions
            },
            bitasset_opts: {
                feed_lifetime_sec: 60 * 60 * 24 * 356,
                minimum_feeds: 1,
                force_settlement_delay_sec: 60,
                force_settlement_offset_percent: 0,
                maximum_force_settlement_volume: 10000,
                short_backing_asset: backingAssetData ? backingAssetData.id : "1.3.0",
            },
            is_prediction_market: true, // enables prediction market asset functionality
            extensions: null
        };
    }, [
        usr,
        symbol,
        precision,
        description,
        maxSupply,
        commission,
        issuer_permissions,
        flags,
        backingAssetData,
        enabledReferrerReward,
        enabledFeeSharingWhitelist,
        enabledTakerFee
    ]);

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
                        size={40} name={res.name} extra="Borrower"
                        expression={{ eye: "normal", mouth: "open" }}
                        colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
                    />
                    </span>
                    <span className="col-span-9 ml-3">
                        #{index + 1}: {res.name} ({res.id})
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

    return (
        <>
            <div className="container mx-auto mt-5 mb-5">
                <div className="grid grid-cols-1 gap-3">
                    <Card>
                        <CardHeader className="pb-1">
                            <CardTitle>🔮 {t("CreatePrediction:card.title")}</CardTitle>
                            <CardDescription>{t("CreatePrediction:card.description")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2">
                                <div className="col-span-2">
                                    <HoverInfo
                                        content={t("AssetCommon:asset_details.title_content")}
                                        header={t("AssetCommon:asset_details.title")}
                                        type="header"
                                    />
                                    
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <HoverInfo
                                                content={t("AssetCommon:asset_details.symbol.header_content")}
                                                header={t("AssetCommon:asset_details.symbol.header")}
                                            />
                                            <Input
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
                                            />
                                        </div>
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
                                            />
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
                                    />

                                    <div className="grid grid-cols-2 gap-5">
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
                                            />
                                        </div>
                                        <div>
                                            <HoverInfo
                                                content={t("AssetCommon:asset_details.precision.header_content")}
                                                header={t("AssetCommon:asset_details.precision.header")}
                                            />
                                            <Input
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
                                            />
                                        </div>
                                    </div>
                                    <Separator className="my-4 mt-5" />
                                </div>
                                <div className="col-span-2">
                                    <HoverInfo
                                        content={t("CreatePrediction:pma.title_content")}
                                        header={t("CreatePrediction:pma.title")}
                                        type="header"
                                    />
                                    <HoverInfo
                                        content={t("CreatePrediction:pma.condition.header_content")}
                                        header={t("CreatePrediction:pma.condition.header")}
                                    />
                                    <Textarea
                                        placeholder={t("CreatePrediction:pma.condition.placeholder")}
                                        value={condition}
                                        onInput={(e) => setCondition(e.currentTarget.value)}
                                    />
                                    <HoverInfo
                                        content={t("CreatePrediction:pma.commission.header_content")}
                                        header={t("CreatePrediction:pma.commission.header")}
                                    />
                                    <Input
                                        placeholder={t("CreatePrediction:pma.commission.placeholder")}
                                        value={commission}
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        pattern="^\d*(\.\d{0,2})?$"
                                        onInput={(e) => {
                                            setCommission(e.currentTarget.value);
                                            debouncedPercent(e.currentTarget.value, setCommission);
                                        }}
                                    />
                                    <HoverInfo
                                        content={t("CreatePrediction:pma.backing_asset.header_content")}
                                        header={t("CreatePrediction:pma.backing_asset.header")}
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input disabled value={backingAssetData ? `${backingAssetData.symbol} (${backingAssetData.id})` : backingAsset} type="text" />
                                        <AssetDropDown
                                            assetSymbol={backingAsset ?? ""}
                                            assetData={null}
                                            storeCallback={setBackingAsset}
                                            otherAsset={null}
                                            marketSearch={marketSearch}
                                            type={"backing"}
                                            chain={usr && usr.chain ? usr.chain : "bitshares"}
                                        />
                                    </div>
                                    <HoverInfo
                                        content={t("CreatePrediction:pma.resolution.header_content")}
                                        header={t("CreatePrediction:pma.resolution.header")}
                                    />
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        <DateTimePicker
                                            granularity="day"
                                            value={date}
                                            onChange={(newDate) => {
                                                const now = new Date();
                                                if (newDate >= now) {
                                                    setDate(newDate)
                                                } else {
                                                    now.setDate(now.getDate() + 7); // default a week ahead
                                                    setDate(now);
                                                }
                                            }}
                                        />
                                        <TimePicker date={date} onChange={setDate} />
                                    </div>
                                    <Separator className="my-4 mt-5" />
                                </div>
                                <div className="col-span-2">
                                    <HoverInfo
                                        content={t("AssetCommon:extensions.header_content")}
                                        header={t("AssetCommon:extensions.header")}
                                        type="header"
                                    />

                                    <AssetFlag
                                        alreadyDisabled={false}
                                        id={"reward_percent_flag"}
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
                                        id={"whitelist_market_fee_sharing_flag"}
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
                                        id={"taker_fee_percent_flag"}
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

                                    <Separator className="my-4 mt-5" />
                                </div>
                                <div className="col-span-2 mb-2">
                                    <div className="grid grid-cols-2 gap-5">
                                        <div>
                                            <HoverInfo
                                                content={t("AssetCommon:permissions.header_content")}
                                                header={t("AssetCommon:permissions.header")}
                                                type="header"
                                            />
                                            <AssetPermission
                                                alreadyDisabled={false}
                                                id={"white_list"}
                                                allowedText={t("AssetCommon:permissions.white_list.true")}
                                                enabledInfo={t("AssetCommon:permissions.white_list.enabledInfo")}
                                                disabledText={t("AssetCommon:permissions.white_list.false")}
                                                disabledInfo={t("AssetCommon:permissions.white_list.disabledInfo")}
                                                permission={permWhiteList}
                                                setPermission={setPermWhiteList}
                                                flag={flagWhiteList}
                                                setFlag={setFlagWhiteList}
                                            />
                                            <AssetPermission
                                                alreadyDisabled={false}
                                                id={"transfer_restricted"}
                                                allowedText={t("AssetCommon:permissions.transfer_restricted.true")}
                                                enabledInfo={t("AssetCommon:permissions.transfer_restricted.enabledInfo")}
                                                disabledText={t("AssetCommon:permissions.transfer_restricted.false")}
                                                disabledInfo={t("AssetCommon:permissions.transfer_restricted.disabledInfo")}
                                                permission={permTransferRestricted}
                                                setPermission={setPermTransferRestricted}
                                                flag={flagTransferRestricted}
                                                setFlag={setFlagTransferRestricted}
                                            />
                                            <AssetPermission
                                                alreadyDisabled={false}
                                                id={"disable_confidential"}
                                                allowedText={t("AssetCommon:permissions.disable_confidential.true")}
                                                enabledInfo={t("AssetCommon:permissions.disable_confidential.enabledInfo")}
                                                disabledText={t("AssetCommon:permissions.disable_confidential.false")}
                                                disabledInfo={t("AssetCommon:permissions.disable_confidential.disabledInfo")}
                                                permission={permDisableConfidential}
                                                setPermission={setPermDisableConfidential}
                                                flag={flagDisableConfidential}
                                                setFlag={setFlagDisableConfidential}
                                            />

                                            <AssetPermission
                                                alreadyDisabled={false}
                                                id={"witness_fed_asset"}
                                                allowedText={t("AssetCommon:permissions.witness_fed_asset.true")}
                                                enabledInfo={t("AssetCommon:permissions.witness_fed_asset.enabledInfo")}
                                                disabledText={t("AssetCommon:permissions.witness_fed_asset.false")}
                                                disabledInfo={t("AssetCommon:permissions.witness_fed_asset.disabledInfo")}
                                                permission={permWitnessFedAsset}
                                                setPermission={setPermWitnessFedAsset}
                                                flag={flagWitnessFedAsset}
                                                setFlag={setFlagWitnessFedAsset}
                                            />

                                            <AssetPermission
                                                alreadyDisabled={false}
                                                id={"committee_fed_asset"}
                                                allowedText={t("AssetCommon:permissions.committee_fed_asset.true")}
                                                enabledInfo={t("AssetCommon:permissions.committee_fed_asset.enabledInfo")}
                                                disabledText={t("AssetCommon:permissions.committee_fed_asset.false")}
                                                disabledInfo={t("AssetCommon:permissions.committee_fed_asset.disabledInfo")}
                                                permission={permCommitteeFedAsset}
                                                setPermission={setPermCommitteeFedAsset}
                                                flag={flagCommitteeFedAsset}
                                                setFlag={setFlagCommitteeFedAsset}
                                            />
                                        </div>

                                        <div>
                                            <HoverInfo
                                                content={t("AssetCommon:flags.header_content")}
                                                header={t("AssetCommon:flags.header")}
                                                type="header"
                                            />
                                            <AssetFlag
                                                alreadyDisabled={false}
                                                id={"white_list_flag"}
                                                allowedText={t("AssetCommon:flags.white_list.true")}
                                                enabledInfo={t("AssetCommon:flags.white_list.enabledInfo")}
                                                disabledText={t("AssetCommon:flags.white_list.false")}
                                                disabledInfo={t("AssetCommon:flags.white_list.disabledInfo")}
                                                permission={permWhiteList}
                                                flag={flagWhiteList}
                                                setFlag={setFlagWhiteList}
                                            />
                                            <AssetFlag
                                                alreadyDisabled={false}
                                                id={"transfer_restricted_flag"}
                                                allowedText={t("AssetCommon:flags.transfer_restricted.true")}
                                                enabledInfo={t("AssetCommon:flags.transfer_restricted.enabledInfo")}
                                                disabledText={t("AssetCommon:flags.transfer_restricted.false")}
                                                disabledInfo={t("AssetCommon:flags.transfer_restricted.disabledInfo")}
                                                permission={permTransferRestricted}
                                                flag={flagTransferRestricted}
                                                setFlag={setFlagTransferRestricted}
                                            />
                                            <AssetFlag
                                                alreadyDisabled={false}
                                                id={"disable_confidential_flag"}
                                                allowedText={t("AssetCommon:flags.disable_confidential.true")}
                                                enabledInfo={t("AssetCommon:flags.disable_confidential.enabledInfo")}
                                                disabledText={t("AssetCommon:flags.disable_confidential.false")}
                                                disabledInfo={t("AssetCommon:flags.disable_confidential.disabledInfo")}
                                                permission={permDisableConfidential}
                                                flag={flagDisableConfidential}
                                                setFlag={setFlagDisableConfidential}
                                            />

                                            <AssetFlag
                                                alreadyDisabled={false}
                                                id={"witness_fed_asset_flag"}
                                                allowedText={t("AssetCommon:flags.witness_fed_asset.true")}
                                                enabledInfo={t("AssetCommon:flags.witness_fed_asset.enabledInfo")}
                                                disabledText={t("AssetCommon:flags.witness_fed_asset.false")}
                                                disabledInfo={t("AssetCommon:flags.witness_fed_asset.disabledInfo")}
                                                permission={permWitnessFedAsset}
                                                flag={flagWitnessFedAsset}
                                                setFlag={setFlagWitnessFedAsset}
                                            />

                                            <AssetFlag
                                                alreadyDisabled={false}
                                                id={"committee_fed_asset_flag"}
                                                allowedText={t("AssetCommon:flags.committee_fed_asset.true")}
                                                enabledInfo={t("AssetCommon:flags.committee_fed_asset.enabledInfo")}
                                                disabledText={t("AssetCommon:flags.committee_fed_asset.false")}
                                                disabledInfo={t("AssetCommon:flags.committee_fed_asset.disabledInfo")}
                                                permission={permCommitteeFedAsset}
                                                flag={flagCommitteeFedAsset}
                                                setFlag={setFlagCommitteeFedAsset}
                                            />

                                        </div>
                                    </div>
                                </div>
                                {
                                    flagWhiteList
                                        ? <div className="col-span-2 mb-3">
                                            <HoverInfo
                                                content={t("CreatePrediction:whitelist.header_content")}
                                                header={t("CreatePrediction:whitelist.header")}
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
                                                content={t("CreatePrediction:blacklist.header_content")}
                                                header={t("CreatePrediction:blacklist.header")}
                                                type="header"
                                            />
                                            <div className="grid grid-cols-12 mt-1">
                                                <span className="col-span-9 border border-grey rounded">
                                                    <List
                                                        height={210}
                                                        itemCount={blacklistAuthorities.length}
                                                        itemSize={100}
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
                                        {t("CreatePrediction:buttons.submit")}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 mt-5 ml-8 mr-8">
                        <Card>
                        <CardHeader className="pb-3">
                            <CardTitle>{t("CreatePrediction:risks.title")}</CardTitle>
                            <CardDescription>{t("CreatePrediction:risks.description")}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <span className="text-sm">
                                <ul className="ml-2 list-disc [&>li]:mt-1 pl-2">
                                    <li>{t("CreatePrediction:risks.1")}</li>
                                    <li>{t("CreatePrediction:risks.2")}</li>
                                    <li>{t("CreatePrediction:risks.3")}</li>
                                </ul>
                            </span>
                        </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            {
                showDialog
                    ? <DeepLinkDialog
                        operationNames={["asset_create"]}
                        username={usr.username}
                        usrChain={usr.chain}
                        userID={usr.id}
                        dismissCallback={setShowDialog}
                        key={`CreatingPMA-${usr.id}-${symbol}`}
                        headerText={t("CreatePrediction:dialogContent.headerText", { symbol })}
                        trxJSON={[trx]}
                    />
                    : null
            }
        </>
    );
}