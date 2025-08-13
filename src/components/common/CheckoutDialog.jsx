import React from 'react';
import { useStore } from '@nanostores/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"; // ShadCN UI Dialog
import { Button } from "@/components/ui/button"; // ShadCN UI Button
import { ScrollArea } from "@/components/ui/scroll-area"; // ShadCN UI ScrollArea
import { Trash2 } from 'lucide-react'; // Lucide icon

import { $checkoutDialogOpen, closeCheckoutDialog, openDeepLinkDialog } from '../../stores/uiStore';
import { basketItems, getCombinedOperations, clearBasket, removeFromBasket } from '../../stores/basketStore';
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

export default function CheckoutDialog() {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const isOpen = useStore($checkoutDialogOpen);
  const items = useStore(basketItems);

  const handleClose = () => {
    closeCheckoutDialog();
  };

  const handleCreateCombinedDeeplink = () => {
    const combinedOps = getCombinedOperations();
    if (combinedOps.length > 0) {
      openDeepLinkDialog(combinedOps, { pageUrl: 'basket', pageTitle: 'Basket Checkout', fromBasket: true });
      // clearBasket(); // Decide if you want to clear immediately or after successful deeplink generation/broadcast
      handleClose();
    } else {
      // Consider using a toast notification here
      alert(t("checkoutDialog:emptyBasketAlert") ?? "Basket is empty!");
    }
  };

  const handleRemoveItem = (itemId) => {
    removeFromBasket(itemId);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{t("checkoutDialog:title") ?? "Basket Checkout"}</DialogTitle>
          <DialogDescription>
            {t("checkoutDialog:description") ?? "Review your operations before creating a combined deeplink."}
          </DialogDescription>
        </DialogHeader>
        
        {items.length === 0 ? (
          <p className="py-4">{t("checkoutDialog:emptyMessage") ?? "Your basket is empty."}</p>
        ) : (
          <ScrollArea className="h-[300px] w-full rounded-md border p-4 my-4">
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-semibold">
                      {t("checkoutDialog:operationsFrom") ?? "Operations from:"} {item.pageTitle || item.pageUrl}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("checkoutDialog:operationCount") ?? "Number of operations:"} {item.operations.length}
                    </p>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => handleRemoveItem(item.id)} aria-label="Remove item">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={handleClose}>
            {t("checkoutDialog:cancel") ?? "Cancel"}
          </Button>
          <Button 
            onClick={handleCreateCombinedDeeplink}
            disabled={items.length === 0}
          >
            {t("checkoutDialog:createLink") ?? "Create Combined Deeplink"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
