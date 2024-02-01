import { 
  copyProperties, 
  getValue, 
  setProperty, 
  setValue,
} from "../common";
import { hpIv } from "../common/pokemon";

const PARTY_SIZE = 6;

function getGamestate(): string {
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

function getBattleOutcome(): string | null {
  const outcome_flags: number = getValue('battle.other.outcome_flags')
  const state: string = getGamestate()
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

function getPlayerPartyPosition(): number {
  const state: string = getGamestate()
  switch (state) {
    case 'Battle':
      return getValue('battle.player.party_position')
    case 'From Battle':
      return getValue('battle.player.party_position')
    default: {
      const team: number[] = [0, 1, 2, 3, 4, 5]
      for (let i = 0; i < team.length; i++) {
        if (getValue<number>(`player.team.${i}.stats.hp`) > 0) {
          return i
        }
      }
      return 0
    }
  }
}

export function postprocessor() {
  const gamestate = getGamestate()
  setValue('meta.state', gamestate)
  setValue('battle.outcome', getBattleOutcome())
  setValue('player.party_position', getPlayerPartyPosition())
  
  //Set player.active_pokemon properties
  const party_position_overworld = getPlayerPartyPosition()
  const party_position_battle = getValue('battle.player.party_position')
  if (gamestate === 'Battle') {
    copyProperties(`player.team.${party_position_battle}`, 'player.active_pokemon')
    copyProperties('battle.player.active_pokemon', 'player.active_pokemon')
  } else {
    setProperty('player.active_pokemon.modifiers.attack', { address: null, value: 0 })
    setProperty('player.active_pokemon.modifiers.defense', { address: null, value: 0 })
    setProperty('player.active_pokemon.modifiers.speed', { address: null, value: 0 })
    setProperty('player.active_pokemon.modifiers.special', { address: null, value: 0 })
    setProperty('player.active_pokemon.modifiers.accuracy', { address: null, value: 0 })
    setProperty('player.active_pokemon.modifiers.evasion', { address: null, value: 0 })

    setProperty('player.active_pokemon.volatile_status_conditions.confusion', { address: null, value: false })
    setProperty('player.active_pokemon.volatile_status_conditions.toxic', { address: null, value: false })
    setProperty('player.active_pokemon.volatile_status_conditions.leech_seed', { address: null, value: false })

    setProperty('player.active_pokemon.effects.bide', { address: null, value: false })
    setProperty('player.active_pokemon.effects.thrash', { address: null, value: false })
    setProperty('player.active_pokemon.effects.multi_hit', { address: null, value: false })
    setProperty('player.active_pokemon.effects.flinch', { address: null, value: false })
    setProperty('player.active_pokemon.effects.charging', { address: null, value: false })
    setProperty('player.active_pokemon.effects.multi_turn', { address: null, value: false })
    setProperty('player.active_pokemon.effects.invulnerable', { address: null, value: false })
    setProperty('player.active_pokemon.effects.bypass_accuracy', { address: null, value: false })
    setProperty('player.active_pokemon.effects.mist', { address: null, value: false })
    setProperty('player.active_pokemon.effects.focus_energy', { address: null, value: false })
    setProperty('player.active_pokemon.effects.substitute', { address: null, value: false })
    setProperty('player.active_pokemon.effects.recharge', { address: null, value: false })
    setProperty('player.active_pokemon.effects.rage', { address: null, value: false })
    setProperty('player.active_pokemon.effects.lightscreen', { address: null, value: false })
    setProperty('player.active_pokemon.effects.reflect', { address: null, value: false })
    setProperty('player.active_pokemon.effects.transformed', { address: null, value: false })

    setProperty('player.active_pokemon.counters.multi_hit', { address: null, value: 0 })
    setProperty('player.active_pokemon.counters.confusion', { address: null, value: 0 })
    setProperty('player.active_pokemon.counters.toxic', { address: null, value: 0 })
    setProperty('player.active_pokemon.counters.disable', { address: null, value: 0 })

    setProperty('player.active_pokemon.last_move.move', { address: null, value: null })
    setProperty('player.active_pokemon.last_move.effect', { address: null, value: 0 })
    setProperty('player.active_pokemon.last_move.power', { address: null, value: 0 })
    setProperty('player.active_pokemon.last_move.type', { address: null, value: null })
    setProperty('player.active_pokemon.last_move.accuracy', { address: null, value: 0 })
    setProperty('player.active_pokemon.last_move.pp_max', { address: null, value: 0 })

    copyProperties(`player.team.${party_position_overworld}`, 'player.active_pokemon')
  }

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
