plugin({ name: "Weapons", version: "1.0.0", author: "you", description: "A menu of two pages" });

const weapons = ["AK-47", "M4A1", "AWP", "Deagle", "USP", "Glock", "MP5", "P90", "Scout", "Famas"];

// Seven items a page: the last three are on the second.
const shop = menus.create("WEAPONS", { title: "Weapon shop" });
for (const weapon of weapons) {
	shop.addItem({ title: weapon, onSelect: ({ player }) => print(player, `Bought ${weapon}`) });
}

server.addCommand("/weapons", ({ player }) => {
	shop.show(player);
});
