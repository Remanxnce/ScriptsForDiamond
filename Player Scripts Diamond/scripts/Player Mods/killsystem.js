import { world, system, Player } from "@minecraft/server";


world.afterEvents.entityDie.subscribe((data) => {
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
    if (data.damageSource.cause === 'entityAttack' && (data.damageSource.damagingEntity instanceof Player)) {
        data.damageSource.damagingEntity.runCommand("effect @s instant_health 1 255 true");
        data.damageSource.damagingEntity.runCommand("effect @s saturation 1 19 true");

    };
    addScore(data.damageSource.damagingEntity, 'kills', 1);
    addScore(data.damageSource.damagingEntity,'killstreak',1);
    addScore(data.damageSource.damagingEntity, 'money',750);
    
    addScore(data.deadEntity, 'deaths', 1);
    setScore(data.deadEntity, `killstreak`, 0);
    data.deadEntity.runCommandAsync(`tag @s add clearbounty`);
}, 
{ "entityTypes": ['minecraft:player']})

function addScore(player, objective, score) {
   try {
       world.scoreboard.getObjective(objective).addScore(player, score)
   } catch (e) {
       player.runCommand(`scoreboard players add "${player.name}" ${objective} ${score}`)
   }}
   function setScore(player, objective, score) {
    try {
        world.scoreboard.getObjective(objective).setScore(player, score)
    } catch (e) {
        player.runCommand(`scoreboard players set "${player.name}" ${objective} ${score}`)
    }
}