import React, { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { List } from "react-window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import AssetFlag from "@/components/common/AssetFlag.tsx";
import AccountSearch from "@/components/AccountSearch.jsx";
import { FeeSharingWhitelistRow } from "./AuthorityRow.jsx";

export default function ExtensionsSection({
  flagChargeMarketFee,
  commission,
  setCommission,
  maxCommission,
  setMaxCommission,
  enabledReferrerReward,
  setEnabledReferrerReward,
  referrerReward,
  setReferrerReward,
  enabledFeeSharingWhitelist,
  setEnabledFeeSharingWhitelist,
  feeSharingWhitelist,
  setFeeSharingWhitelist,
  whitelistMarketFeeSharingDialogOpen,
  setWhitelistMarketFeeSharingDialogOpen,
  enabledTakerFee,
  setEnabledTakerFee,
  takerFee,
  setTakerFee,
  debouncedPercent,
  debouncedMax,
  usr,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const handleFeeSharingRemove = useCallback(
    (id) => {
      setFeeSharingWhitelist(feeSharingWhitelist.filter((x) => x.id !== id));
    },
    [feeSharingWhitelist, setFeeSharingWhitelist]
  );
  const feeSharingRowProps = useMemo(
    () => ({ items: feeSharingWhitelist, onRemove: handleFeeSharingRemove }),
    [feeSharingWhitelist, handleFeeSharingRemove]
  );

  if (!flagChargeMarketFee) return null;

  return (
    <div className="col-span-2 space-y-6">
      <div className="space-y-4">
        <HoverInfo
          content={t("AssetCommon:extensions.header_content")}
          header={t("AssetCommon:extensions.header")}
          type="header"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
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
                setCommission
              );
            }}
          />
        </div>
        <div className="space-y-2">
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
        <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
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
                setReferrerReward
              );
            }}
          />
        </div>
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
        <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4">
          <HoverInfo
            content={t(
              "AssetCommon:extensions.whitelist_market_fee_sharing.header_content"
            )}
            header={t(
              "AssetCommon:extensions.whitelist_market_fee_sharing.header"
            )}
          />
          <div className="grid grid-cols-12 gap-3">
            <span className="col-span-9 border border-border rounded">
              <div className="w-full h-[300px]">
                <List
                  height={300}
                  width="100%"
                  rowComponent={FeeSharingWhitelistRow}
                  rowCount={feeSharingWhitelist.length}
                  rowHeight={75}
                  rowProps={feeSharingRowProps}
                />
              </div>
            </span>
            <span className="col-span-3 text-center">
              <Dialog
                open={whitelistMarketFeeSharingDialogOpen}
                onOpenChange={(open) => {
                  setWhitelistMarketFeeSharingDialogOpen(open);
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="outline">
                    ➕ {t("CreditOfferEditor:addUser")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[375px] bg-card">
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
        </div>
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
        <div className="space-y-2 rounded-xl border border-border/60 bg-card/40 p-4">
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
                setTakerFee
              );
            }}
          />
        </div>
      ) : null}
      </div>
    </div>
  );
}
