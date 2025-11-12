import { system, world } from "@minecraft/server";
import { configuration, SmartSpawner } from "./smartspawner";

let interval = generateInterval(configuration.spawner.delay);

function generateInterval(seconds: number): number {
    return system.runInterval(() => {
        for (const spawner of SmartSpawner.getAllSmartSpawner()) {
            const location = spawner.location;
            const dimensionId = spawner.dimensionId;
            const dimension = world.getDimension(dimensionId);

            if (!dimension.isChunkLoaded(location)) continue;

            const players = dimension.getPlayers({ location, maxDistance: configuration.spawner.range });
            if (!players.length) return;

            system.runJob(SmartSpawner.generateSpawnerLoot(location, dimensionId));
        }
    }, seconds * 20);
}

export function updateInterval(seconds?: number) {
    if (!seconds) seconds = configuration.spawner.delay;

    system.clearRun(interval);
    interval = generateInterval(seconds);
}