import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "react";
import { List } from "react-window";
import { useStore } from "@nanostores/react";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useInitCache } from "@/nanoeffects/Init.ts";
import { createIssuedAssetsStore } from "@/nanoeffects/IssuedAssets.ts";
import { createObjectStore } from "@/nanoeffects/Objects.ts";

import { $currentUser, $userStorage } from "@/stores/users.ts";
import { $currentNode } from "@/stores/node.ts";

import ExternalLink from "./common/ExternalLink.jsx";
import AssetIssuerActions from "./AssetIssuerActions.jsx";

const activeTabStyle = { backgroundColor: "#252526", color: "white" };

export default function IssuedAssets(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  const currentNode = useStore($currentNode);

  const _chain = useMemo(() => {
    if (usr && usr.chain) {
      return usr.chain;
    }
    return "bitshares";
  }, [usr]);

  useInitCache(_chain ?? "bitshares", []);

  const { _assetsBTS, _assetsTEST } = properties;

  const assets = useMemo(() => {
    if (_chain && (_assetsBTS || _assetsTEST)) {
      return _chain === "bitshares" ? _assetsBTS : _assetsTEST;
    }
    return [];
  }, [_assetsBTS, _assetsTEST, _chain]);

  const [issuedAssets, setIssuedAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createIssuedAssetsStore([
        usr.chain,
        usr.id,
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          setLoading(false);
          setIssuedAssets(data);
        }
      });
    }

    if (usr && usr.id && currentNode && currentNode.url) {
      setLoading(true);
      fetching();
    }
  }, [usr, currentNode]);

  const relevantAssets = useMemo(() => {
    if (!issuedAssets || !issuedAssets.length) {
      return [];
    }

    return issuedAssets.filter(
      (asset) => !asset.bitasset_data_id && !asset.for_liquidity_pool // no smartcoins/pmas & no existing pool share assets!
    );
  }, [issuedAssets]);

  const [dynamicData, setDynamicData] = useState([]);
  useEffect(() => {
    async function fetching() {
      const requiredStore = createObjectStore([
        usr.chain,
        JSON.stringify(
          relevantAssets.map((asset) => asset.dynamic_asset_data_id)
        ),
        currentNode ? currentNode.url : null,
      ]);

      requiredStore.subscribe(({ data, error, loading }) => {
        if (data && !error && !loading) {
          const filteredData = Array.isArray(data)
            ? data.filter((d) => {
                const confidential = Number(d?.confidential_supply ?? 0);
                const current = Number(d?.current_supply ?? 0);
                return confidential === 0 && current === 0;
              })
            : [];

          setDynamicData(filteredData);
        }
      });
    }

    if (relevantAssets && relevantAssets.length) {
      fetching();
    }
  }, [relevantAssets]);

  const AssetRow = ({ index, style }) => {
    const issuedAsset = relevantAssets[index];
    if (!issuedAsset) {
      return null;
    }

    return (
      <div style={{ ...style }} key={`acard-${issuedAsset.id}`}>
        <Card className="ml-2 mr-2 cursor-pointer">
          <CardHeader className="pb-1">
            <CardTitle>{`${issuedAsset.symbol} (${issuedAsset.id})`}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5 w-3/4">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("IssuedAssets:title")}</CardTitle>
              <CardDescription>{t("IssuedAssets:description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mt-2">
                {relevantAssets.length > 0 ? (
                  <h5 className="mb-2 text-center">
                    {t("IssuedAssets:listingUIA", {
                      count: relevantAssets.length,
                    })}
                  </h5>
                ) : null}
                {loading ? (
                  <div className="text-center mt-5">
                    {t("CreditBorrow:common.loading")}
                  </div>
                ) : null}
                {(!loading && !relevantAssets) || !relevantAssets.length ? (
                  <Empty className="mt-5">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">❔</EmptyMedia>
                      <EmptyTitle>{t("IssuedAssets:noUIA")}</EmptyTitle>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button asChild>
                        <a href="/create_uia/index.html">
                          {t("PageHeader:create_uia")}
                        </a>
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <>
                    <div className="w-full max-h-[500px] min-h-[500px] overflow-auto">
                      <List
                        rowComponent={AssetRow}
                        rowCount={relevantAssets.length}
                        rowHeight={90}
                        rowProps={{}}
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
