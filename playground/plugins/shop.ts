import { Player, plugin, print, server } from "@amxts/core";
import * as menus from "@amxts/menu-core";

plugin({ name: "Shop", version: "1.0.0", author: "you", description: "A menu made in code" });

menus.addCondition("IS_HURT", player => player.health < 100);
menus.addPlaceholder("hp", player => `${player.health}`);

const shop = menus.create("SHOP", "Shop");
menus.addItem(shop, "Heal (%hp% HP)", { condition: "IS_HURT", onSelect: heal });
menus.addItem(shop, "Reset score", { onSelect: resetScore });
menus.addItem(shop, "Close", { action: "CLOSE_MENU", spaceBefore: 1 });

server.addCommand("/shop", (player) => {
	menus.show(player, "SHOP");
});

function heal(player: Player) {
	player.health = 100;
	print(player, "Healed");
}

function resetScore(player: Player) {
	player.frags = 0;
}
