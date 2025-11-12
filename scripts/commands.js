import { CommandPermissionLevel, CustomCommandParamType, CustomCommandStatus, EntityInventoryComponent, Player, system } from "@minecraft/server";
import { SmartSpawner } from "./smartspawner";
system.beforeEvents.startup.subscribe(({ customCommandRegistry }) => {
    customCommandRegistry.registerCommand({
        name: "smartspawner:givespawner",
        description: "Gives an specific smart spawner to a player",
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
                const itemStack = SmartSpawner.createItemStack(entityType, amount);
                targets.forEach((player) => {
                    const inventory = player.getComponent(EntityInventoryComponent.componentId);
                    if (!inventory)
                        return;
                    inventory.container.addItem(itemStack);
                });
                return { status: CustomCommandStatus.Success, message: `Smart spawner sended to ${targets.map((v) => v.name).join()}!` };
            }
            catch (err) {
                if (err.message)
                    return { status: CustomCommandStatus.Failure, message: err.message };
                return { status: CustomCommandStatus.Failure };
            }
        });
    });
});
