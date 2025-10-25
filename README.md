# Bitshares astro UI

Created using [Astro](https://docs.astro.build), [React](https://react.dev/) & [Electron](https://www.electronjs.org).

Integrates with both the [Beet](https://github.com/bitshares/beet) and [BeetEOS](https://github.com/beetapp/beeteos) multiwallets, for the Bitshares and Bitshares Testnet blockchains.

## Functionality

- Create/Extend/Redeem Hash Time-Locked Contracts (HTLC)
- Create/Claim direct debits (withdraw permissions)
- Create a new account (cloud wallets)
- Craft complex Same-T Fund limit order transactions
- Barter
- View witnesses & committee member lists
- Create/Update your witness/committee member status.
- Create worker proposals
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
- View favourite assets, accounts, market trading pairs
- View ticket leaderboards
- Create/Update vote lock tickets
- Perform override transfers

## Screenshot

<img width="1568" height="1047" alt="image" src="https://github.com/user-attachments/assets/6e7d4a29-3b48-47aa-bf55-9e381d93bc7d" />

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
