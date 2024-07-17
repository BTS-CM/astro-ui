/**
 * Convert human readable quantity into the token's blockchain representation
 */
function blockchainFloat(satoshis: number, precision: number) {
  return satoshis * 10 ** precision;
}

/**
 * Copy the provided text to the user's clipboard
 */
function copyToClipboard(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      console.log("Text copied to clipboard");
    })
    .catch((error) => {
      console.error("Error copying text to clipboard:", error);
    });
}

/**
 * Convert the token's blockchain representation into a human readable quantity
 */
function humanReadableFloat(satoshis: number, precision: number) {
  return parseFloat((satoshis / 10 ** precision).toFixed(precision));
}

/**
 * Trim market order prices
 */
function trimPrice(price: string, precision: number) {
  return parseFloat(price).toFixed(precision);
}

/**
 * Convert date time string to time since string
 */
function getTimeSince(timestamp: string) {
  const now = new Date();
  const timeDiff = now.getTime() - new Date(timestamp).getTime();

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeDiff / (1000 * 60)) % 60);

  let timeSince = "";
  if (days > 0) {
    timeSince += `${days}d `;
  }
  if (hours > 0 || days > 0) {
    timeSince += `${hours}h `;
  }
  timeSince += `${minutes}m`;

  return timeSince;
}

/**
 * Delaying the execution of the function until the user stops typing
 */
function debounce(func: Function, delay: number) {
  let timerId: any;
  return (...args: any[]) => {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * Checks the current order of the base and quote assets and returns a boolean identifying the order
 */
function isInvertedMarket(_baseID: string, _quoteID: string) {
  const baseID = parseInt(_baseID.split(".")[2], 10);
  const quoteID = parseInt(_quoteID.split(".")[2], 10);
  return baseID > quoteID;
}

async function closeWSS(API: any) {
  if (API) {
    try {
      await API.close();
    } catch (error) {
      console.log({ error, msg: "Error closing connection" });
    }
  }
}

export {
  debounce,
  blockchainFloat,
  copyToClipboard,
  humanReadableFloat,
  trimPrice,
  getTimeSince,
  isInvertedMarket,
  closeWSS,
};
