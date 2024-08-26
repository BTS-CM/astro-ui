import { map } from "nanostores";
import { chains } from "@/config/chains";
import { persistentMap } from "@nanostores/persistent";

type Node = {
  url: string;
  chain: string;
};

const $currentNode = map<Node>({ url: "", chain: "" });

function setCurrentNode(chain: string, url?: string) {
  if (!(chains as any)[chain] || url && !(chains as any)[chain].nodeList.find((node: any) => node.url === url)) {
    return; // block invalid nodes
  }

  $currentNode.set({ chain, url: url ?? (chains as any)[chain].nodeList[0].url });
}

type InitNodes = {
  url: string;
}

type StoredNodes = {
  bitshares: InitNodes[];
  bitshares_testnet: InitNodes[];
}

const $nodes = persistentMap<StoredNodes>(
  "nodes",
  {
    bitshares: chains["bitshares"].nodeList,
    bitshares_testnet: chains["bitshares_testnet"].nodeList,
  },
  {
    encode(value) {
      return JSON.stringify(value);
    },
    decode(value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        console.log(e);
        return value;
      }
    },
  }
);

function updateNodes(chain: string, nodes: InitNodes[]) {
  if (!(chains as any)[chain]) {
    return; // block invalid chains
  }
  $nodes.set({ ...$nodes.get(), [chain]: nodes });
}

export { $currentNode, $nodes, setCurrentNode, updateNodes };
