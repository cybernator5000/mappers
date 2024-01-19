//notable addresses:

import { 
    // variables, 
    memory, 
    // console,
    // setValue, 
    getValue 
} from "../common";

export function getBits(a: number, b: number, d: number): number {
    return (a >> b) & ((1 << d) - 1);
}

// prng function; used for decryption.
function prngNext(prngSeed: number) {
    // Ensure 32-bit unsigned result
    const newSeed = (0x41C64E6D * prngSeed + 0x6073) >>> 0;
    const value = (newSeed >>> 16) & 0xFFFF;

    return { newSeed, value }
}

// Block shuffling orders - used for Party structure encryption and decryption
// Once a Pokemon's data has been generated it is assigned a PID which determines the order of the blocks
// The Pokemon's PID never changes, therefore the order of the blocks remains fixed for that Pokemon
const shuffleOrders = {
    0:  [0, 1, 2, 3],
    1:  [0, 1, 3, 2],
    2:  [0, 2, 1, 3],
    3:  [0, 3, 1, 2],
    4:  [0, 2, 3, 1],
    5:  [0, 3, 2, 1],
    6:  [1, 0, 2, 3],
    7:  [1, 0, 3, 2],
    8:  [2, 0, 1, 3],
    9:  [3, 0, 1, 2],
    10: [2, 0, 3, 1],
    11: [3, 0, 2, 1],
    12: [1, 2, 0, 3],
    13: [1, 3, 0, 2],
    14: [2, 1, 0, 3],
    15: [3, 1, 0, 2],
    16: [2, 3, 0, 1],
    17: [3, 2, 0, 1],
    18: [1, 2, 3, 0],
    19: [1, 3, 2, 0],
    20: [2, 1, 3, 0],
    21: [3, 1, 2, 0],
    22: [2, 3, 1, 0],
    23: [3, 2, 1, 0]
};

export function getMetaState(): string {
    // FSM FOR GAMESTATE TRACKING
    // MAIN GAMESTATE: This tracks the three basic states the game can be in.
    // 1. "No Pokemon": cartridge reset; player has not received a Pokemon
    // 2. "Overworld": Pokemon in party, but not in battle
    // 3. "Battle": In battle
    // 4. "To Battle": not yet implemented //TODO: Implement the To Battle state, this requires a new property to accurately track it
    // 5. "From Battle": not yet implemented
    const team_count: number = getValue<number>('player.team_count')
    const active_pokemonPv: number = getValue<number>('battle.player.active_pokemon.internals.personality_value')
    const teamPokemonPv: number = getValue<number>('player.team.0.internals.personality_value')
    const outcome_flags: number = getValue<number>('battle.other.outcome_flags')
    if (team_count === 0) {
        return 'No Pokemon'
    }
    else if (active_pokemonPv === teamPokemonPv && outcome_flags == 1) {
        return 'From Battle'
    }
    else if (active_pokemonPv === teamPokemonPv) {
        return 'Battle'
    }
    else if (active_pokemonPv !== teamPokemonPv) {
        return 'Overworld'
    }
    return 'No Pokemon'
}

export function getMetaEnemyState(state: string, battle_outcomes: number, enemyBarSyncedHp: number): string | null {
    // ENEMY POKEMON MID-BATTLE STATE: Allows for precise timing during battles
    if (state === "No Pokemon" || state === "Overworld") return 'N/A'
    else if (state === "Battle" && battle_outcomes === 1) return 'Battle Finished'
    else if (state === "Battle" && enemyBarSyncedHp > 0) return 'Pokemon In Battle'
    else if (state === "Battle" && enemyBarSyncedHp === 0) return 'Pokemon Fainted'
    return null
}

export function getBattleMode(state: string, opponentTrainer: string | null): string | null {
    if (state === 'Battle') {
        if (opponentTrainer === null) return 'Wild'
        else return 'Trainer'
    } else {
        return null
    }
}

export function getBattleOutcome(): string | null {
    const outcome_flags: number = getValue('battle.other.outcome_flags')
    const state: string = getMetaState()
    switch (state) {
        case 'From Battle':
            switch (outcome_flags) {
                case 1:
                    return 'Win'
                default:
                    return null
            }
    }
    return null
}

/** Calculate the encounter rate based on other variables */
export function getEncounterRate(): number {
    const walking: number = getValue("overworld.encounter_rates.walking");
    // Need properties to correctly determine which of these to return
    // const surfing = getValue("overworld.encounter_rates.surfing");
    // const old_rod = getValue("overworld.encounter_rates.old_rod");
    // const good_rod = getValue("overworld.encounter_rates.good_rod");
    // const super_rod = getValue("overworld.encounter_rates.super_rod");
    return walking;
}

