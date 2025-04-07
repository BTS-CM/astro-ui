# Bitshares astro UI

Created using [Astro](https://docs.astro.build), [React](https://react.dev/) & [Electron](https://www.electronjs.org).

Integrates with both the [Beet](https://github.com/bitshares/beet) and [BeetEOS](https://github.com/beetapp/beeteos) multiwallets, for the Bitshares and Bitshares Testnet blockchains.

## Recent dev blogs
- [Hash Time-Locked Contracts - Create / Extend / Redeem!](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-blog-hash-time-locked-contracts-create-extend-redeem)
- [User Feedback Request - What feature do you want to see introduced next?](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-user-feedback-request-what-feature-do-you-want-to-see-introduced-next)
- [Direct Debit & Timed Transfers!](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-blog-direct-debit-and-timed-transfers)
- [Why you should support the Bitshares Astro-UI Development Worker Proposal!](https://hive.blog/bitshares/@nftea.gallery/why-you-should-support-the-bitshares-astro-ui-development-worker-proposal)
- [Custom Liquidity Pool Tracker Page & Liquidity Pool Overview Page!](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-blog-custom-liquidity-pool-tracker-page-and-liquidity-pool-overview-page)
- [Creating cloud accounts, crafting same-t fund limit order transactions and transfer memos!](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-blog-creating-cloud-accounts-crafting-same-t-fund-limit-order-transactions-and-transfer-memos)
- [New Featured Liquidity Pool Overview page!](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-blog-new-featured-liquidity-pool-overview-page-in-v0-3-31)

## Functionality

- Create/Extend/Redeem Hash Time-Locked Contracts (HTLC)
- Create/Claim direct debits (withdraw permissions)
- Create a new account (cloud wallets)
- Craft complex Same-T Fund limit order transactions
- Create your own featured liquidity pool analytics tracker
- Switch between Bitshares (mainnet) and the Bitshares Testnet blockchains
- Fully translated to 10 languages!
- Place DEX limit orders
- Perform liquidity pool swaps (simple swap & pool exchange swap pages)
- Stake assets in liquidity pools
- Transfer assets to other blockchain users (memo supported)
- Borrow funds from other users (credit deals)
- Lend funds to other users (credit offers)
- Issue Collateralized Debt Positions (smartcoins & market pegged assets)
- View portfolio (balance, activity, open orders)
- View top markets (24hr trading rankings)
- View liquidity pools (in table format)
- Credit deal overview
- Credit offer overview
- Claim vesting balances
- Prediction Market Asset overview
- Create prediction market assets
- Buy Life Time Membership for your account
- User configurable blockchain node connections
- Create/update/delete Same-T Funds
- Create/update User Issued Assets (UIA)
- Create/update Smartcoins
- Create NFTs in UIA or Smartcoin form
- View your issued assets (UIAs, NFTs, Smartcoins & PMAs)
- Create proposals for all operations
- View account proposals - approve/reject
- Configure account lists

## Screenshot

![image](https://github.com/user-attachments/assets/cf85175a-677b-4d78-9ed9-5c8d9b2f2854)

## Dev Commands

All commands are run from the root of the project, from a terminal:

| Command                                | Action                                           |
| :------------------------------------- | :----------------------------------------------- |
| `npm install`                          | Installs dependencies                            |
| `npm run initData`                     | Fetches and stores JSON data for use in the app. |
| `npm run dev`                          | Starts local dev server at `localhost:4321`      |
| `npm run build:astro`                  | Builds the production site at `./dist/`          |
| `npm run start`                        | Runs the electron app in dev mode.               |
| `npm run build:astro \| npm run start` | Builds then runs the electorn app in dev mode.   |
| `npm run dist:windows-latest`          | Builds the windows application.                  |

## Download the Astro UI!

Check out the latest releases:
https://github.com/BTS-CM/astro-ui/releases

Supports Windows, Linux and Mac OSX.
