import { world } from "@minecraft/server";
import { ItemJson } from "./utils/itemjson";
import { MobExperiences } from "./mob_experiences";
export let MobLoots = {};
export class CustomLoot {
    static getAllLootKeys() {
        return world.getDynamicPropertyIds().filter((v) => v.startsWith(this.DB_PREFIX_KEY));
    }
    static getAllLoots() {
        return this.getAllLootKeys().map((key) => JSON.parse(world.getDynamicProperty(key)));
    }
    static getLoot(typeId) {
        const data = world.getDynamicProperty(this.DB_PREFIX_KEY + typeId);
        if (!data)
            return undefined;
        return JSON.parse(data);
    }
    static setLoot(customLoot) {
        if (customLoot.experience[0] < 0)
            customLoot.experience[0] = 0;
        if (customLoot.experience[1] < 0)
            customLoot.experience[1] = 0;
        if (customLoot.experience[0] > customLoot.experience[1])
            customLoot.experience[0] = customLoot.experience[1];
        const key = customLoot.typeId.toLowerCase();
        const data = JSON.stringify(customLoot);
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, data);
    }
    static deleteLoot(typeId) {
        world.setDynamicProperty(this.DB_PREFIX_KEY + typeId);
    }
    // static setLootTable(typeId: string, path: string): string | undefined {
    //     const key = typeId.toLowerCase();
    //     let data = this.getLoot(key);
    //     if (!data) throw new Error("Custom Loot not found!");
    //     const value = path.trim();
    //     data.lootTable = value;        
    //     world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));
    //     return value ? value : undefined;
    // }
    static seLootExperience(typeId, value1, value2 = value1) {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data)
            throw new Error("Custom Loot not found!");
        let min = Math.floor(value1);
        let max = Math.floor(value2);
        if (min < 0)
            min = 0;
        if (max < 0)
            max = 0;
        if (min > max)
            min = max;
        data.experience = [min, max];
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));
        return data.experience;
    }
    static addLootItem(typeId, itemLoot) {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data)
            throw new Error("Custom Loot not found!");
        if (itemLoot.item.amount && itemLoot.item.amount <= 0)
            itemLoot.item.amount = 1;
        if (itemLoot.chance < 0)
            itemLoot.chance = 0;
        if (itemLoot.min_amount < 0)
            itemLoot.min_amount = 0;
        if (itemLoot.min_amount > (itemLoot.item.amount ?? 1))
            itemLoot.min_amount = (itemLoot.item.amount ?? 1);
        data.loot.push(itemLoot);
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));
        return itemLoot;
    }
    static removeLootItem(typeId, index) {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data)
            throw new Error("Custom Loot not found!");
        if (index < 0 || index >= data.loot.length)
            throw new Error("Item not found!");
        data.loot = data.loot.filter((v, i) => index !== i);
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));
    }
    static clearLootItem(typeId) {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data)
            throw new Error("Custom Loot not found!");
        data.loot = [];
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));
    }
    static addLootTable(typeId, lootTable) {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data)
            throw new Error("Custom Loot not found!");
        if (!lootTable.trim())
            throw new Error("Loot Table not found!");
        data.lootTables.push(lootTable);
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));
        return lootTable;
    }
    static removeLootTable(typeId, index) {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data)
            throw new Error("Custom Loot not found!");
        if (index < 0 || index >= data.lootTables.length)
            throw new Error("Loot Table not found!");
        data.lootTables = data.lootTables.filter((v, i) => index !== i);
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));
    }
    static clearLootTable(typeId) {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data)
            throw new Error("Custom Loot not found!");
        data.lootTables = [];
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));
    }
    static generateLoot(typeId) {
        const data = MobLoots[typeId];
        if (!data)
            return undefined;
        let items = [];
        for (const lootItem of data.loot) {
            if (!(Math.random() * 100 <= lootItem.chance))
                continue;
            if ((lootItem.item.amount ?? 1) !== lootItem.min_amount) {
                const max = lootItem.item.amount ?? 1;
                const min = lootItem.min_amount;
                lootItem.item.amount = (Math.random() * (max - min) + min);
            }
            if (lootItem.item.amount === 0)
                continue;
            try {
                items.push(ItemJson.getItemStack(lootItem.item));
            }
            catch (err) { }
        }
        if (data.lootTables.length) {
            const lootTableManager = world.getLootTableManager();
            for (const lootTablePath of data.lootTables) {
                if (lootTablePath.trim()) {
                    const lootTable = lootTableManager.getLootTable(lootTablePath);
                    if (!lootTable)
                        continue;
                    const loots = lootTableManager.generateLootFromTable(lootTable);
                    if (!loots)
                        continue;
                    items.push(...loots);
                }
            }
        }
        return items;
    }
    static generateLootJson(typeId) {
        const data = MobLoots[typeId];
        if (!data)
            return undefined;
        let items = [];
        for (const lootItem of data.loot) {
            if (!(Math.random() * 100 <= lootItem.chance))
                continue;
            if ((lootItem.item.amount ?? 1) !== lootItem.min_amount) {
                const max = lootItem.item.amount ?? 1;
                const min = lootItem.min_amount;
                lootItem.item.amount = (Math.random() * (max - min) + min);
            }
            if (lootItem.item.amount === 0)
                continue;
            try {
                items.push(lootItem.item);
            }
            catch (err) { }
        }
        if (data.lootTables.length) {
            const lootTableManager = world.getLootTableManager();
            for (const lootTablePath of data.lootTables) {
                if (lootTablePath.trim()) {
                    const lootTable = lootTableManager.getLootTable(lootTablePath);
                    if (!lootTable)
                        return items;
                    const loots = lootTableManager.generateLootFromTable(lootTable);
                    if (!loots)
                        return items;
                    for (const itemStack of loots) {
                        items.push(ItemJson.getItemJson(itemStack));
                    }
                }
            }
        }
        return items;
    }
    static updateLoot() {
        const loots = this.getAllLoots();
        for (const loot of loots) {
            const typeId = loot.typeId;
            const experience = loot.experience[0] === loot.experience[1] ? loot.experience[0] : loot.experience;
            MobExperiences[typeId] = experience;
            MobLoots[typeId] = loot;
        }
    }
}
CustomLoot.DB_PREFIX_KEY = "CustomLoot:";
world.afterEvents.worldLoad.subscribe(() => { CustomLoot.updateLoot(); });
