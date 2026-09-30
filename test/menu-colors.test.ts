// The script that rewrites a menu file's colour codes as tags
// (scripts/menu-colors.ts), on the three formats.
import { describe, expect, test } from "bun:test";
import { convertMenuColors } from "../scripts/menu-colors";

describe("menu-colors", () => {
	test("INI: every code is a tag, comments too; anything else stays", () => {
		const ini = "; NUMBER -> \"\\y[%d]\\w\"\r\n[MAIN]\r\nKEY = {\r\n\tNUMBER = \\r[%d]\\w\r\n\tPAGE = \\y[\\r%d\\y | \\y%d\\y]\r\n}\r\nPREFIX = !g[X]!y\r\nPATH = a\\b\r\n";
		const { text, count } = convertMenuColors(ini, "ini");
		expect(text).toBe("; NUMBER -> \"!y[%d]!w\"\r\n[MAIN]\r\nKEY = {\r\n\tNUMBER = !r[%d]!w\r\n\tPAGE = !y[!r%d!y | !y%d!y]\r\n}\r\nPREFIX = !g[X]!y\r\nPATH = a\\b\r\n");
		expect(count).toBe(9);
	});

	test("JSON: the escaped backslash is the code; a line break \\r stays", () => {
		const json = "{ \"labels\": { \"number\": \"\\\\y[%d]\\\\w\", \"exit\": \"Exit\\r\" } }";
		expect(convertMenuColors(json, "json")).toEqual({ text: "{ \"labels\": { \"number\": \"!y[%d]!w\", \"exit\": \"Exit\\r\" } }", count: 2 });
	});

	test("YAML: plain and single-quoted values have the code as it is, double-quoted ones escaped", () => {
		const yaml = [
			"labels:",
			"  number: \\y[%d]\\w",
			"  page: '\\y[\\r%d\\y]'",
			"  time: \"\\\\wLeft \\\\r%d\\n\"",
			"  exit: Say \"hi\" \\d",
			"menus: # \\y in a comment",
		].join("\n");
		const { text, count } = convertMenuColors(yaml, "yaml");
		expect(text).toBe([
			"labels:",
			"  number: !y[%d]!w",
			"  page: '!y[!r%d!y]'",
			"  time: \"!wLeft !r%d\\n\"",
			"  exit: Say \"hi\" !d",
			"menus: # !y in a comment",
		].join("\n"));
		expect(count).toBe(9);
	});

	test("a file without codes is left as it is", () => {
		expect(convertMenuColors("[MAIN]\nPREFIX = !g[X]\n", "ini")).toEqual({ text: "[MAIN]\nPREFIX = !g[X]\n", count: 0 });
	});
});
