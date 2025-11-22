import { Enchantment, EnchantmentTypes, ItemDurabilityComponent, ItemEnchantableComponent, ItemInventoryComponent, ItemLockMode, ItemPotionComponent, ItemStack, Potions } from "@minecraft/server";

export interface RawEnchantment {
    typeId: string;
    level: number;
}

export interface ItemJsonData {

    // Base Item Json
    typeId: string;
    amount?: number;
    nameTag?: string;
    lore?: string[];
    lockMode?: ItemLockMode;
    keepOnDeath?: boolean;
    
    // Not for Potion Json
    enchants?: RawEnchantment[];
    durability_damage?: number;
    canDestroy?: string[];
    canPlaceOn?: string[];
    container?: Record<number, ItemJsonData>;
}

export interface PotionJsonData extends ItemJsonData {
    typeId: "minecraft:potion";
    amount: 1;
    effectId: string;
    deliveryType: string;
}

export type ItemBase = ItemJsonData | PotionJsonData;

const cacheMaxAmount = new Map<string, number>();

/**ItemJson class is for converting ItemStack to json so it can be saved to dynamic properties */
export class ItemJson {

    /**Check if ItemJson is Regular Item or Potion */
    static isPotion(data: ItemBase): boolean {
        return data.hasOwnProperty("effectId");
    }

    /**Get ItemJson data from Minecraft ItemStack */
    static getItemJson<T extends ItemBase = ItemJsonData>(itemStack: ItemStack): T {
        let data: ItemBase = {
            typeId: itemStack.typeId,
        };

        const lore = itemStack.getLore();

        if (itemStack.amount > 1) data.amount = itemStack.amount;
        if (itemStack.keepOnDeath) data.keepOnDeath = true;
        if (itemStack.lockMode !== ItemLockMode.none) data.lockMode = itemStack.lockMode;
        if (itemStack.nameTag) data.nameTag = itemStack.nameTag;
        if (lore) data.lore = lore;

        const potion = itemStack.getComponent(ItemPotionComponent.componentId);
        
        if (potion?.potionEffectType.id) {
            data.typeId = "minecraft:potion";
            data.amount = 1;
            
            (data as PotionJsonData).effectId = potion.potionEffectType.id;
            (data as PotionJsonData).deliveryType = potion.potionDeliveryType.id;
        } else {
            const canDestroy = itemStack.getCanDestroy();
            const canPlaceOn = itemStack.getCanPlaceOn();
            const durability = itemStack.getComponent(ItemDurabilityComponent.componentId);
            
            if (canDestroy.length) data.canDestroy = canDestroy;
            if (canPlaceOn.length) data.canPlaceOn = canPlaceOn;
            if (durability && durability.damage) data.durability_damage = durability.damage;

            const enchantable = itemStack.getComponent(ItemEnchantableComponent.componentId);
            const enchantments = enchantable?.getEnchantments();

            if (enchantments?.length) data.enchants = enchantments.map((ench) => ({ typeId: ench.type.id, level: ench.level }));

            const container = itemStack.getComponent(ItemInventoryComponent.componentId)?.container;

            if (container) {
                data.container = {};

                for (let i = container.firstItem() ?? 0; i < container.size; i++) {
                    const containerItem = container.getItem(i);
                    if (!containerItem) continue;

                    data.container[i] = this.getItemJson(containerItem);
                }
            }
        }

        return data as T;
    }

    /**Get ItemStack from ItemJson or PotionJson data */
    static getItemStack(itemJson: ItemBase): ItemStack {
        const itemStack = !itemJson.hasOwnProperty("effectId") ? new ItemStack(itemJson.typeId, itemJson.amount) : Potions.resolve((itemJson as PotionJsonData).effectId, (itemJson as PotionJsonData).deliveryType);

        if (itemJson.keepOnDeath) itemStack.keepOnDeath = true;
        if (itemJson.lockMode) itemStack.lockMode = itemJson.lockMode;
        if (itemJson.nameTag) itemStack.nameTag = itemJson.nameTag;
        if (itemJson.lore?.length) itemStack.setLore(itemJson.lore);

        if (!itemJson.hasOwnProperty("effectId")) {
            itemStack.setCanDestroy(itemJson.canDestroy);
            itemStack.setCanPlaceOn(itemJson.canPlaceOn);

            if (itemJson.durability_damage) {
                const durability = itemStack.getComponent(ItemDurabilityComponent.componentId);
                if (durability) durability.damage = itemJson.durability_damage;
            }

            if (itemJson.enchants) {
                const enchantable = itemStack.getComponent(ItemEnchantableComponent.componentId);

                if (enchantable) for (const rawenchantment of itemJson.enchants) {
                    const enchantmentType = EnchantmentTypes.get(rawenchantment.typeId);
                    if (!enchantmentType) continue;
                    
                    const enchantment: Enchantment = { type: enchantmentType, level: rawenchantment.level };
                    if (enchantable.canAddEnchantment(enchantment)) enchantable.addEnchantment(enchantment);
                }
            }

            if (itemJson.container) {
                const container = itemStack.getComponent(ItemInventoryComponent.componentId)?.container;

                if (container) for (const key in itemJson.container) {
                    const slot = Number(key);
                    const containerItemStack = this.getItemStack(itemJson.container[slot]);

                    container.setItem(slot, containerItemStack);
                }
            }
        }

        return itemStack;
    }

