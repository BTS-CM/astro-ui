import fs from "fs";
import { getObjects } from "@/nanoeffects/src/common.ts";

function writeToFile(data, chain, fileName) {
  console.log(`Writing to ./src/data/${chain}/${fileName}.json`);
  fs.writeFileSync(
    `./src/data/${chain}/${fileName}.json`,
    JSON.stringify(data, undefined, 4)
  );
}

const main = async () => {
  for (const chain of ["bitshares", "bitshares_testnet"]) {
    let data;
    try {
      data = await getObjects(chain, ["2.0.0"]);
    } catch (error) {
      console.log(error);
      return;
    }

    if (!data) {
      console.log("No data returned");
      return;
    }

    const fees = data[0].parameters.current_fees.parameters;

    writeToFile(fees, chain, "fees");
  }
  process.exit(0);
};

main();
