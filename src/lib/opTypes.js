const opTypes = {
  0: "Transfer",
  1: "Limit order create",
  2: "Limit order cancel",
  3: "Call order update",
  5: "Account creation",
  6: "Account update",
  7: "Account whitelist",
  8: "Account upgrade",
  9: "Account transfer",
  10: "Asset create",
  11: "Asset update",
  12: "Asset update bitasset",
  13: "Asset update feed producers",
  14: "Asset issue",
  15: "Asset reserve",
  16: "Asset fund fee pool",
  17: "Asset settle",
  18: "Asset global settle",
  19: "Asset publish feed",
  20: "Witness create",
  21: "Witness update",
  22: "Proposal create",
  23: "Proposal update",
  24: "Proposal delete",
  25: "Withdraw permission create",
  26: "Withdraw permission update",
  27: "Withdraw permission claim",
  28: "Withdraw permission delete",
  29: "Committee member create",
  30: "Committee member update",
  31: "Committee member update global parameters",
  32: "Vesting balance create",
  33: "Vesting balance withdraw",
  34: "Worker create",
  35: "Custom operation",
  36: "Assert",
  37: "Balance claim",
  38: "Override transfer",
  39: "Transfer to blind",
  40: "Blind transfer",
  41: "Transfer from blind",
  43: "Asset claim fees",
  45: "Collateral bid",
  47: "Asset claim pool",
  48: "Asset update issuer",
  49: "HTLC create",
  50: "HTLC redeem",
  52: "HTLC extend",
  54: "Custom authority create",
  55: "Custom authority update",
  56: "Custom authority delete",
  57: "Ticket create",
  58: "Ticket update",
  59: "Create liquidity pool",
  60: "Delete liquidity pool",
  61: "Liquidity pool deposit",
  62: "Liquidity pool withdraw",
  63: "Liquidity pool exchange",
  64: "SameT fund create",
  65: "SameT fund delete",
  66: "SameT fund update",
  67: "SameT fund borrow",
  68: "SameT fund repay",
  69: "Create credit offer",
  70: "Delete credit offer",
  71: "Update credit offer",
  72: "Accept credit offer",
  73: "Repay credit deal",
};

export { opTypes };