    /**Get item max amount */
    static getMaxAmount(typeId: string): number | undefined {
        try {
            const cacheValue = cacheMaxAmount.get(typeId);
            
            if (!cacheValue) {
                const value = new ItemStack(typeId).maxAmount;
            
                cacheMaxAmount.set(typeId, value);
                return value;
            }

            return cacheValue;
        } catch(err) {
            return undefined;
        }
    }

    /**Validate the item data can be stacking */
    static canBeStacked(itemJson: ItemBase, withItemJson: ItemBase): boolean {
        if (itemJson.typeId !== withItemJson.typeId) return false;
        
        const maxAmount = this.getMaxAmount(itemJson.typeId);
        if (!maxAmount || maxAmount <= (itemJson.amount || 1)) return false;
        if ((itemJson.amount ?? 1) + (withItemJson.amount ?? 1) > maxAmount) return false;

        if (itemJson.nameTag !== withItemJson.nameTag) return false;
        if (JSON.stringify(itemJson.lore) !== JSON.stringify(withItemJson.lore)) return false;

        if (JSON.stringify(itemJson.canDestroy) !== JSON.stringify(withItemJson.canDestroy)) return false;
        if (JSON.stringify(itemJson.canDestroy) !== JSON.stringify(withItemJson.canDestroy)) return false;
        if (JSON.stringify(itemJson.canPlaceOn) !== JSON.stringify(withItemJson.canPlaceOn)) return false;
        if (JSON.stringify(itemJson.container) !== JSON.stringify(withItemJson.container)) return false;

        if ((itemJson.keepOnDeath ?? false) !== (withItemJson.keepOnDeath ?? false)) return false;
        if ((itemJson.lockMode ?? ItemLockMode.none) !== (withItemJson.lockMode ?? ItemLockMode.none)) return false;

        return true;
    }

    /**Add item data to array inventory */
    static addItemToArray(itemJson: ItemBase, items: ItemBase[]): ItemBase[] {
        const maxAmount = this.getMaxAmount(itemJson.typeId);

        for (let i = 0; i < items.length; i++) {
            const withItemJson = items[i];

            if (itemJson.typeId !== withItemJson.typeId) continue;
            if (!maxAmount || maxAmount <= (withItemJson.amount || 1)) continue;
            
            if (itemJson.nameTag !== withItemJson.nameTag) continue;
            if (JSON.stringify(itemJson.lore) !== JSON.stringify(withItemJson.lore)) continue;
            
            if (JSON.stringify(itemJson.canDestroy) !== JSON.stringify(withItemJson.canDestroy)) continue;
            if (JSON.stringify(itemJson.canDestroy) !== JSON.stringify(withItemJson.canDestroy)) continue;
            if (JSON.stringify(itemJson.canPlaceOn) !== JSON.stringify(withItemJson.canPlaceOn)) continue;
            if (JSON.stringify(itemJson.container) !== JSON.stringify(withItemJson.container)) continue;
            
            if ((itemJson.keepOnDeath ?? false) !== (withItemJson.keepOnDeath ?? false)) continue;
            if ((itemJson.lockMode ?? ItemLockMode.none) !== (withItemJson.lockMode ?? ItemLockMode.none)) continue;
            
            const amount = (withItemJson.amount ?? 1) + (itemJson.amount ?? 1);
            
            if (amount > maxAmount) {
                itemJson.amount = (amount - maxAmount);
                items[i].amount = maxAmount;
            } else {
                itemJson.amount = 0;
                items[i].amount = amount;
                break;
            }
        }

        if (itemJson.amount === undefined) itemJson.amount = 1;

        if (itemJson.amount > 0) {
            if (!maxAmount || itemJson.amount > maxAmount) itemJson.amount = maxAmount;

            items.push(itemJson);
        }

        return items;
    }
}