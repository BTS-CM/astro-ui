import React from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import AssetFlag from "@/components/common/AssetFlag.tsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";

export default function SmartcoinOptionsSection({
  editing,
  hasEditedBitassetOptions,
  setHasEditedBitassetOptions,
  backingAsset,
  setBackingAsset,
  backingAssetData,
  feedLifetimeSeconds,
  setFeedLifetimeSeconds,
  minimumFeeds,
  setMinimumFeeds,
  forceSettlementDelaySeconds,
  setForceSettlementDelaySeconds,
  forceSettlementOffsetPercent,
  setForceSettlementOffsetPercent,
  maximumForceSettlementVolume,
  setMaximumForceSettlementVolume,
  mcr,
  setMcr,
  icr,
  setIcr,
  mssr,
  setMssr,
  bsrmStrategy,
  setBsrmStrategy,
  permDisableMCRUpdate,
  permDisableICRUpdate,
  permDisableMSSRUpdate,
  permDisableBSRMUpdate,
  mcfrExtensionEnabled,
  setMcfrExtensionEnabled,
  marginCallFeeRatio,
  setMarginCallFeeRatio,
  fsfExtensionEnabled,
  setFsfExtensionEnabled,
  forceSettleFeePercent,
  setForceSettleFeePercent,
  debouncedPercent,
  marketSearch,
  usr,
  balances,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  return (
    <div className="col-span-2 space-y-6">
      <div className="col-span-2 space-y-4">
        {!editing ? (
          <HoverInfo
            content={t("CreateSmartcoin:title.header_content")}
            header={t("CreateSmartcoin:title.header")}
            type="header"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
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
                  className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-background rounded-md group-hover:bg-opacity-0"
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
        <div className="col-span-2 space-y-6">
          <div className="space-y-2">
            <HoverInfo
              content={t(
                "CreateSmartcoin:backing_asset.header_content"
              )}
              header={t("CreateSmartcoin:backing_asset.header")}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
              <div className="col-span-2 w-full sm:w-1/2 space-y-2">
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
              <div className="col-span-2 w-full sm:w-1/2 space-y-2">
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
              <div className="col-span-2 w-full sm:w-1/2 space-y-2">
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
              <div className="col-span-2 space-y-2">
                <HoverInfo
                  content={t("CreateSmartcoin:bsrm.header_content")}
                  header={t("CreateSmartcoin:bsrm.header")}
                />
                <Select
                  onValueChange={(val) => {
                    setBsrmStrategy(val);
                    if (editing) setHasEditedBitassetOptions(true);
                  }}
                  value={bsrmStrategy}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
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

            <span className="col-span-2 w-full sm:w-3/4 space-y-4">
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
                <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
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

            <span className="col-span-2 w-full sm:w-3/4 space-y-4">
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
                <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
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

          <Separator className="mt-2 mb-1" />
        </div>
      ) : null}
    </div>
  );
}
