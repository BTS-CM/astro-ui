import { map } from "nanostores";
import { chains } from "../config/chains";

type Node = {
  url: string;
  chain: string;
};

const $currentNode = map<Node>({ url: "", chain: "" });

function setCurrentNode(chain: string, url?: string) {
  if (!chains[chain] || !chains[chain].nodeList.find((node) => node.url === url)) {
    return; // block invalid nodes
  }
  $currentNode.set({ chain, url: url ?? chains[chain].nodeList[0].url });
}

export { $currentNode, setCurrentNode };
