import React, { useState, useMemo, useSyncExternalStore } from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import {
  Search,
  User,
  Coins,
  Hash,
  FileText,
  Box,
  Star,
  Copy,
  Check,
  Database,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { $currentUser } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";
import {
  $favouriteUsers,
  $favouriteAssets,
  addFavouriteUser,
  removeFavouriteUser,
  addFavouriteAsset,
  removeFavouriteAsset,
} from "@/stores/favourites.ts";

import {
  fetchAccountFull,
  fetchAssetFull,
  fetchObjectById,
  fetchBlockByNumber,
  fetchTransactionByHash,
} from "@/nanoeffects/Explorer.ts";

function JSONDialog({ open, onOpenChange, title, subtitle, jsonData, favControl }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const [copied, setCopied] = useState(false);
  const jsonString = useMemo(() => {
    if (!jsonData) return "";
    try {
      return JSON.stringify(jsonData, null, 2);
    } catch {
      return String(jsonData);
    }
  }, [jsonData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[820px] w-[95vw] max-h-[85vh] flex flex-col bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            {favControl}
          </DialogTitle>
          {subtitle ? <DialogDescription>{subtitle}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <Textarea
            readOnly
            value={jsonString}
            rows={22}
            className="font-mono text-xs flex-1 min-h-[420px] max-h-[60vh] resize-y"
            placeholder={t("Explorer:jsonPlaceholder")}
          />
          <div className="flex items-center justify-between gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {jsonString.length ? `${(jsonString.length / 1024).toFixed(1)} KB` : ""}
            </span>
            <Button onClick={handleCopy} variant="outline" size="sm" className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t("Explorer:copied") : t("Explorer:copy")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionCard({ icon: Icon, accent, title, description, children }) {
  return (
    <Card className="overflow-hidden border-border bg-card/60 backdrop-blur">
      <div className={`h-1 w-full bg-gradient-to-r from-[hsl(var(--accent-${accent}))] to-[hsl(var(--accent-${accent}))]`} />
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-[hsl(var(--accent-${accent})/0.15)] border-[hsl(var(--accent-${accent})/0.25)]`}>
            <Icon className={`h-4 w-4 text-[hsl(var(--accent-${accent}-fg))]`} />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs mt-1">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

export default function Explorer() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore($currentUser.subscribe, $currentUser.get, () => true);
  const currentNode = useStore($currentNode);
  const favUsers = useStore($favouriteUsers);
  const favAssets = useStore($favouriteAssets);
  const chain = usr && usr.chain ? usr.chain : "bitshares";

  // per-section inputs
  const [accountInput, setAccountInput] = useState("");
  const [assetInput, setAssetInput] = useState("");
  const [objectInput, setObjectInput] = useState("");
  const [txInput, setTxInput] = useState("");
  const [blockInput, setBlockInput] = useState("");

  // loading / error per section
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  // dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogSubtitle, setDialogSubtitle] = useState("");
  const [dialogData, setDialogData] = useState(null);
  const [dialogFav, setDialogFav] = useState(null);

  const setSectionLoading = (key, val) =>
    setLoading((p) => ({ ...p, [key]: val }));
  const setSectionError = (key, msg) =>
    setErrors((p) => ({ ...p, [key]: msg || null }));

  const openDialog = (title, subtitle, data, favEl) => {
    setDialogTitle(title);
    setDialogSubtitle(subtitle || "");
    setDialogData(data);
    setDialogFav(favEl || null);
    setDialogOpen(true);
  };

  const isFavUser = (id) => {
    const list = favUsers ? favUsers[chain] || [] : [];
    return !!list.find((u) => u.id === id);
  };
  const isFavAsset = (id) => {
    const list = favAssets ? favAssets[chain] || [] : [];
    return !!list.find((a) => a.id === id);
  };

  const handleAccountSearch = async () => {
    const trimmed = accountInput.trim();
    if (!trimmed) {
      setSectionError("account", t("Explorer:account.errorEmpty"));
      return;
    }
    setSectionLoading("account", true);
    setSectionError("account", null);
    try {
      const result = await fetchAccountFull(chain, trimmed, currentNode ? currentNode.url : null);
      const fav = (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-2"
          onClick={() => {
            const u = { name: result.account.name, id: result.account.id };
            if (isFavUser(result.account.id)) removeFavouriteUser(chain, u);
            else addFavouriteUser(chain, u);
          }}
          title={isFavUser(result.account.id) ? t("Explorer:removeFavourite") : t("Explorer:favourite")}
        >
          <Star className={`h-4 w-4 ${isFavUser(result.account.id) ? "fill-[hsl(var(--accent-warning))] text-[hsl(var(--accent-warning-fg))]" : "text-muted-foreground"}`} />
        </Button>
      );
      openDialog(
        t("Explorer:account.dialogTitle", { name: result.account.name, id: result.account.id }),
        t("Explorer:account.dialogSubtitle", { chain }),
        result,
        fav
      );
    } catch (e) {
      setSectionError("account", e?.message || String(e));
    } finally {
      setSectionLoading("account", false);
    }
  };

  const handleAssetSearch = async () => {
    const trimmed = assetInput.trim();
    if (!trimmed) {
      setSectionError("asset", t("Explorer:asset.errorEmpty"));
      return;
    }
    setSectionLoading("asset", true);
    setSectionError("asset", null);
    try {
      const result = await fetchAssetFull(chain, trimmed, currentNode ? currentNode.url : null);
      const fav = (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 ml-2"
          onClick={() => {
            const a = { symbol: result.asset.symbol, id: result.asset.id, issuer: result.asset.issuer };
            if (isFavAsset(result.asset.id)) removeFavouriteAsset(chain, a);
            else addFavouriteAsset(chain, a);
          }}
          title={isFavAsset(result.asset.id) ? t("Explorer:removeFavourite") : t("Explorer:favourite")}
        >
          <Star className={`h-4 w-4 ${isFavAsset(result.asset.id) ? "fill-[hsl(var(--accent-warning))] text-[hsl(var(--accent-warning-fg))]" : "text-muted-foreground"}`} />
        </Button>
      );
      openDialog(t("Explorer:asset.dialogTitle", { symbol: result.asset.symbol, id: result.asset.id }), t("Explorer:asset.dialogSubtitle", { chain }), result, fav);
    } catch (e) {
      setSectionError("asset", e?.message || String(e));
    } finally {
      setSectionLoading("asset", false);
    }
  };

  const handleObjectSearch = async () => {
    const trimmed = objectInput.trim();
    if (!/^\d+\.\d+\.\d+$/.test(trimmed)) {
      setSectionError("object", t("Explorer:object.errorInvalid"));
      return;
    }
    setSectionLoading("object", true);
    setSectionError("object", null);
    try {
      const result = await fetchObjectById(chain, trimmed, currentNode ? currentNode.url : null);
      openDialog(t("Explorer:object.dialogTitle", { id: trimmed }), t("Explorer:object.dialogSubtitle", { chain }), result);
    } catch (e) {
      setSectionError("object", e?.message || String(e));
    } finally {
      setSectionLoading("object", false);
    }
  };

  const handleTxSearch = async () => {
    const trimmed = txInput.trim().toLowerCase();
    if (!trimmed) {
      setSectionError("tx", t("Explorer:tx.errorEmpty"));
      return;
    }
    if (!/^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(trimmed)) {
      setSectionError("tx", t("Explorer:tx.errorInvalid"));
      return;
    }
    setSectionLoading("tx", true);
    setSectionError("tx", null);
    try {
      const result = await fetchTransactionByHash(chain, trimmed, currentNode ? currentNode.url : null);
      openDialog(t("Explorer:tx.dialogTitle", { hash: `${trimmed.slice(0, 12)}…` }), t("Explorer:tx.dialogSubtitle", { chain }), result);
    } catch (e) {
      setSectionError("tx", e?.message || String(e));
    } finally {
      setSectionLoading("tx", false);
    }
  };

  const handleBlockSearch = async () => {
    const trimmed = blockInput.trim();
    const num = parseInt(trimmed, 10);
    if (!trimmed || isNaN(num) || num <= 0) {
      setSectionError("block", t("Explorer:block.errorInvalid"));
      return;
    }
    setSectionLoading("block", true);
    setSectionError("block", null);
    try {
      const result = await fetchBlockByNumber(chain, num, currentNode ? currentNode.url : null);
      openDialog(t("Explorer:block.dialogTitle", { num }), t("Explorer:block.dialogSubtitle", { chain }), result);
    } catch (e) {
      setSectionError("block", e?.message || String(e));
    } finally {
      setSectionLoading("block", false);
    }
  };

  const renderError = (key) =>
    errors[key] ? (
      <div className="mt-2 flex items-center gap-2 text-xs text-destructive">
        <AlertCircle className="h-3.5 w-3.5" /> <span>{errors[key]}</span>
      </div>
    ) : null;

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 max-w-6xl">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-[0_8px_24px_-8px_rgba(0,0,0,0.25),inset_0_1px_0_0_rgba(255,255,255,0.04)]">
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-1)/0.5)] to-transparent" />
          <span aria-hidden="true" className="pointer-events-none absolute -top-24 -left-20 h-48 w-48 rounded-full bg-[hsl(var(--accent-1)/0.12)] blur-2xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-20 h-48 w-48 rounded-full bg-[hsl(var(--accent-2)/0.12)] blur-2xl" />

          <div className="relative p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--accent-1)/0.3)] to-[hsl(var(--accent-2)/0.3)] border border-[hsl(var(--accent-1)/0.4)] shadow-[0_0_12px_-2px_hsl(var(--accent-1)/0.25)]">
                    <Database className="h-4 w-4 text-[hsl(var(--accent-1-fg))]" />
                  </span>
                  {t("Explorer:title")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("Explorer:subtitle")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Account */}
              <SectionCard
                icon={User}
                accent="1"
                title={t("Explorer:account.title")}
                description={t("Explorer:account.description")}
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      placeholder={t("Explorer:account.placeholder")}
                      value={accountInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^[a-z0-9.-]*$/i.test(v) || /^1\.2\.\d*$/.test(v)) setAccountInput(v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAccountSearch();
                      }}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={handleAccountSearch} disabled={!!loading.account} className="shrink-0 gap-2">
                    {loading.account ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {t("Explorer:search")}
                  </Button>
                </div>
                {renderError("account")}
              </SectionCard>

              {/* Asset */}
              <SectionCard
                icon={Coins}
                accent="2"
                title={t("Explorer:asset.title")}
                description={t("Explorer:asset.description")}
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      placeholder={t("Explorer:asset.placeholder")}
                      value={assetInput}
                      onChange={(e) => setAssetInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAssetSearch();
                      }}
                      className="pl-9 uppercase"
                    />
                  </div>
                  <Button onClick={handleAssetSearch} disabled={!!loading.asset} className="shrink-0 gap-2">
                    {loading.asset ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {t("Explorer:search")}
                  </Button>
                </div>
                {renderError("asset")}
              </SectionCard>

              {/* Object ID */}
              <SectionCard
                icon={Box}
                accent="3"
                title={t("Explorer:object.title")}
                description={t("Explorer:object.description")}
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Box className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      placeholder={t("Explorer:object.placeholder")}
                      value={objectInput}
                      onChange={(e) => setObjectInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleObjectSearch();
                      }}
                      className="pl-9 font-mono"
                    />
                  </div>
                  <Button onClick={handleObjectSearch} disabled={!!loading.object} className="shrink-0 gap-2">
                    {loading.object ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {t("Explorer:search")}
                  </Button>
                </div>
                {renderError("object")}
              </SectionCard>

              {/* Transaction hash */}
              <SectionCard
                icon={FileText}
                accent="1"
                title={t("Explorer:tx.title")}
                description={t("Explorer:tx.description")}
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      placeholder={t("Explorer:tx.placeholder")}
                      value={txInput}
                      onChange={(e) => setTxInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleTxSearch();
                      }}
                      className="pl-9 font-mono"
                    />
                  </div>
                  <Button onClick={handleTxSearch} disabled={!!loading.tx} className="shrink-0 gap-2">
                    {loading.tx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {t("Explorer:search")}
                  </Button>
                </div>
                {renderError("tx")}
              </SectionCard>

              {/* Block number */}
              <SectionCard
                icon={Hash}
                accent="2"
                title={t("Explorer:block.title")}
                description={t("Explorer:block.description")}
              >
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Database className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      placeholder={t("Explorer:block.placeholder")}
                      value={blockInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (/^\d*$/.test(v)) setBlockInput(v);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleBlockSearch();
                      }}
                      className="pl-9 font-mono"
                      inputMode="numeric"
                    />
                  </div>
                  <Button onClick={handleBlockSearch} disabled={!!loading.block} className="shrink-0 gap-2">
                    {loading.block ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    {t("Explorer:search")}
                  </Button>
                </div>
                {renderError("block")}
              </SectionCard>
            </div>
          </div>
        </div>
      </div>

      <JSONDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={dialogTitle}
        subtitle={dialogSubtitle}
        jsonData={dialogData}
        favControl={dialogFav}
      />
    </>
  );
}
