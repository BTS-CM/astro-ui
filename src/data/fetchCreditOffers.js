import fs from "fs";
import { getObjects } from "@/nanoeffects/src/common.ts";
import { getMaxObjectIDs } from "@/nanoeffects/MaxObjectID.ts";

const chains = ["bitshares", "bitshares_testnet"];

const getAllOfferData = async (chain) => {
  let maxObjectID;
  try {
    maxObjectID = await getMaxObjectIDs(chain, 1, 21);
  } catch (error) {
    console.log({ error });
    return;
  }

  let objectIds = Array.from({ length: maxObjectID }, (_, i) => `1.21.${i}`);

  console.log(`Fetching ${chain} offer data for ${objectIds.length} offers!`);

  let data;
  try {
    data = await getObjects(chain, objectIds);
  } catch (error) {
    console.log(error);
    return;
  }

  let fetchedAccounts;
  try {
    fetchedAccounts = await getObjects(chain, [
      ...new Set(data.map((x) => x.owner_account)),
    ]);
  } catch (error) {
    console.log(error);
    return;
  }

  data = data.map((offer) => {
    const account = fetchedAccounts.find(
      (account) => account.id === offer.owner_account
    );

    return {
      ...offer,
      owner_name: account.name,
    };
  });

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
    allData = await getAllOfferData(chain);
    if (allData) {
      writeToFile(allData, chain, "allOffers");
    }
  }
  process.exit(0);
};

main();
