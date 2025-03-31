const opTypes = {
  0: "Transfer",
  1: "Limit order create",
  2: "Limit order cancel",
  3: "Call order update",
  4: "Limit order filled",
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
  42: "Asset settle cancel",
  43: "Asset claim fees",
  44: "FBA distribute",
  45: "Collateral bid",
  46: "Execute bid",
  47: "Asset claim pool",
  48: "Asset update issuer",
  49: "HTLC create",
  50: "HTLC redeem",
  51: "HTLC redeemed",
  52: "HTLC extend",
  53: "HTLC refund",
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
  74: "Credit deal expired",
  75: "Update liquidity pool",
  76: "Update credit deal",
  77: "Update limit order",
};

// Structure describing fields for each operation (example)
const opData = {
  transfer: {
    fields: {
      fee: { index: 0, name: "Fee", type: "asset" }, // Assuming 'asset' implies { amount, asset_id }
      from: { index: 1, name: "From Account", type: "account_id_type" },
      to: { index: 2, name: "To Account", type: "account_id_type" },
      amount: { index: 3, name: "Amount", type: "asset" },
      memo: { index: 4, name: "Memo", type: "optional_memo_data" }, // Example of other types
      extensions: { index: 5, name: "Extensions", type: "extensions_type"}
    }
  },
  custom_authority_create: {
      fields: {
         fee: { index: 0, name: "Fee", type: "asset"},
         account: { index: 1, name: "Account", type: "account_id_type" },
         enabled: { index: 2, name: "Enabled", type: "bool_type" },
         valid_from: { index: 3, name: "Valid From", type: "time_point_sec_type"},
         valid_to: { index: 4, name: "Valid To", type: "time_point_sec_type"},
         operation_type: { index: 5, name: "Operation Type", type: "uint16_t" }, // Example type
         auth: { index: 6, name: "Auth", type: "authority" }, // Example complex type
         restrictions: { index: 7, name: "Restrictions", type: "vector_restriction" },
         extensions: { index: 8, name: "Extensions", type: "extensions_type" }
      }
  },
  // ... Add field definitions for ALL operations that custom authorities can apply to
  // This is crucial for the 'Member Index' dropdown
};


// --- Restriction Types and Argument Handling (Refined) ---

// From restriction_argument_type enum (custom_authority.hpp)
const restrictionArgumentTypesEnum = {
  void_t: 0,
  account_id_type: 1,
  asset_id_type: 2,
  bool_type: 3,
  share_type: 4, // int64_t
  string_type: 5,
  time_point_sec_type: 6,
  flat_set_account_id_type: 7,
  flat_set_asset_id_type: 8,
};

// Map Restriction Type enum values (custom_authority.hpp::restriction::restriction_type)
// to their corresponding Argument Type enum values (restrictionArgumentTypesEnum)
// Verified against BSIP-40 text and C++ structure hints.
const restrictionArgumentTypeMap = {
    0: restrictionArgumentTypesEnum.void_t,              // only_by_witness
    1: restrictionArgumentTypesEnum.account_id_type,     // only_from_account
    2: restrictionArgumentTypesEnum.account_id_type,     // only_to_account
    3: restrictionArgumentTypesEnum.asset_id_type,       // only_for_asset
    4: restrictionArgumentTypesEnum.share_type,          // amount_le
    5: restrictionArgumentTypesEnum.share_type,          // amount_ge
    6: restrictionArgumentTypesEnum.asset_id_type,       // asset_is_authorized
    7: restrictionArgumentTypesEnum.account_id_type,     // from_account_is_authorized
    8: restrictionArgumentTypesEnum.account_id_type,     // to_account_is_authorized
    9: restrictionArgumentTypesEnum.bool_type,           // is_ltm (BSIP requires argument to be true)
    10: restrictionArgumentTypesEnum.flat_set_account_id_type, // from_account_in_allowlist
    11: restrictionArgumentTypesEnum.flat_set_account_id_type, // to_account_in_allowlist
    12: restrictionArgumentTypesEnum.flat_set_asset_id_type, // asset_in_allowlist
    13: restrictionArgumentTypesEnum.flat_set_account_id_type, // from_account_not_in_blocklist
    14: restrictionArgumentTypesEnum.flat_set_account_id_type, // to_account_not_in_blocklist
    15: restrictionArgumentTypesEnum.flat_set_asset_id_type, // asset_not_in_blocklist
    // Add any further restriction types defined in the C++ enum
};

// Helper function to get the argument type *identifier string* (e.g., 'share_type')
// Returns 'unknown' if the restriction type code is not found in the map.
function getArgumentTypeIdentifier(restrictionTypeCode) {
    const argTypeCode = restrictionArgumentTypeMap[restrictionTypeCode];
    if (argTypeCode === undefined) {
        return 'unknown';
    }
    // Find the key (enum name string) corresponding to the value (enum int)
    const typeEnumKey = Object.keys(restrictionArgumentTypesEnum).find(
        key => restrictionArgumentTypesEnum[key] === argTypeCode
    );
    return typeEnumKey || 'unknown'; // Fallback
}

// UI Names for Restriction Types
const restrictionTypeNames = {
    0: "Only By Witness",
    1: "Only From Account",
    2: "Only To Account",
    3: "Only For Asset",
    4: "Amount Less Than/Equal To",
    5: "Amount Greater Than/Equal To",
    6: "Asset Is Authorized By Issuer", // Clarified name
    7: "From Account Is Authorized By Issuer", // Clarified name
    8: "To Account Is Authorized By Issuer", // Clarified name
    9: "Is Lifetime Member (LTM)",
    10: "From Account In Allowlist",
    11: "To Account In Allowlist",
    12: "Asset In Allowlist",
    13: "From Account NOT In Blocklist",
    14: "To Account NOT In Blocklist",
    15: "Asset NOT In Blocklist",
    // Add names for other restriction types
};

export {
  opTypes,
  opData,
  restrictionArgumentTypesEnum,
  getArgumentTypeIdentifier,
  restrictionTypeNames 
};
