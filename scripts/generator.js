import { system, world } from "@minecraft/server";
import { configuration, ActiveSpawner } from "./activespawner";
export class ActiveSpawnerGenerator {
    static getIntervalId() {
        return runId;
    }
    static generateInterval(seconds) {
        return system.runInterval(() => {
            for (const spawner of ActiveSpawner.getAllActiveSpawner()) {
                const location = spawner.location;
                const dimensionId = spawner.dimensionId;
                const dimension = world.getDimension(dimensionId);
                if (!dimension.isChunkLoaded(location))
                    continue;
                const players = dimension.getPlayers({ location, maxDistance: configuration.spawner.range });
                if (!players.length)
                    continue;
                system.runJob(ActiveSpawner.generateSpawnerLoot(location, dimensionId));
                system.runJob(this.createSpawnerParticles(location, dimension));
            }
        }, seconds * 20);
    }
    static updateInterval(seconds) {
        if (!seconds)
            seconds = configuration.spawner.delay;
        system.clearRun(runId);
        runId = this.generateInterval(seconds);
    }
    static *createSpawnerParticles(location, dimension) {
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
}
let runId = ActiveSpawnerGenerator.generateInterval(configuration.spawner.delay);
