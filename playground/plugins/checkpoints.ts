plugin({ name: "Checkpoints", version: "1.0.0", author: "you", description: "Menus of the menu file, their actions and placeholders by name" });

// The menu file names the actions and the placeholders; the plugin answers
// them, several at once - with functions of the player, or of the menu's context.
const saved = new Map<number, number>();

function savedBy(player: Player) {
	return saved.has(player.id) ? saved.get(player.id) : 0;
}

function save(player: Player) {
	saved.set(player.id, savedBy(player) + 1);
}

menus.register("CP_MENU", "CP_MORE");
menus.addActions({
	CP_SAVE: save,
	CP_RESET: (player) => {
		saved.delete(player.id);
	},
	CP_WHERE: ({ player, menu }) => print(player, `You are in ${menu.name}`),
	CP_AGAIN: player => menus.show(player, "CP_MENU"),
});
menus.addPlaceholders({
	saved: player => `${savedBy(player)}`,
	menu: ({ menu }) => menu.name,
});

server.addCommand(["/cp", "cp"], player => menus.show(player, "CP_MENU"));
