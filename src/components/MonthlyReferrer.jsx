import React, { useEffect, useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { List } from "react-window";

import { Crown, HandCoins, Gift, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import { humanReadableFloat, blockchainFloat } from "@/lib/common.js";
import { getObjects } from "@/nanoeffects/src/common";

import { createTopDonatorsStore } from "@/nanoeffects/TopDonators.ts";
import { useInitCache } from "@/nanoeffects/Init.ts";
import { createUserBalancesStore } from "@/nanoeffects/UserBalances.ts";
import { createAssetFromSymbolStore } from "@/nanoeffects/Assets.ts";

import DeepLinkDialog from "./common/DeepLinkDialog.jsx";

import {
  DONATIONS_TARGET_ID,
  DONATIONS_TARGET_LABEL,
  DONATIONS_ASSET_ID,
  DONATIONS_ASSET_SYMBOL,
  DONATIONS_ASSET_PRECISION,
  DONATIONS_LIMIT,
  DONATIONS_LOOKBACK_DAYS,
  DONATIONS_DEFAULT_REFERRER_NAME,
  DONATIONS_TESTNET_REFERRER_NAME,
} from "@/config/donations.ts";

import { cn } from "@/lib/utils";

const DONOR_ROW_HEIGHT = 64;

export default function MonthlyReferrer() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useSyncExternalStore(
    $currentNode.subscribe,
    $currentNode.get,
    () => null
  );

  const isTestnet = Boolean(usr && usr.chain && usr.chain !== "bitshares");
  const isLTM = Boolean(usr && usr.id === usr.referrer);

  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  const [refreshCounter, setRefreshCounter] = useState(0);
  const [donors, setDonors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState({});

  const [donationAmount, setDonationAmount] = useState("");
  const [donateDialog, setDonateDialog] = useState(false);
  const [btsPrecision, setBtsPrecision] = useState(DONATIONS_ASSET_PRECISION);

  useEffect(() => {
    if (!usr || !usr.chain) return;
    const store = createAssetFromSymbolStore([usr.chain, "BTS"]);
    const unsub = store.subscribe(({ data, error }) => {
      if (data && !error && data.assetData) {
        setBtsPrecision(data.assetData.precision);
      }
    });
    return () => unsub();
  }, [usr]);

  useEffect(() => {
    if (isTestnet) return;
    const store = createTopDonatorsStore([
      DONATIONS_TARGET_ID,
      DONATIONS_ASSET_ID,
      DONATIONS_LIMIT,
      DONATIONS_LOOKBACK_DAYS,
    ]);
    const unsub = store.subscribe(({ data, error, loading }) => {
      setLoading(Boolean(loading));
      if (data && !error && !loading) {
        setDonors(data || []);
      } else if (!loading && error) {
        setDonors([]);
      }
    });
    return () => unsub();
  }, [isTestnet, refreshCounter]);

  useEffect(() => {
    async function fetchNames() {
      if (!donors.length) {
        setAccounts({});
        return;
      }
      try {
        const nodeURL = currentNode ? currentNode.url : null;
        const ids = donors.map((d) => d.id);
        const results = await getObjects("bitshares", ids, nodeURL);
        const map = {};
        for (const acc of results || []) {
          if (acc && acc.id) map[acc.id] = acc;
        }
        setAccounts(map);
      } catch (e) {
        console.log(e);
      }
    }
    fetchNames();
  }, [donors, currentNode]);

  const [btsBalanceSats, setBtsBalanceSats] = useState(0);
  useEffect(() => {
    if (isTestnet || !usr || !usr.id) return;
    const store = createUserBalancesStore([
      usr.chain,
      usr.id,
      currentNode ? currentNode.url : null,
    ]);
    const unsub = store.subscribe(({ data, error, loading }) => {
      if (data && !error && !loading) {
        const bts = (data || []).find((b) => b.asset_id === DONATIONS_ASSET_ID);
        setBtsBalanceSats(bts ? Number(bts.amount ?? 0) : 0);
      }
    });
    return () => unsub();
  }, [isTestnet, usr, currentNode]);

  const donationAmountSats = useMemo(() => {
    if (!donationAmount || isNaN(parseFloat(donationAmount))) return 0;
    const sats = blockchainFloat(
      parseFloat(donationAmount),
      btsPrecision
    );
    return sats > 0 ? sats : 0;
  }, [donationAmount, btsPrecision]);

  const donationOperation = useMemo(() => {
    if (!usr || !usr.id || !donationAmountSats) return null;
    return [
      {
        fee: { amount: 0, asset_id: "1.3.0" },
        from: usr.id,
        to: DONATIONS_TARGET_ID,
        amount: {
          amount: String(donationAmountSats),
          asset_id: DONATIONS_ASSET_ID,
        },
        extensions: {},
      },
    ];
  }, [usr, donationAmountSats]);

  const canDonate = Boolean(
    donationOperation &&
      btsBalanceSats >= donationAmountSats &&
      donationAmountSats > 0
  );

  const topDonor = donors.length ? donors[0] : null;
  const topDonorName =
    topDonor && accounts[topDonor.id]
      ? accounts[topDonor.id].name
      : topDonor
      ? topDonor.id
      : null;
  const effectiveReferrer = topDonorName
    ? topDonorName
    : DONATIONS_DEFAULT_REFERRER_NAME;

  const DonorRow = ({ index, style, items }) => {
    const d = items[index];
    if (!d) return null;
    const acc = accounts[d.id];
    const name = acc && acc.name ? acc.name : d.id;
    const amount = humanReadableFloat(d.totalAmount, btsPrecision);
    return (
      <div style={{ ...style, overflow: "hidden" }} className="px-1 pb-1">
        <div
          className={cn(
            "flex h-full items-center gap-2 rounded-lg border px-3",
            index === 0
              ? "border-[hsl(var(--accent-warning)/0.40)] bg-[hsl(var(--accent-warning)/0.08)]"
              : "border-border/60 bg-accent/10"
          )}
        >
          <div className="w-12 shrink-0 font-mono text-sm">
            {index === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-[hsl(var(--accent-1-fg))] font-semibold">
                <Crown className="h-4 w-4" strokeWidth={2.25} />
                {index + 1}
              </span>
            ) : (
              <span className="text-muted-foreground">{index + 1}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {name}
            </span>
            <span className="block truncate text-xs font-mono text-muted-foreground">
              {d.id}
            </span>
          </div>
          <div className="w-20 shrink-0 text-right font-mono text-sm text-foreground/80">
            {d.count.toLocaleString()}
          </div>
          <div className="w-32 shrink-0 text-right font-mono text-sm text-foreground">
            {amount.toLocaleString(locale.get() || undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: btsPrecision,
            })}{" "}
            {DONATIONS_ASSET_SYMBOL}
          </div>
        </div>
      </div>
    );
  };

  if (isTestnet) {
    return (
      <div className="container mx-auto mt-5 mb-5 max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-warning)/0.20)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-warning)/0.70)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-warning)/0.10)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-3)/0.10)] blur-3xl"
          />
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-1">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-warning)/0.40)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.30)] to-[hsl(var(--accent-3)/0.30)] dark:text-[hsl(var(--accent-warning-fg))] text-[hsl(var(--accent-warning-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-warning)/0.4)]">
                <Crown className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                {t("MonthlyReferrer:title", "Monthly Referrer")}
              </h2>
            </div>
            <p className="text-sm text-foreground/80 mt-3">
              {t("MonthlyReferrer:testnetMessage", "This feature is only available on mainnet. On testnet, the default referrer account ({{default}}) will be used for all new accounts.", { default: DONATIONS_TESTNET_REFERRER_NAME })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-5 mb-5 max-w-4xl">
      <div className="grid grid-cols-1 gap-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-warning)/0.20)]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-warning)/0.70)] to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-warning)/0.10)] blur-3xl"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[hsl(var(--accent-3)/0.10)] blur-3xl"
          />

          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-warning)/0.40)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.30)] to-[hsl(var(--accent-3)/0.30)] dark:text-[hsl(var(--accent-warning-fg))] text-[hsl(var(--accent-warning-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-warning)/0.4)]">
                <Crown className="h-4.5 w-4.5" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {t("MonthlyReferrer:title", "Monthly Referrer")}
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {t("MonthlyReferrer:subtitle")}
                </p>
              </div>
            </div>

            {!loading && donors.length ? (
              <div className="rounded-xl border border-[hsl(var(--accent-warning)/0.35)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.10)] to-transparent p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[hsl(var(--accent-warning)/0.40)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.30)] to-[hsl(var(--accent-3)/0.30)] text-white dark:text-white">
                    <Gift className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <p className="text-sm text-foreground/80">
                    {t("MonthlyReferrer:currentReferrer", "New accounts created in this app are currently registered & referred by:")}{" "}
                    <span className="font-semibold text-[hsl(var(--accent-1-fg))]">
                      {effectiveReferrer}
                    </span>
                  </p>
                </div>
              </div>
            ) : null}

            <div className="rounded-xl border border-[hsl(var(--accent-warning)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.06)] to-transparent p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[hsl(var(--accent-warning)/0.40)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.30)] to-[hsl(var(--accent-3)/0.30)] dark:text-[hsl(var(--accent-warning-fg))] text-[hsl(var(--accent-warning-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-warning)/0.4)]">
                  <HandCoins className="h-4 w-4" strokeWidth={2.25} />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {t("MonthlyReferrer:donate.title", "Donate to become the top donor")}
                  </h3>
                  <p className="text-xs text-muted-foreground/70">
                    {t("MonthlyReferrer:donate.target", {
                      target: DONATIONS_TARGET_LABEL,
                      symbol: DONATIONS_ASSET_SYMBOL,
                    })}
                  </p>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <p className="text-xs text-muted-foreground/80">
                    {t("MonthlyReferrer:donate.available", "Available")}
                  </p>
                  <p className="text-sm font-mono text-foreground">
                    {humanReadableFloat(
                      btsBalanceSats,
                      btsPrecision
                    ).toLocaleString(locale.get() || undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: btsPrecision,
                    })}{" "}
                    {DONATIONS_ASSET_SYMBOL}
                  </p>
                </div>
              </div>
              {isLTM ? (
                <>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-medium text-foreground/70 mb-1.5">
                        {t("MonthlyReferrer:donate.amount", "Amount")}{" "}
                        ({DONATIONS_ASSET_SYMBOL})
                      </label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={donationAmount}
                        onChange={(e) => {
                          const input = e.target.value;
                          if (new RegExp(`^\\d*\\.?\\d{0,${btsPrecision}}$`).test(input)) {
                            setDonationAmount(input);
                          }
                        }}
                        className="bg-accent/30 dark:bg-white/[0.05] border-border text-foreground placeholder:text-muted-foreground/60"
                      />
                    </div>
                    <Button
                      onClick={() => setDonateDialog(true)}
                      disabled={!canDonate}
                      aria-disabled={!canDonate}
                      className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-white dark:text-white shadow-[0_8px_28px_-12px_hsl(var(--accent-1)/0.7)] transition-all"
                    >
                      <Send className="h-4 w-4 mr-1.5" strokeWidth={2.25} />
                      {t("MonthlyReferrer:donate.submit", "Donate")}
                    </Button>
                  </div>
                  {donationAmountSats > 0 && btsBalanceSats < donationAmountSats ? (
                    <p className="mt-2 text-xs text-[hsl(var(--accent-danger-fg))]">
                      {t("MonthlyReferrer:donate.insufficient", "Insufficient balance")}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border border-[hsl(var(--accent-danger)/0.30)] bg-[hsl(var(--accent-danger)/0.06)] p-3">
                  <p className="text-xs text-foreground/80 flex-1">
                    {t("MonthlyReferrer:ltmRequired", "You need a lifetime membership")}
                  </p>
                  <a href="/ltm.html" className="shrink-0 ml-auto self-end sm:self-auto sm:ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-[hsl(var(--accent-1)/0.3)] text-[hsl(var(--accent-1-fg))] hover:bg-[hsl(var(--accent-1)/0.1)] hover:text-[hsl(var(--accent-1-fg))]"
                    >
                      {t("MonthlyReferrer:ltmUpgradeCta", "Upgrade to Lifetime Membership")}
                    </Button>
                  </a>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--accent-warning)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.06)] to-transparent p-4">
                <Spinner />
                <p>{t("Market:loading")}</p>
              </div>
            ) : donors.length ? (
              <div className="rounded-xl border border-[hsl(var(--accent-warning)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.06)] to-transparent p-2 sm:p-3 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-[hsl(var(--accent-warning)/0.08)]">
                  <div className="w-12 shrink-0 text-xs font-medium text-muted-foreground">
                    {t("MonthlyReferrer:th.rank", "Rank")}
                  </div>
                  <div className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
                    {t("MonthlyReferrer:th.donor", "Donor")}
                  </div>
                  <div className="w-20 shrink-0 text-right text-xs font-medium text-muted-foreground">
                    {t("MonthlyReferrer:th.transfers", "Transfers")}
                  </div>
                  <div className="w-32 shrink-0 text-right text-xs font-medium text-muted-foreground">
                    {t("MonthlyReferrer:th.amount", "Total")}
                  </div>
                </div>
                <List
                  rowComponent={DonorRow}
                  rowCount={donors.length}
                  rowHeight={DONOR_ROW_HEIGHT}
                  rowProps={{ items: donors }}
                  style={{ height: Math.min(320, donors.length * DONOR_ROW_HEIGHT) }}
                />
              </div>
            ) : (
              <div className="rounded-xl border border-[hsl(var(--accent-warning)/0.20)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.06)] to-transparent p-4">
                <p>{t("MonthlyReferrer:empty")} </p>
                <p className="mt-1 text-sm text-muted-foreground/80">
                  {t("MonthlyReferrer:emptyDefault", "New accounts are currently registered & referred by the default account:")}{" "}
                  <span className="font-semibold text-foreground">
                    {DONATIONS_DEFAULT_REFERRER_NAME}
                  </span>
                </p>
              </div>
            )}

            <div className="mt-4">
              <Button
                onClick={() => setRefreshCounter(refreshCounter + 1)}
                disabled={loading}
                aria-busy={loading}
                className="bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-white dark:text-white shadow-[0_8px_28px_-12px_hsl(var(--accent-1)/0.7)] hover:shadow-[0_12px_36px_-12px_hsl(var(--accent-1)/0.9)] transition-all"
              >
                {t("PortfolioTabs:refreshRecentActivityButton")}
              </Button>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-2xl shadow-[color:hsl(var(--accent-warning)/0.20)]">
          <div className="relative p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[hsl(var(--accent-warning)/0.40)] bg-gradient-to-br from-[hsl(var(--accent-warning)/0.30)] to-[hsl(var(--accent-3)/0.30)] dark:text-[hsl(var(--accent-warning-fg))] text-[hsl(var(--accent-warning-fg))] shadow-[0_0_18px_-2px_hsl(var(--accent-warning)/0.4)]">
                <HandCoins className="h-4 w-4" strokeWidth={2.25} />
              </span>
              <h3 className="text-base font-semibold text-foreground">
                {t("MonthlyReferrer:how.title", "How it works")}
              </h3>
            </div>
            <ul className="grid grid-cols-1 gap-2 text-sm text-foreground/75">
              <li>
                {t("MonthlyReferrer:how.intro", "Donate BTS to the creator of this application")}{" "}
                {t("MonthlyReferrer:how.intro2", "— the top donor of the past 30 days becomes the referrer/registrar for every new account created in this app.")}
              </li>
              <li>
                {t("MonthlyReferrer:how.topOnly", "Only the #1 donor earns the referrer/registrar role. Donors ranked 2–100 are listed here but receive no referral credit.")}
              </li>
              <li>
                {t("MonthlyReferrer:how.ltm", "Lifetime membership required — without an upgraded LTM account your referrals earn you no fees.")}
              </li>
              <li>
                {t("MonthlyReferrer:how.appOnly", "Only accounts created inside this application (create account, faucet method) are attributed to the top donor. Registrations made through other BitShares wallets or interfaces do not count.")}
              </li>
              <li>
                {t("MonthlyReferrer:how.noGuarantee", "Becoming the top donor does not guarantee you any referrals — you must actively invite people to create accounts through this app during the window. If nobody donates, the referrer falls back to the default account:")}{" "}
                <span className="font-mono text-foreground">
                  {DONATIONS_DEFAULT_REFERRER_NAME}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {donateDialog && donationOperation ? (
        <DeepLinkDialog
          operationNames={["transfer"]}
          username={usr.username}
          usrChain={usr.chain}
          userID={usr.id}
          dismissCallback={setDonateDialog}
          key={`Donating${donationAmount}${DONATIONS_ASSET_SYMBOL}to${DONATIONS_TARGET_LABEL}`}
          headerText={t("MonthlyReferrer:donate.header", "Donating {{amount}} {{symbol}} to {{target}}", {
            amount: donationAmount,
            symbol: DONATIONS_ASSET_SYMBOL,
            target: DONATIONS_TARGET_LABEL,
          })}
          trxJSON={donationOperation}
        />
      ) : null}
    </div>
  );
}