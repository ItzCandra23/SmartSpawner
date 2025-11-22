import { BlockInventoryComponent, Player, Vector3, world } from "@minecraft/server";
import { configuration, SmartSpawner } from "./smartspawner";
import { formatId, formatNumber, formatString } from "./utils/format";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

export class SmartSpawnerUI {

    static openSpawner(player: Player, location: Vector3, dimensionId: string) {
        const data = SmartSpawner.getSmartSpawner(location, dimensionId);
        if (!data) return;

        const nametag = formatId(data.entityId);
        const title = formatString(configuration.spawner_ui.Main.title, {
            "{stack}": data.stack,
            "{nametag}": nametag,
            "{typeid}": data.entityId,
        });
        const description = formatString(configuration.spawner_ui.Main.description, {
            "{stack}": data.stack,
            "{nametag}": nametag,
            "{typeid}": data.entityId,
            "{experience}": data.expecience,
            "{max_experience}": data.stack * configuration.spawner.max_experience,
            "{slots}": data.inventory.length,
            "{max_slots}": data.stack * configuration.spawner.inventory_size,
            "{min_mobs}": data.stack,
            "{max_mobs}": data.stack * configuration.spawner.max_mobs,
            "{delay}": configuration.spawner.delay,
            "{range}": configuration.spawner.range,
        });

        const form = new ActionFormData();

        form.title(title);
        form.body(description);

        form.button(formatString(configuration.spawner_ui.Main.buttons.ManageSpawer.text, {
            "{stack}": data.stack,
        }), configuration.spawner_ui.Main.buttons.ManageSpawer.texture);

        form.button(formatString(configuration.spawner_ui.Main.buttons.SpawnerStorage.text, {
            "{slots}": data.inventory.length,
            "{max_slots}": data.stack * configuration.spawner.inventory_size,
        }), configuration.spawner_ui.Main.buttons.SpawnerStorage.texture);

        form.button(formatString(configuration.spawner_ui.Main.buttons.Experience.text, {
            "{experience}": formatNumber(data.expecience),
            "{max_experience}": formatNumber(data.stack * configuration.spawner.max_experience),
        }), configuration.spawner_ui.Main.buttons.Experience.texture);

        form.show(player).then((r) => {

            if (r.selection === 0) this.manageSpawner(player, location, dimensionId, () => this.openSpawner(player, location, dimensionId));
            if (r.selection === 1) this.spawnerStorage(player, location, dimensionId, 1, () => this.openSpawner(player, location, dimensionId));
            if (r.selection === 2) {
                try {
                    const xp = SmartSpawner.takeExperienceLoot(player, location, dimensionId);
                    if (xp) player.playSound("random.orb");
                    
                    this.openSpawner(player, location, dimensionId);
                } catch(err) {}
            }
        });
    }

