/*
 * 荒穗计划 · 集中平衡参数
 * 这里只存放适合反复调试的数值。修改后刷新页面即可生效。
 * 倍率 1 表示标准强度；例如 enemy.density = 1.2 会让场上敌人上限提高约 20%。
 */
window.WILDROOT_CONFIG = {
  seeds: {
    startingIds: [0, 1, 2],
    startingCount: 3,
    unlockCost: 5,
    unlockBonusSeeds: 2
  },
  progression: {
    statNodeEvery: 3,
    statMaxLevel: 4,
    stats: {
      power: { multiplier: 1.07, weight: 1 },
      plating: { multiplier: 0.95, weight: 1 },
      stride: { multiplier: 1.05, weight: 1 },
      evasion: { amount: 0.035, cap: 0.24, weight: 1 }
    },
    choiceWeights: {
      character: 1.1,
      weapon: 1.15,
      crop: 1.15,
      farming: 1,
      general: 1
    }
  },
  enemy: {
    density: 1,
    spawnRate: 1,
    eliteBaseChance: 0.045,
    eliteChancePerDay: 0.02,
    eliteChanceCap: 0.15
  },
  events: {
    initialDelay: 44,
    intervalMin: 72,
    intervalMax: 100
  },
  breeding: {
    mutationBaseChance: 0.04,
    mutationPerDiversity: 0.045,
    ruinMutationBonus: 0.11,
    hybridBaseChance: 0.30,
    hybridMutationBonus: 0.10,
    hybridChanceCap: 0.88,
    hybridPityStep: 0.10,
    hybridPityCap: 0.40
  },
  interface: {
    pluginPageSize: 8
  }
};
