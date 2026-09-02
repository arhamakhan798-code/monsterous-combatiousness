/**
 * leaderboard.js — Monsterous Combatness Leaderboard & Stats Tracking
 * 
 * Tracks:
 * - Wins/losses per fighter
 * - Highest combo streak
 * - Total damage dealt
 * - Favorite fighter
 * - Account statistics
 */

'use strict';

const LeaderboardSystem = {
  // Local storage key
  storageKey: 'mc_leaderboard',
  
  // In-memory leaderboard (seeded with example data)
  leaderboard: [
    { rank: 1, username: 'PHANTOM', fighter: 'WRAITH', wins: 47, losses: 8, winRate: 85 },
    { rank: 2, username: 'INFERNO', fighter: 'NOVA', wins: 42, losses: 12, winRate: 78 },
    { rank: 3, username: 'ABYSS', fighter: 'ABYSSAL', wins: 39, losses: 15, winRate: 72 },
    { rank: 4, username: 'SHADOW', fighter: 'WRAITH', wins: 35, losses: 18, winRate: 66 },
    { rank: 5, username: 'FLAME', fighter: 'NOVA', wins: 31, losses: 21, winRate: 60 },
    { rank: 6, username: 'VOID', fighter: 'ABYSSAL', wins: 28, losses: 24, winRate: 54 },
    { rank: 7, username: 'GHOST', fighter: 'WRAITH', wins: 25, losses: 27, winRate: 48 },
    { rank: 8, username: 'BLAZE', fighter: 'NOVA', wins: 22, losses: 30, winRate: 42 },
    { rank: 9, username: 'CRUSH', fighter: 'ABYSSAL', wins: 19, losses: 33, winRate: 36 },
    { rank: 10, username: 'NOVA_STRIKE', fighter: 'NOVA', wins: 16, losses: 36, winRate: 31 }
  ],
  
  init() {
    this.loadFromStorage();
    return this.leaderboard;
  },
  
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.leaderboard = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[Leaderboard] Could not load from storage');
    }
  },
  
  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.leaderboard));
    } catch (e) {
      console.warn('[Leaderboard] Could not save to storage');
    }
  },
  
  recordMatch(username, fighter, outcome) {
    // Find or create player entry
    let entry = this.leaderboard.find(e => e.username === username && e.fighter === fighter);
    
    if (!entry) {
      entry = {
        rank: this.leaderboard.length + 1,
        username: username,
        fighter: fighter,
        wins: 0,
        losses: 0,
        winRate: 0
      };
      this.leaderboard.push(entry);
    }
    
    // Update stats
    if (outcome === 'VICTORY') {
      entry.wins++;
    } else {
      entry.losses++;
    }
    
    // Calculate win rate
    const total = entry.wins + entry.losses;
    entry.winRate = Math.round((entry.wins / total) * 100);
    
    // Resort leaderboard by wins
    this.leaderboard.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.winRate - a.winRate;
    });
    
    // Update ranks
    this.leaderboard.forEach((entry, i) => {
      entry.rank = i + 1;
    });
    
    // Keep only top 100
    this.leaderboard = this.leaderboard.slice(0, 100);
    
    this.saveToStorage();
    return entry;
  },
  
  getTopPlayers(limit = 10) {
    return this.leaderboard.slice(0, limit);
  },
  
  getPlayerStats(username) {
    const entries = this.leaderboard.filter(e => e.username === username);
    if (entries.length === 0) return null;
    
    // Aggregate stats
    return {
      username: username,
      totalWins: entries.reduce((sum, e) => sum + e.wins, 0),
      totalLosses: entries.reduce((sum, e) => sum + e.losses, 0),
      fighters: entries,
      overallWinRate: Math.round(
        entries.reduce((sum, e) => sum + e.wins, 0) / 
        (entries.reduce((sum, e) => sum + e.wins, 0) + entries.reduce((sum, e) => sum + e.losses, 0)) * 100
      )
    };
  },
  
  getFighterStats(fighter) {
    const entries = this.leaderboard.filter(e => e.fighter === fighter);
    const totalWins = entries.reduce((sum, e) => sum + e.wins, 0);
    const totalLosses = entries.reduce((sum, e) => sum + e.losses, 0);
    
    return {
      fighter: fighter,
      topPlayers: entries.slice(0, 5),
      totalMatches: totalWins + totalLosses,
      totalWins: totalWins,
      totalLosses: totalLosses,
      overallWinRate: Math.round((totalWins / (totalWins + totalLosses)) * 100)
    };
  }
};

window.LeaderboardSystem = LeaderboardSystem;
