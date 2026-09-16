import { computed, map } from "nanostores";
import { chains } from "@/config/chains";
import { persistentMap } from "@nanostores/persistent";

type Node = {
  url: string;
  chain: string;
};

const $currentNode = map<Node>({ url: "", chain: "" });

// Derived atoms so url-only readers (the common case) never re-render on a
// chain-only flip and vice versa. Prefer `useStore($currentNodeUrl)` over
// `useStore($currentNode)` unless the component truly needs both fields.
const $currentNodeUrl = computed($currentNode, (n) => n?.url ?? "");
const $currentNodeChain = computed($currentNode, (n) => n?.chain ?? "");

function setCurrentNode(chain: string, url?: string) {
  if (!(chains as any)[chain]) {
    return;
  }

  $currentNode.set({
    chain,
    url: url ?? (chains as any)[chain].nodeList[0].url,
  });
}

type InitNodes = {
  url: string;
};

type StoredNodes = {
  bitshares: InitNodes[];
  bitshares_testnet: InitNodes[];
};

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

export { $currentNode, $currentNodeUrl, $currentNodeChain, $nodes, setCurrentNode, updateNodes };
