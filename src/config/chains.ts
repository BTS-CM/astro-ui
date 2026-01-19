export const chains = {
  bitshares: {
    coreSymbol: "BTS",
    name: "BitShares",
    chainId: "4018d7844c78f6a6c41c6a552b898022310fc5dec06da467ee7905a8dad512c8",
    nodeList: [
      {
        url: "wss://node.xbts.io/ws",
      },
      {
        url: "wss://kibana.bitshares.dev/ws",
      },
      {
        url: "wss://btsws.roelandp.nl/ws",
      },
    ],
  },
  bitshares_testnet: {
    coreSymbol: "TEST",
    name: "BitShares",
    testnet: true,
    chainId: "39f5e2ede1f8bc1a3a54a7914414e3779e33193f1f5693510e73cb7a87617447",
    nodeList: [
      {
        url: "wss://testnet.dex.trading/",
      },
      {
        url: "wss://testnet.xbts.io/ws",
      },
      {
        url: "wss://api-testnet.61bts.com/ws",
      },
    ],
  },
};
