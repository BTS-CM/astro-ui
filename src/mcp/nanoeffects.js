import * as AccountActivity from "@/nanoeffects/AccountActivity";
import * as AccountCount from "@/nanoeffects/AccountCount";
import * as AccountLimitOrders from "@/nanoeffects/AccountLimitOrders";
import * as AccountProposedTransactions from "@/nanoeffects/AccountProposedTransactions";
import * as AccountReferences from "@/nanoeffects/AccountReferences";
import * as AssetCallOrders from "@/nanoeffects/AssetCallOrders";
import * as AssetExists from "@/nanoeffects/AssetExists";
import * as BlockSignature from "@/nanoeffects/BlockSignature";
import * as BlockedAccounts from "@/nanoeffects/BlockedAccounts";
import * as CallOrderHolders from "@/nanoeffects/CallOrderHolders";
import * as CollateralBids from "@/nanoeffects/CollateralBids";
import * as CreditOffers from "@/nanoeffects/CreditOffers";
import * as CreditOffersByOwner from "@/nanoeffects/CreditOffersByOwner";
import * as CurrentBlock from "@/nanoeffects/CurrentBlock";
import * as FullAccountDetails from "@/nanoeffects/FullAccountDetails";
import * as FullSmartcoin from "@/nanoeffects/FullSmartcoin";
import * as HTLC from "@/nanoeffects/HTLC";
import * as IssuedAssets from "@/nanoeffects/IssuedAssets";
import * as LenderDeals from "@/nanoeffects/LenderDeals";
import * as BorrowerDeals from "@/nanoeffects/BorrowerDeals";
import * as LiquidityPools from "@/nanoeffects/LiquidityPools";
import * as MarketLimitOrders from "@/nanoeffects/MarketLimitOrders";
import * as MarketOrderBook from "@/nanoeffects/MarketOrderBook";
import * as MarketTradeHistory from "@/nanoeffects/MarketTradeHistory";
import * as MaxObjectID from "@/nanoeffects/MaxObjectID";
import * as OfferDeals from "@/nanoeffects/OfferDeals";
import * as SameTFundByAsset from "@/nanoeffects/SameTFundByAsset";
import * as SameTFundByOwner from "@/nanoeffects/SameTFundByOwner";
import * as SameTFunds from "@/nanoeffects/SameTFunds";
import * as Tickets from "@/nanoeffects/Tickets";
import * as TopActiveMarkets from "@/nanoeffects/TopActiveMarkets";
import * as TopAssetHolders from "@/nanoeffects/TopAssetHolders";
import * as TopLifetimeMembers from "@/nanoeffects/TopLifetimeMembers";
import * as TopLimitOrderCreators from "@/nanoeffects/TopLimitOrderCreators";
import * as TopLimitOrderFillers from "@/nanoeffects/TopLimitOrderFillers";
import * as TopPoolSwaps from "@/nanoeffects/TopPoolSwaps";
import * as UserBalances from "@/nanoeffects/UserBalances";
import * as UserCallOrders from "@/nanoeffects/UserCallOrders";
import * as UserCustomAuthorities from "@/nanoeffects/UserCustomAuthorities";
import * as UserSearch from "@/nanoeffects/UserSearch";
import * as VestingBalances from "@/nanoeffects/VestingBalances";
import * as WithdrawPermissionPayer from "@/nanoeffects/WithdrawPermissionPayer";
import * as WithdrawPermissionReciever from "@/nanoeffects/WithdrawPermissionReciever";
import * as WorkerProposals from "@/nanoeffects/WorkerProposals";
import * as ChainParameters from "@/nanoeffects/ChainParameters";
import * as GlobalProperties from "@/nanoeffects/GlobalProperties";
import * as UserTickets from "@/nanoeffects/UserTickets";
import * as Objects from "@/nanoeffects/Objects";

