plugin({ name: "Rules", version: "1.0.0", author: "you", description: "List menus of text lines alone, paged" });

// Text lines alone: a page holds as many as numbered rows, 8 and 9 turn it.
const rules = menus.create("LIST_RULES", { title: "Rules" });
rules.setListSource(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rule => menus.textRow(`Rule ${rule}`)));

// Long lines: a page ends sooner, before the menu's text passes its bytes.
const help = menus.create("LIST_HELP", { title: "Помощь" });
help.setListSource(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(line => menus.textRow(`!y${line}. !wКоманда сервера и подробное описание того, что она делает`)));

// More lines a page than numbered rows: text lines take no keys. A title of two lines: the page tag ends the first.
const manual = menus.create("LIST_MANUAL", { title: "Manual\n!d(read it all)", linesPerPage: 11 });
manual.setListSource(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(line => menus.textRow(`Line ${line}`)));

// As many lines, long: the bytes end a page before its eleventh line.
const longManual = menus.create("LIST_LONG_MANUAL", { title: "Справка", linesPerPage: 11 });
longManual.setListSource(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(line => menus.textRow(`!y${line}. !wКоманда сервера и подробное описание того, что она делает`)));

server.addCommand("/manual", ({ player }) => {
	manual.show(player);
});

server.addCommand("/longmanual", ({ player }) => {
	longManual.show(player);
});

server.addCommand("/rules", ({ player }) => {
	rules.show(player);
});

server.addCommand("/help", ({ player }) => {
	help.show(player);
});
