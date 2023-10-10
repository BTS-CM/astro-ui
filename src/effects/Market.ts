import { addAssetsToCache } from "../stores/cache.ts";

/**
 * Fetching the dynamic data from api cache
 * @param chain
 * @param id
 * @param setDynamic
 */
async function fetchDynamicData(chain: string, id: string, setDynamic: any) {
  const replacedID = id.replace("1.3.", "2.3.");
  const fetchedDynamicData = await fetch(
    `http://localhost:8080/cache/dynamic/${chain}/${replacedID}`,
    { method: "GET" }
  );

  if (!fetchedDynamicData.ok) {
    console.log(`Failed to fetch ${replacedID} dynamic data`);
    return;
  }

  const dynamicDataJSON = await fetchedDynamicData.json();

  if (dynamicDataJSON && dynamicDataJSON.result) {
    console.log(`Fetched ${replacedID} dynamic data`);
    setDynamic(dynamicDataJSON.result);
  }
}

/**
 * Retrieving bitasset data from the API
 * @param chain
 * @param id bitasset id for a smartcoin
 * @param setBitassetData
 */
async function fetchBitassetData(
  chain: string,
  id: string,
  setBitassetData: any
) {
  const response = await fetch(
    `http://localhost:8080/api/getObjects/${chain}`,
    { method: "POST", body: JSON.stringify([id]) }
  );

  if (!response.ok) {
    console.log("Failed to fetch bitasset data");
    return;
  }

  const responseContents = await response.json();

  if (
    responseContents &&
    responseContents.result &&
    responseContents.result.length
  ) {
    const finalResult = responseContents.result[0];

    setBitassetData(finalResult);
  }
}

/**
 * Retrieve basic asset details from the API
 * @param chain
 * @param assetID
 * @param setAssetData
 */
async function fetchCachedAsset(
  chain: string,
  assetID: string,
  setAssetData: any
) {
  const fetchedAsset = await fetch(
    `http://localhost:8080/cache/asset/${chain}/${assetID}`,
    { method: "GET" }
  );

  if (!fetchedAsset.ok) {
    console.log(`Failed to fetch asset: ${assetID}`);
    return;
  }

  const assetJSON = await fetchedAsset.json();

  if (assetJSON && assetJSON.result) {
    console.log("Fetched asset data");
    setAssetData(assetJSON.result);
    addAssetsToCache([assetJSON.result]);
  }
}

export { fetchDynamicData, fetchBitassetData, fetchCachedAsset };
