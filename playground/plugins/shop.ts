plugin({ name: "Shop", version: "1.0.0", author: "you", description: "A menu made in code" });

const shop = menus.create("SHOP", {
	title: ({ player }) => `Shop for ${player.name}`,
	activeWhen: ({ player }) => player.isAlive,
});

shop.addItem({
	title: ({ player }) => `Heal (${player.health} HP)`,
	visible: ({ player }) => player.health < 100,
	onSelect: ({ player }) => {
		player.health = 100;
		player.print("Healed");
	},
});
shop.addItem({
	title: "Armor",
	enabled: ({ player }) => player.armor < 100,
	message: ({ player }) => `(${player.armor} already)`,
	onSelect: ({ player }) => {
		player.armor = 100;
	},
});
// Requirements, each with its message - the first that fails gives it; one
// without a message of its own has the item's.
shop.addItem({
	title: "Helmet",
	enabled: [
		{ when: ({ player }) => player.health >= 50, message: "(50 HP needed)" },
		{ when: ({ player }) => player.armor < 100 },
	],
	message: "(full)",
	onSelect: ({ player }) => {
		player.armor = 100;
	},
});
shop.addItem({ title: "Close", action: "CLOSE_MENU", spaceBefore: 1 });

server.addCommand("/shop", ({ player }) => {
	shop.show(player);
});