    static spawnerStorage(player: Player, location: Vector3, dimensionId: string, page: number = 1, onback?: () => void) {
        const data = SmartSpawner.getSmartSpawner(location, dimensionId);
        if (!data) return;

        const nametag = formatId(data.entityId);
        const title = formatString(configuration.spawner_ui.SpawnerStorage.title, {
            "{stack}": data.stack,
            "{nametag}": nametag,
            "{typeid}": data.entityId,
        });
        const description = formatString(configuration.spawner_ui.SpawnerStorage.description, {
            "{stack}": data.stack,
            "{nametag}": nametag,
            "{typeid}": data.entityId,
            "{experience}": data.expecience,
            "{max_experience}": data.stack * configuration.spawner.max_experience,
            "{slots}": data.inventory.length,
            "{max_slots}": data.stack * configuration.spawner.inventory_size,
            "{min_mobs}": data.stack,
            "{max_mobs}": data.stack * configuration.spawner.max_mobs,
            "{delay}": configuration.spawner.delay,
            "{range}": configuration.spawner.range,
        });

        const items = data.inventory.slice((page - 1) * configuration.spawner.inventory_size, page * configuration.spawner.inventory_size);
        const form = new ActionFormData();

        form.title(title);
        form.body(description);

        for (const item of items) {
            form.button(formatString(configuration.spawner_ui.SpawnerStorage.buttons.Item.text, {
                "{nametag}": item.nameTag ?? formatId(item.typeId),
                "{typeid}": item.typeId,
                "{amount}": item.amount ?? 1,
            }));
        }

        const nextButton = data.inventory.length > page * configuration.spawner.inventory_size;
        const prevButton = page > 1;

        if (nextButton) form.button(configuration.spawner_ui.SpawnerStorage.buttons.NextPage.text, configuration.spawner_ui.SpawnerStorage.buttons.NextPage.texture);
        if (prevButton) form.button(configuration.spawner_ui.SpawnerStorage.buttons.PrevPage.text, configuration.spawner_ui.SpawnerStorage.buttons.PrevPage.texture);

        form.button(configuration.spawner_ui.SpawnerStorage.buttons.TakeAll.text, configuration.spawner_ui.SpawnerStorage.buttons.TakeAll.texture);
        form.button(configuration.spawner_ui.SpawnerStorage.buttons.Refresh.text, configuration.spawner_ui.SpawnerStorage.buttons.Refresh.texture);
        if (onback) form.button(configuration.spawner_ui.SpawnerStorage.buttons.Back.text, configuration.spawner_ui.SpawnerStorage.buttons.Back.texture);
        
        form.show(player).then((r) => {
            if (r.selection === undefined) return;
            
            let i = items.length;

            if (nextButton) {
                if (r.selection === i) return this.spawnerStorage(player, location, dimensionId, page + 1, onback);

                i++;
            }

            if (prevButton) {
                if (r.selection === i) return this.spawnerStorage(player, location, dimensionId, page - 1, onback);

                i++;
            }

            if (r.selection === i) {
                try {
                    const container = world.getDimension(dimensionId).getBlock(location)?.above()?.getComponent(BlockInventoryComponent.componentId)?.container;

                    SmartSpawner.takeAllInventoryLoot(location, dimensionId, container);
                    this.spawnerStorage(player, location, dimensionId, 1, onback);
                } catch(err) {}
                return;
            }
            if (r.selection === i + 1) {
                this.spawnerStorage(player, location, dimensionId, page, onback);
                return;
            }
            if (r.selection === i + 2) {
                if (onback) onback();
                return;
            }

            const slot = ((page - 1) * configuration.spawner.inventory_size) + r.selection;

            try {
                const container = world.getDimension(dimensionId).getBlock(location)?.above()?.getComponent(BlockInventoryComponent.componentId)?.container;

                SmartSpawner.takeInventoryLoot(slot, location, dimensionId, container);
                this.spawnerStorage(player, location, dimensionId, page, onback);
            } catch(err) {}
        });
    }

    static manageSpawner(player: Player, location: Vector3, dimensionId: string, onback?: () => void) {
        const data = SmartSpawner.getSmartSpawner(location, dimensionId);
        if (!data) return;

        const nametag = formatId(data.entityId);
        const title = formatString(configuration.spawner_ui.ManageSpawner.title, {
            "{stack}": data.stack,
            "{nametag}": nametag,
            "{typeid}": data.entityId,
        });
        const description = formatString(configuration.spawner_ui.ManageSpawner.description, {
            "{stack}": data.stack,
            "{nametag}": nametag,
            "{typeid}": data.entityId,
            "{experience}": data.expecience,
            "{max_experience}": data.stack * configuration.spawner.max_experience,
            "{slots}": data.inventory.length,
            "{max_slots}": data.stack * configuration.spawner.inventory_size,
            "{min_mobs}": data.stack,
            "{max_mobs}": data.stack * configuration.spawner.max_mobs,
            "{delay}": configuration.spawner.delay,
            "{range}": configuration.spawner.range,
        });

        const form =  new ActionFormData();

        form.title(title);
        form.body(description);

        // form.button(configuration.spawner_ui.ManageSpawner.buttons.Increase.text, configuration.spawner_ui.ManageSpawner.buttons.Increase.texture);
        form.button(configuration.spawner_ui.ManageSpawner.buttons.Decrease.text, configuration.spawner_ui.ManageSpawner.buttons.Decrease.texture);
        if (onback) form.button(configuration.spawner_ui.ManageSpawner.buttons.Back.text, configuration.spawner_ui.ManageSpawner.buttons.Back.texture);

        form.show(player).then((r) => {
            if (r.selection === undefined) return;
            // if (r.selection === 0) return this.increaseStack(player, location, dimensionId, () => this.manageSpawner(player, location, dimensionId, onback));
            if (r.selection === 0) return this.decreaseStack(player, location, dimensionId, () => this.manageSpawner(player, location, dimensionId, onback));
            if (r.selection === 1 && onback) return onback();
        });
    }

