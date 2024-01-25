import { 
    variables, 
    memory,
    setValue,
    getValue,
} from "../common";

export { BitRange } from '../common';

function getMetaState() {
    const team_0_level: number = getValue('player.team.0.level')
    const callback1: string | null = getValue('pointers.callback1')
    // const callback2: string | null = getValue('pointers.callback1')
    const battleOutcome: string | null = getValue('battle.turnInfo.battleOutcome')
    const battleDialogue: string | null = getValue('battle.turnInfo.battleDialogue')
    const state: string = getValue('meta.state') ?? "Base Stats"
    if (team_0_level == 0) 
        return "Base Stats";
    else if (callback1 == null)
        return "Base Stats";
    else if (callback1 == "Overworld")
        return "Overworld";
    // else if (callback2 == "Battle Animation") {
    //     return "To Battle"
    // }
    else if (battleDialogue == "Player Control" && state == "Overworld") {
        return "Battle"
    }
    else if (battleOutcome !=  null && callback1 == "Battle") {
        return "From Battle";
    }
    else
        return "Battle";
}

export function preprocessor() {
    variables.dma_a = memory.defaultNamespace.get_uint32_le(0x3005D8C)
    variables.dma_b = memory.defaultNamespace.get_uint32_le(0x3005D90)
    variables.dma_c = memory.defaultNamespace.get_uint32_le(0x3005D94)
    variables.callback1 = memory.defaultNamespace.get_uint32_le(0x30022C0)
    variables.callback2 = memory.defaultNamespace.get_uint32_le(0x30022C4)
    setValue('meta.state', getMetaState())
}