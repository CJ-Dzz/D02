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
    unlockBonusSeeds: 2,
    packSize: 2,
    prices: [3, 2, 3, 4, 4, 5, 3, 4]
  },
  waves: {
    baseDuration: 22,
    durationPerWave: 0.75,
    rewardBaseDuration: 17,
    rewardDurationPerWave: 0.45,
    eventFinishGrace: 1.5
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
  drops: {
    mergeRadius: 82,
    xpValueMultiplier: 1.18,
    waterChance: 0.12,
    biomassChance: 0.30,
    waterValue: 2,
    biomassValue: 2
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
  merchant: {
    stockSize: 4
  },
  exploration: {
    slotChance: 0.72,
    maxPerDay: 4,
    weights: { rain: 1.3, composter: 1.1, seedcache: 1, memory: 0.7, workbench: 0.95, pollen: 0.8 }
  },
  interface: {
    pluginPageSize: 8
  }
};
