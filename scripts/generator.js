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
                    continue;
                system.runJob(SmartSpawner.generateSpawnerLoot(location, dimensionId));
                system.runJob(createSpawnerParticles(location, dimension));
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
let runId = SmartSpawnerGenerator.generateInterval(5);
function* createSpawnerParticles(location, dimension) {
    const particleType = "minecraft:basic_flame_particle";
    const particlesPerTick = 15;
    const spread = { x: 1, y: 1, z: 1 };
    try {
        for (let i = 0; i < particlesPerTick; i++) {
            const offsetX = (Math.random() - 0.5) * spread.x;
            const offsetY = (Math.random() - 0.5) * spread.y;
            const offsetZ = (Math.random() - 0.5) * spread.z;
            const particlePos = {
                x: location.x + 0.5 + offsetX,
                y: location.y + 0.5 + offsetY,
                z: location.z + 0.5 + offsetZ
            };
            dimension.spawnParticle(particleType, particlePos);
            yield;
        }
    }
    catch (error) { }
}
