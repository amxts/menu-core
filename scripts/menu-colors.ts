// Rewrites the colour codes of a menu file - Pawn's \y, \r, \w, \d and \R -
// as the tags a menu file writes colours with: !y, !r, !w, !d and !R.
//
//   bun scripts/menu-colors.ts <file>...            rewrites each file in place
//   bun scripts/menu-colors.ts --dry-run <file>...  says what it would change
//
// The file's format is its extension: .ini, .yaml or .yml, .json or .jsonc.
// In INI and in a plain or single-quoted YAML value a code is a backslash and
// the letter; in JSON and in a double-quoted YAML value the backslash is
// escaped, `\\y`, and a single `\r` there is a line break and stays. Comments
// are rewritten too: they describe the file. Line ends and a byte order mark
// stay as they are.
import { readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import process from "node:process";

const LETTERS = "yrwdR";

/** A file's text with its colour codes made tags, and how many there were. */
export function convertMenuColors(text: string, format: "ini" | "yaml" | "json"): { text: string; count: number } {
	let count = 0;
	const tag = (_: string, letter: string) => {
		count++;
		return `!${letter}`;
	};

	if (format === "ini") return { text: text.replace(/\\([yrwdR])/g, tag), count };
	if (format === "json") return { text: text.replace(/(?<!\\)\\\\([yrwdR])/g, tag), count };

	const lines = text.split("\n").map((line) => {
		let out = "";
		let quoted = false;
		for (let i = 0; i < line.length; i++) {
			const c = line[i];
			const next = line[i + 1] ?? "";

			if (quoted && c === "\\") {
				// An escape: `\\y` is a code; anything else - `\"`, `\n`, `\r` - stays.
				if (next === "\\" && LETTERS.includes(line[i + 2] ?? "")) {
					out += tag("", line[i + 2]);
					i += 2;
				} else {
					out += c + next;
					i++;
				}
				continue;
			}

			if (!quoted && c === "\\" && LETTERS.includes(next) && next.length > 0) {
				out += tag("", next);
				i++;
				continue;
			}

			// A double quote opens a value where a value starts: after `key: `, `- `, `[`, `{`, `,` or the indent.
			if (c === "\"" && (quoted || /(?:^|[:\-[{,])\s*$/.test(line.slice(0, i)))) quoted = !quoted;
			out += c;
		}
		return out;
	});
	return { text: lines.join("\n"), count };
}

function formatOf(file: string): "ini" | "yaml" | "json" | null {
	const extension = extname(file).toLowerCase();
	if (extension === ".ini") return "ini";
	if (extension === ".yaml" || extension === ".yml") return "yaml";
	if (extension === ".json" || extension === ".jsonc") return "json";
	return null;
}

if (import.meta.main) {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const files = args.filter(arg => arg !== "--dry-run");
	if (files.length === 0) {
		console.error("usage: bun scripts/menu-colors.ts [--dry-run] <menu file>...");
		process.exit(1);
	}

	let failed = false;
	for (const file of files) {
		const format = formatOf(file);
		if (!format) {
			console.error(`${file}: not a menu file - .ini, .yaml, .yml, .json or .jsonc`);
			failed = true;
			continue;
		}

		const converted = convertMenuColors(readFileSync(file, "utf8"), format);
		if (converted.count > 0 && !dryRun) writeFileSync(file, converted.text);
		const verb = dryRun ? "would be" : "were";
		const plural = converted.count === 1 ? "" : "s";
		console.log(converted.count > 0 ? `${file}: ${converted.count} colour code${plural} ${verb} made tags` : `${file}: no colour codes - nothing to change`);
	}
	process.exit(failed ? 1 : 0);
}
