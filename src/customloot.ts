import { ItemStack, world } from "@minecraft/server";
import { ItemBase, ItemJson, ItemJsonData } from "./utils/itemjson";

export interface ItemLoot {
    chance: number;
    min_amount: number;
    item: ItemJsonData;
}

export interface CustomLootData {
    typeId: string;
    experience: [number, number];
    loot: ItemLoot[];
    lootTables: string[];
}

export let MobLoots: Record<string, CustomLootData> = {};

export class CustomLoot {

    static readonly DB_PREFIX_KEY = "CustomLoot:";

    static getAllLootKeys(): string[] {
        return world.getDynamicPropertyIds().filter((v) => v.startsWith(this.DB_PREFIX_KEY));
    }

    static getAllLoots(): CustomLootData[] {
        return this.getAllLootKeys().map((key) => JSON.parse(world.getDynamicProperty(key) as string));
    }

    static getLoot(typeId: string): CustomLootData | undefined {
        const data = world.getDynamicProperty(this.DB_PREFIX_KEY + typeId);
        if (!data) return undefined;

        return JSON.parse(data as string);
    }

    static setLoot(customLoot: CustomLootData): void {
        if (customLoot.experience[0] < 0) customLoot.experience[0] = 0;
        if (customLoot.experience[1] < 0) customLoot.experience[1] = 0;
        if (customLoot.experience[0] > customLoot.experience[1]) customLoot.experience[0] = customLoot.experience[1];

        const key = customLoot.typeId.toLowerCase();
        const data = JSON.stringify(customLoot);

        world.setDynamicProperty(this.DB_PREFIX_KEY + key, data);
    }

    static deleteLoot(typeId: string): void {
        world.setDynamicProperty(this.DB_PREFIX_KEY + typeId);
    }

    // static setLootTable(typeId: string, path: string): string | undefined {
    //     const key = typeId.toLowerCase();
    //     let data = this.getLoot(key);
    //     if (!data) throw new Error("Loot not found!");

    //     const value = path.trim();

    //     data.lootTable = value;        
    //     world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));

    //     return value ? value : undefined;
    // }

    static setLootExperience(typeId: string, value1: number, value2: number = value1): [number, number] {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data) throw new Error("Loot not found!");

        let min = Math.floor(value1);
        let max = Math.floor(value2);

        if (min < 0) min = 0;
        if (max < 0) max = 0;
        if (min > max) min = max;

        data.experience = [min, max];        
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));

        return data.experience;
    }

    static addLootItem(typeId: string, itemLoot: ItemLoot): ItemLoot {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data) throw new Error("Loot not found!");

        if (itemLoot.item.amount && itemLoot.item.amount <= 0) itemLoot.item.amount = 1;
        if (itemLoot.chance < 0) itemLoot.chance = 0;
        if (itemLoot.min_amount < 0) itemLoot.min_amount = 0;
        if (itemLoot.min_amount > (itemLoot.item.amount ?? 1)) itemLoot.min_amount = (itemLoot.item.amount ?? 1);

        data.loot.push(itemLoot);
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));

        return itemLoot;
    }

    static removeLootItem(typeId: string, index: number): void {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data) throw new Error("Loot not found!");

        if (index < 0 || index >= data.loot.length) throw new Error("Item not found!");

        data.loot = data.loot.filter((v, i) => index !== i);

        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));
    }

    static clearLootItem(typeId: string): void {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data) throw new Error("Loot not found!");

        data.loot = [];
        
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));
    }

    static addLootTable(typeId: string, lootTable: string): string {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data) throw new Error("Loot not found!");
        if (!lootTable.trim()) throw new Error("Loot Table not found!");

        data.lootTables.push(lootTable);
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));

        return lootTable;
    }

    static removeLootTable(typeId: string, index: number): void {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data) throw new Error("Loot not found!");

        if (index < 0 || index >= data.lootTables.length) throw new Error("Loot Table not found!");

        data.lootTables = data.lootTables.filter((v, i) => index !== i);

        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));
    }

    static clearLootTable(typeId: string): void {
        const key = typeId.toLowerCase();
        let data = this.getLoot(key);
        if (!data) throw new Error("Loot not found!");

        data.lootTables = [];
        
        world.setDynamicProperty(this.DB_PREFIX_KEY + key, JSON.stringify(data));
    }

    /**@deprecated */
    static generateLoot(typeId: string): ItemStack[] | undefined {
        const data = MobLoots[typeId];
        if (!data) return undefined;

        let items: ItemStack[] = [];

        for (const lootItem of data.loot) {
            if (!(Math.random() * 100 <= lootItem.chance)) continue;

            if ((lootItem.item.amount ?? 1) !== lootItem.min_amount) {
                const max = lootItem.item.amount ?? 1;
                const min = lootItem.min_amount;

                lootItem.item.amount = Math.floor(Math.random() * (max - min + 1)) + min;
            }

            if (lootItem.item.amount === 0) continue;

            try {
                items.push(ItemJson.getItemStack(lootItem.item));
            } catch(err) {}
        }

        if (data.lootTables.length) {
            const lootTableManager = world.getLootTableManager();

            for (const lootTablePath of data.lootTables) {
                if (lootTablePath.trim()) {
                    const lootTable = lootTableManager.getLootTable(lootTablePath);
                    if (!lootTable) continue;

                    const loots = lootTableManager.generateLootFromTable(lootTable);
                    if (!loots) continue;

                    items.push(...loots);
                }
            }
        }

        return items;
    }

    static generateLootJson(typeId: string): ItemBase[] | undefined {
        const data = MobLoots[typeId];
        if (!data) return undefined;

        let items: ItemBase[] = [];

        for (const lootItem of data.loot) {
            if (!(Math.random() * 100 <= lootItem.chance)) continue;

            if ((lootItem.item.amount ?? 1) !== lootItem.min_amount) {
                const max = lootItem.item.amount ?? 1;
                const min = lootItem.min_amount;

                lootItem.item.amount = Math.floor(Math.random() * (max - min + 1)) + min;
            }

            if (lootItem.item.amount === 0) continue;

            try {
                items.push(lootItem.item);
            } catch(err) {}
        }

        if (data.lootTables.length) {
            const lootTableManager = world.getLootTableManager();

            for (const lootTablePath of data.lootTables) {
                if (lootTablePath.trim()) {
                    const lootTable = lootTableManager.getLootTable(lootTablePath);
                    if (!lootTable) return items;

                    const loots = lootTableManager.generateLootFromTable(lootTable);
                    if (!loots) return items;

                    for (const itemStack of loots) {
                        items.push(ItemJson.getItemJson(itemStack));
                    }
                }
            }
        }

        return items;
    }

    static generateExperience(typeId: string, multiple: number = 1): number | undefined {
        const data = MobLoots[typeId];
        if (!data) return undefined;

        return Math.round(Math.random() * (data.experience[0] * multiple - data.experience[1] * multiple)) + data.experience[1] * multiple;
    }

    static updateLoot() {
        const loots = this.getAllLoots();

        for (const loot of loots) {
            const typeId = loot.typeId;
            MobLoots[typeId] = loot;

            // const experience = loot.experience[0] === loot.experience[1] ? loot.experience[0] : loot.experience;
            // MobExperiences[typeId] = experience;
        }
    }
}

world.afterEvents.worldLoad.subscribe(() => { CustomLoot.updateLoot(); });