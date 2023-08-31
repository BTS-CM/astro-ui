# Bitshares Pool exchange demo

Created using [Astro](https://docs.astro.build) & React.

Integrates with the Bitshares Beet multiwallet, specifically the [develop](https://github.com/bitshares/beet/tree/develop) branch.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

To update the required pool & asset data run the following commands occasionally:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm run fetchPools`      | Fetches all Bitshares pools                      |
| `npm run fetchAssets`     | Fetches required asset data for pool assets      |