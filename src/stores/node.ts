import { map } from "nanostores";
import { chains } from "@/config/chains";

type Node = {
  url: string;
  chain: string;
};

const $currentNode = map<Node>({ url: "", chain: "" });

function setCurrentNode(chain: string, url?: string) {
  if (!(chains as any)[chain] || !(chains as any)[chain].nodeList.find((node: any) => node.url === url)) {
    return; // block invalid nodes
  }
  $currentNode.set({ chain, url: url ?? (chains as any)[chain].nodeList[0].url });
}

export { $currentNode, setCurrentNode };
