import React, { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { List } from "react-window";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import HoverInfo from "@/components/common/HoverInfo.tsx";
import AccountSearch from "@/components/AccountSearch.jsx";
import {
  WhitelistAuthorityRow,
  BlacklistAuthorityRow,
} from "./AuthorityRow.jsx";

export default function AuthorityListsSection({
  flagWhiteList,
  whitelistAuthorities,
  setWhitelistAuthorities,
  blacklistAuthorities,
  setBlacklistAuthorities,
  whitelistAuthorityDialogOpen,
  setWhitelistAuthorityDialogOpen,
  blacklistAuthorityDialogOpen,
  setBlacklistAuthorityDialogOpen,
  usr,
}) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });

  const handleWhitelistRemove = useCallback(
    (id) => {
      setWhitelistAuthorities(whitelistAuthorities.filter((x) => x.id !== id));
    },
    [whitelistAuthorities, setWhitelistAuthorities]
  );
  const handleBlacklistRemove = useCallback(
    (id) => {
      setBlacklistAuthorities(blacklistAuthorities.filter((x) => x.id !== id));
    },
    [blacklistAuthorities, setBlacklistAuthorities]
  );
  const whitelistRowProps = useMemo(
    () => ({ items: whitelistAuthorities, onRemove: handleWhitelistRemove }),
    [whitelistAuthorities, handleWhitelistRemove]
  );
  const blacklistRowProps = useMemo(
    () => ({ items: blacklistAuthorities, onRemove: handleBlacklistRemove }),
    [blacklistAuthorities, handleBlacklistRemove]
  );

  if (!flagWhiteList) return null;

  return (
    <div className="space-y-8">
      <div className="col-span-2 space-y-4">
        <HoverInfo
          content={t("AssetCommon:whitelist.header_content")}
          header={t("AssetCommon:whitelist.header")}
          type="header"
        />
        <div className="grid grid-cols-12 gap-3">
          <span className="col-span-9 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="w-full h-[300px]">
              <List
                height={300}
                width="100%"
                rowComponent={WhitelistAuthorityRow}
                rowCount={whitelistAuthorities.length}
                rowHeight={75}
                rowProps={whitelistRowProps}
              />
            </div>
          </span>
          <span className="col-span-3 text-center">
            <Dialog
              open={whitelistAuthorityDialogOpen}
              onOpenChange={(open) => {
                setWhitelistAuthorityDialogOpen(open);
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
                  chain={usr && usr.chain ? usr.chain : "bitshares"}
                  excludedUsers={
                    usr && usr.username && usr.username.length
                      ? [usr]
                      : []
                  }
                  setChosenAccount={(_account) => {
                    if (
                      _account &&
                      !whitelistAuthorities.find(
                        (_usr) => _usr.id === _account.id
                      )
                    ) {
                      setWhitelistAuthorities(
                        whitelistAuthorities &&
                          whitelistAuthorities.length
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

      <div className="col-span-2 space-y-4">
        <HoverInfo
          content={t("AssetCommon:blacklist.header_content")}
          header={t("AssetCommon:blacklist.header")}
          type="header"
        />
        <div className="grid grid-cols-12 gap-3">
          <span className="col-span-9 rounded-xl border border-border/60 bg-card/40 p-4">
            <div className="w-full h-[300px]">
              <List
                height={300}
                width="100%"
                rowComponent={BlacklistAuthorityRow}
                rowCount={blacklistAuthorities.length}
                rowHeight={75}
                rowProps={blacklistRowProps}
              />
            </div>
          </span>
          <span className="col-span-3 text-center">
            <Dialog
              open={blacklistAuthorityDialogOpen}
              onOpenChange={(open) => {
                setBlacklistAuthorityDialogOpen(open);
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
                  chain={usr && usr.chain ? usr.chain : "bitshares"}
                  excludedUsers={
                    usr && usr.username && usr.username.length
                      ? [usr]
                      : []
                  }
                  setChosenAccount={(_account) => {
                    if (
                      _account &&
                      !blacklistAuthorities.find(
                        (_usr) => _usr.id === _account.id
                      )
                    ) {
                      setBlacklistAuthorities(
                        blacklistAuthorities &&
                          blacklistAuthorities.length
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
    </div>
  );
}