    static increaseStack(player: Player, location: Vector3, dimensionId: string, onback?: () => void) {
        const data = SmartSpawner.getSmartSpawner(location, dimensionId);
        if (!data) return;

        const nametag = formatId(data.entityId);
        const title = formatString(configuration.spawner_ui.IncreaseStack.title, {
            "{stack}": data.stack,
            "{nametag}": nametag,
            "{typeid}": data.entityId,
        });
        const description = formatString(configuration.spawner_ui.IncreaseStack.description, {
            "{stack}": data.stack,
            "{nametag}": nametag,
            "{typeid}": data.entityId,
            "{experience}": data.expecience,
            "{max_experience}": data.stack * configuration.spawner.max_experience,
            "{slots}": data.inventory.length,
            "{max_slots}": data.stack * configuration.spawner.inventory_size,
            "{min_mobs}": data.stack,
            "{max_mobs}": data.stack * configuration.spawner.max_mobs,
            "{delay}": configuration.spawner.delay,
            "{range}": configuration.spawner.range,
        });

        const form =  new ModalFormData();

        form.title(title);
        form.label(description);
        form.textField(configuration.spawner_ui.IncreaseStack.contents.Value.text, configuration.spawner_ui.IncreaseStack.contents.Value.placeholder);

        form.show(player).then((r) => {
            if (r.formValues === undefined) return onback && onback();

            const value = Number(r.formValues[1]);
            if (value !== value) return onback && onback();

            try {
                const amount = Math.floor(value);

                SmartSpawner.addSpawnerStack(amount, location, dimensionId);
                
                player.sendMessage(`§d+${amount}§f Spawner Stack`);
                player.playSound("conduit.activate");
            } catch(err) {
                onback && onback();
            }
        });
    }

    static decreaseStack(player: Player, location: Vector3, dimensionId: string, onback?: () => void) {
        const data = SmartSpawner.getSmartSpawner(location, dimensionId);
        if (!data) return;

        const nametag = formatId(data.entityId);
        const title = formatString(configuration.spawner_ui.DecreaseStack.title, {
            "{stack}": data.stack,
            "{nametag}": nametag,
            "{typeid}": data.entityId,
        });
        const description = formatString(configuration.spawner_ui.DecreaseStack.description, {
            "{stack}": data.stack,
            "{nametag}": nametag,
            "{typeid}": data.entityId,
            "{experience}": data.expecience,
            "{max_experience}": data.stack * configuration.spawner.max_experience,
            "{slots}": data.inventory.length,
            "{max_slots}": data.stack * configuration.spawner.inventory_size,
            "{min_mobs}": data.stack,
            "{max_mobs}": data.stack * configuration.spawner.max_mobs,
            "{delay}": configuration.spawner.delay,
            "{range}": configuration.spawner.range,
        });

        const form =  new ModalFormData();

        form.title(title);
        form.label(description);
        form.textField(configuration.spawner_ui.DecreaseStack.contents.Value.text, configuration.spawner_ui.DecreaseStack.contents.Value.placeholder);

        form.show(player).then((r) => {
            if (r.formValues === undefined) return onback && onback();

            const value = Number(r.formValues[1]);
            if (value !== value) return onback && onback();

            try {
                const amount = Math.floor(value);
                const container = world.getDimension(dimensionId).getBlock(location)?.above()?.getComponent(BlockInventoryComponent.componentId)?.container;

                SmartSpawner.takeSpawnerStack(amount, location, dimensionId, container);
                
                player.sendMessage(`§d-${amount}§f Spawner Stack`);
                player.playSound("conduit.deactivate");
            } catch(err) {
                onback && onback();
            }
        });
    }
}