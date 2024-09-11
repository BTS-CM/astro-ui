# Bitshares astro UI

Created using [Astro](https://docs.astro.build) & React.

Integrates with both the [Beet](https://github.com/bitshares/beet) and [BeetEOS](https://github.com/beetapp/beeteos) multiwallets, for the Bitshares and Bitshares Testnet blockchains.

## Dev blogs

* [Announcement thread](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-development-worker-proposal)
* [Electron packaging announcement thread](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-worker-proposal-electron-release)
* [Simple swaps & node configuration dev blog](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-update-swaps-and-nodes)
* [Favourite assets & Portfolio tweaks dev blog](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-update-favourite-assets-and-portfolio-tweaks)
* [Credit offer overviews & Vesting balance claims](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-update-credit-offer-owner-overview-page-and-vesting-balance-claim-page)
* [Prediction market asset update](https://hive.blog/hive-120117/@nftea.gallery/bitshares-astro-ui-dev-update-prediction-market-assets)

## Functionality

* Switch between Bitshares (mainnet) and the Bitshares Testnet blockchains
* Fully translated to 10 languages!
* Place limit orders
* Perform liquidity pool swaps
* Stake assets in liquidity pools
* Transfer assets to other blockchain users
* Borrow funds from other users (credit deals)
* Lend funds to other users (credit offers)
* Issue Collateralized Debt Positions (smartcoins & market pegged assets)
* View portfolio (balance, activity, open orders)
* View top markets (24hr trading rankings)
* Credit deal overview
* Credit offer overview
* Claim vesting balances
* Prediction market asset overview
* Create prediction market assets
* Buy Life Time Membership for your account
* User configurable blockchain node connections
* Create/update/delete Same-T Funds

## Dev Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run initData`        | Fetches and stores JSON data for use in the app. |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build:astro`     | Builds the production site at `./dist/`          |
| `npm run start`           | Runs the electron app in dev mode.               |
| `npm run dist:windows-latest` | Builds the windows application.              |

## Download the Astro UI!

Check out the latest releases:
https://github.com/BTS-CM/astro-ui/releases

Supports Windows, Linux and Mac OSX.