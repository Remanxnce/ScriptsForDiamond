import { world, system } from "@minecraft/server";

const CombatDatabase = {};//list used to hold player names that are in combat

world.afterEvents.entityHurt.subscribe((event) => {
    console.warn(`${event.hurtEntity.name} was hit`);
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
    event.hurtEntity.runCommandAsync(`scoreboard players operation "bounty of ${event.hurtEntity.name}" bounty = @s bounty`)
    if (getScore('inpvp', event.hurtEntity.name)==1){
        if (getScore(`inkos`,event.hurtEntity.name)==0){
            if (event.damageSource.cause !== "entityAttack") return;
                if (getScore(`geartier`,event.hurtEntity.name) > getScore(`geartier`,event.damageSource.damagingEntity.name)){
                    //fair right, undergeared vs overgeared
                    if (event.hurtEntity.hasTag(`undering` || event.damageSource.damagingEntity.hasTag(`undering`))) return
                    CombatDatabase[event.hurtEntity.id] = { timer: setTimer(20, 'seconds') };
                    CombatDatabase[event.damageSource.damagingEntity.id] = { timer: setTimer(20, 'seconds') };
                    event.hurtEntity.runCommandAsync(`execute if entity @s [scores={incombat=0}] run tellraw @s {"rawtext":[{"text":"§cYou are now in combat!"}]}`);
                    event.hurtEntity.addTag('incombat');
                    event.hurtEntity.addTag(`fairfight`);
                    event.damageSource.damagingEntity.runCommandAsync(`execute if entity @s [scores={incombat=0}] run tellraw @s {"rawtext":[{"text":"§cYou have initiated combat fairly!"}]}`);
                    event.damageSource.damagingEntity.addTag('incombat');
                    event.damageSource.damagingEntity.addTag(`fairfight`)
                    event.hurtEntity.runCommandAsync(`scoreboard players set @a [tag=incombat] incombat 1`)
                }else if (getScore(`geartier`,event.hurtEntity.name) < getScore(`geartier`,event.damageSource.damagingEntity.name)){
                        if (getScore(`geartier`,event.damageSource.damagingEntity.name)==6)return;
                    //unfair right, out of kos and overgeared vs undergeared
                        if (event.hurtEntity.hasTag(`fairfight` || event.damageSource.damagingEntity.hasTag(`fairfight`))) return
                    CombatDatabase[event.damageSource.damagingEntity.id] = { timer: setTimer(20, 'seconds') };
                    event.damageSource.damagingEntity.runCommandAsync(`execute if entity @s [scores={incombat=0}] run tellraw @s {"rawtext":[{"text":"§cYou have initiated combat unfairly!§l Killing this player will result in a warn!"}]}`);
                    event.hurtEntity.runCommandAsync(`execute if entity @s [scores={incombat=0}] run tellraw @s [scores={incombat=0}] {"rawtext":[{"text":"§eA player has initiated combat against you unfairly!§l You may combat log."}]}`);
                    event.damageSource.damagingEntity.addTag('incombat');
                    event.damageSource.damagingEntity.addTag(`undering`);
                    event.hurtEntity.addTag(`being undered`);
                    event.hurtEntity.runCommandAsync(`scoreboard players set @a [tag=incombat] incombat 1`);
                }else if (getScore('geartier',event.hurtEntity.name) == getScore(`geartier`,event.damageSource.damagingEntity.name)){
                    //fair fight, both players are equal
                    CombatDatabase[event.hurtEntity.id] = { timer: setTimer(20, 'seconds') };
                    CombatDatabase[event.damageSource.damagingEntity.id] = { timer: setTimer(20, 'seconds') };
                    event.hurtEntity.runCommandAsync(`execute if entity @s [scores={incombat=0}] run tellraw @s {"rawtext":[{"text":"§cYou are now in combat!"}]}`);
                    event.damageSource.damagingEntity.runCommandAsync(`execute if entity @s [scores={incombat=0}] run tellraw @s {"rawtext":[{"text":"§cYou have initiated combat fairly!"}]}`);
                    event.damageSource.damagingEntity.addTag('incombat');
                    event.hurtEntity.addTag('incombat');
                    event.hurtEntity.runCommandAsync(`scoreboard players set @a [tag=incombat] incombat 1`)
                }
    }}})

