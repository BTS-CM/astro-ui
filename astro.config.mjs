import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

import starlight from "@astrojs/starlight";

export default defineConfig({
  outDir: "./astroDist",
  publicDir: './src/data',
  build: { format: 'file' },
  integrations: [
    react(),
    starlight({
      title: 'Bitshares Astro UI Docs',
      sidebar: [
        { label: 'Overview', slug: 'docs/docs-index' },
        {
          label: 'Exchanging Funds',
          items: [
            { label: 'DEX', link: '/docs/exchanging/dex/' },
            { label: 'Instant Trade', link: '/docs/exchanging/instant_trade/' },
            { label: 'Barter', link: '/docs/exchanging/barter/' },
            { label: 'Same-T Fund (User)', link: '/docs/exchanging/tfund_user/' },
            { label: 'Top Markets', link: '/docs/exchanging/top-markets/' },
            { label: 'Open Orders', link: '/docs/exchanging/open-orders/' },
          ],
        },
        {
          label: 'Liquidity Pools',
          items: [
            { label: 'Swap', link: '/docs/pools/swap/' },
            { label: 'Stake', link: '/docs/pools/stake/' },
            { label: 'Pools', link: '/docs/pools/pools/' },
            { label: 'Custom Pool Tracker', link: '/docs/pools/custom_pool_overview/' },
            { label: 'Top Pools', link: '/docs/pools/top-pools/' },
          ],
        },
        {
          label: 'Transferring Funds',
          items: [
            { label: 'Transfer', link: '/docs/transfer/transfer/' },
            { label: 'Timed Transfer', link: '/docs/transfer/timed_transfer/' },
            { label: 'Withdraw Permissions', link: '/docs/transfer/withdraw_permissions/' },
            { label: 'HTLC', link: '/docs/transfer/htlc/' },
            { label: 'Create Vesting', link: '/docs/transfer/create_vesting/' },
            { label: 'Airdrop Calculator', link: '/docs/transfer/airdrop_calculate/' },
            { label: 'Monthly Referrer', link: '/docs/transfer/monthly_referrer/' },
          ],
        },
        {
          label: 'Forms of Debt',
          items: [
            { label: 'Borrow', link: '/docs/debt/borrow/' },
            { label: 'Credit Deals', link: '/docs/debt/deals/' },
            { label: 'Lend', link: '/docs/debt/lend/' },
            { label: 'Credit Offers', link: '/docs/debt/offers/' },
            { label: 'SmartCoins', link: '/docs/debt/smartcoins/' },
            { label: 'Call Orders', link: '/docs/debt/call-orders/' },
            { label: 'Bid on settlement', link: '/docs/debt/settlement_bids/' },
            { label: 'Same-T Funds', link: '/docs/debt/tfunds/' },
          ],
        },
        {
          label: 'Asset Creation',
          items: [
            { label: 'Create UIA', link: '/docs/asset-creation/create_uia/' },
            { label: 'Create SmartCoin', link: '/docs/asset-creation/create_smartcoin/' },
            { label: 'Create Liquidity Pool', link: '/docs/asset-creation/create_liquidity_pool/' },
            { label: 'Issued Assets', link: '/docs/asset-creation/issued_assets/' },
          ],
        },
        {
          label: 'Account Overviews',
          items: [
            { label: 'Portfolio Balances', link: '/docs/account/balances/' },
            { label: 'Custom Authorities', link: '/docs/account/custom_authorities/' },
            { label: 'Favourites', link: '/docs/account/favourites/' },
            { label: 'Vesting Balances', link: '/docs/account/vesting/' },
            { label: 'Proposals', link: '/docs/account/proposals/' },
            { label: 'Recent Activity', link: '/docs/account/recent-activity/' },
            { label: 'Account Lists', link: '/docs/account/account_lists/' },
          ],
        },
        {
          label: 'Blockchain Overviews',
          items: [
            { label: 'Explorer', link: '/docs/blockchain/explorer/' },
            { label: 'Blocks', link: '/docs/blockchain/blocks/' },
            { label: 'Top Operations', link: '/docs/blockchain/top-operations/' },
            { label: 'Network Fees', link: '/docs/blockchain/network_fees/' },
          ],
        },
        {
          label: 'Community',
          items: [
            { label: 'Trollbox', link: '/docs/community/trollbox/' },
            { label: 'Forum', link: '/docs/community/forum/' },
          ],
        },
        {
          label: 'Governance',
          items: [
            { label: 'Vote', link: '/docs/governance/vote/' },
            { label: 'Witnesses', link: '/docs/governance/witnesses/' },
            { label: 'Committee', link: '/docs/governance/committee/' },
            { label: 'Committee Parameters', link: '/docs/governance/committee_parameters/' },
            { label: 'Governance', link: '/docs/governance/governance/' },
            { label: 'Create Worker', link: '/docs/governance/create_worker/' },
            { label: 'Create Ticket', link: '/docs/governance/create_ticket/' },
            { label: 'Ticket Leaderboard', link: '/docs/governance/ticket_leaderboard/' },
          ],
        },
        {
          label: 'Invoicing',
          items: [
            { label: 'Invoice Inventory', link: '/docs/invoicing/invoice_inventory/' },
            { label: 'Create Invoice', link: '/docs/invoicing/create_invoice/' },
            { label: 'Pay Invoice', link: '/docs/invoicing/pay_invoice/' },
            { label: 'Stored Invoices', link: '/docs/invoicing/stored_invoices/' },
          ],
        },
        {
          label: 'Settings',
          items: [
            { label: 'Blocked Users', link: '/docs/settings/blocked-users/' },
            { label: 'Lifetime Membership', link: '/docs/settings/ltm/' },
            { label: 'Nodes', link: '/docs/settings/nodes/' },
            { label: 'Create Account', link: '/docs/settings/create_account/' },
            { label: 'Change Password', link: '/docs/settings/change_password/' },
            { label: 'Configure Visuals', link: '/docs/settings/visuals/' },
            { label: 'Theme Customizer', link: '/docs/settings/theme/' },
            { label: 'Per-Page Themes', link: '/docs/settings/page_themes/' },
            { label: 'Broadcasting with Beet', link: '/docs/settings/broadcasting/' },
          ],
        },
        {
          label: 'BitShares Blockchain',
          items: [
            { label: 'Delegated Proof of Stake (DPOS)', link: '/docs/learn/dpos/' },
            { label: 'What is BitShares?', link: '/docs/learn/what-is-bitshares/' },
            { label: 'Assets & Tokens', link: '/docs/learn/assets/' },
            { label: 'DEX Concepts', link: '/docs/learn/dex/' },
            { label: 'Borrowing & Margin Calls', link: '/docs/learn/margin/' },
            { label: 'Governance Roles', link: '/docs/learn/governance-roles/' },
            { label: 'Workers & Funding', link: '/docs/learn/workers/' },
            { label: 'Accounts & Permissions', link: '/docs/learn/accounts/' },
            { label: 'History & Graphene', link: '/docs/learn/history/' },
            { label: 'Fees, Membership & Rewards', link: '/docs/learn/fees/' },
            { label: 'Multi-Signature', link: '/docs/learn/multisig/' },
            { label: 'Wallets, Accounts & Keys', link: '/docs/learn/wallets/' },
            { label: 'HTLC Concepts', link: '/docs/learn/htlc/' },
            { label: 'Tickets & Voting Power', link: '/docs/learn/tickets/' },
            { label: 'Credit Lending', link: '/docs/learn/credit/' },
            { label: 'Samet Funds', link: '/docs/learn/samet/' },
            { label: 'Private Transfers', link: '/docs/learn/privacy/' },
          ],
        },
      ],
    })
  ],
  vite: {
    plugins: [tailwindcss()],
    worker: { format: "es" },
    build: { assetsInlineLimit: 0 },
  },
});