/**
 * characters.js — Monsterous Combatness Character Database
 * 
 * Each fighter has:
 * - Name and title
 * - Stats (Power, Speed, Defense, Special)
 * - Lore/backstory
 * - Combat style
 */

'use strict';

const CharacterDatabase = {
  fighters: {
    male: {
      id: 'male',
      name: 'WRAITH',
      title: 'The Forgotten Champion',
      image: 'assets/male-char.png',
      power: 87,
      speed: 72,
      defense: 81,
      special: 'Phantom Strike',
      lore: `Born from the ruins of a forgotten kingdom, Wraith fights not for victory—but to discover who created him. His ethereal form phases between worlds, striking with otherworldly precision. Some say he's the echo of an ancient warrior. Others claim he's something far darker.`,
      description: 'Balanced attacker with strong defense. Masters both speed and power.',
      combatStyle: 'Aggressive counter-fighter',
      specialAbility: 'Dodge incoming attacks with increased speed'
    },
    
    female: {
      id: 'female',
      name: 'NOVA',
      title: 'Wildfire Warrior',
      image: 'assets/female-char.png',
      power: 92,
      speed: 85,
      defense: 78,
      special: 'Inferno Combo',
      lore: `Nova blazes through the arena with relentless fury. Once a fire keeper for a dying civilization, she now channels her inner flames into devastating attacks. Each strike leaves scorched earth in its wake. She fights to prove that from ashes, rebirth is possible.`,
      description: 'Speed-focused fighter with explosive power. Chains combos effortlessly.',
      combatStyle: 'Relentless offensive pressure',
      specialAbility: 'Chain multiple attacks for bonus damage'
    },
    
    monster: {
      id: 'monster',
      name: 'ABYSSAL',
      title: 'Lord of the Deep',
      image: 'assets/monsters/monster.png',
      power: 95,
      speed: 60,
      defense: 92,
      special: 'Void Crush',
      lore: `Abyssal emerged from the depths of forgotten caverns, a creature of immense size and strength. Its very presence warps reality around it. Champions have risen to face it, but only legends speak of their fates. It is hunger incarnate, and it hungers still.`,
      description: 'Tank with devastating power. Slow but unstoppable.',
      combatStyle: 'Heavy-hitting defensive wall',
      specialAbility: 'Reduce damage taken, increase outgoing damage'
    }
  },
  
  getCharacter(id) {
    return this.fighters[id] || this.fighters.male;
  },
  
  getAllFighters() {
    return Object.values(this.fighters);
  },
  
  getUserFighter(charId) {
    return this.fighters[charId];
  }
};

window.CharacterDatabase = CharacterDatabase;
