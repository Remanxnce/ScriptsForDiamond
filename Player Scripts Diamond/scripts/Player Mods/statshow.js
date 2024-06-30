// Script example for ScriptAPI
// Author: Jayly <https://github.com/JaylyDev>
// Project: https://github.com/JaylyDev/ScriptAPI
import { EntityHealthComponent, system, world } from "@minecraft/server";
const getScore = (objective, target, useZero = true) => {
    try {
        const obj = world.scoreboard.getObjective(objective);
        if (typeof target == 'string') {
            return obj.getScore(obj.getParticipants().find(v => v.displayName == target));
        }
        return obj.getScore(target.scoreboard);
    } catch {
        return useZero ? 0 : NaN;
    }
}

system.runInterval(() => {
    for (const player of world.getPlayers()) {
        const health = player.getComponent(EntityHealthComponent.componentId);
        player.nameTag = `§c§l${health.currentValue.toFixed(1)}§r | ${player.name} | §c§l${health.currentValue.toFixed(1)}\n§1§l${getScore('warns',player.name)} Warns\n§f ${getScore(`cps`,player.name)} CPS`;
        //player.nameTag = `${player.name}\n§c§l${health.currentValue.toFixed(1)}§f\n${getScore(`cps`,player.name)} CPS`
        //player.nameTag = `${player.name}\n§c§l${health.currentValue.toFixed(1)}§r\n${getScore(`cps`,player.name)} CPS`
        //player.nameTag = `§c§l${health.currentValue.toFixed(1)}§r | ${player.name} | §c§l${health.currentValue.toFixed(1)}\n§r${getScore(`cps`,player.name)} CPS | §1§l${getScore('warns',player.name)} Warns`;
    }
});