/**
 * Convert human readable quantity into the token's blockchain representation
 * @param {Float} satoshis
 * @param {Number} precision
 * @returns {Number}
 */
function blockchainFloat(satoshis, precision) {
  const factor = 10 ** precision;
  return Math.round(satoshis * factor);
}

/**
 * Copy the provided text to the user's clipboard
 * @param {String} text
 */
function copyToClipboard(text) {
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
 * @param {Float} satoshis
 * @param {Number} precision
 * @returns {Number}
 */
function humanReadableFloat(satoshis, precision) {
  return parseFloat((satoshis / 10 ** precision).toFixed(precision));
}

/**
 * Trim market order prices
 * @param {string} price
 * @param {Number} precision
 * @returns {Number}
 */
function trimPrice(price, precision) {
  return parseFloat(price).toFixed(precision);
}

/**
 * Convert date time string to time since string
 * @param {string} timestamp
 * @returns
 */
function getTimeSince(timestamp) {
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

const permission_flags = {
  /** < an issuer-specified percentage of all market trades in this asset is paid to the issuer */
  charge_market_fee: 0x01,
  white_list: 0x02 /** < accounts must be whitelisted in order to hold this asset */,
  override_authority: 0x04 /** < issuer may transfer asset back to himself */,
  transfer_restricted: 0x08 /** < require the issuer to be one party to every transfer */,
  disable_force_settle: 0x10 /** < disable force settling */,
  /**
   * allow the bitasset issuer to force a global settling
   * this may be set in permissions, but not flags
   * */
  global_settle: 0x20,
  disable_confidential: 0x40 /** < allow the asset to be used with confidential transactions */,
  witness_fed_asset: 0x80 /** < allow the asset to be fed by witnesses */,
  committee_fed_asset: 0x100 /** < allow the asset to be fed by the committee */,
  lock_max_supply: 0x200, /// < the max supply of the asset can not be updated
  disable_new_supply: 0x400, /// < unable to create new supply for the asset
  disable_mcr_update: 0x800, /// < the bitasset owner can not update MCR, permission only
  disable_icr_update: 0x1000, /// < the bitasset owner can not update ICR, permission only
  disable_mssr_update: 0x2000, /// < the bitasset owner can not update MSSR, permission only
  disable_bsrm_update: 0x4000, /// < the bitasset owner can not update BSRM, permission only
  disable_collateral_bidding: 0x8000, /// < Can not bid collateral after a global settlement
};

const uia_permission_mask = [
  "charge_market_fee",
  "white_list",
  "override_authority",
  "transfer_restricted",
  "disable_confidential",
];

/**
 * Given flag mask, return an object with booleans indicating which flags are set
 * @param {number} mask
 * @returns Object
 */
function getFlagBooleans(mask) {
  const booleans = {};

  for (let flag in permission_flags) {
    if (mask & permission_flags[flag]) {
      booleans[flag] = true;
    }
  }

  return booleans;
}

/**
 * Given form values return the asset flag value
 */
function getFlags(flagBooleans) {
  const keys = Object.keys(permission_flags);

  let flags = 0;

  keys.forEach((key) => {
    if (flagBooleans[key] && key !== "global_settle") {
      flags += permission_flags[key];
    }
  });

  return flags;
}

/**
 * Given form values return the asset permissions value
 */
function getPermissions(flagBooleans, isBitAsset = false) {
  const permissions = isBitAsset
    ? Object.keys(permission_flags)
    : uia_permission_mask;
  let flags = 0;
  permissions.forEach((permission) => {
    if (flagBooleans[permission] && permission !== "global_settle") {
      flags += permission_flags[permission];
    }
  });

  if (isBitAsset && flagBooleans.global_settle) {
    flags += permission_flags.global_settle;
  }

  return flags;
}

/**
 * Delaying the execution of the function until the user stops typing
 * @param {function} func
 * @param {number} delay
 * @returns {function}
 */
function debounce(func, delay) {
  let timerId;
  return (...args) => {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * Checks the current order of the base and quote assets and returns a boolean identifying the order
 * @param {string} _baseID
 * @param {string} _quoteID
 * @returns {boolean}
 */
function isInvertedMarket(_baseID, _quoteID) {
  const baseID = parseInt(_baseID.split(".")[2], 10);
  const quoteID = parseInt(_quoteID.split(".")[2], 10);
  return baseID > quoteID;
}

export {
  debounce,
  blockchainFloat,
  copyToClipboard,
  humanReadableFloat,
  trimPrice,
  getTimeSince,
  getFlagBooleans,
  getFlags,
  getPermissions,
  isInvertedMarket,
};
