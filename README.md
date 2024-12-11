# Bitshares astro UI

Created using [Astro](https://docs.astro.build), [React](https://react.dev/) & [Electron](https://www.electronjs.org).

Integrates with both the [Beet](https://github.com/bitshares/beet) and [BeetEOS](https://github.com/beetapp/beeteos) multiwallets, for the Bitshares and Bitshares Testnet blockchains.

## Dev blogs

- [Evaluating worker proposal support progress](https://hive.blog/hive-120117/@nftea.gallery/evaluating-worker-proposal-support-from-all-bitshares-blockchain-accounts)
- [Issued Asset Actions & Smartcoin UX improvements!](https://hive.blog/hive-120117/@nftea.gallery/another-october-bitshares-astro-ui-development-blog-issued-asset-actions-and-smartcoin-ux-improvements)
- [Proposals](https://hive.blog/hive-120117/@nftea.gallery/october-bitshares-astro-ui-development-blog-demonstrating-the-construction-and-resolution-of-bitshares-proposals)
- [Account lists](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-blog-manage-your-bitshares-account-lists-more-easily)
- [Smartcoins](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-development-preview-blog-creating-smartcoins-on-the-bitshares-blockchain-for-use-on-the-bts-dex)
- [User Issued Assets](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-update-creating-user-issued-assets-and-browsing-issued-assets-overview)
- [Vesting Balances](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-update-creating-vesting-balances)
- [Same-T Funds](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-update-same-t-fund-support-has-been-added)
- [Prediction Market Assets](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-update-prediction-market-assets)
- [Credit offer overviews & Vesting balance claims](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-update-credit-offer-owner-overview-page-and-vesting-balance-claim-page)
- [Favourite assets & Portfolio tweaks](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-update-favourite-assets-and-portfolio-tweaks)
- [Simple swaps & node configuration](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-update-swaps-and-nodes)
- [Electron packaging](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-worker-proposal-electron-release)
- [Announcement thread](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-development-worker-proposal)

## Functionality

- Switch between Bitshares (mainnet) and the Bitshares Testnet blockchains
- Fully translated to 10 languages!
- Place limit orders
- Perform liquidity pool swaps
- Stake assets in liquidity pools
- Transfer assets to other blockchain users
- Borrow funds from other users (credit deals)
- Lend funds to other users (credit offers)
- Issue Collateralized Debt Positions (smartcoins & market pegged assets)
- View portfolio (balance, activity, open orders)
- View top markets (24hr trading rankings)
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
