import React, { useState, useMemo } from "react";
import { List } from "react-window";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { PlusCircledIcon } from "@radix-ui/react-icons";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { humanReadableFloat } from "@/bts/common";

/**
 * Creating a basic asset dropdown component
 * @param {String} assetSymbol current asset symbol
 * @param {Function} storeCallback setState
 * @param {String} otherAsset market pair asset
 * @returns {JSX.Element}
 */
export default function BalanceAssetDropDownCard(properties) {
  const {
    assetsToHide, // already selected balance assets
    storeCallback,
    assets,
    size,
    usrBalances,
  } = properties;

  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredUserBalances = useMemo(() => {
    let _balances;
    if (assetsToHide) {
      const filteredBalances = usrBalances.filter((balance) => {
        return !assetsToHide.includes(balance.asset_id);
      });
      _balances = filteredBalances;
    } else {
      _balances = usrBalances;
    }
    return _balances.filter((balance) => balance.amount > 0);
  }, [assetsToHide, usrBalances]);

  const Row = ({ index, style }) => {
    let res = filteredUserBalances[index];

    if (!res || !assets) {
      return;
    }

    const specifiedAsset = assets.find((asset) => asset.id === res.asset_id);
    if (!specifiedAsset) {
      console.log("Asset not found in assets list");
      return;
    }

    const balanceAvailable = humanReadableFloat(
      res.amount,
      specifiedAsset.precision
    );

    const [transferAmount, setTransferAmount] = useState(0);

    return (
      <div style={{ ...style, marginBottom: "10px", paddingRight: "10px" }}>
        <Dialog>
          <DialogTrigger asChild>
            <Card key={`acard-${res.asset_id}`}>
              <CardHeader className="p-3">
                <CardTitle className="h-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      {specifiedAsset.symbol} ({res.asset_id})
                    </div>
                    <div>{balanceAvailable}</div>
                  </div>
                </CardTitle>
              </CardHeader>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px] bg-white">
            <DialogHeader>
              <DialogTitle>
                {t("Transfer:amountToTransfer", {
                  asset: specifiedAsset.symbol,
                })}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-2">
              <Input
                label={t("Transfer:amountToTransferLabel")}
                value={transferAmount}
                placeholder={transferAmount}
                onChange={(e) => {
                  let regex = new RegExp(
                    `^[0-9]*\\.?[0-9]{0,${specifiedAsset.precision}}$`
                  );

                  if (regex.test(e.target.value)) {
                    setTransferAmount(e.target.value);
                  }
                }}
                className="mb-1"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setTransferAmount(balanceAvailable);
                }}
              >
                {t("LimitOrderCard:useBalance")}
              </Button>
            </div>
            {transferAmount > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  storeCallback({
                    asset: specifiedAsset,
                    amount: transferAmount,
                  });
                  setDialogOpen(false);
                }}
              >
                {t("barter:submit")}
              </Button>
            ) : (
              <Button variant="outline" disabled>
                {t("barter:submit")}
              </Button>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(open) => {
        setDialogOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={"outline"}
          className={`${
            size && size === "small" ? "h-7 " : ""
          }p-3 hover:shadow-lg`}
          onClick={() => setDialogOpen(true)}
        >
          <PlusCircledIcon className="mr-2 h-4 w-4" /> {t("Barter:addAsset")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] bg-white">
        <DialogHeader>
          <DialogTitle>
            <h3 className="text-2xl font-extrabold tracking-tight">
              {t("AssetDropDownCard:selecting")}
            </h3>
          </DialogTitle>
        </DialogHeader>
        {filteredUserBalances && filteredUserBalances.length ? (
          <>
            <List
              height={350}
              rowComponent={Row}
              rowCount={filteredUserBalances.length}
              rowHeight={45}
              rowProps={{}}
              className="w-full"
            />
          </>
        ) : (
          "N/A"
        )}
      </DialogContent>
    </Dialog>
  );
}
