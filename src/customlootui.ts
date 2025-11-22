import { Player } from "@minecraft/server";
import { ItemBase } from "./utils/itemjson";
import { ItemLoot } from "./customloot";
import { ModalFormData } from "@minecraft/server-ui";
import { formatId } from "./utils/format";

export class CustomLootUI {

    static async askItemLoot(player: Player, itemBase: ItemBase, message?: string): Promise<ItemLoot | undefined> {
        const form = new ModalFormData();

        form.title(`x${itemBase.amount ?? 1} ${itemBase.nameTag ?? formatId(itemBase.typeId)}`);
        form.label(`${message ? message + "§r\n\n" : ""}Type ID: §d${itemBase.typeId}§r\nAmount: §b${itemBase.amount ?? 1}§r\n`);
        
        form.textField("Chance", "1 - 100", {
            tooltip: "If it fails, try waiting and inputting non-number characters several times, then enter a valid one."
        });
        form.textField("Min Amount", "1 - 64", {
            defaultValue: `${itemBase.amount ?? 1}`
        });

        try {
            const res = await form.show(player);
            if (res.formValues === undefined) return undefined;

            const chance = Number(res.formValues[1]);

            if (chance !== chance) return this.askItemLoot(player, itemBase, "§cInvalid chance!");
            if (chance > 100 || chance < 0) return this.askItemLoot(player, itemBase, "§cChance out of range!");

            const min_amount = Number(res.formValues[2]);

            if (min_amount !== min_amount) return this.askItemLoot(player, itemBase, "§cInvalid minimum amount!");
            if (min_amount > (itemBase.amount ?? 1) || min_amount < 0) return this.askItemLoot(player, itemBase, "§cMinimum Amount out of range!");

            return {
                chance,
                min_amount: Math.floor(min_amount),
                item: itemBase,
            };
        } catch(err) {
            return undefined;
        }
    }
}