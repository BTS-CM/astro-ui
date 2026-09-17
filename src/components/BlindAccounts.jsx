import React, { useState, useMemo, useEffect, useRef } from "react";
import { useStore } from "@nanostores/react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { Plus, KeyRound, Download, Upload, Trash2, Copy, Eye, EyeOff } from "lucide-react";

import {
  $blindAccounts,
  addAccount,
  removeAccount,
} from "@/stores/blindAccounts.ts";
import {
  suggestBrainKey,
  accountFromBrainKey,
  accountFromWif,
  encryptWif,
  encrypt,
  strength,
} from "@/lib/blindAccounts.js";

const STRENGTH_COLORS = [
  "bg-[hsl(var(--accent-danger-fg))]",
  "bg-[hsl(var(--accent-danger-fg))]",
  "bg-[hsl(var(--accent-warning-fg))]",
  "bg-[hsl(var(--accent-success-fg))]",
  "bg-[hsl(var(--accent-success-fg))]",
];

function PasswordFields({ t, password, setPassword, confirm, setConfirm }) {
  const [show, setShow] = useState(false);
  const meter = useMemo(() => strength(password), [password]);
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className="space-y-3">
      <Alert className="border-[hsl(var(--accent-warning)/0.4)] bg-[hsl(var(--accent-warning)/0.08)]">
        <AlertDescription className="text-[11px] text-[hsl(var(--accent-warning-fg))]">
          {t("BlindAccounts:passwordWarning")}
        </AlertDescription>
      </Alert>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {t("BlindAccounts:passwordLabel")}
        </Label>
        <div className="relative">
          <Input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("BlindAccounts:passwordPlaceholder")}
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password.length > 0 ? (
          <div className="space-y-1">
            <Progress
              value={(meter.score / 4) * 100}
              className={`h-1.5 ${STRENGTH_COLORS[meter.score]}`}
            />
            <p className="text-[10px] text-muted-foreground">
              {t("BlindAccounts:strengthLabel")}:{" "}
              {t(`BlindAccounts:strength.${meter.label}`)} ({meter.bits} bits)
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
          {t("BlindAccounts:passwordConfirmLabel")}
        </Label>
        <Input
          type={show ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={t("BlindAccounts:passwordPlaceholder")}
        />
        {mismatch ? (
          <p className="text-[10px] text-[hsl(var(--accent-danger-fg))]">
            {t("BlindAccounts:passwordMismatch")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function BlindAccounts({ chain }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const accounts = useStore($blindAccounts);

  const list = useMemo(
    () => (accounts && accounts[chain]) || [],
    [accounts, chain]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  return (
    <Card className="relative overflow-hidden border border-border bg-card/60">
      <div className="relative p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[hsl(var(--accent-1)/0.30)] bg-gradient-to-br from-[hsl(var(--accent-1)/0.20)] to-[hsl(var(--accent-3)/0.20)] text-[hsl(var(--accent-1-gradFg))] flex-shrink-0">
              <KeyRound className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-bold tracking-tight">
                {t("BlindAccounts:title")}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {t("BlindAccounts:description")}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setError("");
                setImportOpen(true);
              }}
              className="gap-1 h-8 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setError("");
                setRestoreOpen(true);
              }}
              className="gap-1 h-8 border-[hsl(var(--accent-1)/0.3)] hover:bg-[hsl(var(--accent-1)/0.06)]"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setError("");
                setNotice("");
                setCreateOpen(true);
              }}
              className="gap-1 h-8 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))]"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {notice ? (
          <p className="text-[11px] text-[hsl(var(--accent-success-fg))]">
            {notice}
          </p>
        ) : null}

        {list.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">
            {t("BlindAccounts:noAccounts")}
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((acc) => (
              <AccountRow
                key={acc.publicKey}
                t={t}
                account={acc}
                onRemove={() => {
                  if (window.confirm(t("BlindAccounts:removeConfirm"))) {
                    removeAccount(chain, acc.label);
                  }
                }}
                onBackup={() => {
                  const blob = new Blob(
                    [
                      JSON.stringify(
                        {
                          version: 1,
                          label: acc.label,
                          chain: acc.chain,
                          publicKey: acc.publicKey,
                          encryptedWif: acc.encryptedWif,
                          encryptedBrainKey: acc.encryptedBrainKey,
                        },
                        null,
                        2
                      ),
                    ],
                    { type: "application/json" }
                  );
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `blind-account-${(acc.label || "account")
                    .replace(/[^a-zA-Z0-9_-]/g, "_")
                    .slice(0, 64)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  setNotice(t("BlindAccounts:backupDownloaded"));
                }}
              />
            ))}
          </div>
        )}

        {error ? (
          <p className="text-[11px] text-[hsl(var(--accent-danger-fg))]">
            {error}
          </p>
        ) : null}
      </div>

      <CreateDialog
        t={t}
        chain={chain}
        open={createOpen}
        setOpen={setCreateOpen}
        onError={setError}
        onNotice={setNotice}
      />
      <ImportDialog
        t={t}
        chain={chain}
        open={importOpen}
        setOpen={setImportOpen}
        onError={setError}
      />
      <RestoreDialog
        t={t}
        chain={chain}
        open={restoreOpen}
        setOpen={setRestoreOpen}
        onError={setError}
      />
    </Card>
  );
}

function AccountRow({ t, account, onRemove, onBackup }) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-accent/20 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground truncate">
          {account.label}
        </div>
        <div className="font-mono text-[10px] text-muted-foreground truncate">
          {account.publicKey}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        title={t("BlindAccounts:pubKeyLabel")}
        aria-label={t("BlindAccounts:pubKeyLabel")}
        onClick={() => {
          navigator.clipboard?.writeText(account.publicKey);
          setCopied(true);
          if (copyTimer.current) clearTimeout(copyTimer.current);
          copyTimer.current = setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Copy className="h-3.5 w-3.5 text-[hsl(var(--accent-success-fg))]" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-1-fg))]"
        title={t("BlindAccounts:backupButton")}
        onClick={onBackup}
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--accent-danger-fg))]"
        title={t("BlindAccounts:removeButton")}
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function CreateDialog({ t, chain, open, setOpen, onError }) {
  const [label, setLabel] = useState("");
  const [brainKey, setBrainKey] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const regenerate = async () => {
    try {
      setBrainKey(await suggestBrainKey());
    } catch (e) {
      onError(e.message || String(e));
    }
  };

  const submit = async () => {
    setBusy(true);
    try {
      if (!label.trim()) throw new Error(t("BlindAccounts:errorLabelExists"));
      if (password !== confirm)
        throw new Error(t("BlindAccounts:passwordMismatch"));
      if (strength(password).score < 2)
        throw new Error(t("BlindAccounts:strength.weak"));

      const acc = await accountFromBrainKey(label.trim(), chain, brainKey, 0);
      const encryptedWif = await encryptWif(acc.wif, password);
      const encryptedBrainKey = await encrypt(brainKey, password);
      addAccount(chain, {
        label: acc.label,
        chain: acc.chain,
        publicKey: acc.publicKey,
        encryptedWif,
        encryptedBrainKey,
      });
      setOpen(false);
      setLabel("");
      setBrainKey("");
      setPassword("");
      setConfirm("");
    } catch (e) {
      onError(e.message || t("BlindAccounts:errorGeneric", { message: String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) regenerate();
        setOpen(o);
      }}
    >
      <DialogContent className="sm:max-w-[460px] bg-card">
        <DialogHeader>
          <DialogTitle>{t("BlindAccounts:createTitle")}</DialogTitle>
          <DialogDescription>{t("BlindAccounts:createDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {t("BlindAccounts:labelLabel")}
          </Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("BlindAccounts:labelPlaceholder")}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              {t("BlindAccounts:brainKeyLabel")}
            </Label>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 gap-1 text-[11px] text-[hsl(var(--accent-1-fg))]"
                onClick={() => navigator.clipboard?.writeText(brainKey)}
              >
                <Copy className="h-3 w-3" />
                {t("BlindAccounts:copyBrainKey")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[11px] text-[hsl(var(--accent-1-fg))]"
                onClick={regenerate}
              >
                {t("BlindAccounts:generateNew")}
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-accent/30 p-3 font-mono text-[11px] leading-relaxed break-words">
            {brainKey}
          </div>
        </div>

        <PasswordFields
          t={t}
          password={password}
          setPassword={setPassword}
          confirm={confirm}
          setConfirm={setConfirm}
        />

        <Button
          onClick={submit}
          disabled={busy}
          className="w-full gap-2 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))]"
        >
          {busy ? t("BlindAccounts:creating") : t("BlindAccounts:createButton")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({ t, chain, open, setOpen, onError }) {
  const [label, setLabel] = useState("");
  const [brainKey, setBrainKey] = useState("");
  const [wif, setWif] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      if (!label.trim()) throw new Error(t("BlindAccounts:errorLabelExists"));
      if (password !== confirm)
        throw new Error(t("BlindAccounts:passwordMismatch"));
      if (strength(password).score < 2)
        throw new Error(t("BlindAccounts:strength.weak"));

      let acc;
      if (brainKey.trim().split(/\s+/).length >= 12) {
        acc = await accountFromBrainKey(label.trim(), chain, brainKey.trim(), 0);
      } else if (wif.trim()) {
        acc = await accountFromWif(label.trim(), chain, wif.trim());
      } else {
        throw new Error(t("BlindAccounts:errorGeneric", { message: "no key" }));
      }

      const encryptedWif = await encryptWif(acc.wif, password);
      const encryptedBrainKey = brainKey.trim()
        ? await encrypt(brainKey.trim(), password)
        : null;
      addAccount(chain, {
        label: acc.label,
        chain: acc.chain,
        publicKey: acc.publicKey,
        encryptedWif,
        encryptedBrainKey,
      });
      setOpen(false);
      setLabel("");
      setBrainKey("");
      setWif("");
      setPassword("");
      setConfirm("");
    } catch (e) {
      onError(e.message || t("BlindAccounts:errorGeneric", { message: String(e) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[460px] bg-card">
        <DialogHeader>
          <DialogTitle>{t("BlindAccounts:importTitle")}</DialogTitle>
          <DialogDescription>{t("BlindAccounts:importDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {t("BlindAccounts:labelLabel")}
          </Label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("BlindAccounts:labelPlaceholder")}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {t("BlindAccounts:importBrainKeyLabel")}
          </Label>
          <Input
            value={brainKey}
            onChange={(e) => setBrainKey(e.target.value)}
            placeholder="word1 word2 … word16"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {t("BlindAccounts:importWifLabel")}
          </Label>
          <Input
            value={wif}
            onChange={(e) => setWif(e.target.value)}
            placeholder="5K… / 5H…"
          />
        </div>

        <PasswordFields
          t={t}
          password={password}
          setPassword={setPassword}
          confirm={confirm}
          setConfirm={setConfirm}
        />

        <Button
          onClick={submit}
          disabled={busy}
          className="w-full gap-2 bg-gradient-to-r from-[hsl(var(--accent-1))] to-[hsl(var(--accent-3))] text-[hsl(var(--accent-1-gradFg))]"
        >
          {t("BlindAccounts:importButton")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function RestoreDialog({ t, chain, open, setOpen, onError }) {
  const [error, setLocalError] = useState("");

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data.publicKey || !data.encryptedWif) {
          throw new Error("invalid");
        }
        addAccount(chain, {
          label: data.label || "restored",
          chain: data.chain || chain,
          publicKey: data.publicKey,
          encryptedWif: data.encryptedWif,
          encryptedBrainKey: data.encryptedBrainKey || null,
        });
        setOpen(false);
      } catch (err) {
        setLocalError(t("BlindAccounts:restoreError"));
        onError(t("BlindAccounts:restoreError"));
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[420px] bg-card">
        <DialogHeader>
          <DialogTitle>{t("BlindAccounts:restoreTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
            {t("BlindAccounts:restoreFromFile")}
          </Label>
          <Input type="file" accept="application/json,.json" onChange={onFile} />
          {error ? (
            <p className="text-[11px] text-[hsl(var(--accent-danger-fg))]">
              {error}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