const NANOEFFECTS = {
  getAccountActivity: {
    fn: AccountActivity.getAccountActivity,
    argNames: ["accountId", "limit", "lookbackDays"],
    description: "Recent account activity (transfers/history) for an account id.",
  },
  getAccountCount: {
    fn: AccountCount.getAccountCount,
    argNames: ["chain", "specificNode"],
    description: "Total number of accounts on the chain.",
  },
  getAccountLimitOrders: {
    fn: AccountLimitOrders.getAccountLimitOrders,
    argNames: ["chain", "accountId", "specificNode"],
    description: "Open limit orders belonging to an account.",
  },
  getAccountProposals: {
    fn: AccountProposedTransactions.getAccountProposals,
    argNames: ["chain", "accountId", "specificNode"],
    description: "Proposals created by or involving an account.",
  },
  getAccountReferences: {
    fn: AccountReferences.getAccountReferences,
    argNames: ["chain", "accountId", "specificNode"],
    description: "Object references owned by an account.",
  },
  getAssetCallOrders: {
    fn: AssetCallOrders.getAssetCallOrders,
    argNames: ["chain", "ids", "specificNode", "existingAPI"],
    description: "Call orders for the given bitasset ids.",
  },
  checkAssetExists: {
    fn: AssetExists.checkAssetExists,
    argNames: ["chain", "symbol", "specificNode"],
    description: "Check whether an asset symbol exists and resolve its id.",
  },
  getBlockSignature: {
    fn: BlockSignature.getBlockSignature,
    argNames: ["chain", "blockNumber", "specificNode"],
    description: "Signature / header data for a specific block.",
  },
  getBlockedaccounts: {
    fn: BlockedAccounts.getBlockedaccounts,
    argNames: ["chain", "specificNode"],
    description: "List of blocked/blacklisted accounts.",
  },
  getCallOrderHolders: {
    fn: CallOrderHolders.getCallOrderHolders,
    argNames: ["chain", "assetId", "specificNode"],
    description: "Holders of call orders for a bitasset.",
  },
  getCollateralBids: {
    fn: CollateralBids.getCollateralBids,
    argNames: ["chain", "assetId", "specificNode"],
    description: "Collateral bids on a smartcoin settlement.",
  },
  getCreditOffers: {
    fn: CreditOffers.getCreditOffers,
    argNames: ["chain", "specificNode"],
    description: "All credit offers on the chain.",
  },
  getCreditOffersByOwner: {
    fn: CreditOffersByOwner.getCreditOffersByOwner,
    argNames: ["chain", "accountNameOrId", "specificNode"],
    description: "Credit offers created by a specific owner.",
  },
  getCurrentBlock: {
    fn: CurrentBlock.getCurrentBlock,
    argNames: ["chain", "specificNode"],
    description: "Current head block header of the chain.",
  },
  getFullAccountDetails: {
    fn: FullAccountDetails.getFullAccountDetails,
    argNames: ["chain", "accountId", "specificNode"],
    description: "Full account object (balances, orders, authorities, etc.).",
  },
  getFullSmartcoin: {
    fn: FullSmartcoin.getFullSmartcoin,
    argNames: ["chain", "assetId", "collateralAssetId", "bitassetId", "collateralBitassetId", "userId", "specificNode"],
    description: "Detailed smartcoin (bitasset) data including feeds and settlement.",
  },
  get_htlc: {
    fn: HTLC.get_htlc,
    argNames: ["chain", "accountNameOrId", "type", "specificNode"],
    description: "Fetch a single hashed time-lock contract by id.",
  },
  fetchingIssuedAssets: {
    fn: IssuedAssets.fetchingIssuedAssets,
    argNames: ["chain", "accountId", "specificNode", "existingAPI"],
    description: "Assets issued by a specific account.",
  },
  fetchLenderDeals: {
    fn: LenderDeals.fetchLenderDeals,
    argNames: ["chain", "accountId", "specificNode"],
    description: "Credit deals where the account is the lender.",
  },
  fetchBorrowerDeals: {
    fn: BorrowerDeals.fetchBorrowerDeals,
    argNames: ["chain", "accountId", "specificNode"],
    description: "Credit deals where the account is the borrower.",
  },
  fetchLiquidityPools: {
    fn: LiquidityPools.fetchLiquidityPools,
    argNames: ["chain", "specificNode", "existingAPI"],
    description: "All liquidity pools on the chain.",
  },
  fetchLPTradingVolume: {
    fn: LiquidityPools.fetchLPTradingVolume,
    argNames: ["chain", "pools", "specificNode"],
    description: "Trading volume for a liquidity pool.",
  },
  getLimitOrders: {
    fn: MarketLimitOrders.getLimitOrders,
    argNames: ["chain", "baseAssetId", "quoteAssetId", "specificNode"],
    description: "Limit orders on a market pair.",
  },
  getMarketOrderBook: {
    fn: MarketOrderBook.getMarketOrderBook,
    argNames: ["chain", "baseAssetId", "quoteAssetId", "limit", "specificNode"],
    description: "Order book for a market pair.",
  },
  getMarketTradeHistory: {
    fn: MarketTradeHistory.getMarketTradeHistory,
    argNames: ["chain", "baseAssetId", "quoteAssetId", "accountId", "specificNode"],
    description: "Recent trade history for a market pair.",
  },
  getTicker: {
    fn: MarketTradeHistory.getTicker,
    argNames: ["chain", "baseAssetId", "quoteAssetId", "specificNode"],
    description: "24h ticker for a market pair.",
  },
  getMultipleTickers: {
    fn: MarketTradeHistory.getMultipleTickers,
    argNames: ["chain", "pairs", "specificNode"],
    description: "Tickers for multiple market pairs.",
  },
  getMaxObjectIDs: {
    fn: MaxObjectID.getMaxObjectIDs,
    argNames: ["chain", "space", "type", "specificNode"],
    description: "Maximum object id currently allocated for a space/type.",
  },
  getCreditDealsByOfferId: {
    fn: OfferDeals.getCreditDealsByOfferId,
    argNames: ["chain", "offerId", "specificNode"],
    description: "Credit deals created against a specific offer.",
  },
  getSameTFundsByAsset: {
    fn: SameTFundByAsset.getSameTFundsByAsset,
    argNames: ["chain", "assetId", "specificNode"],
    description: "Samet fund(s) for a given asset.",
  },
  getSameTFundsByOwner: {
    fn: SameTFundByOwner.getSameTFundsByOwner,
    argNames: ["chain", "accountNameOrId", "specificNode"],
    description: "Samet funds owned by a specific account.",
  },
  getSameTFunds: {
    fn: SameTFunds.getSameTFunds,
    argNames: ["chain", "specificNode"],
    description: "All samet funds on the chain.",
  },
  getTickets: {
    fn: Tickets.getTickets,
    argNames: ["chain", "lastId", "specificNode"],
    description: "Lottery/event tickets on the chain (paginated by lastId).",
  },
  getTopActiveMarkets: {
    fn: TopActiveMarkets.getTopActiveMarkets,
    argNames: ["limit", "lookbackDays"],
    description: "Most active markets by volume.",
  },
  getTopAssetHolders: {
    fn: TopAssetHolders.getTopAssetHolders,
    argNames: ["chain", "assetId", "specificNode"],
    description: "Top holders of a given asset.",
  },
  getTopLifetimeMembers: {
    fn: TopLifetimeMembers.getTopLifetimeMembers,
    argNames: ["chain", "specificNode"],
    description: "Top lifetime members by referral stats.",
  },
  getTopLimitOrderCreators: {
    fn: TopLimitOrderCreators.getTopLimitOrderCreators,
    argNames: ["chain", "specificNode"],
    description: "Top accounts creating limit orders.",
  },
  getTopLimitOrderFillers: {
    fn: TopLimitOrderFillers.getTopLimitOrderFillers,
    argNames: ["chain", "specificNode"],
    description: "Top accounts filling limit orders.",
  },
  getTopPoolSwaps: {
    fn: TopPoolSwaps.getTopPoolSwaps,
    argNames: ["limit", "lookbackDays"],
    description: "Top liquidity pool swaps over a lookback window.",
  },
  accountSearch: {
    fn: UserSearch.accountSearch,
    argNames: ["chain", "searchTerm", "specificNode"],
    description: "Search for accounts by name/id prefix.",
  },
  getAccountBalances: {
    fn: UserBalances.getAccountBalances,
    argNames: ["chain", "accountId", "specificNode"],
    description: "Asset balances for an account.",
  },
  getUserCallOrders: {
    fn: UserCallOrders.getUserCallOrders,
    argNames: ["chain", "accountId", "specificNode"],
    description: "Call orders (debt positions) for an account.",
  },
  getUserCustomAuthorities: {
    fn: UserCustomAuthorities.getUserCustomAuthorities,
    argNames: ["chain", "accountId", "specificNode"],
    description: "Custom authorities attached to an account.",
  },
  getVestingBalances: {
    fn: VestingBalances.getVestingBalances,
    argNames: ["chain", "accountId", "specificNode"],
    description: "Vesting balances (timelocked) for an account.",
  },
  fetchPayerWithdrawPermissions: {
    fn: WithdrawPermissionPayer.fetchPayerWithdrawPermissions,
    argNames: ["chain", "accountId", "specificNode"],
    description: "Withdraw permissions where the account is the payer.",
  },
  fetchReceiverWithdrawPermissions: {
    fn: WithdrawPermissionReciever.fetchReceiverWithdrawPermissions,
    argNames: ["chain", "accountId", "specificNode"],
    description: "Withdraw permissions where the account is the receiver.",
  },
  getWorkerProposals: {
    fn: WorkerProposals.getWorkerProposals,
    argNames: ["chain", "specificNode"],
    description: "Active worker proposals on the chain.",
  },
  getChainParameters: {
    fn: ChainParameters.createChainParametersStore,
    argNames: ["chain", "specificNode"],
    description: "Chain global parameters: max transaction size, transfer fee, price per kbyte.",
  },
  getGlobalProperties: {
    fn: GlobalProperties.createGlobalPropertiesStore,
    argNames: ["chain", "specificNode"],
    description: "Raw global properties object (2.0.0): active witnesses, committee, parameters.",
  },
  getUserTickets: {
    fn: UserTickets.createUserTicketsStore,
    argNames: ["chain", "accountID", "specificNode", "lastID"],
    description: "Tickets owned by a specific account (filtered from all tickets).",
  },
  getUsername: {
    fn: Objects.createUsernameStore,
    argNames: ["chain", "object_ids", "specificNode"],
    description: "Resolve object IDs to { name, id } tuples.",
  },
};

export function listNanoEffects() {
  return Object.entries(NANOEFFECTS)
    .filter(([, v]) => typeof v.fn === "function")
    .map(([name, v]) => ({
      name,
      argNames: v.argNames,
      description: v.description,
    }));
}

export function hasNanoEffect(name) {
  return !!NANOEFFECTS[name] && typeof NANOEFFECTS[name].fn === "function";
}

export async function callNanoEffect(name, args = []) {
  const entry = NANOEFFECTS[name];
  if (!entry || typeof entry.fn !== "function") {
    throw new Error(`Unknown nanoeffect: ${name}`);
  }
  return await entry.fn(...args);
}
