import { getValue, setValue } from "../common";
import { hpIv } from "../common/pokemon";

const PARTY_SIZE = 6;

export function getBits(a: number, b: number, d: number): number {
  return (a >> b) & ((1 << d) - 1);
}

export function getMetaState(): string {
  // FSM FOR GAMESTATE TRACKING
  // MAIN GAMESTATE: This tracks the three basic states the game can be in.
  // 1. "No Pokemon": cartridge reset; player has not received a Pokemon
  // 2. "Overworld": Pokemon in party, but not in battle
  // 3. "To Battle": Battle has started but player hasn't sent their Pokemon in yet
  // 4. "From Battle": Battle result has been decided but the battle has not transition to the overworld yet
  // 5. "Battle": In battle
  const team_0_level: number = getValue('player.team.0.level')
  const outcome_flags: number = getValue('battle.other.outcome_flags')
  const battle_start: number = getValue('battle.other.battle_start')
  const battle_mode: string = getValue('battle.mode')
  const low_health_alarm: string = getValue('battle.other.low_health_alarm')
  if (team_0_level == 0) {
    return 'No Pokemon'
  }
  else if (battle_mode == null) {
    return 'Overworld'
  }	
  else if (battle_start == 0) {
    return 'To Battle'
  }	
  else if (low_health_alarm == "Disabled" || outcome_flags > 0) {
    return 'From Battle'
  }
  else {
    return 'Battle'
  }
}

export function getBattleOutcome(): string | null {
  const outcome_flags: number = getValue('battle.other.outcome_flags')
  const state: string = getMetaState()
  switch (state) {
    case 'From Battle':
      switch (outcome_flags) {
        case 0:
          return 'Win'
        case 1:
          return 'Lose'
        case 2:
          return 'Flee'
        default:
          return null
      }
  }
  return null
}

export function set_active_pokemon() {
  const state = getMetaState()
  const properties_string: string[] = [
    'species', 'nickname', 'type_1', 'type_2', 'status_condition',
    'moves.0.move', 'moves.1.move', 'moves.2.move', 'moves.3.move',
    'last_move.move', 'last_move.type', 
  ]
  const properties_number: string[] = [
    'dex_number', 'level', 'exp', 'ot_id', 'catch_rate', 
    'moves.0.pp', 'moves.0.pp_up', 'moves.1.pp', 'moves.1.pp_up', 'moves.2.pp', 'moves.2.pp_up', 'moves.3.pp', 'moves.3.pp_up',
    'stats.hp', 'stats.hp_max', 'stats.attack', 'stats.defense', 'stats.speed', 'stats.special',
    'ivs.hp', 'ivs.attack', 'ivs.defense', 'ivs.speed', 'ivs.special',
    'evs.hp', 'evs.attack', 'evs.defense', 'evs.speed', 'evs.special',
    'modifiers.attack', 'modifiers.defense', 'modifiers.speed', 'modifiers.special', 'modifiers.accuracy', 'modifiers.evasion',
    'counters.multi_hit', 'counters.confusion', 'counters.toxic', 'counters.disable',
  ]
  const properties_boolean: string[] = [
    'volatile_status_conditions.confusion', 'volatile_status_conditions.toxic', 'volatile_status_conditions.leech_seed',
    'effects.bide', 'effects.thrash', 'effects.multi_hit', 'effects.flinch', 'effects.charging', 'effects.multi_turn',
    'effects.invulnerable', 'effects.bypass_accuracy', 'effects.mist', 'effects.focus_energy', 'effects.substitute',
    'effects.recharge', 'effects.rage', 'effects.lightscreen', 'effects.reflect', 'effects.transformed',
    'last_move.effect', 'last_move.power', 'last_move.accuracy', 'last_move.pp_max'
  ]
  properties_string.forEach(property => {
    let value: any = null;
    if (state !== 'No Pokemon') {
      if (state === 'Battle') {
        value = getValue<typeof property>(`battle.player.active_pokemon.${property}`);
      } else {
        // Check if the property exists before trying to get its value
        try {
          value = getValue<typeof property>(`player.team.0.${property}`);
        } catch (error) {
          value = null;
        }
      }
    }
    setValue(`player.active_pokemon.${property}`, value);
  });
  properties_number.forEach(property => {
    let value: any = 0;
    if (state !== 'No Pokemon') {
      if (state === 'Battle') {
        try {
          value = getValue<typeof property>(`battle.player.active_pokemon.${property}`);
        } catch (error) { 
          try {
            value = getValue<typeof property>(`player.team.0.${property}`);
          } catch (error) {
          value = 0;
          }
        }
      } else {
        // Check if the property exists before trying to get its value
        try {
          value = getValue<typeof property>(`player.team.0.${property}`);
        } catch (error) {
          value = 0;
        }
      }
    }
    setValue(`player.active_pokemon.${property}`, value);
  });
  properties_boolean.forEach(property => {
    let value: any = false;
    if (state !== 'No Pokemon') {
      if (state === 'Battle') {
        value = getValue<typeof property>(`battle.player.active_pokemon.${property}`);
      } else {
        // Check if the property exists before trying to get its value
        try {
          value = getValue<typeof property>(`player.team.0.${property}`);
        } catch (error) {
          value = false;
        }
      }
    }
    setValue(`player.active_pokemon.${property}`, value);
  });
}

export function postprocessor() {
  setValue('meta.state', getMetaState())
  setValue('battle.outcome', getBattleOutcome())
  set_active_pokemon()

  for (let index = 0; index < PARTY_SIZE; index++) {
    const ivs = {
      attack: getValue<number>(`player.team.${index}.ivs.attack`),
      defense: getValue<number>(`player.team.${index}.ivs.defense`),
      special: getValue<number>(`player.team.${index}.ivs.special`),
      speed: getValue<number>(`player.team.${index}.ivs.speed`),
    };

    setValue(`player.team.${index}.ivs.hp`, hpIv(ivs));
  }
}
