import React, { useEffect, useState } from "react";
import { InView } from "react-intersection-observer";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import { Avatar } from "@/components/Avatar";

import {
  Card,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

import AccountSelect from "../AccountSelect.jsx";

export default function CurrentUser(properties) {
  const { usr } = properties;
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });

  const [inView, setInView] = React.useState(false);
  if (!usr || !usr.id || !usr.id.length) {
    return null;
  }

  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (usr && usr.id && usr.id.length) {
      setOpen(false);
    }
  }, [usr]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Item variant="outline" className="bg-white">
                  <ItemMedia>
                    <InView onChange={setInView}>
                      {inView ? (
                        <Avatar
                          size={50}
                          name={usr.username}
                          extra=""
                          expression={{
                            eye: "normal",
                            mouth: "open",
                          }}
                          colors={[
                            "#92A1C6",
                            "#146A7C",
                            "#F0AB3D",
                            "#C271B4",
                            "#C20D90",
                          ]}
                        />
                      ) : null}
                    </InView>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-black">{usr.username}</ItemTitle>
                    <ItemDescription className="text-left">
                      {usr.id}
                      <br />
                      {usr.chain}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("CurrentUser:dialogContent.switchAccountChain")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle>
            {t("CurrentUser:dialogContent.replacingUser")}
          </DialogTitle>
        </DialogHeader>
        <AccountSelect />
      </DialogContent>
    </Dialog>
  );
}
