import fs from "fs";
import { getObjects } from "../src/nanoeffects/src/common.ts";
import { getMaxObjectIDs } from "../src/nanoeffects/MaxObjectID.ts";

const chains = ["bitshares", "bitshares_testnet"];

const getAllCreditDealData = async (chain) => {
  let maxObjectID;
  try {
    maxObjectID = await getMaxObjectIDs(chain, 1, 22);
  } catch (error) {
    console.log({ error });
    return;
  }

  let objectIds = Array.from({ length: maxObjectID }, (_, i) => `1.22.${i}`);

  console.log(
    `Fetching ${chain} credit deal data for ${objectIds.length} deals!`
  );

  let data;
  try {
    data = await getObjects(chain, objectIds);
  } catch (error) {
    console.log(error);
    return;
  }

  return data;
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
    allData = await getAllCreditDealData(chain);
    if (allData) {
      writeToFile(allData, chain, "allCreditDeals");
    }
  }
  process.exit(0);
};

main();
