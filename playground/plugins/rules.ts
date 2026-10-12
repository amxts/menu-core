plugin({ name: "Rules", version: "1.0.0", author: "you", description: "List menus of text lines alone, paged" });

// Text lines alone: a page holds as many as numbered rows, 8 and 9 turn it.
const rules = menus.create("LIST_RULES", { title: "Rules" });
rules.setListSource(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rule => menus.textRow(`Rule ${rule}`)));

// Long lines: a page ends sooner, before the menu's text passes its bytes.
const help = menus.create("LIST_HELP", { title: "Помощь" });
help.setListSource(() => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(line => menus.textRow(`!y${line}. !wКоманда сервера и подробное описание того, что она делает`)));

server.addCommand("/rules", ({ player }) => {
	rules.show(player);
});

server.addCommand("/help", ({ player }) => {
	help.show(player);
});
