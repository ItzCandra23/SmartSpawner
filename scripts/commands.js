import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, EntityInventoryComponent, Player, system } from "@minecraft/server";
import { ActiveSpawner } from "./activespawner";
import { CustomLoot } from "./customloot";
import { MobExperiences } from "./mob_experiences";
import { ItemJson } from "./utils/itemjson";
import { CustomLootUI } from "./customlootui";
import { formatId } from "./utils/format";
system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
    customCommandRegistry.registerCommand({
        name: "ActiveSpawner:givespawner",
        description: "Gives an specific active spawner to a player",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        mandatoryParameters: [
            {
                name: "entity",
                type: CustomCommandParamType.EntityType,
            }
        ],
        optionalParameters: [
            {
                name: "amount",
                type: CustomCommandParamType.Integer,
            },
            {
                name: "player",
                type: CustomCommandParamType.PlayerSelector,
            }
        ]
    }, (o, entityType, amount, players) => {
        const targets = o.sourceEntity instanceof Player ? [o.sourceEntity] : players;
        if (!targets || !targets.length)
            return { status: CustomCommandStatus.Failure, message: "Player not found!" };
        system.run(() => {
            try {
                const itemStack = ActiveSpawner.createItemStack(entityType, amount);
                targets.forEach((player) => {
                    const inventory = player.getComponent(EntityInventoryComponent.componentId);
                    if (!inventory)
                        return;
                    inventory.container.addItem(itemStack);
                });
                return { status: CustomCommandStatus.Success, message: `Active spawner sended to ${targets.map((v) => v.name).join()}!` };
            }
            catch (err) {
                if (err.message)
                    return { status: CustomCommandStatus.Failure, message: err.message };
                return { status: CustomCommandStatus.Failure };
            }
        });
    });
    let LootAction;
    (function (LootAction) {
        LootAction["reload"] = "reload";
        LootAction["create"] = "create";
        LootAction["delete"] = "delete";
        LootAction["check"] = "check";
        LootAction["add"] = "add";
        LootAction["set"] = "set";
        LootAction["clear"] = "clear";
    })(LootAction || (LootAction = {}));
    let SelectLoot;
    (function (SelectLoot) {
        SelectLoot["hand"] = "hand";
        SelectLoot["hotbar"] = "hotbar";
        SelectLoot["inventory"] = "inventory";
        SelectLoot["table"] = "table";
        SelectLoot["xp"] = "xp";
    })(SelectLoot || (SelectLoot = {}));
    customCommandRegistry.registerEnum("ActiveSpawner:lootaction", Object.values(LootAction));
    customCommandRegistry.registerEnum("ActiveSpawner:selectloot", Object.values(SelectLoot));
    customCommandRegistry.registerCommand({
        name: "ActiveSpawner:ssloot",
        description: "Custom Loot for Active Spawner",
        permissionLevel: CommandPermissionLevel.GameDirectors,
        optionalParameters: [
            {
                name: "action",
                type: CustomCommandParamType.Enum,
                enumName: "ActiveSpawner:lootaction"
            },
            {
                name: "entity",
                type: CustomCommandParamType.EntityType,
            },
            {
                name: "select",
                type: CustomCommandParamType.Enum,
                enumName: "ActiveSpawner:selectloot"
            },
            {
                name: "value",
                type: CustomCommandParamType.String,
            },
        ]
    }, (o, action, entity, select, value) => {
        const player = o.sourceEntity instanceof Player ? o.sourceEntity : undefined;
        function getSelectedXP() {
            if (select !== SelectLoot.xp)
                return undefined;
            if (!value)
                return undefined;
            const rawvalue = value.split("-");
            if (!rawvalue.length)
                return undefined;
            let xp1 = Number(rawvalue[0]);
            if (xp1 !== xp1 || xp1 < 0)
                return undefined;
            xp1 = Math.floor(xp1);
            if (rawvalue.length === 1)
                return [xp1, xp1];
            let xp2 = Number(rawvalue[1]);
            if (xp2 !== xp2 || xp2 < xp1)
                return undefined;
            xp2 = Math.floor(xp2);
            return [xp1, xp2];
        }
        function getSelectedLoot() {
            if (!select)
                return undefined;
            if (select === SelectLoot.table)
                return value?.trim();
            if (!player)
                return undefined;
            const container = player.getComponent(EntityInventoryComponent.componentId)?.container;
            if (!container)
                return undefined;
            if (select === SelectLoot.hand) {
                const hand = container.getItem(player.selectedSlotIndex);
                return hand ? [hand] : undefined;
            }
            if (select === SelectLoot.hotbar) {
                let items = [];
                for (let i = 0; i < 9; i++) {
                    const itemStack = container.getItem(i);
                    if (itemStack)
                        items.push(itemStack);
                }
                return items;
            }
            if (select === SelectLoot.inventory) {
                let items = [];
                for (let i = 0; i < container.size; i++) {
                    const itemStack = container.getItem(i);
                    if (itemStack)
                        items.push(itemStack);
                }
                return items;
            }
            return undefined;
        }
        if (!action) {
            const data = CustomLoot.getAllLoots();
            const list = data.map((loot) => {
                let res = `§7 -§d ${loot.typeId}`;
                if (loot.experience[0] !== 0 && loot.experience[1] !== 0) {
                    if (loot.experience[0] === loot.experience[1])
                        res += ` [${loot.experience[0]} XP]`;
                    else
                        res += ` [${loot.experience[0]}-${loot.experience[1]} XP]`;
                }
                if (loot.loot.length)
                    res += ` [${loot.loot.length} Items]`;
                if (loot.lootTables.length)
                    res += ` [${loot.lootTables.length} Tables]`;
                return res;
            });
            return {
                status: CustomCommandStatus.Success,
                message: `List of Spawner Custom Loot:\n${list.join("\n")}\n§r§f-- -`,
            };
        }
        if (action === LootAction.reload) {
            CustomLoot.updateLoot();
            return {
                status: CustomCommandStatus.Success,
                message: "§f[§dCustomLoot§f] Reloaded!",
            };
        }
        if (!entity)
            return {
                status: CustomCommandStatus.Failure,
                message: "Entity not found!",
            };
        if (action === LootAction.check) {
            const data = CustomLoot.getLoot(entity.id);
            if (!data)
                return {
                    status: CustomCommandStatus.Failure,
                    message: `Loot not found!`,
                };
            const expecience = data.experience[0] === data.experience[1] ? data.experience[0] : `${data.experience[0]} - ${data.experience[1]}`;
            const items = data.loot.map((item, i) => `\n§r§d  ${i}: x${item.min_amount === (item.item.amount ?? 1) ? item.min_amount : `[${item.min_amount} - ${item.item.amount ?? 1}]`} §f${item.item.nameTag ?? "§d" + item.item.typeId}§r§d [${item.chance}%]`);
            const tables = data.lootTables.map((table) => `\n§r§d  - ${table}`);
            return {
                status: CustomCommandStatus.Success,
                message: `§fSpawner Custom Loot:\n§7 Type ID: §d${data.typeId}\n§7 Experience: §b${expecience} XP\n§7 Items: §d(${items.length})${items.join("\n")}\n§7 Tables: §d(${tables.length})${tables.join("\n")}§r\n§f-- -`,
            };
        }
        if (action === LootAction.create) {
            if (CustomLoot.getLoot(entity.id))
                return {
                    status: CustomCommandStatus.Failure,
                    message: "Loot Already!",
                };
            const experience = (typeof MobExperiences[entity.id] !== "object" ? [MobExperiences[entity.id] ?? 0, MobExperiences[entity.id] ?? 0] : MobExperiences[entity.id]);
            const rawloot = getSelectedLoot();
            const lootTables = typeof rawloot === "string" ? [rawloot] : [];
            const message = `§f[§d${formatId(entity.id)}§f] Loot Created! §d/ssloot check ${entity.id}§f for more`;
            if (typeof rawloot === "object") {
                system.run(async () => {
                    const loot = await Promise.all(rawloot.map(async (v) => {
                        const itemJson = ItemJson.getItemJson(v);
                        if (!player)
                            return ({ chance: 100, min_amount: itemJson.amount ?? 1, item: itemJson });
                        const itemLoot = await CustomLootUI.askItemLoot(player, itemJson);
                        if (!itemLoot)
                            return ({ chance: 100, min_amount: itemJson.amount ?? 1, item: itemJson });
                        return itemLoot;
                    }));
                    CustomLoot.setLoot({
                        typeId: entity.id,
                        experience,
                        loot,
                        lootTables,
                    });
                    player?.sendMessage(message);
                });
                return undefined;
            }
            CustomLoot.setLoot({
                typeId: entity.id,
                experience,
                loot: [],
                lootTables,
            });
            return {
                status: CustomCommandStatus.Success,
                message,
            };
        }
        if (action === LootAction.delete) {
            if (!CustomLoot.getLoot(entity.id))
                return {
                    status: CustomCommandStatus.Failure,
                    message: "Loot not found!",
                };
            CustomLoot.deleteLoot(entity.id);
            return {
                status: CustomCommandStatus.Success,
                message: `§f[§d${formatId(entity.id)}§f] Loot Deleted!`,
            };
        }
        if (action === LootAction.set && select === SelectLoot.xp) {
            const xp = getSelectedXP();
            if (!xp)
                return {
                    status: CustomCommandStatus.Failure,
                    message: "Value not found!",
                };
            try {
                CustomLoot.setLootExperience(entity.id, xp[0], xp[1]);
                return {
                    status: CustomCommandStatus.Success,
                    message: `§f[§d${formatId(entity.id)}§f] Experience Setted! §d/ssloot check ${entity.id}§f for more`,
                };
            }
            catch (err) {
                return {
                    status: CustomCommandStatus.Failure,
                    message: err.message,
                };
            }
        }
        if (action === LootAction.add) {
            const rawloot = getSelectedLoot();
            if (!rawloot)
                return {
                    status: CustomCommandStatus.Failure,
                    message: "Loot not found!",
                };
            const message = `§f[§d${formatId(entity.id)}§f] Loot Added! §d/ssloot check ${entity.id}§f for more`;
            if (typeof rawloot === "object") {
                system.run(async () => {
                    const loots = await Promise.all(rawloot.map(async (v) => {
                        const itemJson = ItemJson.getItemJson(v);
                        if (!player)
                            return ({ chance: 100, min_amount: itemJson.amount ?? 1, item: itemJson });
                        const itemLoot = await CustomLootUI.askItemLoot(player, itemJson);
                        if (!itemLoot)
                            return ({ chance: 100, min_amount: itemJson.amount ?? 1, item: itemJson });
                        return itemLoot;
                    }));
                    for (const loot of loots)
                        CustomLoot.addLootItem(entity.id, loot);
                    player?.sendMessage(message);
                });
                return undefined;
            }
            CustomLoot.addLootTable(entity.id, rawloot);
            return {
                status: CustomCommandStatus.Success,
                message,
            };
        }
        if (action === LootAction.set) {
            const rawloot = getSelectedLoot();
            if (!rawloot)
                return {
                    status: CustomCommandStatus.Failure,
                    message: "Loot not found!",
                };
            const message = `§f[§d${formatId(entity.id)}§f] Loot Added! §d/ssloot check ${entity.id}§f for more`;
            if (typeof rawloot === "object") {
                system.run(async () => {
                    const loots = await Promise.all(rawloot.map(async (v) => {
                        const itemJson = ItemJson.getItemJson(v);
                        if (!player)
                            return ({ chance: 100, min_amount: itemJson.amount ?? 1, item: itemJson });
                        const itemLoot = await CustomLootUI.askItemLoot(player, itemJson);
                        if (!itemLoot)
                            return ({ chance: 100, min_amount: itemJson.amount ?? 1, item: itemJson });
                        return itemLoot;
                    }));
                    CustomLoot.clearLootItem(entity.id);
                    for (const loot of loots)
                        CustomLoot.addLootItem(entity.id, loot);
                    player?.sendMessage(message);
                });
                return undefined;
            }
            CustomLoot.clearLootTable(entity.id);
            CustomLoot.addLootTable(entity.id, rawloot);
            return {
                status: CustomCommandStatus.Success,
                message,
            };
        }
        if (action === LootAction.clear && select === SelectLoot.xp) {
            CustomLoot.setLootExperience(entity.id, 0);
            return {
                status: CustomCommandStatus.Success,
                message: `§f[§d${formatId(entity.id)}§f] Experience Clear! §d/ssloot check ${entity.id}§f for more`,
            };
        }
        if (action === LootAction.clear && select === SelectLoot.table) {
            CustomLoot.clearLootTable(entity.id);
            return {
                status: CustomCommandStatus.Success,
                message: `§f[§d${formatId(entity.id)}§f] Loot Tables Clear! §d/ssloot check ${entity.id}§f for more`,
            };
        }
        if (action === LootAction.clear) {
            CustomLoot.clearLootItem(entity.id);
            return {
                status: CustomCommandStatus.Success,
                message: `§f[§d${formatId(entity.id)}§f] Loot Clear! §d/ssloot check ${entity.id}§f for more`,
            };
        }
        return {
            status: CustomCommandStatus.Failure,
            message: "Command not found! Check https://github.com/ItzCandra23/ActiveSpawner for more!",
        };
    });
});
