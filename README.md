# skills-kit

Shared [Bun](https://bun.sh) helpers for [Agent Skills](https://agentskills.io/home) repos, such as [ai-skills](https://github.com/IgorKrupenja/ai-skills) and [tallinn-dev](https://github.com/IgorKrupenja/tallinn-dev):

- `browser.ts` runs [playwright-cli](https://github.com/microsoft/playwright-cli) on the repo's own browser. A headed `open` hands focus straight back to the app you were in, so the new window doesn't stay in front.
- `tab.ts` gives each caller a background tab of its own in that browser, so parallel chats and agents never act on each other's tabs.
- `gws.ts` runs [gws](https://github.com/googleworkspace/cli), the Google Workspace CLI, and parses its JSON.
- `places.ts` turns a venue name into candidate places with their full address, through the [Places API (New)](https://developers.google.com/maps/documentation/places/web-service/text-search). It needs an API key with that API enabled, in `GOOGLE_PLACES_API_KEY`.

The helpers are in `src/`. Everything runs on Bun; Node isn't needed.

## Use

Add it to a repo straight from GitHub (it isn't on npm). Its dependencies, playwright-cli and gws, come with it:

```bash
bun add github:IgorKrupenja/skills-kit
```

Also add `"trustedDependencies": ["@googleworkspace/cli"]` to the repo's `package.json`, so `bun install` downloads gws's binary. Then:

```bash
bun node_modules/skills-kit/src/browser.ts open --headed     # any playwright-cli command
bun node_modules/skills-kit/src/tab.ts open my-tab https://example.com
bun node_modules/skills-kit/src/tab.ts run my-tab <<'JS'
async (p, env) => p.title()
JS
bun node_modules/skills-kit/src/tab.ts close my-tab
bun node_modules/skills-kit/src/gws.ts calendar colors get   # any gws command
bun node_modules/skills-kit/src/places.ts "Telliskivi Loomelinnak, Tallinn"
```

In scripts, `import { gws, gwsItems } from "skills-kit/gws"` and `import { searchPlaces } from "skills-kit/places"`. Each script's header has the details.

`bun.lock` pins the kit to a commit; `bun update skills-kit` moves a repo to the latest one.

## One browser per repo

playwright-cli keeps its browsers and their profiles under the path it's installed at, so each repo that installs the kit gets its own browser, with logins kept apart from any other playwright-cli on the machine. The browser is named after the repo's `package.json` name. A `playwright-cli.json` at the repo's root replaces the kit's default config, which mutes audio and uses the installed Google Chrome.
