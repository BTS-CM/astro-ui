import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance } from "@/lib/i18n.js";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CardRow(properties) {
  const { t, i18n } = useTranslation("en", { i18n: i18nInstance });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const handleTooltipClick = (e) => {
    e.stopPropagation();
    if (!dialogOpen) {
      setDialogOpen(true);
    }
  };

  return (
    <div className="col-span-1" key={`${properties.dialogtitle}`}>
      <div className="grid grid-cols-10">
        <div className="col-span-4">{properties.title}:</div>
        <div className="col-span-5 mr-2">
          <Badge variant="outline" className="pl-2 pb-1 w-full">
            {properties.button}
          </Badge>
        </div>
        <div className="col-span-1">
          <TooltipProvider>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                setTooltipOpen(false);
              }}
            >
              <DialogContent className="sm:max-w-[400px] bg-white">
                <DialogHeader>
                  <DialogTitle>{properties.dialogtitle}</DialogTitle>
                  {properties.dialogdescription}
                </DialogHeader>
              </DialogContent>
              <Tooltip>
                <TooltipTrigger
                  asChild
                  open={tooltipOpen}
                  onMouseOver={() => {
                    setTooltipOpen(true);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 text-gray-400"
                      onClick={handleTooltipClick}
                    >
                      ?
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                {tooltipOpen && <TooltipContent>{properties.tooltip}</TooltipContent>}
              </Tooltip>
            </Dialog>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