// Preprocessor runs every loop (everytime gamehook updates)
export function preprocessor() {
    // // Set property values
    // const metaState: string = getMetaState()
    // const battle_outcomes: number = getValue<number>('battle.outcome')
    // const enemyBarSyncedHp: number = getValue<number>('battle.opponent.enemy_bar_synced_hp')
    // const opponentTrainer: string | null = getValue<string | null>('battle.opponent.trainer')
    // setValue('meta.state', metaState)
    // setValue('battle.mode', getBattleMode(metaState, opponentTrainer))
    // setValue('meta.state_enemy', getMetaEnemyState(metaState, battle_outcomes, enemyBarSyncedHp))
    // setValue('overworld.encounter_rate', getEncounterRate())

    // Loop through various party-structures to decrypt the Pokemon data
    const partyStructures = [
        "struct1", "struct2", "struct3", "struct4", "struct5",
        // "static_player", "static_opponent",
        // "player", "static_wild",
        // "static_player", "static_opponent", "static_ally", "static_opponent_2",
        // "dynamic_player", "dynamic_opponent", "dynamic_ally", "dynamic_opponent_2",
    ];
    for (let i = 0; i < partyStructures.length; i++) {
        let user = partyStructures[i];

        // Determine the offset from the base_ptr (global_pointer) - only run once per party-structure loop
        // Updating structures start offset from the global_pointer by 0x5888C; they are 0x5B0 bytes long
        // team_count is always offset from the start of the team structure by -0x04 and it's a 1-byte value
        const offsets = { //!All addresses that are commented out are for White2
            // An extremely long block of party structures starts at address 0x221BFB0
            // player: 0x221E42C,
            // static_player: 0x22349B4,
            // static_opponent: 0x226ACF4,
            struct1: 0x221E3EC,
            struct2: 0x2258834, 
            struct3: 0x2259DB4, // TODO: what does this party structure correspond to?
            struct4: 0x22592F4, // TODO: what does this party structure correspond to?
            struct5: 0x224795C, // TODO: what does this party structure correspond to?
            // player: 0xD094,
            // static team structures
            // static_player: 0x35514,
            // static_wild: 0x35AC4,
            // static_opponent: 0x7A0,
            // static_ally: 0x7A0 + 0x5B0,
            // static_opponent_2: 0x7A0 + 0xB60,
            //dynamic team structures
            // dynamic_player: 0x2258314, // Confirmed as White2 address (party structure length is 0x560)
            // dynamic_opponent: 0x2258874, // Confirmed as White2 address
            // dynamic_unknown_1: 0x2258DD4, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            // dynamic_unknown_2: 0x2259334, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            // dynamic_unknown_3: 0x2259894, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            // dynamic_unknown_4: 0x2259DF4, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            // dynamic_unknown_5: 0x225A354, // Confirmed as White2 address // TODO: what does this party structure correspond to?
            // dynamic_unknown_6: 0x225A8B4, // Confirmed as White2 address // TODO: what does this party structure correspond to?
        };

        // Loop through each party-slot within the given party-structure
        for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
            // Initialize an empty array to store the decrypted data
            let decryptedData = new Array(220).fill(0x00);

                let startingAddress = offsets[user] + (220 * slotIndex);

                let encryptedData = memory.defaultNamespace.get_bytes(startingAddress, 220); // Read the Pokemon's data (220-bytes)
                let pid = encryptedData.get_uint32_le(); // PID = Personality Value
                let checksum = encryptedData.get_uint16_le(6); // Used to initialize the prngSeed

                // Transfer the unencrypted data to the decrypted data array
                for (let i = 0; i < 8; i++) {
                    decryptedData[i] = encryptedData.get_byte(i);
                }

                // Begin the decryption process for the block data
                // Initialized the prngSeed as the checksum
                let prngSeed = checksum;
                for (let i = 0x08; i < 0x88; i += 2) {
                    let prngFunction = prngNext(prngSeed); // Seed prng calculation
                    let key = prngFunction.value; // retrieve the upper 16-bits as the key for decryption
                    prngSeed = Number((0x41C64E6Dn * BigInt(prngSeed) + 0x6073n) & 0xFFFFFFFFn); // retrieve the next seed value and write it back to the prngSeed
                    let data = encryptedData.get_uint16_le(i) ^ key; // XOR the data with the key to decrypt it
                    decryptedData[i + 0] = data & 0xFF; // isolate the lower 8-bits of the decrypted data and write it to the decryptedData array (1 byte)
                    decryptedData[i + 1] = data >> 8; // isolate the upper 8-bits of the decrypted data and write it to the decryptedData array (1 byte)
                }

                // Determine how the block data is shuffled   
                const shuffleId = ((pid & 0x3E000) >> 0xD) % 24; // Determine the shuffle order index
                let shuffleOrder = shuffleOrders[shuffleId]; // Recall the shuffle order
                if (!shuffleOrder) {
                    throw new Error("The PID returned an unknown substructure order.");
                }
                let dataCopy = decryptedData.slice(0x08, 0x88); // Initialize a copy of the decrypted data

                // Unshuffle the block data
                for (let i = 0; i < 4; i++) {
                    // Copy the shuffled blocks into the decryptedData
                    decryptedData.splice(0x08 + i * 0x20, 0x20, ...dataCopy.slice(shuffleOrder[i] * 0x20, shuffleOrder[i] * 0x20 + 0x20));
                }

                // Decrypting the battle stats
                prngSeed = pid; // The seed is the pid this time
                for (let i = 0x88; i < 0xDB; i += 2) {
                    // this covers the remainder of the 236 byte structure
                    let prngFunction = prngNext(prngSeed); // as before
                    let key = prngFunction.value;

                    // Number and BigInt are required so Javascript stores the prngSeed as an accurate value (it is very large)
                    prngSeed = Number((0x41C64E6Dn * BigInt(prngSeed) + 0x6073n) & 0xFFFFFFFFn);

                    let data = encryptedData.get_uint16_le(i) ^ key;
                    decryptedData[i + 0] = data & 0xFF;
                    decryptedData[i + 1] = (data >> 8) & 0xFF;
                }

            // Fills the memory contains for the mapper's class to interpret
            // console.info(`Filling memory for ${user} / slot ${slotIndex}`)
            // console.info(`${decryptedData.length}`)
            memory.fill(`${user}_party_structure_${slotIndex}`, 0x00, decryptedData)
            // console.info("Done filling memory")
        }
    }
}