#!/usr/bin/env bun
/**
 * Run playwright-cli on the browser of the repo that installed this kit.
 *
 * playwright-cli files its browsers and their profiles under the path it is installed at, so the
 * copy in a repo's node_modules gets a browser of its own, with logins kept apart from any other
 * copy on the machine. Skills reach that browser through this script or tab.ts, never through a
 * `playwright-cli` on PATH.
 *
 * The arguments go to playwright-cli as they are, after `-s=<session>` (the session is the repo's
 * package name). `open` also gets `--persistent` and a playwright-cli.json: the repo's own if it
 * has one at its root, else this kit's (muted audio, the installed Google Chrome). playwright-cli
 * runs on Bun, browser server included, so Node isn't needed.
 *
 *     bun node_modules/skills-kit/src/browser.ts list
 *     bun node_modules/skills-kit/src/browser.ts open https://example.com --headed
 *     bun node_modules/skills-kit/src/browser.ts screenshot --filename=.playwright-cli/page.png
 */

/**
 * The repo using the kit: the folder that holds node_modules/skills-kit. import.meta.dir is this
 * file's real folder, <repo>/node_modules/skills-kit/src; in a checkout of the kit, <kit>/src.
 */
const nodeModules = import.meta.dir.lastIndexOf("/node_modules/");
export const REPO = nodeModules >= 0 ? import.meta.dir.slice(0, nodeModules) : import.meta.dir.replace(/\/src$/, "");
/** The browser's session name: the repo's package name, so each repo's browser is easy to tell apart. */
export const SESSION: string = (await Bun.file(`${REPO}/package.json`).json()).name;

/** A file of an installed package, found the way an import from this kit would find it; "" if missing. */
export function resolvePackageFile(file: string): string {
  try {
    return Bun.resolveSync(file, import.meta.dir);
  } catch {
    return "";
  }
}

/** playwright-cli's entry script, run with this Bun (process.execPath). */
export const CLI = resolvePackageFile("@playwright/cli/playwright-cli.js");
const CONFIG = (await Bun.file(`${REPO}/playwright-cli.json`).exists())
  ? `${REPO}/playwright-cli.json`
  : `${import.meta.dir}/playwright-cli.json`;

export function die(message: string): never {
  console.error(message);
  process.exit(1);
}

export async function ensureInstalled(): Promise<void> {
  if (!CLI || !(await Bun.file(CLI).exists())) die(`playwright-cli isn't installed in ${REPO}: run \`bun install\` there`);
}

/** The full playwright-cli command for these arguments, on this repo's browser unless they name a session. */
export function cliCommand(args: string[], session = SESSION): string[] {
  const named = args.some(a => a === "-s" || a.startsWith("-s=") || a.startsWith("--session"));
  const command = [process.execPath, CLI, ...(named ? [] : [`-s=${session}`]), ...args];
  if (args.find(a => !a.startsWith("-")) === "open") {
    if (!args.includes("--persistent") && !args.some(a => a.startsWith("--profile"))) command.push("--persistent");
    if (!args.some(a => a.startsWith("--config"))) command.push(`--config=${CONFIG}`);
  }
  return command;
}

if (import.meta.main) {
  await ensureInstalled();
  const proc = Bun.spawn(cliCommand(Bun.argv.slice(2)), { stdio: ["inherit", "inherit", "inherit"] });
  process.exit(await proc.exited);
}
