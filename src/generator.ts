import { system, world } from "@minecraft/server";
import { configuration, SmartSpawner } from "./smartspawner";

system.runInterval(() => {
    for (const spawner of SmartSpawner.getAllSmartSpawner()) {
        const location = spawner.location;
        const dimensionId = spawner.dimensionId;
        const dimension = world.getDimension(dimensionId);

        if (!dimension.isChunkLoaded(location)) continue;

        const players = dimension.getPlayers({ location, maxDistance: configuration.spawner.range });
        if (!players.length) return;

        system.runJob(SmartSpawner.generateSpawnerLoot(location, dimensionId));
    }
}, configuration.spawner.delay * 20);