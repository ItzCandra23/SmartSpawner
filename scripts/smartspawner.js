import { BlockInventoryComponent, EntityInventoryComponent, EntityTypes, ItemEnchantableComponent, ItemStack, system, world } from "@minecraft/server";
import { formatID } from "./utils/formatId";
import { ItemJson } from "./utils/itemjson";
import { MobExperiences } from "./mob_experiences";
const configuration = {
    spawner: {
        range: 16,
        delay: 25,
        max_stack: 64,
        max_experience: 1000,
        inventory_size: 45,
    },
};
export class SmartSpawner {
    static getPrefixLore() {
        return "§s§m§a§r§t§s§p§a§w§n§e§r";
    }
    /**Create Smart Spawner ItemStack
     * @throws Invalid ItemStack
     */
    static createItemStack(entityType, amount) {
        const itemStack = new ItemStack("minecraft:mob_spawner", amount);
        itemStack.nameTag = `§a${formatID(entityType.id)} Spawner`;
        itemStack.setLore([
            this.getPrefixLore() + "§eA Smart Spawner",
            entityType.id,
        ]);
        return itemStack;
    }
    /**Get Smart Spawner Entity Type from ItemStack */
    static getItemSpawnerType(itemStack) {
        if (itemStack.typeId !== "minecraft:mob_spawner")
            return undefined;
        const lores = itemStack.getLore();
        if (lores.length < 2 || !lores[0].startsWith(this.getPrefixLore()))
            return undefined;
        return EntityTypes.get(lores[1]);
    }
    /**Get all smart spawner data keys
     * Format [SmartSpawnerBlock:DimensionId:X:Y:Z]
     */
    static getSmartSpawnerKeys() {
        return world.getDynamicPropertyIds().filter((v) => v.startsWith("SmartSpawnerBlock:"));
    }
    /**Get all smart spawner data */
    static getAllSmartSpawner() {
        return this.getSmartSpawnerKeys().map((key) => JSON.parse(world.getDynamicProperty(key)));
    }
    /**Get smart spawner data */
    static getSmartSpawner(location, dimensionId) {
        const result = world.getDynamicProperty(`SmartSpawnerBlock:${dimensionId}:${Math.floor(location.x)}:${Math.floor(location.y)}:${Math.floor(location.z)}`);
        if (!result)
            return undefined;
        return JSON.parse(result);
    }
    /**Set Spawner as Smart Spawner
     * @throws Invalid Block Type
     * @throws Already set as Smart Spawner
     */
    static setSmartSpawner(entityType, block) {
        if (block.typeId !== "minecraft:mob_spawner")
            throw new Error("Invalid block type!");
        if (this.getSmartSpawner(block.location, block.dimension.id))
            throw new Error("Already set as Smart Spawner");
        const key = `SmartSpawnerBlock:${block.dimension.id}:${Math.floor(block.location.x)}:${Math.floor(block.location.y)}:${Math.floor(block.location.z)}`;
        const data = {
            entityId: entityType.id,
            location: block.location,
            dimensionId: block.dimension.id,
            stack: 1,
            expecience: 0,
            inventory: [],
        };
        world.setDynamicProperty(key, JSON.stringify(data));
        return [key, data];
    }
    /**Delete Smart Spawner data */
    static deleteSmartSpawner(location, dimensionId) {
        world.setDynamicProperty(`SmartSpawnerBlock:${dimensionId}:${Math.floor(location.x)}:${Math.floor(location.y)}:${Math.floor(location.z)}`);
    }
    /**Get spawner stack amount */
    static getSpawnerStack(location, dimensionId) {
        return this.getSmartSpawner(location, dimensionId)?.stack;
    }
    /**Add spawner stack */
    static addSpawnerStack(amount, location, dimensionId) {
        if (amount < 1)
            throw new Error("Invalid amount!");
        let data = this.getSmartSpawner(location, dimensionId);
        if (!data)
            throw new Error("Spawner not found!");
        if (data.stack + amount > configuration.spawner.max_stack)
            throw new Error("Stack exceeds the limit!");
        data.stack += amount;
        world.setDynamicProperty(`SmartSpawnerBlock:${dimensionId}:${location.x}:${location.y}:${location.z}`, JSON.stringify(data));
        return data.stack;
    }
    /**Take spawner stack */
    static takeSpawnerStack(amount, location, dimensionId, container) {
        if (amount < 1)
            throw new Error("Invalid amount!");
        let data = this.getSmartSpawner(location, dimensionId);
        if (!data)
            throw new Error("Spawner not found!");
        if ((data.stack - amount) < 1)
            throw new Error("Amount exceeds the limit!");
        data.stack -= amount;
        const itemStack = this.createItemStack({ id: data.entityId }, amount);
        if (container)
            container.addItem(itemStack);
        else {
            const dimension = world.getDimension(dimensionId);
            const pos = { x: location.x + 0.5, y: location.y + 1, z: location.z + 0.5 };
            dimension.spawnItem(itemStack, pos);
        }
        world.setDynamicProperty(`SmartSpawnerBlock:${dimensionId}:${location.x}:${location.y}:${location.z}`, JSON.stringify(data));
        return data.stack;
    }
    /**Take all spawner stack */
    static takeAllSpawnerStack(location, dimensionId, container) {
        let data = this.getSmartSpawner(location, dimensionId);
        if (!data)
            throw new Error("Spawner not found!");
        const amount = data.stack - 1;
        if (amount <= 0)
            throw new Error("Amount exceeds the limit!");
        data.stack = 1;
        const itemStack = this.createItemStack({ id: data.entityId }, amount);
        if (container)
            container.addItem(itemStack);
        else {
            const dimension = world.getDimension(dimensionId);
            const pos = { x: location.x + 0.5, y: location.y + 1, z: location.z + 0.5 };
            dimension.spawnItem(itemStack, pos);
        }
        world.setDynamicProperty(`SmartSpawnerBlock:${dimensionId}:${location.x}:${location.y}:${location.z}`, JSON.stringify(data));
        return data.stack;
    }
    /**Generate items loot from entity type */
    static generateSpawnerItemsLoot(entityType, multiple = 1) {
        if (multiple < 1)
            multiple = 1;
        let data = [];
        const lootTableManager = world.getLootTableManager();
        for (let i = 0; i < multiple; i++) {
            for (const lootItem of lootTableManager.generateLootFromEntityType(entityType) ?? []) {
                data.push(ItemJson.getItemJson(lootItem));
            }
        }
        return data;
    }
    /**Get spawner raw loot inventory */
    static getRawInventory(location, dimensionId) {
        return this.getSmartSpawner(location, dimensionId)?.inventory ?? [];
    }
    /**Get spawner loot inventory */
    static getInventory(location, dimensionId) {
        return this.getRawInventory(location, dimensionId).map((itemJson) => ItemJson.getItemStack(itemJson));
    }
    /**Get spawner inventory size */
    static getInventorySize(location, dimensionId) {
        const data = this.getSmartSpawner(location, dimensionId);
        if (!data)
            return undefined;
        const inventory_size = configuration.spawner.inventory_size;
        if (inventory_size < 1)
            return 0;
        return data.stack * inventory_size;
    }
    /**Add loot item to spawner inventory */
    static addInventoryLoot(itemJson, location, dimensionId) {
        let data = this.getSmartSpawner(location, dimensionId);
        if (!data)
            throw new Error("Spawner not found!");
        const inventory = ItemJson.addItemToArray(itemJson, data.inventory);
        data.inventory = inventory.slice(0, configuration.spawner.inventory_size);
        world.setDynamicProperty(`SmartSpawnerBlock:${dimensionId}:${location.x}:${location.y}:${location.z}`, JSON.stringify(data));
    }
    /**Take loot from spawner inventory slot */
    static takeInventoryLoot(slot, location, dimensionId, container) {
        let data = this.getSmartSpawner(location, dimensionId);
        if (!data)
            throw new Error("Spawner not found!");
        const itemJson = data.inventory[slot];
        if (!itemJson)
            throw new Error("Empty slot!");
        const itemStack = ItemJson.getItemStack(itemJson);
        if (container)
            container.addItem(itemStack);
        else {
            const dimension = world.getDimension(dimensionId);
            const pos = { x: location.x + 0.5, y: location.y + 1, z: location.z + 0.5 };
            dimension.spawnItem(itemStack, pos);
        }
        data.inventory = data.inventory.filter((v, i) => i !== slot);
        world.setDynamicProperty(`SmartSpawnerBlock:${dimensionId}:${location.x}:${location.y}:${location.z}`, JSON.stringify(data));
    }
    /**Take all loot from spawner inventory */
    static takeAllInventoryLoot(location, dimensionId, container) {
        let data = this.getSmartSpawner(location, dimensionId);
        if (!data)
            throw new Error("Spawner not found!");
        const dimension = world.getDimension(dimensionId);
        const pos = { x: location.x + 0.5, y: location.y + 1, z: location.z + 0.5 };
        for (const itemJson of data.inventory) {
            try {
                const itemStack = ItemJson.getItemStack(itemJson);
                if (container)
                    container.addItem(itemStack);
                else
                    dimension.spawnItem(itemStack, pos);
            }
            catch (err) { }
        }
        data.inventory = [];
        world.setDynamicProperty(`SmartSpawnerBlock:${dimensionId}:${location.x}:${location.y}:${location.z}`, JSON.stringify(data));
    }
    /**Generate experience value from entity type */
    static generateSpawnerExperience(entityType, multiple = 1) {
        const dynamicValue = world.getDynamicProperty("SmartSpawnerExperience:" + entityType.id);
        const rawValue = dynamicValue ? JSON.parse(dynamicValue) : MobExperiences[entityType.id];
        if (!rawValue)
            return 0;
        if (Array.isArray(rawValue))
            return Math.round(Math.random() * (rawValue[0] * multiple - rawValue[1] * multiple)) + rawValue[1] * multiple;
        return rawValue * multiple;
    }
    /**Get spawner loot experience */
    static getExperience(location, dimensionId) {
        return this.getSmartSpawner(location, dimensionId)?.expecience;
    }
    /**Get spawner maximum experience storage */
    static getMaxExperience(location, dimensionId) {
        const data = this.getSmartSpawner(location, dimensionId);
        if (!data)
            return undefined;
        const max_experience = configuration.spawner.max_experience;
        if (max_experience < 1)
            return 0;
        return data.stack * max_experience;
    }
    /**Add spawner loot experience */
    static addExperienceLoot(experience, location, dimensionId) {
        let data = this.getSmartSpawner(location, dimensionId);
        if (!data)
            throw new Error("Spawner not found!");
        const max_experience = data.stack * configuration.spawner.max_experience;
        if (experience < 1 || data.expecience + experience > max_experience)
            return;
        data.expecience += experience;
        world.setDynamicProperty(`SmartSpawnerBlock:${dimensionId}:${location.x}:${location.y}:${location.z}`, JSON.stringify(data));
    }
    /**Take spawner experience loot */
    static takeExperienceLoot(player, location, dimensionId) {
        let data = this.getSmartSpawner(location, dimensionId);
        if (!data)
            throw new Error("Spawner not found!");
        player.addExperience(data.expecience);
        data.expecience = 0;
        world.setDynamicProperty(`SmartSpawnerBlock:${dimensionId}:${location.x}:${location.y}:${location.z}`, JSON.stringify(data));
    }
}
const PlacingProcess = new Map();
const InteractDelay = new Map();
world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    if (ev.cancel)
        return;
    const playerId = ev.player.id;
    const player = ev.player;
    const block = ev.block;
    const itemStack = ev.itemStack;
    const now = Date.now();
    const interactDelay = InteractDelay.get(playerId) ?? 0;
    PlacingProcess.delete(playerId);
    const smartspawner = SmartSpawner.getSmartSpawner(block.location, block.dimension.id);
    if (itemStack && itemStack.typeId === "minecraft:mob_spawner") {
        const entityType = SmartSpawner.getItemSpawnerType(itemStack);
        if (!entityType)
            return;
        if (smartspawner) {
            ev.cancel = true;
            if (now - interactDelay < 500)
                return;
            InteractDelay.set(playerId, now);
            system.run(() => {
                if (SmartSpawner.getItemSpawnerType(itemStack)?.id !== smartspawner.entityId)
                    return;
                const container = player.getComponent(EntityInventoryComponent.componentId)?.container;
                if (!container)
                    return;
                const mainhand = container.getItem(player.selectedSlotIndex);
                if (!mainhand)
                    return;
                const amount = mainhand.amount;
                const dimension = block.dimension;
                const location = block.location;
                try {
                    const result = SmartSpawner.addSpawnerStack(1, location, dimension.id);
                    if (amount > 1) {
                        mainhand.amount -= 1;
                        container.setItem(player.selectedSlotIndex, mainhand);
                    }
                    else
                        container.setItem(player.selectedSlotIndex);
                    player.sendMessage(`§f[§d${formatID(entityType.id)}§f] Stacked §d${result}§f spawners!`);
                    player.playSound("random.levelup");
                }
                catch (err) {
                    player.sendMessage("§c" + err.message);
                }
            });
        }
        else {
            PlacingProcess.set(playerId, entityType);
            return;
        }
    }
    if (smartspawner) {
        ev.cancel = true;
        const now = Date.now();
        const interactDelay = InteractDelay.get(playerId) ?? 0;
        if (now - interactDelay < 500)
            return;
        InteractDelay.set(playerId, now);
    }
});
world.afterEvents.playerPlaceBlock.subscribe((ev) => {
    const block = ev.block;
    if (block.typeId !== "minecraft:mob_spawner")
        return;
    const entityType = PlacingProcess.get(ev.player.id);
    if (!entityType)
        return;
    PlacingProcess.delete(ev.player.id);
    system.run(() => {
        const player = ev.player;
        try {
            SmartSpawner.setSmartSpawner(entityType, block);
            player.sendMessage(`§f[§d${formatID(entityType.id)}§f] Spawner §bActivated`);
            player.playSound("conduit.activate");
        }
        catch (err) {
            player.sendMessage("§c" + err.message);
        }
    });
});
world.beforeEvents.playerBreakBlock.subscribe((ev) => {
    if (ev.cancel)
        return;
    const block = ev.block;
    const player = ev.player;
    const itemStack = ev.itemStack;
    const location = block.location;
    const dimensionId = block.dimension.id;
    const smartspawner = SmartSpawner.getSmartSpawner(location, dimensionId);
    if (!smartspawner)
        return;
    ev.cancel = true;
    system.run(() => {
        if (!itemStack?.getComponent(ItemEnchantableComponent.componentId)?.hasEnchantment("minecraft:silk_touch")) {
            player.sendMessage(`§cSilk touch needed!`);
            return;
        }
        if (smartspawner.stack > 1) {
            const container = block.above()?.getComponent(BlockInventoryComponent.componentId)?.container;
            SmartSpawner.takeSpawnerStack(1, location, dimensionId, container);
        }
        else {
            const itemStack = SmartSpawner.createItemStack({ id: smartspawner.entityId }, smartspawner.stack);
            const pos = { x: location.x + 0.5, y: location.y + 0.5, z: location.z + 0.5 };
            SmartSpawner.deleteSmartSpawner(location, dimensionId);
            block.dimension.setBlockType(location, "minecraft:air");
            block.dimension.spawnItem(itemStack, pos);
            player.sendMessage(`§f[§b${formatID(smartspawner.entityId)}§f] Spawner §cDeactivated`);
            player.playSound("conduit.deactivate");
        }
    });
});
