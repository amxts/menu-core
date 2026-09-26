import { plugin, print, server } from "@amxts/core";
import * as menus from "@amxts/menu-core";

plugin({ name: "Shop", version: "1.0.0", author: "you", description: "A menu made in code" });

const shop = menus.create("SHOP", {
	title: player => `Shop for ${player.name}`,
	activeWhen: player => player.isAlive,
});

shop.addItem(player => `Heal (${player.health} HP)`, {
	visible: player => player.health < 100,
	onSelect: (player) => {
		player.health = 100;
		print(player, "Healed");
	},
});
shop.addItem("Armor", {
	enabled: player => player.armor < 100,
	message: player => `(${player.armor} already)`,
	onSelect: (player) => {
		player.armor = 100;
	},
});
shop.addItem("Close", { action: "CLOSE_MENU", spaceBefore: 1 });

server.addCommand("/shop", (player) => {
	shop.show(player);
});
