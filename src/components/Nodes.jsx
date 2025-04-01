import React, { useState, useEffect, useSyncExternalStore } from "react";
import { FixedSizeList as List } from "react-window";
import { useStore } from "@nanostores/react";

import { useTranslation } from "react-i18next";
import { i18n as i18nInstance, locale } from "@/lib/i18n.js";
import { useInitCache } from "@/nanoeffects/Init.ts";

import {
  $currentNode,
  $nodes,
  setCurrentNode,
  updateNodes,
} from "@/stores/node";
import { $currentUser } from "@/stores/users.ts";
import { chains } from "@/config/chains";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Nodes(properties) {
  const { t, i18n } = useTranslation(locale.get(), { i18n: i18nInstance });
  const currentNode = useStore($currentNode);
  const nodes = useStore($nodes);
  const usr = useSyncExternalStore(
    $currentUser.subscribe,
    $currentUser.get,
    () => true
  );
  useInitCache(usr && usr.chain ? usr.chain : "bitshares", []);

  const [inputURL, setInputURL] = useState("");

  const NodeRow = ({ index, style }) => {
    return (
      <div style={{ ...style }} key={`acard-${index}`}>
        <Card className="ml-2 mr-2">
          <CardHeader
            className={`pb-0 pt-0 ${index === 0 ? "bg-green-100" : ""}`}
          >
            <CardTitle>
              <div className={`grid grid-cols-4 gap-2 items-center mt-0 pt-0`}>
                <div className={`col-span-3`}>
                  {index + 1}: {nodes[usr.chain][index].url}
                </div>
                <div className="text-right flex items-center justify-end">
                  <Button
                    className="mr-2"
                    variant="none"
                    onClick={() => {
                      const updatedNodes = [...nodes[usr.chain]];
                      const [selectedNode] = updatedNodes.splice(index, 1);
                      updateNodes(usr.chain, [selectedNode, ...updatedNodes]);
                    }}
                  >
                    ⬆️
                  </Button>
                  <Button
                    variant="none"
                    onClick={() => {
                      const updatedNodes = [...nodes[usr.chain]];
                      updatedNodes.splice(index, 1);
                      updateNodes(usr.chain, updatedNodes);
                    }}
                  >
                    ❌
                  </Button>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  };

  return (
    <>
      <div className="container mx-auto mt-5 mb-5">
        <div className="grid grid-cols-1 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>{t("Nodes:cardTitle")}</CardTitle>
              <CardDescription>{t("Nodes:cardDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              {usr &&
              usr.chain &&
              nodes[usr.chain] &&
              nodes[usr.chain].length ? (
                <List
                  height={250}
                  itemCount={nodes[usr.chain].length}
                  itemSize={50}
                  className="w-full"
                >
                  {NodeRow}
                </List>
              ) : (
                <p>{t("Nodes:none")}</p>
              )}
              <br />
              <div>
                <p>{t("Nodes:addDescription")}</p>
                <Input
                  name="searchInput"
                  placeholder="wss://url/ws"
                  className="mb-3 mt-3 w-full"
                  onChange={(event) => {
                    setInputURL(event.target.value);
                  }}
                  onKeyPress={(event) => {
                    if (
                      event.key !== "Enter" ||
                      !inputURL ||
                      nodes[usr.chain].findIndex(
                        (node) => node.url === inputURL
                      ) !== -1 ||
                      !/^wss?:\/\/[a-zA-Z0-9.-]+\/ws$/.test(inputURL)
                    ) {
                      return;
                    }

                    updateNodes(usr.chain, [
                      ...nodes[usr.chain],
                      { url: inputURL },
                    ]);
                  }}
                />
                <Button
                  className="mr-2"
                  onClick={() => {
                    if (
                      !inputURL ||
                      nodes[usr.chain].findIndex(
                        (node) => node.url === inputURL
                      ) !== -1 ||
                      !/^wss?:\/\/[a-zA-Z0-9.:\/\-]+$/.test(inputURL) ||
                      inputURL.includes("..")
                    ) {
                      return;
                    }
                    updateNodes(usr.chain, [
                      ...nodes[usr.chain],
                      { url: inputURL },
                    ]);
                  }}
                >
                  {t("Nodes:add")}
                </Button>
                <Button
                  onClick={() =>
                    updateNodes(usr.chain, chains[usr.chain].nodeList)
                  }
                >
                  {t("Nodes:reset")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
