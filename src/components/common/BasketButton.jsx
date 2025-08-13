import React from 'react';
import { useStore } from '@nanostores/react';
import { ShoppingBasket } from 'lucide-react';
import { basketItems } from '../../stores/basketStore';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from 'lucide-react';
import { getCombinedOperations, clearBasket, removeFromBasket } from '../../stores/basketStore';
import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import DeepLinkDialog from './DeepLinkDialog'; // Import DeepLinkDialog

// CheckoutDialog component is now part of BasketButton.jsx to use DialogTrigger effectively
function CheckoutDialogContent({ onClose }) {
  const { t } = useTranslation(locale.get(), { i18n: i18nInstance });
  const items = useStore(basketItems);

  const [isDeepLinkDialogOpen, setIsDeepLinkDialogOpen] = React.useState(false);
  const [deepLinkDialogOps, setDeepLinkDialogOps] = React.useState([]);
  const [deepLinkDialogSource, setDeepLinkDialogSource] = React.useState(null);

  const handleCreateCombinedDeeplink = () => {
    const combinedOps = getCombinedOperations();
    if (combinedOps.length > 0) {
      setDeepLinkDialogOps(combinedOps);
      setDeepLinkDialogSource({ pageUrl: 'basket', pageTitle: 'Basket Checkout', fromBasket: true, operations: combinedOps });
      setIsDeepLinkDialogOpen(true);
      // clearBasket(); // Consider when to clear
      if (onClose) onClose(); // Close the checkout dialog
    } else {
      alert(t("checkoutDialog:emptyBasketAlert") ?? "Basket is empty!");
    }
  };

  const handleRemoveItem = (itemId) => {
    removeFromBasket(itemId);
  };

  return (
    <>
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
              {items.map((item) => (
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
          <Button variant="outline" onClick={onClose}>
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

      {/* Render DeepLinkDialog controlled by local state */}
      {isDeepLinkDialogOpen && (
        <DeepLinkDialog
          open={isDeepLinkDialogOpen}
          onOpenChange={setIsDeepLinkDialogOpen} // Allows DeepLinkDialog to close itself
          initialTrxJSON={deepLinkDialogOps} // Pass the combined operations
          operationNames={["multiple_operations"]} // Or derive more specific names if possible
          title={t("checkoutDialog:deepLinkTitle") ?? "Combined Transaction"}
          sourceInfo={deepLinkDialogSource} // Pass the source info including fromBasket flag
          // You might need to pass other default/required props for DeepLinkDialog here
          // e.g., usrChain, userID, dismissCallback (if needed for specific logic within DeepLinkDialog)
          // For dismissCallback, you could have: dismissCallback={() => setIsDeepLinkDialogOpen(false)}
        />
      )}
    </>
  );
}

export default function BasketButton() {
  const items = useStore(basketItems);
  const [isCheckoutOpen, setIsCheckoutOpen] = React.useState(false);

  return (
    <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          aria-label="Open basket"
          className="relative"
        >
          <ShoppingBasket className="h-5 w-5" />
          {items.length > 0 && (
            <span 
              className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white"
            >
              {items.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <CheckoutDialogContent onClose={() => setIsCheckoutOpen(false)} /> 
    </Dialog>
  );
}
