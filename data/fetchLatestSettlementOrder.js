import fs from "fs";
import { getObjects } from "../src/nanoeffects/src/common.ts";
import { getMaxObjectIDs } from "../src/nanoeffects/MaxObjectID.ts";

const chains = ["bitshares", "bitshares_testnet"];

const getLatestSettlementOrder = async (chain) => {
  let maxObjectID;
  try {
    maxObjectID = await getMaxObjectIDs(chain, 1, 4);
  } catch (error) {
    console.log({ error });
    return;
  }

  let settlementOrder;
  try {
    settlementOrder = await getObjects(chain, [`1.4.${maxObjectID}`]);
  } catch (error) {
    console.log(error);
    return;
  }

  return settlementOrder;
};

function writeToFile(data, chain, fileName) {
  console.log(`Writing to ./src/data/${chain}/${fileName}.json`);
  fs.writeFileSync(
    `./src/data/${chain}/${fileName}.json`,
    JSON.stringify(data, undefined, 4)
  );
}

const main = async () => {
  let allData = [];
  for (const chain of chains) {
    allData = await getLatestSettlementOrder(chain);
    if (allData) {
      writeToFile(allData, chain, "latestSettlementOrder");
    }
  }
  process.exit(0);
};

main();
