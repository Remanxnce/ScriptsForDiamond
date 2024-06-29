import { world, system } from "@minecraft/server";

const CombatDatabase = {};//list used to hold player names that are in combat

world.afterEvents.entityHurt.subscribe((event) => {
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
    if (event.damageSource.cause !== "entityAttack") return;//ignores any non-player damage
    CombatDatabase[event.hurtEntity.id] = { timer: setTimer(10, 'seconds') };//assigns the timer for 10 seconds
    event.hurtEntity.runCommandAsync(`execute if entity @s [scores={incombat=0}] run tellraw @s {"rawtext":[{"text":"§cYou are now in combat"}]}`)
    event.hurtEntity.addTag('incombat');//marks the player who's been hit
    event.hurtEntity.runCommandAsync(`scoreboard players set @a [tag=incombat] incombat 1`)
}})//specifies that it's only tagging players

system.runInterval(() => {
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
    //happens when a player loads into the game
    if (!event.initialSpawn) return//ignores if it's the players first time logging in? not sure
    if (!CombatDatabase[event.player.id]?.clear) return;//ignores if they're not marked to be cleared
    delete CombatDatabase[event.player.id]//removes player from the list
    event.player.runCommandAsync('clear @s')//clears the player who combat logged
    event.player.runCommandAsync(`scoreboard players set @s incombat 0`)
    event.player.runCommandAsync(`scoreboard players add @s warns 1`)
    event.player.sendMessage('§cYour inventory Was Cleared For Combat logging!');//notifies the player they combat logged
})

world.afterEvents.entityDie.subscribe(({ damageSource, deadEntity }) => {
    //happens when a player has died
    if (!CombatDatabase[deadEntity.id]) return;//ignores if they're already not in the database
    delete CombatDatabase[deadEntity.id]//removes the player's name from the database
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