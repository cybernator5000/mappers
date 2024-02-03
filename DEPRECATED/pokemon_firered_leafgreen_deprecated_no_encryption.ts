import { 
    variables, 
    memory,
    setValue,
    getValue,
} from "../common";

function getGamestate(): string {
    // FSM FOR GAMESTATE TRACKING
    // MAIN GAMESTATE: This tracks the three basic states the game can be in.
    // 1. "No Pokemon": cartridge reset; player has not received a Pokemon
    // 2. "Overworld": Pokemon in party, but not in battle
    // 3. "To Battle": Battle has started but player hasn't sent their Pokemon in yet
    // 4. "From Battle": Battle result has been decided but the battle has not transition to the overworld yet
    // 5. "Battle": In battle
    const team_0_level: number = getValue('player.team.0.level')
    const callback_1: string = getValue('pointers.callback1')
    const callback_2: string = getValue('pointers.callback2')
    const battle_outcomes: string | null = getValue('battle.outcome')
    if (team_0_level == 0) 
        return "No Pokemon"
    else if (callback_1 == null)
        return "No Pokemon"
    else if (callback_2 == "Battle Animation") //! CURRENTLY NOT WORKING, Need a better property to track
        return "To Battle"
    else if (callback_1 == "Overworld")
        return "Overworld"
    else if (callback_1 == "Battle") {
        if (battle_outcomes != null) {
            return "From Battle"
        }
        return "Battle"
    }
    return "Error"
}

export function preprocessor() {
    const gamestate = getGamestate();
    variables.dma_a = memory.defaultNamespace.get_uint32_le(0x3005008)
    variables.dma_b = memory.defaultNamespace.get_uint32_le(0x300500C)
    variables.dma_c = memory.defaultNamespace.get_uint32_le(0x3005010)
    variables.callback1 = memory.defaultNamespace.get_uint32_le(0x30030F0)
    variables.callback2 = memory.defaultNamespace.get_uint32_le(0x30030F4)
    setValue('meta.state', gamestate)
}