system.runInterval(() => {
    world.getPlayers().forEach((player) => {
        const playerequippable = player.getComponent('equippable');
        const items = ['Chest', 'Feet', 'Head', 'Legs', 'Mainhand'].map((slot) => playerequippable.getEquipment(slot)).filter(Boolean);
        //console.warn(items.map((item) => item.typeId).join(', '))
        if (items.map((item) => item.typeId).join(', ').includes("netherite")){
            player.runCommandAsync(`scoreboard players set @s geartier 5`);
        }else if (items.map((item) => item.typeId).join(', ').includes("diamond")){
            player.runCommandAsync(`scoreboard players set @s geartier 4`);
        }else if (items.map((item) => item.typeId).join(', ').includes("iron")){
            player.runCommandAsync(`scoreboard players set @s geartier 3`);
        }else if (items.map((item) => item.typeId).join(', ').includes("chainmail")|| (items.map((item) => item.typeId).join(', ').includes("stone"))){
            player.runCommandAsync(`scoreboard players set @s geartier 2`);
        }else if (items.map((item) => item.typeId).join(', ').includes("leather")|| (items.map((item) => item.typeId).join(', ').includes("wooden_sword"))){
            player.runCommandAsync(`scoreboard players set @s geartier 1`);
        }else{
            player.runCommandAsync(`scoreboard players set @s geartier 6`);
        }
    })
    //I'm assuming runs when a player is hit?
    world.getPlayers({ tag: 'incombat' }).map((player) => {//creates list of players who are in combat
        if (!CombatDatabase[player.id]) return delete CombatDatabase[player.id], player.removeTag('incombat')//removes the tag from the player if they're not on the list. used to find C-logging
        if (!CombatDatabase[player.id] || CombatDatabase[player.id].hasOwnProperty('clear')) return;//checks if the player has already been cleared
        if (hasTimerReachedEnd(CombatDatabase[player.id].timer.targetDate)) {
            //happens when the player has outlasted the combat log time
            delete CombatDatabase[player.id]//removes fair players from the list
            player.runCommandAsync('execute if entity @s [scores={inpvp=1}] run tellraw @s {"rawtext":[{"text":"§aYou Are Now Out Of Combat"}]}')//notifies the player they're no longer in combat
            player.removeTag('incombat')//removes the tag from the player
            player.runCommandAsync(`scoreboard players set @s incombat 0`)
            player.removeTag('undering');
            player.removeTag(`being undered`);
            return
        }
        //happens if the player leaves before the combat logout time
        const playerinv = player.getComponent('inventory').container//gets the player's inventory
        CombatDatabase[player.id] = { timer: CombatDatabase[player.id].timer, location: player.location, dimension: player.dimension.id, items: [...Array.from({ length: playerinv.size }).map((_, i) => playerinv.getItem(i)).filter(v => v !== undefined), ...["Head", "Chest", "Legs", "Feet"].map(v => player.getComponent("minecraft:equippable").getEquipment(v)).filter(v => v !== undefined)] }
        //^I'm assuming has to do with throwing the player's gear all over when they die
    })
})

world.afterEvents.playerLeave.subscribe(({ playerId, playerName }) => {
    //happens after the player leaves the game
    if (!CombatDatabase[playerId] || CombatDatabase[playerId]?.clear) return;//ignores if the player is logging out in a fair time
    CombatDatabase[playerId]?.items.map((value) => world.getDimension(CombatDatabase[playerId].dimension).spawnItem(value, CombatDatabase[playerId].location))//throws player items on the ground
    CombatDatabase[playerId] = { clear: true }//marks them to be cleared
    world.sendMessage(`§l§7${playerName}§f Combat Logged! Make sure to make fun of them!`)//tells the server when a player combat logs
})

world.afterEvents.playerSpawn.subscribe((event) => {
    console.warn("player has respawned");
    event.player.removeTag('undering');
    event.player.removeTag('being undered');
    event.player.removeTag('incombat');
    event.player.runCommandAsync(`scoreboard players set @s incombat 0`);
    event.player.removeTag('fairfight');
    //happens when a player loads into the game
    if (!event.initialSpawn) return//ignores if it's the players first time logging in? not sure
    if (!CombatDatabase[event.player.id]?.clear) return;//ignores if they're not marked to be cleared
    delete CombatDatabase[event.player.id]//removes player from the list
    event.player.runCommandAsync('clear @s')//clears the player who combat logged
    event.player.runCommandAsync(`scoreboard players set @s incombat 0`)
    event.player.runCommandAsync(`scoreboard players add @s warns 1`)
    event.player.sendMessage('§cYour inventory Was Cleared For Combat logging! In addition, you were also warned!');//notifies the player they combat logged
})

world.afterEvents.entityDie.subscribe(({ damageSource, deadEntity }) => {
    if (damageSource.damagingEntity.hasTag('undering') && deadEntity.hasTag('being undered')){
        damageSource.damagingEntity.sendMessage("§l§cYou have been warned for underarmor killing!");
        damageSource.damagingEntity.runCommandAsync(`scoreboard players add @s warns 1`);
        damageSource.damagingEntity.removeTag(`incombat`);
        damageSource.damagingEntity.removeTag('undering');
        damageSource.damagingEntity.removeTag('fairfight');
        deadEntity.removeTag(`being undered`);
        deadEntity.removeTag(`incombat`)
    }
    CombatDatabase[damageSource.damagingEntity.id] = { timer: setTimer(0, 'seconds') };
    if (!CombatDatabase[deadEntity.id]) return;//ignores if they're already not in the database
    CombatDatabase[deadEntity.id] = { timer: setTimer(0, 'seconds') };
    
    
    
        
    console.warn("player has died");
}, { entityTypes: ["minecraft:player"] })//checks for just players

export const setTimer = (value, unit) => {
    //I'm assuming all of the below has to do with the timer for combat logging. Holds no relevance to what needs to be changed for NEO
    const targetDate = new Date();
    switch (unit) {
        case 'hours':
            targetDate.setHours(targetDate.getHours() + value);
            break;
        case 'days':
            targetDate.setDate(targetDate.getDate() + value);
            break;
        case 'minutes':
            targetDate.setMinutes(targetDate.getMinutes() + value);
            break;
        case 'seconds':
            targetDate.setSeconds(targetDate.getSeconds() + value);
            break;
    }
    return { value, unit, targetDate };
};

export function hasTimerReachedEnd(targetDate) {
    if (!(targetDate instanceof Date)) targetDate = new Date(targetDate);
    return Date.now() >= targetDate;
}

export const formatTime = (milliseconds) => ({
    days: Math.floor(milliseconds / (1000 * 60 * 60 * 24)),
    hours: Math.floor((milliseconds / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((milliseconds / (1000 * 60)) % 60),
    seconds: Math.floor((milliseconds / 1000) % 60),
});

export const getTime = (timerInfo) => {
    const timeRemaining = new Date(timerInfo.targetDate).getTime() - Date.now();
    return formatTime(timeRemaining);
};