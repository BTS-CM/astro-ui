/**
 * Convert human readable quantity into the token's blockchain representation
 * @param {Float} satoshis
 * @param {Number} precision
 * @returns {Number}
 */
function blockchainFloat(satoshis, precision) {
    return satoshis * 10 ** precision;
}

/**
 * Copy the provided text to the user's clipboard
 * @param {String} text 
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
      .then(() => {
        console.log('Text copied to clipboard');
      })
      .catch((error) => {
        console.error('Error copying text to clipboard:', error);
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

  let timeSince = '';
  if (days > 0) {
    timeSince += `${days}d `;
  }
  if (hours > 0 || days > 0) {
    timeSince += `${hours}h `;
  }
  timeSince += `${minutes}m`;

  return timeSince;
}

export {
    blockchainFloat,
    copyToClipboard,
    humanReadableFloat,
    trimPrice,
    getTimeSince
}