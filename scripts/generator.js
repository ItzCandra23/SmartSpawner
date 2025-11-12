import { system, world } from "@minecraft/server";
import { configuration, SmartSpawner } from "./smartspawner";
export class SmartSpawnerGenerator {
    static getIntervalId() {
        return runId;
    }
    static generateInterval(seconds) {
        return system.runInterval(() => {
            for (const spawner of SmartSpawner.getAllSmartSpawner()) {
                const location = spawner.location;
                const dimensionId = spawner.dimensionId;
                const dimension = world.getDimension(dimensionId);
                if (!dimension.isChunkLoaded(location))
                    continue;
                const players = dimension.getPlayers({ location, maxDistance: configuration.spawner.range });
                if (!players.length)
                    return;
                system.runJob(SmartSpawner.generateSpawnerLoot(location, dimensionId));
            }
        }, seconds * 20);
    }
    static updateInterval(seconds) {
        if (!seconds)
            seconds = configuration.spawner.delay;
        system.clearRun(runId);
        runId = this.generateInterval(seconds);
    }
}
let runId = SmartSpawnerGenerator.generateInterval(configuration.spawner.delay);
