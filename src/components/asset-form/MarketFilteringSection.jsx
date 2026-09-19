import React, { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { List } from "react-window";
import { Separator } from "@/components/ui/separator";

import AssetFlag from "@/components/common/AssetFlag.tsx";
import AssetDropDown from "@/components/Market/AssetDropDownCard.jsx";
import { AllowedMarketsRow, BannedMarketsRow } from "./MarketsRow.jsx";

export default function MarketFilteringSection({
  allowedMarketsEnabled,
  setAllowedMarketsEnabled,
  allowedMarkets,
  setAllowedMarkets,
  bannedMarketsEnabled,
  setBannedMarketsEnabled,
  bannedMarkets,
  setBannedMarkets,
  assets,
  marketSearch,
  usr,
  balances,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const handleAllowedRemove = useCallback(
    (id) => {
      setAllowedMarkets(allowedMarkets.filter((x) => x !== id));
    },
    [allowedMarkets, setAllowedMarkets]
  );
  const handleBannedRemove = useCallback(
    (id) => {
      setBannedMarkets(bannedMarkets.filter((x) => x !== id));
    },
    [bannedMarkets, setBannedMarkets]
  );
  const allowedRowProps = useMemo(
    () => ({ items: allowedMarkets, assets, marketSearch, onRemove: handleAllowedRemove }),
    [allowedMarkets, assets, marketSearch, handleAllowedRemove]
  );
  const bannedRowProps = useMemo(
    () => ({ items: bannedMarkets, assets, marketSearch, onRemove: handleBannedRemove }),
    [bannedMarkets, assets, marketSearch, handleBannedRemove]
  );

  // Assets already on one list must not be selectable on the other.
  // The picker matches against both symbol and id, so exclude both forms.
  const allowedExclusions = useMemo(() => {
    const symbols = allowedMarkets
      .map((id) => assets.find((a) => a.id === id)?.symbol)
      .filter(Boolean);
    return [...allowedMarkets, ...symbols];
  }, [allowedMarkets, assets]);
  const bannedExclusions = useMemo(() => {
    const symbols = bannedMarkets
      .map((id) => assets.find((a) => a.id === id)?.symbol)
      .filter(Boolean);
    return [...bannedMarkets, ...symbols];
  }, [bannedMarkets, assets]);

  const handleAllowedAdd = useCallback(
    (input) => {
      const _foundAsset = assets.find(
        (x) => x.symbol === input || x.id === input
      );
      if (!_foundAsset) {
        return;
      }
      if (
        allowedMarkets.includes(_foundAsset.id) ||
        bannedMarkets.includes(_foundAsset.id)
      ) {
        return;
      }
      setAllowedMarkets([...allowedMarkets, _foundAsset.id]);
    },
    [assets, allowedMarkets, bannedMarkets, setAllowedMarkets]
  );
  const handleBannedAdd = useCallback(
    (input) => {
      const _foundAsset = assets.find(
        (x) => x.symbol === input || x.id === input
      );
      if (!_foundAsset) {
        return;
      }
      if (
        bannedMarkets.includes(_foundAsset.id) ||
        allowedMarkets.includes(_foundAsset.id)
      ) {
        return;
      }
      setBannedMarkets([...bannedMarkets, _foundAsset.id]);
    },
    [assets, bannedMarkets, allowedMarkets, setBannedMarkets]
  );

  return (
    <div className="col-span-2 space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
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
            storeCallback={handleAllowedAdd}
            otherAsset={null}
            otherAssets={bannedExclusions}
            marketSearch={marketSearch}
            type={"backing"}
            chain={usr && usr.chain ? usr.chain : "bitshares"}
            balances={balances}
          />
        ) : null}
      </div>
      {allowedMarketsEnabled ? (
        allowedMarkets.length ? (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="w-full h-[300px]">
              <List
                height={300}
                width="100%"
                rowComponent={AllowedMarketsRow}
                rowCount={allowedMarkets.length}
                rowHeight={90}
                rowProps={allowedRowProps}
              />
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border/60 bg-card/40 px-4 py-5 text-sm leading-relaxed text-muted-foreground">
            {t("AssetCommon:extensions.allowed_markets.emptyHint")}
          </p>
        )
      ) : null}
      </div>
      <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
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
            storeCallback={handleBannedAdd}
            otherAsset={null}
            otherAssets={allowedExclusions}
            marketSearch={marketSearch}
            type={"backing"}
            chain={usr && usr.chain ? usr.chain : "bitshares"}
            balances={balances}
          />
        ) : null}
      </div>
      {bannedMarketsEnabled ? (
        bannedMarkets.length ? (
          <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="w-full h-[300px]">
              <List
                height={300}
                width="100%"
                rowComponent={BannedMarketsRow}
                rowCount={bannedMarkets.length}
                rowHeight={90}
                rowProps={bannedRowProps}
              />
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border/60 bg-card/40 px-4 py-5 text-sm leading-relaxed text-muted-foreground">
            {t("AssetCommon:extensions.banned_markets.emptyHint")}
          </p>
        )
      ) : null}
      </div>
      <Separator className="mt-2 mb-1" />
    </div>
  );
}
