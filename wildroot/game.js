(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const TAU = Math.PI * 2;
  const WORLD_W = 2380;
  const WORLD_H = 1480;
  const VIEW = { x: 196, y: 72, w: W - 196, h: H - 72 };
  const FINAL_DAY = 5;

  const $ = (id) => document.getElementById(id);
  const ui = {
    hud: $("hud"), start: $("start-screen"), story: $("story-screen"), choice: $("choice-screen"), pause: $("pause-screen"), end: $("end-screen"), bossIntro: $("boss-intro"),
    phaseLabel: $("phase-label"), phaseIcon: $("phase-icon"), clockText: $("clock-text"), phaseFill: $("phase-fill"), threat: $("threat-label"),
    hpFill: $("hp-fill"), hpText: $("hp-text"), xpFill: $("xp-fill"), xpText: $("xp-text"),
    score: $("score-text"), water: $("water-text"), coins: $("coin-text"), dash: $("dash-fill"), dashLabel: $("dash-label"), dashState: $("dash-state"),
    context: $("context-hint"), sound: $("sound-btn"), choiceCards: $("choice-cards"), choiceEyebrow: $("choice-eyebrow"), choiceTitle: $("choice-title"), choiceSubtitle: $("choice-subtitle"),
    endBadge: $("end-badge"), endTitle: $("end-title"), endCopy: $("end-copy"), endScore: $("end-score"), endKills: $("end-kills"), endCrops: $("end-crops"), endCrystals: $("end-crystals"), buildSummary: $("build-summary"),
    best: $("best-score"), crystals: $("meta-crystals"), metaBonus: $("meta-bonus"),
    overclockFill: $("overclock-fill"), overclockText: $("overclock-text"), combo: $("combo-display"),
    buildItems: $("build-items"), aiSpeech: $("ai-speech"), event: $("random-event"), fusion: $("fusion-banner"), fusionTitle: $("fusion-title"), fusionCopy: $("fusion-copy"),
    skillName: $("skill-name"), skillIcon: $("skill-icon"), skillCopy: $("skill-copy"), skillFill: $("skill-fill"), skillReady: $("skill-ready"), mission: $("mission-card"),
    stance: $("stance-meter"), stanceFill: $("stance-fill"), stanceText: $("stance-text"),
    characterDetailIcon: $("character-detail-icon"), characterDetailSkill: $("character-detail-skill"), characterDetailCd: $("character-detail-cd"), characterDetailCopy: $("character-detail-copy"), characterDetailPassive: $("character-detail-passive"),
    storyChapter: $("story-chapter"), storyTitle: $("story-title"), storyText: $("story-text"), storySpeaker: $("story-speaker"), storyAvatar: $("story-avatar"),
    bossName: $("boss-name"), bossIcon: $("boss-icon"), bossWarning: $("boss-warning"),
    terrainCard: $("terrain-card"), terrainName: $("terrain-name"), terrainCopy: $("terrain-copy"), restShop: $("rest-shop"), restShopItems: $("rest-shop-items"), merchantItems: $("merchant-items"), merchantRefresh: $("merchant-refresh"), restContinue: $("rest-continue"), activeTool: $("active-tool"), activeToolName: $("active-tool-name"), activeToolCount: $("active-tool-count"),
    codex: $("codex-screen"), codexTabs: $("codex-tabs"), codexGrid: $("codex-grid"), codexProgress: $("codex-progress"), seedLoadoutCount: $("seed-loadout-count")
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const chance = (p) => Math.random() < p;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const norm = (x, y) => {
    const d = Math.hypot(x, y) || 1;
    return { x: x / d, y: y / d };
  };
  const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const formatTime = (seconds) => `00:${Math.max(0, Math.ceil(seconds)).toString().padStart(2, "0")}`;

  const storage = {
    load() {
      try {
        return JSON.parse(localStorage.getItem("wildroot-save")) || { best: 0, crystals: 0, runs: 0 };
      } catch (_) {
        return { best: 0, crystals: 0, runs: 0 };
      }
    },
    save(data) {
      try { localStorage.setItem("wildroot-save", JSON.stringify(data)); } catch (_) { /* localStorage may be blocked */ }
    }
  };
  let meta = storage.load();
  meta.modules = Object.assign({ compute: 0, soil: 0, backup: 0, radar: 0, memory: 0, bond: 0 }, meta.modules || {});
  meta.runs = meta.runs || 0;
  meta.discoveries = meta.discoveries || {};
  meta.achievements = meta.achievements || {};
  meta.harvestStats = Object.assign({ pepper: 0, sun: 0, thorn: 0, magnet: 0, mint: 0, clone: 0 }, meta.harvestStats || {});
  meta.hybridCrafts = meta.hybridCrafts || 0;

  class SoundEngine {
    constructor() { this.context = null; this.enabled = true; this.bgmClock = 0; this.bgmStep = 0; }
    init() {
      if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === "suspended") this.context.resume().catch(() => {});
    }
    tone(freq, length = 0.06, type = "square", volume = 0.035, slide = 0) {
      if (!this.enabled) return;
      this.init();
      const t = this.context.currentTime;
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + length);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
      osc.connect(gain).connect(this.context.destination);
      osc.start(t);
      osc.stop(t + length);
    }
    shoot() { this.tone(170, .045, "square", .025, 80); }
    hit() { this.tone(95, .035, "sawtooth", .02, -30); }
    pickup() { this.tone(530, .07, "sine", .035, 240); }
    plant() { this.tone(260, .08, "triangle", .04, 100); }
    water() { this.tone(420, .09, "sine", .03, -100); }
    harvest() { this.tone(440, .13, "triangle", .045, 300); setTimeout(() => this.tone(660, .12, "triangle", .035, 250), 60); }
    hurt() { this.tone(100, .16, "sawtooth", .07, -55); }
    level() { [420, 560, 720].forEach((f, i) => setTimeout(() => this.tone(f, .14, "triangle", .045, 80), i * 65)); }
    dash() { this.tone(190, .1, "sine", .035, 260); }
    boom() { this.tone(85, .22, "sawtooth", .065, -45); }
    updateMusic(dt) {
      if (!this.enabled || !this.context || state !== "playing" || !game) return;
      this.bgmClock -= dt;
      if (this.bgmClock > 0) return;
      const boss = Boolean(game.boss);
      const night = game.phase === "night";
      const melody = boss ? [110,165,147,196,110,220,165,147] : night ? [147,175,165,131,147,220,196,165] : [196,247,294,262,220,294,330,247];
      const bass = boss ? [55,55,73,65] : night ? [73,65,82,55] : [98,110,123,110];
      const step = this.bgmStep++;
      this.tone(melody[step % melody.length], boss ? .18 : .24, boss ? "sawtooth" : "triangle", boss ? .018 : .014, 0);
      if (step % 2 === 0) this.tone(bass[Math.floor(step / 2) % bass.length], .32, "sine", .016, 0);
      if (boss && step % 2 === 1) this.tone(65, .035, "square", .012, -8);
      this.bgmClock = boss ? .19 : night ? .3 : .36;
    }
  }
  const sound = new SoundEngine();

  const input = {
    keys: new Set(),
    mouse: { x: W / 2, y: H / 2, down: false },
    interact: false,
    dash: false,
    skill: false
  };

  const CHARACTERS = {
    sprout: { name: "小芽", code: "AI-07", color: "#9b84d4", body: "#ff87ad", damage: 1, fire: 1, growth: 1, shield: 0, aura: 1.18, skill: "丰收编译", skillIcon: "⌁", skillCopy: "催熟附近作物并发射种子齐射", skillDetail: "催熟 560 范围内作物 58%；每株成熟作物向目标发射 5 枚穿透种子。附近无作物时返还携带种子。", passive: "作物战斗光环范围 +18%", role: "射击与种田均衡联动", exclusive: "递归丰收指令", skillCd: 19, line: "均衡演算完成。让作物和枪一起上班！" },
    beat: { name: "霹雳", code: "BEAT-02", color: "#ef6e83", body: "#ffb24f", damage: 1.12, fire: .9, growth: .9, shield: 0, aura: 1, skill: "雷暴节拍", skillIcon: "⚡", skillCopy: "让成熟作物充当导电桩发动雷击", skillDetail: "成熟作物越多，500 范围雷击越强、超频越久；没有成熟作物时只能产生较弱脉冲。", passive: "基础伤害 +12%，射击间隔 -10%", role: "依靠成熟作物放大爆发火力", exclusive: "安可超频模块", skillCd: 18, line: "节拍已对齐。先种导电桩，再让雷声开花！" },
    mochi: { name: "奶泡", code: "MOCHI-11", color: "#61c9ad", body: "#86d9d0", damage: .92, fire: 1, growth: 1.25, shield: 20, aura: 1.08, skill: "泡泡温室", skillIcon: "♡", skillCopy: "生成护盾并灌溉所有作物", skillDetail: "获得 28 护盾并治疗 14 点生命；灌溉所有作物、推进 22% 生长，并消除身边敌弹。", passive: "作物生长 +25%，初始护盾 +20", role: "稳健守田与近战续航", exclusive: "软体温室协议", skillCd: 22, line: "软乎乎地种田，硬邦邦地打虫！" }
  };
  let selectedCharacter = "sprout";
  let selectedWeapon = "rifle";
  let selectedSeedLoadout = [0, 1, 2, 3];

  const WEAPONS = {
    rifle: { name: "脉冲步枪", tag: "均衡连射", copy: "射速、射程与伤害均衡，适合所有作物光环。", damage: 1, fire: 1, speed: 1, size: 1, shots: 1, spread: 0, life: 1.25, pierce: 0, homing: 0, splash: 0 },
    shotgun: { name: "孢子霰弹枪", tag: "近距多弹", copy: "一次发射 5 枚孢子，射程较短，贴近目标时爆发极高。", damage: .62, fire: 1.55, speed: .86, size: 1.12, shots: 5, spread: .52, life: .7, pierce: 0, homing: 0, splash: 0 },
    rail: { name: "根系轨道枪", tag: "慢射贯穿", copy: "单发威力高且自带 3 次穿透，射速较慢，适合扎根和暴击。", damage: 2.55, fire: 2.35, speed: 1.35, size: 1.55, shots: 1, spread: 0, life: 1.6, pierce: 3, homing: 0, splash: 0, crit: .05 },
    wand: { name: "共生法杖", tag: "追踪法球", copy: "发射缓慢追踪法球，作物光环效果提高，命中产生小范围魔力波。", damage: 1.15, fire: 1.38, speed: .68, size: 1.7, shots: 1, spread: 0, life: 2.1, pierce: 0, homing: 7, splash: 22, aura: 1.18 }
  };

  const CROP_TYPES = [
    { id: "pepper", name: "火爆辣椒", color: "#ff6755", dark: "#9d342d", grow: 14, glyph: "◆", aura: "火焰爆破弹", passive: "收获横扫整行" },
    { id: "sun", name: "向日葵", color: "#f6d95d", dark: "#b78132", grow: 16, glyph: "●", aura: "暴击阳光", passive: "周期产出阳光" },
    { id: "thorn", name: "豌豆炮", color: "#80cf70", dark: "#397747", grow: 18, glyph: "✦", aura: "穿透豌豆", passive: "自动射击" },
    { id: "magnet", name: "磁力菇", color: "#5fd0db", dark: "#337e8a", grow: 17, glyph: "◉", aura: "追踪磁弹", passive: "吸走资源与敌弹" },
    { id: "mint", name: "寒冰菇", color: "#7fcff2", dark: "#477ca7", grow: 18, glyph: "❄", aura: "寒霜弹", passive: "收获全屏冻结" },
    { id: "clone", name: "模仿菇", color: "#bd8df2", dark: "#7554a5", grow: 20, glyph: "♊", aura: "复制弹", passive: "模仿邻近作物" }
  ];

  const FIELD_ZONES = [
    { id: "home", name: "避难所菜园", x: WORLD_W / 2, y: WORLD_H / 2, color: "#fff0aa", grow: 1, yield: 1, copy: "安全、稳定" },
    { id: "solar", name: "破碎温室", x: 610, y: 390, color: "#ffd27e", grow: 1.35, yield: .9, copy: "生长快，产量略低" },
    { id: "ruin", name: "旧城天台", x: 1770, y: 390, color: "#c7b5ff", grow: .9, yield: 1.35, copy: "生长慢，高产突变" },
    { id: "crater", name: "陨坑湿地", x: 1630, y: 1110, color: "#8ee5c6", grow: 1.1, yield: 1.15, copy: "作物更耐啃食" }
  ];

  const TERRAIN_RULES = {
    bridge: { name: "断桥田", copy: "中央裂谷只留下三处窄桥，跨区救田需要规划路线。", color: "#d58b6b" },
    greenhouse: { name: "移动温室", copy: "破碎温室会沿轨道移动，成熟光环和田块位置随之改变。", color: "#e6b75f" },
    blackout: { name: "夜间停电区", copy: "入夜后视野收缩；成熟向日葵会形成照明安全区。", color: "#786aa0" },
    irrigation: { name: "可争夺灌溉站", copy: "靠近中央泵站完成占领，可灌溉全图并获得湿度恢复。", color: "#55b9a1" },
    finale: { name: "末日复合地形", copy: "第五天会同时启用两条本轮出现过的地形规则。", color: "#e56f90" }
  };

  const HYBRIDS = [
    { id: "sunpepper", pair: [0, 1], name: "日灼辣椒", copy: "收获时先治疗护盾，再释放高暴击灼热冲击。", color: "#ffb953" },
    { id: "steampepper", pair: [0, 4], name: "蒸汽冰椒", copy: "爆炸同时冻结，形成冷热交替的控制带。", color: "#f08da1" },
    { id: "prismpea", pair: [1, 2], name: "棱光豌豆", copy: "自动射击有更高暴击，并在命中后分出光弹。", color: "#d8dd68" },
    { id: "railpea", pair: [2, 3], name: "磁轨豌豆", copy: "自动弹获得强追踪和额外穿透。", color: "#64d4b9" },
    { id: "mirrorfrost", pair: [4, 5], name: "镜霜双生菇", copy: "冻结结束时复制一次较弱的碎冰冲击。", color: "#a9b9f5" },
    { id: "twinsun", pair: [1, 5], name: "双生日葵", copy: "更快产出阳光，收获时延长超频窗口。", color: "#f3cf79" }
  ];

  const COMBO_PLANTS = [
    { id: "peacannon", pair: [2, 2], achievement: "pea_battery", achievementName: "豆阵成军", unlockCopy: "累计收获 6 株豌豆炮", name: "双联豆炮", icon: "✹", color: "#9ee77f", cost: 4, copy: "两株成熟豌豆炮合并为重型炮座，每 3 秒发射高伤贯穿炮弹。" },
    { id: "solarforge", pair: [1, 1], achievement: "sun_grid", achievementName: "追光者", unlockCopy: "累计收获 6 株向日葵", name: "聚光向日塔", icon: "☀", color: "#ffe26f", cost: 4, copy: "两株成熟向日葵合并为聚光塔，周期产出阳光并维持丰收动能。" },
    { id: "cryoforge", pair: [0, 4], achievement: "hybrid_mind", achievementName: "杂交学徒", unlockCopy: "累计完成 3 次自然杂交", name: "冷热反应炉", icon: "♨", color: "#ef9fba", cost: 5, copy: "辣椒与寒冰菇合并为反应炉，周期制造兼具爆炸与冻结的热震波。" }
  ];

  const STAT_TALENTS = [
    { id: "power", icon: "⚔", type: "三级属性", name: "战术增幅", max: 4, color: "#ff816f", desc: (level) => `人物攻击力 +10%（当前节点 LV.${level}）`, apply: () => { game.player.damage *= 1.1; } },
    { id: "plating", icon: "⬢", type: "三级属性", name: "复合护甲", max: 4, color: "#86a9c8", desc: (level) => `人物所受伤害 -7%（当前节点 LV.${level}）`, apply: () => { game.player.armor *= .93; } },
    { id: "stride", icon: "»", type: "三级属性", name: "伺服步态", max: 4, color: "#65d7bd", desc: (level) => `移动速度 +7%（当前节点 LV.${level}）`, apply: () => { game.player.speed *= 1.07; } },
    { id: "evasion", icon: "◇", type: "三级属性", name: "相位闪避", max: 4, color: "#c69af0", desc: (level) => `闪避率 +5%（当前 ${Math.round(game.player.dodge * 100 + 5)}%）`, apply: () => { game.player.dodge = Math.min(.28, game.player.dodge + .05); } }
  ];

  const MERCHANT_ITEMS = [
    { id: "shovel", icon: "♠", name: "折叠开荒铲", cost: 6, copy: "主动道具，耐久 5。切换后按 E，可在当前位置开垦新田。", apply: () => { game.activeTools.shovel = 5; selectActiveTool("shovel"); } },
    { id: "overdrive", icon: "⚔", name: "赤红增幅器", cost: 6, copy: "攻击力 +14%。可能并不适合纯种植构筑。", apply: () => { game.player.damage *= 1.14; } },
    { id: "carapace", icon: "⬢", name: "甲壳复合板", cost: 5, copy: "人物所受伤害 -12%。", apply: () => { game.player.armor *= .88; } },
    { id: "boots", icon: "»", name: "蜻蜓伺服靴", cost: 5, copy: "移动速度 +12%。", apply: () => { game.player.speed *= 1.12; } },
    { id: "cloak", icon: "◇", name: "概率斗篷", cost: 6, copy: "闪避率 +9%，最高不超过 32%。", apply: () => { game.player.dodge = Math.min(.32, game.player.dodge + .09); } },
    { id: "scope", icon: "◎", name: "露珠瞄准镜", cost: 5, copy: "暴击率 +6%。", apply: () => { game.player.crit += .06; } },
    { id: "heart", icon: "♥", name: "罐装心跳", cost: 5, copy: "最大生命 +24，并恢复 24。", apply: () => { game.player.maxHp += 24; game.player.hp += 24; } },
    { id: "trigger", icon: "⌁", name: "风切扳机", cost: 7, copy: "远程与近战基础攻击间隔 -10%。", apply: () => { game.player.fireRate *= .9; game.player.meleeRate *= .9; } }
  ];

  const ENEMY_DATA = {
    mite: { hp: 30, speed: 78, damage: 9, radius: 14, xp: 9, color: "#be6049", attacksCrops: true },
    spitter: { hp: 48, speed: 52, damage: 8, radius: 17, xp: 14, color: "#9872a8" },
    boar: { hp: 105, speed: 57, damage: 16, radius: 22, xp: 23, color: "#7f5747", attacksCrops: true },
    wasp: { hp: 38, speed: 112, damage: 11, radius: 13, xp: 13, color: "#e6b854" },
    leech: { hp: 72, speed: 67, damage: 12, radius: 18, xp: 18, color: "#7aa55c" },
    bloater: { hp: 165, speed: 38, damage: 19, radius: 27, xp: 32, color: "#cf7996" },
    thief: { hp: 82, speed: 105, damage: 8, radius: 17, xp: 28, color: "#e58e54", attacksCrops: true },
    healer: { hp: 96, speed: 45, damage: 7, radius: 20, xp: 30, color: "#72c58d" },
    glitch: { hp: 68, speed: 78, damage: 13, radius: 18, xp: 24, color: "#70b7e8" },
    crowboss: { hp: 3200, speed: 96, damage: 21, radius: 43, xp: 220, color: "#584c78", bossName: "乱码鸦王" },
    slimeboss: { hp: 6200, speed: 55, damage: 25, radius: 56, xp: 340, color: "#5ea887", bossName: "缓存史莱姆" },
    boss: { hp: 11200, speed: 51, damage: 29, radius: 61, xp: 520, color: "#76517e", bossName: "枯穗暴君" }
  };
  const ENEMY_NAMES = { mite: "啃根虫", spitter: "吐籽怪", boar: "冲撞野猪", wasp: "飞刺蜂", leech: "吸能蛭", bloater: "臃肿孢体", thief: "掠种贼", healer: "修复者", glitch: "故障兽" };

  const ELITE_AFFIXES = [
    { id: "frenzy", name: "狂暴", icon: "⚡", copy: "移动速度 +35%，伤害 +15%。", color: "#ff776d", apply: (e) => { e.speed *= 1.35; e.damage *= 1.15; } },
    { id: "armored", name: "装甲", icon: "⬡", copy: "生命 +80%，移动速度 -14%。", color: "#b4a99c", apply: (e) => { e.hp *= 1.8; e.maxHp = e.hp; e.speed *= .86; } },
    { id: "splitting", name: "分裂", icon: "✣", copy: "死亡时分裂出两只啃根虫。", color: "#d89bf0", apply: () => {} },
    { id: "leeching", name: "虹吸", icon: "♥", copy: "命中玩家会恢复自身生命。", color: "#eb6d91", apply: () => {} },
    { id: "blight", name: "腐田", icon: "♣", copy: "极少数获得攻击作物资格的精英。", color: "#7fc66b", apply: (e) => { e.damage *= 1.18; } }
  ];

  const BOSS_VARIANTS = {
    crowboss: [
      { id: "storm", name: "暴风羽冠", copy: "羽弹更多、飞行更快。", hp: 1, speed: 1.18, shots: 2, skill: .9, summons: 0 },
      { id: "iron", name: "铁喙协议", copy: "生命和碰撞伤害更高，弹幕略慢。", hp: 1.32, speed: .92, damage: 1.25, shots: 0, skill: 1.08, summons: 1 }
    ],
    slimeboss: [
      { id: "acid", name: "强酸缓存", copy: "腐蚀区更大，技能频率更高。", hp: 1.08, speed: 1, hazard: 1.28, skill: .82, summons: 0 },
      { id: "colony", name: "群落备份", copy: "召唤更多吸能蛭，并周期性分裂。", hp: 1.18, speed: .95, hazard: 1, skill: 1.05, summons: 3 }
    ],
    boss: [
      { id: "eclipse", name: "日蚀核心", copy: "战斗进入停电状态，年轮频率提高。", hp: 1.1, speed: 1.08, skill: .82, summons: 1, blackout: true },
      { id: "rootlord", name: "噬田根冠", copy: "少数能直接腐蚀作物的首领变体。", hp: 1.25, speed: .94, skill: .95, summons: 1, cropHazard: true }
    ]
  };

  let state = "start";
  let game = null;
  let lastTime = performance.now();
  let idleTime = 0;
  const scenery = Array.from({ length: 420 }, (_, i) => ({
    x: 35 + ((i * 83.17) % (WORLD_W - 70)),
    y: 35 + ((i * 139.71) % (WORLD_H - 70)),
    size: 2 + (i % 4),
    tone: i % 3
  }));

  function shuffled(values) {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function createTerrainSchedule() {
    const firstFour = shuffled(["bridge", "greenhouse", "blackout", "irrigation"]);
    return { days: [...firstFour, "finale"], finale: shuffled(firstFour).slice(0, 2) };
  }

  function activeTerrainIds() {
    if (!game) return [];
    const id = game.terrainDays[game.day - 1];
    return id === "finale" ? game.finalTerrainRules : [id];
  }

  function hasTerrain(id) { return activeTerrainIds().includes(id); }

  function terrainLabel() {
    const ids = activeTerrainIds();
    if (ids.length > 1) return { name: ids.map((id) => TERRAIN_RULES[id].name).join(" + "), copy: ids.map((id) => TERRAIN_RULES[id].copy).join(" ") };
    return TERRAIN_RULES[ids[0]] || TERRAIN_RULES.irrigation;
  }

  function resetGame() {
    const computeLevel = meta.modules.compute;
    const soilLevel = meta.modules.soil;
    const backupLevel = meta.modules.backup;
    const radarLevel = meta.modules.radar;
    const memoryLevel = meta.modules.memory;
    const bondLevel = meta.modules.bond;
    const character = CHARACTERS[selectedCharacter];
    const weapon = WEAPONS[selectedWeapon];
    const terrainSchedule = createTerrainSchedule();
    const startingSeeds = CROP_TYPES.map((_, index) => selectedSeedLoadout.includes(index) ? 3 + Math.floor(soilLevel / 2) : 0);
    game = {
      character: selectedCharacter,
      weapon: selectedWeapon,
      carriedSeeds: [...selectedSeedLoadout],
      elapsed: 0,
      phase: "day",
      phaseTime: 0,
      day: 1,
      spawnTimer: 1.2,
      score: 0,
      coins: 4,
      water: 5 + backupLevel,
      seeds: startingSeeds,
      selectedSeed: selectedSeedLoadout[0],
      selectedTool: null,
      activeTools: {},
      kills: 0,
      crops: 0,
      shake: 0,
      flash: 0,
      shieldFlash: 0,
      bossSpawned: false,
      boss: null,
      bossIntroTime: 0,
      ended: false,
      threatPulse: 0,
      upgrades: [`主武器：${weapon.name}`, `种子槽：${selectedSeedLoadout.map((index) => CROP_TYPES[index].name).join(" / ")}`],
      upgradeCounts: {},
      statTalents: {},
      merchantOwned: {},
      merchantStock: [],
      merchantRefreshes: 0,
      items: {},
      fusions: {},
      fusionCount: 0,
      hybridCount: 0,
      hybridPity: 0,
      comboCards: {},
      comboPlantCount: 0,
      comboHarvestStacks: {},
      hybridStatStacks: {},
      terrainDays: terrainSchedule.days,
      finalTerrainRules: terrainSchedule.finale,
      irrigation: { x: WORLD_W / 2, y: WORLD_H / 2 - 205, progress: 0, captured: false, contested: false },
      terrainDamageTimer: 0,
      freezeTimer: 0,
      eventTimer: 38,
      activeEvent: null,
      eventTime: 0,
      eventCount: 0,
      eventBannerTime: 0,
      dayStoryShown: {},
      overclock: 0,
      overclockTime: 0,
      combo: 0,
      comboTime: 0,
      droneLevel: 0,
      droneTimer: 0,
      orbitLevel: 0,
      orbitHitTimer: 0,
      cloneTime: 0,
      peaTime: 0,
      skillFx: null,
      chests: [],
      relics: {},
      nightChestDays: {},
      autoWaterTimer: 5,
      farmbrainWaterTimer: 5,
      autoSeedTimer: 10,
      cropPulseTimer: 1,
      harvestMomentum: 0,
      harvestMomentumTime: 0,
      harvestTempoPower: 0,
      bloomShotLevel: 0,
      vineRicochet: 0,
      pollenGuidance: 0,
      harvestShieldLevel: 0,
      meleeHarvestRate: 0,
      aiSpeechTime: 0,
      missionTime: 7,
      terrainCardTime: 7,
      toast: { text: "", sub: "", time: 0 },
      pendingChoice: null,
      player: {
        x: WORLD_W / 2,
        y: WORLD_H / 2 + 220,
        radius: 15,
        hp: 100 + backupLevel * 7,
        maxHp: 100 + backupLevel * 7,
        shield: character.shield + backupLevel * 2,
        armor: 1,
        dodge: 0,
        speed: 220,
        damage: 17 * character.damage * weapon.damage,
        fireRate: .205 * character.fire * weapon.fire,
        bulletSpeed: 700 * weapon.speed,
        bulletSize: 4 * weapon.size,
        shootTimer: 0,
        dashCooldown: 0,
        dashMax: 2.35,
        dashTime: 0,
        dashDir: { x: 0, y: -1 },
        hurtCooldown: 0,
        level: 1,
        xp: 0,
        xpNeed: 36,
        multishot: 1,
        pierce: 0,
        crit: .05 + (weapon.crit || 0),
        magnet: 95 * (1 + radarLevel * .1),
        harvestDamage: 1,
        ricochet: 0,
        homing: 0,
        attackMode: "ranged",
        meleeRange: 108,
        meleeArc: 1.82,
        meleePower: 1.16,
        meleeRate: .43,
        stationaryCharge: 0,
        stationaryMax: 3,
        angle: -Math.PI / 2,
        skillCooldown: 0,
        skillMax: character.skillCd * Math.max(.52, 1 - bondLevel * .06)
      },
      camera: { x: WORLD_W / 2, y: WORLD_H / 2 + 90 },
      cropGrowth: (1 + soilLevel * .09) * character.growth,
      cropAura: character.aura * (weapon.aura || 1),
      computeLink: computeLevel * .035,
      skillPower: 1 + bondLevel * .09,
      xpGain: 1 + memoryLevel * .08,
      crystalBonus: 1 + memoryLevel * .07,
      dropLuck: radarLevel * .025,
      cropYield: .9,
      cropArmor: 1,
      pepperRadius: 1,
      sunPower: 1,
      thornPower: 1,
      magnetPower: 1,
      mintPower: 1,
      clonePower: 1,
      enemies: [],
      bullets: [],
      enemyBullets: [],
      pickups: [],
      particles: [],
      floaters: [],
      hazards: [],
      plots: createPlots()
    };
    input.keys.clear();
    input.mouse.down = false;
    input.interact = false;
    input.dash = false;
    input.skill = false;
    selectSeed(selectedSeedLoadout[0]);
    rollMerchantStock(true);
    updateLoadoutAvailability();
    updateTerrainUi();
    renderRestShop();
    discoverEntry(`weapon:${selectedWeapon}`, 1);
    renderBuildDock();
    updateMetaDisplay();
    updateHud();
  }

  function createPlots() {
    const plots = [];
    for (const zone of FIELD_ZONES) {
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          plots.push(makePlot(zone.x - 36 + col * 72, zone.y - 35 + row * 70, zone.id));
        }
      }
    }
    return plots;
  }

  function makePlot(x, y, zoneId, dug = false) {
    const zone = FIELD_ZONES.find((entry) => entry.id === zoneId) || FIELD_ZONES[0];
    return {
      x, y, baseX: x, baseY: y, radius: 27, zone: zone.id,
      growMod: zone.grow, yieldMod: zone.yield, armorMod: zone.id === "crater" ? 1.35 : 1,
      state: "empty", crop: null, growth: 0, wet: 0, hp: 100, maxHp: 100,
      mutation: false, pulse: rand(0, TAU), hit: 0, sway: rand(0, TAU), passiveTimer: rand(1, 3),
      mimicCrop: null, hybrid: null, comboPlant: null, dug
    };
  }

  let storyIndex = 0;
  function storySequence() {
    const character = CHARACTERS[selectedCharacter];
    const personal = selectedCharacter === "beat"
      ? "我保留了旧世界最后一首歌。只要节拍还在，我们就不会被黑夜吞掉。"
      : selectedCharacter === "mochi"
        ? "我的护理数据库说，希望不能食用。可你把种子放进我手里时，我决定相信例外。"
        : "我原本被制造来提高 3.7% 的番茄产量。现在，人类的明天好像也归我管理了。";
    return [
      { chapter: "序章 · 熄灯之后", title: "世界结束时，我们选了种田", speaker: "旁白", avatar: "▣", text: "末日第 417 天，城市电网彻底熄灭。避难所只剩最后一袋种子，和一名仍在运行的农务 AI。" },
      { chapter: `${character.code} · 记忆片段`, title: `与你同行的 ${character.name}`, speaker: character.name, avatar: character.skillIcon, text: personal },
      { chapter: "生存协议 · 第一次广播", title: "五个夜晚，一次选择", speaker: "你", avatar: "◇", text: "远处还有四块能耕种的土地。我们带上种子和最后一把脉冲枪：白天播种，夜晚活下去，把末日变成下一个春天。" }
    ];
  }

  function openStory() {
    storyIndex = 0;
    state = "story";
    ui.start.classList.add("hidden");
    ui.story.classList.remove("hidden");
    renderStory();
    sound.init();
    sound.tone(220, .3, "triangle", .025, 110);
  }

  function renderStory() {
    const line = storySequence()[storyIndex];
    ui.storyChapter.textContent = line.chapter;
    ui.storyTitle.textContent = line.title;
    ui.storySpeaker.textContent = line.speaker;
    ui.storyAvatar.textContent = line.avatar;
    ui.storyText.textContent = line.text;
    $("story-next").querySelector("span").textContent = storyIndex === storySequence().length - 1 ? "进入荒野" : "继续";
  }

  function advanceStory() {
    storyIndex++;
    if (storyIndex >= storySequence().length) startRun();
    else { renderStory(); sound.tone(300 + storyIndex * 70, .12, "triangle", .02, 80); }
  }

  function goHome() {
    state = "start";
    game = null;
    input.keys.clear(); input.mouse.down = false;
    [ui.story, ui.choice, ui.pause, ui.end, ui.hud, ui.bossIntro, ui.codex, ui.restShop].forEach((element) => element.classList.add("hidden"));
    ui.start.classList.remove("hidden");
    ui.event.classList.add("hidden");
    updateMetaDisplay();
  }

  function startRun() {
    resetGame();
    state = "playing";
    ui.start.classList.add("hidden");
    ui.story.classList.add("hidden");
    ui.end.classList.add("hidden");
    ui.end.classList.remove("victory");
    ui.pause.classList.add("hidden");
    ui.choice.classList.add("hidden");
    ui.restShop.classList.add("hidden");
    ui.hud.classList.remove("hidden");
    canvas.focus();
    sound.init();
    sound.bgmClock = 0;
    const character = CHARACTERS[selectedCharacter];
    ui.aiSpeech.querySelector("b").textContent = character.name;
    document.querySelector(".brand-mini span").textContent = `${character.code} ONLINE`;
    document.querySelector(".portrait b").textContent = character.code.split("-")[0];
    showToast(`第一日 · ${character.name}开机`, "五日远征开始：成熟作物会直接改造附近弹丸");
    aiSay(character.line, 4.2);
  }

  function currentDuration() {
    if (game.phase === "day") return 38;
    if (game.phase === "rest") return Infinity;
    if ([2, 4, FINAL_DAY].includes(game.day)) return 999;
    return 29;
  }

  function bossTypeForDay(day) {
    if (day === 2) return "crowboss";
    if (day === 4) return "slimeboss";
    if (day === FINAL_DAY) return "boss";
    return null;
  }

  function isBossType(type) { return type === "boss" || type === "crowboss" || type === "slimeboss"; }
  function bossDisplayName(enemy) { return enemy && enemy.variant ? `${enemy.variant.name} · ${ENEMY_DATA[enemy.type].bossName}` : ENEMY_DATA[enemy.type].bossName; }

  function phaseTransition() {
    if (game.phase === "day") {
      game.phase = "rest";
      game.phaseTime = 0;
      game.enemies.forEach((enemy) => { if (!isBossType(enemy.type)) enemy.dead = true; });
      game.enemies = game.enemies.filter((enemy) => !enemy.dead);
      game.enemyBullets.length = 0;
      game.hazards.length = 0;
      rollMerchantStock(game.day === 1);
      ui.restShop.classList.remove("hidden");
      renderRestShop();
      showToast(`第 ${game.day} 日 · 无限休整`, "害兽停止刷新；完成采购和播种后按 F 主动进入夜晚");
      updateMission("休整、商店与播种", "没有时间限制；可购买四类种子、组合卡与随机强力道具");
      aiSay("敌群撤退了！慢慢整理，准备好再按 F 叫它们回来。", 4);
      sound.tone(360, .35, "triangle", .04, 140);
    } else if (game.phase === "rest") {
      game.phase = "night";
      game.phaseTime = 0;
      game.threatPulse = 1;
      ui.restShop.classList.add("hidden");
      sound.tone(150, .35, "sawtooth", .05, -60);
      const bossType = bossTypeForDay(game.day);
      if (bossType) {
        const bossName = ENEMY_DATA[bossType].bossName;
        showToast(`第 ${game.day} 夜 · ${bossName}来袭`, game.day === FINAL_DAY ? "最终首领：守住最后一块田" : "阶段首领：击败后进入下一日");
        aiSay(game.day === FINAL_DAY ? "警告：体积超出可爱标准。批准全部火力！" : `发现阶段首领 ${bossName}，准备拆包！`, 4.5);
        spawnBoss(bossType);
      } else {
        showToast(`第 ${game.day} 夜 · 饥群出巢`, "敌人会优先啃食成熟作物");
        aiSay("夜间模式启动。谁碰庄稼，我就让谁重新投胎。", 4);
      }
    } else if (game.day < FINAL_DAY) {
      if (!game.nightChestDays[game.day]) dropRelicChest(game.player.x + 55, game.player.y, game.day);
      game.day++;
      game.phase = "day";
      game.phaseTime = 0;
      game.boss = null;
      game.bossSpawned = false;
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + 12);
      game.water += 2;
      game.coins += 4;
      game.irrigation = { x: WORLD_W / 2, y: WORLD_H / 2 - 205, progress: 0, captured: false, contested: false };
      updateTerrainUi();
      renderRestShop();
      showToast(`第 ${game.day} 日 · 土壤回温`, "补给：生命 +12，水 +2，生物质 +4；今日地形规则已轮换");
      const beat = [
        "活下来了。广播里出现了另一个避难所的呼号，可它只重复着我们的名字。",
        "旧城天台还有土。那里的植物在没有人类照料后，学会了自己发光。",
        "记录显示，首领都来自失控的农业设施。末日也许不是意外。",
        "最后一夜。种子库就在枯穗暴君身后——那是明年，也是所有答案。"
      ][Math.min(3, game.day - 2)];
      aiSay(beat, 5.2);
      updateMission(`第 ${game.day} 日生存记录`, beat);
      showChoice("dawn");
    }
  }

  function updateTerrainUi() {
    if (!game || !ui.terrainName) return;
    const label = terrainLabel();
    ui.terrainName.textContent = label.name;
    ui.terrainCopy.textContent = label.copy;
    ui.terrainCard.style.borderColor = activeTerrainIds().length > 1 ? "#ff9bb8" : "#fff";
    ui.terrainCard.classList.remove("hidden");
    game.terrainCardTime = 7;
  }

  function updateLoadoutAvailability() {
    const allowed = game ? game.carriedSeeds : selectedSeedLoadout;
    document.querySelectorAll(".seed-card").forEach((card) => {
      const index = Number(card.dataset.seed);
      card.classList.toggle("unavailable", !allowed.includes(index));
    });
    if (game && !allowed.includes(game.selectedSeed)) game.selectedSeed = allowed[0];
  }

  function rollMerchantStock(guaranteeShovel = false) {
    if (!game) return;
    const available = MERCHANT_ITEMS.filter((item) => !game.merchantOwned[item.id]);
    const stock = [];
    const shovel = available.find((item) => item.id === "shovel");
    if (guaranteeShovel && shovel) stock.push(shovel.id);
    const pool = available.filter((item) => !stock.includes(item.id));
    while (stock.length < Math.min(3, available.length) && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      stock.push(pool.splice(index, 1)[0].id);
    }
    game.merchantStock = stock;
  }

  function renderMerchant() {
    if (!game || !ui.merchantItems) return;
    ui.merchantItems.innerHTML = "";
    for (const id of game.merchantStock) {
      const item = MERCHANT_ITEMS.find((entry) => entry.id === id);
      if (!item) continue;
      const owned = Boolean(game.merchantOwned[id]);
      const button = document.createElement("button");
      button.innerHTML = `<b>${item.icon} ${item.name}</b><small>${item.copy}</small><em>${owned ? "已售罄" : `◆${item.cost}`}</em>`;
      button.disabled = owned || game.coins < item.cost || game.phase !== "rest";
      button.addEventListener("click", () => buyMerchantItem(id));
      ui.merchantItems.appendChild(button);
    }
    if (!game.merchantStock.length) ui.merchantItems.innerHTML = "<small>货郎的背包已经被你买空了。</small>";
    const refreshCost = 2 + game.merchantRefreshes * 2;
    ui.merchantRefresh.textContent = `刷新 ◆${refreshCost}`;
    ui.merchantRefresh.disabled = game.phase !== "rest" || game.coins < refreshCost || MERCHANT_ITEMS.every((item) => game.merchantOwned[item.id]);
  }

  function refreshMerchant() {
    if (!game || game.phase !== "rest") return;
    const cost = 2 + game.merchantRefreshes * 2;
    if (game.coins < cost) return;
    game.coins -= cost;
    game.merchantRefreshes++;
    rollMerchantStock(false);
    renderRestShop();
    showToast("货郎重新翻了翻背包", `本轮已刷新 ${game.merchantRefreshes} 次；下次刷新需要 ◆${2 + game.merchantRefreshes * 2}`);
    sound.pickup();
  }

  function buyMerchantItem(id) {
    const item = MERCHANT_ITEMS.find((entry) => entry.id === id);
    if (!game || !item || game.phase !== "rest" || game.merchantOwned[id] || game.coins < item.cost) return;
    game.coins -= item.cost;
    game.merchantOwned[id] = true;
    item.apply();
    game.upgrades.push(`商店：${item.name}`);
    showToast(`购入 · ${item.name}`, item.copy);
    renderRestShop();
    renderBuildDock();
    updateHud();
    sound.level();
  }

  function renderRestShop() {
    if (!game || !ui.restShopItems) return;
    ui.restShopItems.innerHTML = "";
    for (const index of game.carriedSeeds) {
      const crop = CROP_TYPES[index];
      const button = document.createElement("button");
      button.innerHTML = `${crop.glyph} ${crop.name} ×2　<strong>◆2</strong>`;
      button.disabled = game.coins < 2 || game.phase !== "rest";
      button.addEventListener("click", () => buySeed(index));
      ui.restShopItems.appendChild(button);
    }
    const label = document.createElement("span");
    label.className = "rest-shop-section";
    label.textContent = "成就组合卡 · 每局购买后才能进行对应合株";
    ui.restShopItems.appendChild(label);
    for (const combo of COMBO_PLANTS) {
      const unlocked = Boolean(meta.achievements[combo.achievement]);
      const owned = Boolean(game.comboCards[combo.id]);
      const button = document.createElement("button");
      button.className = "combo-card";
      button.innerHTML = unlocked
        ? `${combo.icon} ${combo.name}　<strong>${owned ? "已装载" : `◆${combo.cost}`}</strong>`
        : `🔒 ${combo.achievementName}　<strong>${combo.unlockCopy}</strong>`;
      button.disabled = !unlocked || owned || game.coins < combo.cost || game.phase !== "rest";
      button.addEventListener("click", () => buyComboCard(combo.id));
      ui.restShopItems.appendChild(button);
    }
    renderMerchant();
  }

  function buySeed(index) {
    if (!game || game.phase !== "rest" || !game.carriedSeeds.includes(index) || game.coins < 2) return;
    game.coins -= 2;
    game.seeds[index] += 2;
    floatText(game.player.x, game.player.y - 38, `+2 ${CROP_TYPES[index].name}`, CROP_TYPES[index].color, 12);
    showToast("休整采购完成", `${CROP_TYPES[index].name}种子 +2，剩余生物质 ${game.coins}`);
    sound.pickup();
    renderRestShop();
    updateHud();
  }

  function buyComboCard(id) {
    const combo = COMBO_PLANTS.find((entry) => entry.id === id);
    if (!game || !combo || game.phase !== "rest" || !meta.achievements[combo.achievement] || game.comboCards[id] || game.coins < combo.cost) return;
    game.coins -= combo.cost;
    game.comboCards[id] = true;
    showToast(`组合卡装载 · ${combo.name}`, `${combo.copy} 将两株配方植物相邻种植并催熟即可自动合株。`);
    aiSay("组合许可已写入育种机。两株植物都会被消耗，威力可不止两株。", 4);
    sound.level();
    renderRestShop();
    renderBuildDock();
    updateHud();
  }

  function isBrokenBridgeGap(x, y) {
    if (x < 1110 || x > 1270) return false;
    const onBridge = (y > 180 && y < 330) || (y > 660 && y < 820) || (y > 1140 && y < 1300);
    return !onBridge;
  }

  function updateTerrainRules(dt) {
    if (!game) return;
    const greenhouseActive = hasTerrain("greenhouse");
    const ox = greenhouseActive ? Math.sin(game.elapsed * .34) * 155 : 0;
    const oy = greenhouseActive ? Math.cos(game.elapsed * .27) * 72 : 0;
    for (const plot of game.plots) {
      if (plot.zone === "solar") { plot.x = plot.baseX + ox; plot.y = plot.baseY + oy; }
      else { plot.x = plot.baseX; plot.y = plot.baseY; }
    }

    game.terrainDamageTimer = Math.max(0, game.terrainDamageTimer - dt);
    if (hasTerrain("bridge") && isBrokenBridgeGap(game.player.x, game.player.y)) {
      game.player.x = game.player.x < 1190 ? 1087 : 1293;
      if (game.terrainDamageTimer <= 0) {
        game.player.hurtCooldown = 0;
        hurtPlayer(6, 1190, game.player.y);
        floatText(game.player.x, game.player.y - 38, "断桥！", "#ffba78", 13);
        game.terrainDamageTimer = .8;
      }
    }

    if (hasTerrain("irrigation")) {
      const station = game.irrigation;
      const playerNear = dist(game.player, station) < 105;
      station.contested = game.enemies.some((enemy) => !enemy.dead && !isBossType(enemy.type) && dist(enemy, station) < 135);
      if (!station.captured) {
        station.progress = clamp(station.progress + (playerNear && !station.contested ? dt : -dt * .45), 0, 3);
        if (station.progress >= 3) {
          station.captured = true;
          game.water += 2;
          for (const plot of game.plots) if (plot.state !== "empty") plot.wet = Math.max(plot.wet, 10);
          showToast("灌溉站已占领", "全图作物补水；今日剩余时间缓慢恢复湿度");
          aiSay("泵站归我们了！这次轮到水追着植物跑。", 3.5);
          ringEffect(station.x, station.y, "#74e6d0", 180);
        }
      } else {
        for (const plot of game.plots) if (plot.state === "growing") plot.wet = Math.min(12, plot.wet + dt * .28);
      }
    }
  }

  function discoverEntry(key, reward = 1) {
    if (meta.discoveries[key]) return false;
    meta.discoveries[key] = Date.now();
    meta.crystals = (meta.crystals || 0) + reward;
    storage.save(meta);
    updateMetaDisplay();
    if (game) {
      const entry = codexEntries().find((item) => item.key === key);
      showToast(`图鉴首次发现 · ${entry ? entry.name : key}`, `芽晶 +${reward}，已永久记录到末日图鉴`);
      sound.level();
    }
    return true;
  }

  function unlockAchievement(id, name, copy) {
    if (meta.achievements[id]) return false;
    meta.achievements[id] = Date.now();
    storage.save(meta);
    if (game) {
      showToast(`成就完成 · ${name}`, `${copy}；对应组合卡已加入休整采购。`);
      ringEffect(game.player.x, game.player.y, "#ffe36f", 220);
      sound.level();
      renderRestShop();
    }
    return true;
  }

  function recordHarvestAchievement(cropId) {
    meta.harvestStats[cropId] = (meta.harvestStats[cropId] || 0) + 1;
    if (cropId === "thorn" && meta.harvestStats.thorn >= 6) unlockAchievement("pea_battery", "豆阵成军", "累计收获 6 株豌豆炮");
    if (cropId === "sun" && meta.harvestStats.sun >= 6) unlockAchievement("sun_grid", "追光者", "累计收获 6 株向日葵");
    storage.save(meta);
  }

  function recordHybridAchievement() {
    meta.hybridCrafts++;
    if (meta.hybridCrafts >= 3) unlockAchievement("hybrid_mind", "杂交学徒", "累计完成 3 次自然杂交");
    storage.save(meta);
  }

  function codexEntries() {
    const cropEntries = CROP_TYPES.map((crop, index) => ({ key: `crop:${crop.id}`, tab: "crops", type: "作物", name: crop.name, copy: `${crop.aura}；${crop.passive}。成熟 ${crop.grow} 秒。`, color: crop.color, index }));
    const hybridEntries = HYBRIDS.map((hybrid) => ({ key: `hybrid:${hybrid.id}`, tab: "hybrids", type: "杂交作物", name: hybrid.name, copy: `${CROP_TYPES[hybrid.pair[0]].name} × ${CROP_TYPES[hybrid.pair[1]].name}：${hybrid.copy}`, color: hybrid.color }));
    const comboEntries = COMBO_PLANTS.map((combo) => ({ key: `combo:${combo.id}`, tab: "combos", type: "组合植株", name: combo.name, copy: `${CROP_TYPES[combo.pair[0]].name} + ${CROP_TYPES[combo.pair[1]].name}：${combo.copy}`, color: combo.color, achievement: combo.achievement, unlockCopy: combo.unlockCopy }));
    const fusionEntries = (typeof FUSIONS === "undefined" ? [] : FUSIONS).map((fusion) => ({ key: `fusion:${fusion.id}`, tab: "fusions", type: "插件融合", name: fusion.name, copy: `${fusion.copy}。${fusion.effect}`, color: fusion.color }));
    const weaponEntries = Object.entries(WEAPONS).map(([id, weapon]) => ({ key: `weapon:${id}`, tab: "weapons", type: "主武器", name: weapon.name, copy: `${weapon.tag}：${weapon.copy}`, color: "#d67796" }));
    const enemyEntries = Object.entries(ENEMY_NAMES).map(([id, name]) => ({ key: `enemy:${id}`, tab: "enemies", type: ENEMY_DATA[id].attacksCrops ? "夜间可攻击植物" : "只攻击玩家", name, copy: `生命 ${ENEMY_DATA[id].hp}，基础伤害 ${ENEMY_DATA[id].damage}。${ENEMY_DATA[id].attacksCrops ? "仅在夜晚会把田块列为目标。" : "不会主动攻击植物。"}`, color: ENEMY_DATA[id].color }));
    const eliteEntries = ELITE_AFFIXES.map((affix) => ({ key: `elite:${affix.id}`, tab: "elites", type: "精英词缀", name: affix.name, copy: affix.copy, color: affix.color }));
    const bossEntries = Object.entries(BOSS_VARIANTS).flatMap(([type, variants]) => variants.map((variant) => ({ key: `boss:${type}:${variant.id}`, tab: "bosses", type: ENEMY_DATA[type].bossName, name: variant.name, copy: variant.copy, color: ENEMY_DATA[type].color })));
    return [...cropEntries, ...hybridEntries, ...comboEntries, ...fusionEntries, ...weaponEntries, ...enemyEntries, ...eliteEntries, ...bossEntries];
  }

  let currentCodexTab = "crops";
  function openCodex() {
    state = "codex";
    ui.start.classList.add("hidden");
    ui.codex.classList.remove("hidden");
    renderCodex();
  }

  function closeCodex() {
    state = "start";
    ui.codex.classList.add("hidden");
    ui.start.classList.remove("hidden");
  }

  function renderCodex() {
    const tabs = [
      ["crops", "基础作物"], ["hybrids", "杂交"], ["combos", "组合植株"], ["fusions", "插件融合"],
      ["weapons", "武器"], ["enemies", "怪物"], ["elites", "精英词缀"], ["bosses", "Boss 变体"]
    ];
    ui.codexTabs.innerHTML = "";
    for (const [id, label] of tabs) {
      const button = document.createElement("button");
      button.textContent = label;
      button.classList.toggle("active", id === currentCodexTab);
      button.addEventListener("click", () => { currentCodexTab = id; renderCodex(); });
      ui.codexTabs.appendChild(button);
    }
    const all = codexEntries();
    const entries = all.filter((entry) => entry.tab === currentCodexTab);
    ui.codexGrid.innerHTML = entries.map((entry) => {
       if (meta.discoveries[entry.key]) return `<article class="codex-entry" style="border-color:${entry.color}"><span>${entry.type} · 已发现</span><h3>${entry.name}</h3><p>${entry.copy}</p></article>`;
       if (entry.tab === "combos") {
         const unlocked = meta.achievements[entry.achievement];
         return `<article class="codex-entry unknown hinted" style="border-color:${entry.color}"><span>${unlocked ? "组合卡已解锁 · 尚未培育" : "成就锁定"}</span><h3>${entry.name}</h3><p>${unlocked ? entry.copy : entry.unlockCopy}</p></article>`;
       }
      if (entry.tab === "fusions" || entry.tab === "hybrids") return `<article class="codex-entry unknown hinted" style="border-color:${entry.color}"><span>配方线索 · 未完成</span><h3>${entry.name}</h3><p>${entry.copy}</p></article>`;
      return `<article class="codex-entry unknown">???<small>首次发现后解锁</small></article>`;
    }).join("");
    const found = all.filter((entry) => meta.discoveries[entry.key]).length;
    ui.codexProgress.textContent = `已发现 ${found} / ${all.length} · 首次发现会直接奖励芽晶`;
  }

  function showToast(text, sub = "") {
    game.toast = { text, sub, time: 3.2 };
  }

  function aiSay(text, duration = 3) {
    if (!game) return;
    ui.aiSpeech.querySelector("span").textContent = text;
    ui.aiSpeech.classList.remove("hidden");
    game.aiSpeechTime = duration;
  }

  function updateMission(title, copy) {
    if (!ui.mission) return;
    ui.mission.querySelector("b").textContent = title;
    ui.mission.querySelector("span").textContent = copy;
    ui.mission.classList.remove("hidden");
    if (game) game.missionTime = 6.5;
  }

  function spawnBoss(type = "boss") {
    if (game.bossSpawned) return;
    game.bossSpawned = true;
    const angle = rand(0, TAU);
    const boss = createEnemy(type, clamp(game.player.x + Math.cos(angle) * 430, 90, WORLD_W - 90), clamp(game.player.y + Math.sin(angle) * 360, 90, WORLD_H - 90));
    const variants = BOSS_VARIANTS[type];
    const variant = variants[Math.floor(Math.random() * variants.length)];
    boss.variant = variant;
    const rating = combatRating();
    const adaptiveScale = clamp(.95 + rating * .075 + (game.day - 1) * .08, 1, 2.45);
    boss.hp *= adaptiveScale * (variant.hp || 1);
    boss.maxHp = boss.hp;
    boss.speed *= variant.speed || 1;
    boss.damage *= variant.damage || 1;
    boss.adaptiveScale = adaptiveScale;
    boss.enrageStage = 0;
    boss.enter = 1.3;
    boss.shootTimer = 1.1;
    boss.summonTimer = 5;
    boss.skillTimer = type === "crowboss" ? 3.6 : type === "slimeboss" ? 4.2 : 3.2;
    game.boss = boss;
    game.enemies.push(boss);
    discoverEntry(`boss:${type}:${variant.id}`, 3);
    game.shake = .8;
    game.freezeTimer = Math.max(game.freezeTimer, 2.15);
    const intro = {
      crowboss: { icon: "♠", warning: "三阶段俯冲；66% 与 33% 血量会立刻狂暴" },
      slimeboss: { icon: "●", warning: "腐蚀区与分裂召唤；低血量弹幕加速" },
      boss: { icon: "✣", warning: "自适应生命与双重年轮；爆发要留给狂暴阶段" }
    }[type];
    ui.bossName.textContent = bossDisplayName(boss);
    ui.bossIcon.textContent = intro.icon;
    ui.bossWarning.textContent = `${variant.copy} ${intro.warning}`;
    ui.bossIntro.classList.remove("hidden");
    ui.bossIntro.style.animation = "none"; void ui.bossIntro.offsetWidth; ui.bossIntro.style.animation = "boss-intro 2.25s ease both";
    setTimeout(() => ui.bossIntro.classList.add("hidden"), 2250);
    sound.boom();
  }

  function combatRating() {
    const itemLevels = Object.values(game.items).reduce((sum, value) => sum + value, 0);
    const rawDps = (game.player.damage * Math.max(1, game.player.multishot)) / Math.max(.08, game.player.attackMode === "melee" ? game.player.meleeRate : game.player.fireRate);
    return itemLevels * .55 + game.fusionCount * 2.2 + Object.keys(game.relics || {}).length * 1.4 + Math.max(0, rawDps - 75) / 95;
  }

  function dropRelicChest(x, y, day = game.day) {
    if (game.nightChestDays[day]) return;
    game.nightChestDays[day] = true;
    game.chests.push({ x: clamp(x, 70, WORLD_W - 70), y: clamp(y, 70, WORLD_H - 70), day, opened: false, pulse: 0 });
    showToast("关键遗物箱已掉落", "靠近后按 E 开启；永久基础属性只存在于这些遗物中");
    aiSay("这只箱子不会消失。里面是能改变本轮底层参数的真家伙。", 4);
  }

  function createEnemy(type, x, y) {
    const d = ENEMY_DATA[type];
    const scale = 1 + game.elapsed * .0038 + (game.day - 1) * .13;
    const hpScale = isBossType(type) ? 1 : scale;
    const enemy = {
      type, x, y, vx: 0, vy: 0,
      radius: d.radius,
      hp: d.hp * hpScale,
      maxHp: d.hp * hpScale,
      speed: d.speed * (1 + (game.day - 1) * .035),
      damage: d.damage * (1 + (game.day - 1) * .09),
      xp: d.xp,
      color: d.color,
      hit: 0,
      dead: false,
      attackTimer: rand(.1, .4),
      shootTimer: rand(.8, 1.5),
      specialTimer: rand(2.5, 4.5),
      targetPlot: null,
      seed: Math.random() * TAU,
      age: 0,
      facing: 0
    };
    if (!isBossType(type)) {
      discoverEntry(`enemy:${type}`, 1);
      const eliteChance = Math.min(.19, .055 + game.day * .025);
      if (chance(eliteChance)) {
        const available = ELITE_AFFIXES.filter((affix) => affix.id !== "blight" || game.day >= 3);
        const affix = available[Math.floor(Math.random() * available.length)];
        enemy.affix = affix.id;
        enemy.eliteName = affix.name;
        enemy.eliteColor = affix.color;
        affix.apply(enemy);
        discoverEntry(`elite:${affix.id}`, 1);
      }
    }
    return enemy;
  }

  function enemySpawnPool(day = game.day) {
    const pool = ["mite", "mite", "mite", "mite", "mite", "mite", "spitter"];
    if (day >= 2) pool.push("boar", "boar", "boar", "wasp", "wasp");
    if (day >= 3) pool.push("leech", "leech", "glitch", "thief");
    if (day >= 4) pool.push("bloater", "healer");
    return pool;
  }

  function spawnEnemy(type = null, forcedX = null, forcedY = null) {
    if (!type) {
      const pool = enemySpawnPool();
      type = pool[Math.floor(Math.random() * pool.length)];
    }
    let x = forcedX;
    let y = forcedY;
    if (x === null || y === null) {
      const a = rand(0, TAU);
      const radius = rand(480, 650);
      x = clamp(game.player.x + Math.cos(a) * radius, 28, WORLD_W - 28);
      y = clamp(game.player.y + Math.sin(a) * radius, 28, WORLD_H - 28);
    }
    const enemy = createEnemy(type, x, y);
    if (game.phase === "night" && type === "thief") enemy.targetPlot = getVulnerablePlot(true);
    else if (game.phase === "night" && enemyCanAttackCrops(enemy) && chance(type === "mite" ? .62 : .35)) {
      enemy.targetPlot = getVulnerablePlot();
    }
    game.enemies.push(enemy);
  }

  function getVulnerablePlot(readyOnly = false) {
    const candidates = game.plots.filter((p) => readyOnly ? p.state === "ready" : p.state !== "empty");
    return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
  }

  function enemyCanAttackCrops(enemy) {
    return Boolean(ENEMY_DATA[enemy.type].attacksCrops || enemy.affix === "blight" || (enemy.variant && enemy.variant.cropHazard));
  }

  function update(dt) {
    if (state !== "playing" || !game) return;
    sound.updateMusic(dt);
    if (game.freezeTimer > 0) {
      game.freezeTimer -= dt;
      updateParticles(dt);
      updateHud();
      return;
    }
    game.elapsed += dt;
    game.phaseTime += dt;
    game.spawnTimer -= dt;
    game.shake = Math.max(0, game.shake - dt * 3.5);
    game.flash = Math.max(0, game.flash - dt * 4);
    game.shieldFlash = Math.max(0, game.shieldFlash - dt * 3.2);
    game.threatPulse = Math.max(0, game.threatPulse - dt);
    if (game.toast.time > 0) game.toast.time -= dt;
    if (game.missionTime > 0) {
      game.missionTime -= dt;
      if (game.missionTime <= 0) ui.mission.classList.add("hidden");
    }
    if (game.terrainCardTime > 0) {
      game.terrainCardTime -= dt;
      if (game.terrainCardTime <= 0) ui.terrainCard.classList.add("hidden");
    }
    if (game.aiSpeechTime > 0) {
      game.aiSpeechTime -= dt;
      if (game.aiSpeechTime <= 0) ui.aiSpeech.classList.add("hidden");
    }
    if (game.comboTime > 0) {
      game.comboTime -= dt;
      if (game.comboTime <= 0) game.combo = 0;
    }
    if (game.overclockTime > 0) {
      game.overclockTime -= dt;
      if (game.overclockTime <= 0) aiSay("超频结束。呼——CPU 差点熟了。", 2.6);
    }
    if (game.cloneTime > 0) game.cloneTime -= dt;
    if (game.peaTime > 0) game.peaTime -= dt;
    if (game.skillFx) { game.skillFx.time -= dt; if (game.skillFx.time <= 0) game.skillFx = null; }
    for (const chest of game.chests) chest.pulse += dt;
    updateRandomEvents(dt);
    updateHarvestMomentum(dt);
    updateFarmTools(dt);

    if (game.fusions.farmbrain) {
      game.farmbrainWaterTimer -= dt;
      if (game.farmbrainWaterTimer <= 0) {
        const thirsty = game.plots.find((plot) => plot.state === "growing" && plot.wet <= 2);
        if (thirsty && game.water > 0) {
          game.water--;
          thirsty.wet = 10;
          burst(thirsty.x, thirsty.y, "#65dce0", 9, 70);
          floatText(thirsty.x, thirsty.y - 27, "主脑浇水", "#63cfd4", 11);
        }
        game.farmbrainWaterTimer = 5;
      }
    }

    if (game.phaseTime >= currentDuration() && !(game.phase === "night" && bossTypeForDay(game.day))) phaseTransition();

    const timePressure = Math.log1p(game.elapsed / 35) * 2.8 + Math.sqrt(game.elapsed / 60) * 1.4;
    const maxEnemies = Math.round((game.phase === "night" ? 12 : 7) + timePressure + (game.day - 1) * 2);
    if (game.phase !== "rest" && game.spawnTimer <= 0 && game.enemies.length < maxEnemies && !(game.boss && game.boss.enter > 0)) {
      spawnEnemy();
      const pressure = 1 + Math.log1p(game.elapsed / 60) * .32 + (game.day - 1) * .07;
      game.spawnTimer = (game.phase === "night" ? rand(.86, 1.22) : rand(1.45, 2.05)) / pressure;
    }

    updatePlayer(dt);
    updateTerrainRules(dt);
    updatePlots(dt);
    updateCropPassives(dt);
    updateBullets(dt);
    updateEnemies(dt);
    updateOrbit(dt);
    updateHazards(dt);
    updateEnemyBullets(dt);
    updatePickups(dt);
    updateParticles(dt);
    updateInteraction();
    game.camera.x = lerp(game.camera.x, clamp(game.player.x, VIEW.w / 2, WORLD_W - VIEW.w / 2), Math.min(1, dt * 4.5));
    game.camera.y = lerp(game.camera.y, clamp(game.player.y, VIEW.h / 2, WORLD_H - VIEW.h / 2), Math.min(1, dt * 4.5));
    updateHud();
  }

  function cultivationState() {
    const readyPlots = game.plots.filter((plot) => plot.state === "ready");
    const nearbyPlots = readyPlots.filter((plot) => dist(plot, game.player) <= 285 * game.cropAura);
    const cropIds = new Set();
    for (const plot of nearbyPlots) {
      cropIds.add(CROP_TYPES[plot.crop].id);
      if (plot.comboPlant) {
        const combo = COMBO_PLANTS.find((entry) => entry.id === plot.comboPlant);
        if (combo) combo.pair.forEach((index) => cropIds.add(CROP_TYPES[index].id));
      }
    }
    return { ready: readyPlots.length, nearby: nearbyPlots.length, diversity: cropIds.size, combos: nearbyPlots.filter((plot) => plot.comboPlant).length };
  }

  function combatCropMultiplier(melee = false) {
    const link = cultivationState();
    const base = melee ? .98 : .7;
    const value = base
      + Math.min(5, link.nearby) * (melee ? .09 : .065)
      + link.diversity * (melee ? .055 : .04)
      + game.harvestMomentum * (melee ? .06 : .05)
      + link.combos * (melee ? .08 : .055)
      + (game.harvestCalibratorStacks || 0) * (melee ? .016 : .012)
      + ((link.nearby || game.harvestMomentum) ? game.computeLink : 0);
    return clamp(value, base, melee ? 1.8 : 1.42);
  }

  function grantHarvestMomentum(amount = 1) {
    game.harvestMomentum = clamp(game.harvestMomentum + amount, 0, 6);
    game.harvestMomentumTime = Math.max(game.harvestMomentumTime, 12);
  }

  function updateHarvestMomentum(dt) {
    if (game.harvestMomentum <= 0) return;
    game.harvestMomentumTime -= dt;
    if (game.harvestMomentumTime <= 0) {
      game.harvestMomentum--;
      game.harvestMomentumTime = game.harvestMomentum > 0 ? 3 : 0;
    }
  }

  function updateFarmTools(dt) {
    const irrigatorLevel = game.items.irrigator || 0;
    if (irrigatorLevel) {
      game.autoWaterTimer -= dt;
      if (game.autoWaterTimer <= 0) {
        const thirsty = game.plots.filter((plot) => plot.state === "growing" && plot.wet <= 2).sort((a, b) => a.wet - b.wet)[0];
        if (thirsty && game.water > 0) {
          game.water--;
          thirsty.wet = 9;
          burst(thirsty.x, thirsty.y, "#65dce0", 7, 60);
          floatText(thirsty.x, thirsty.y - 27, "滴灌补水", "#63cfd4", 10);
        }
        game.autoWaterTimer = 13 - irrigatorLevel * 2.5;
      }
    }
    const seederLevel = game.items.autoseeder || 0;
    if (seederLevel) {
      game.autoSeedTimer -= dt;
      if (game.autoSeedTimer <= 0) {
        const radius = seederLevel === 1 ? 230 : 420;
        const empty = game.plots.filter((plot) => plot.state === "empty" && dist(plot, game.player) <= radius).sort((a, b) => dist(a, game.player) - dist(b, game.player))[0];
        const seedIndex = game.seeds[game.selectedSeed] > 0 ? game.selectedSeed : game.carriedSeeds.find((index) => game.seeds[index] > 0);
        if (empty && seedIndex !== undefined) plantPlot(empty, seedIndex, "自动播种");
        game.autoSeedTimer = 16 - seederLevel * 3;
      }
    }
  }

  function updatePlayer(dt) {
    const p = game.player;
    p.shootTimer -= dt;
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.hurtCooldown = Math.max(0, p.hurtCooldown - dt);
    p.skillCooldown = Math.max(0, p.skillCooldown - dt);
    if (game.fusions.solarwall && game.plots.some((plot) => plot.state === "ready" && CROP_TYPES[plot.crop].id === "sun")) p.shield = Math.min(45, p.shield + dt * 1.8);

    let mx = (input.keys.has("d") || input.keys.has("arrowright") ? 1 : 0) - (input.keys.has("a") || input.keys.has("arrowleft") ? 1 : 0);
    let my = (input.keys.has("s") || input.keys.has("arrowdown") ? 1 : 0) - (input.keys.has("w") || input.keys.has("arrowup") ? 1 : 0);
    const move = norm(mx, my);
    if (mx === 0 && my === 0) { move.x = 0; move.y = 0; }
    const rooted = (mx === 0 && my === 0) && p.dashTime <= 0;
    const cropLink = cultivationState();
    const anchorLevel = game.items.anchor || 0;
    if (anchorLevel) {
      const linkedRoot = cropLink.nearby > 0 || game.harvestMomentum > 0;
      p.stationaryCharge = clamp(p.stationaryCharge + (rooted && linkedRoot ? dt : -dt * 2.7), 0, p.stationaryMax);
      if (p.stationaryCharge >= p.stationaryMax && game.fusions.turret) p.shield = Math.min(45, p.shield + dt * .9);
    } else p.stationaryCharge = 0;

    const mouseWorld = screenToWorld(input.mouse.x, input.mouse.y);
    const aimAngle = Math.atan2(mouseWorld.y - p.y, mouseWorld.x - p.x);
    p.angle += angleDelta(p.angle, aimAngle) * Math.min(1, dt * 18);

    if (input.dash && p.dashCooldown <= 0) {
      p.dashDir = mx || my ? norm(mx, my) : { x: Math.cos(p.angle), y: Math.sin(p.angle) };
      p.dashTime = .18;
      p.dashCooldown = p.dashMax;
      p.hurtCooldown = Math.max(p.hurtCooldown, .3);
      burst(p.x, p.y, "#8ae3d3", 12, 180);
      sound.dash();
    }
    input.dash = false;
    if (input.skill) activateSkill();
    input.skill = false;

    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.x += p.dashDir.x * 690 * dt;
      p.y += p.dashDir.y * 690 * dt;
      if (chance(.7)) game.particles.push({ x: p.x, y: p.y, vx: rand(-25, 25), vy: rand(-25, 25), life: .28, maxLife: .28, size: rand(4, 9), color: "#78d8c9", alpha: .7, shape: "square" });
    } else {
      const speedBoost = game.overclockTime > 0 ? 1.18 : 1;
      p.x += move.x * p.speed * speedBoost * dt;
      p.y += move.y * p.speed * speedBoost * dt;
    }
    p.x = clamp(p.x, 28, WORLD_W - 28);
    p.y = clamp(p.y, 28, WORLD_H - 28);

    if (input.mouse.down && p.shootTimer <= 0) {
      shootPlayer();
      const rootedRatio = p.stationaryCharge / p.stationaryMax;
      const stanceRate = anchorLevel ? 1 - rootedRatio * (.12 + anchorLevel * .08) : 1;
      const peaRate = game.peaTime > 0 ? .78 : 1;
      const harvestRate = Math.max(.66, 1 - game.harvestMomentum * (.018 + game.harvestTempoPower));
      const meleeHarvestRate = p.attackMode === "melee" ? Math.max(.72, 1 - game.harvestMomentum * game.meleeHarvestRate) : 1;
      p.shootTimer = (p.attackMode === "melee" ? p.meleeRate : p.fireRate) * (game.overclockTime > 0 ? .66 : 1) * stanceRate * peaRate * harvestRate * meleeHarvestRate;
    }

    if (game.droneLevel > 0) {
      game.droneTimer -= dt;
      const target = nearestEnemy(p.x, p.y, 430);
      const farmLinked = cropLink.nearby > 0 || game.harvestMomentum > 0;
      if (target && farmLinked && game.droneTimer <= 0) {
        const droneAngle = game.elapsed * 2.3;
        const dx = p.x + Math.cos(droneAngle) * 31;
        const dy = p.y + Math.sin(droneAngle) * 22;
        const aim = Math.atan2(target.y - dy, target.x - dx);
        const droneShots = (game.fusions.farmbrain ? 2 : 1) + (game.fusions.mirrorgarden ? 1 : 0);
        for (let i = 0; i < droneShots; i++) {
          const a = aim + (i - (droneShots - 1) / 2) * .13;
          game.bullets.push({ x: dx, y: dy, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, radius: 3.5, damage: p.damage * (.42 + game.droneLevel * .08) * combatCropMultiplier(false), life: 1.2, pierce: 0, ricochet: 0, homing: 4, crit: false, drone: true, dead: false });
        }
        game.droneTimer = Math.max(.3, .92 - game.droneLevel * .15) * (game.overclockTime > 0 ? .55 : 1);
        sound.tone(310, .035, "square", .012, 90);
      }
    }
  }

  function screenToWorld(x, y) {
    return { x: x - VIEW.x + game.camera.x - VIEW.w / 2, y: y - VIEW.y + game.camera.y - VIEW.h / 2 };
  }

  function activateSkill() {
    const p = game.player;
    if (p.skillCooldown > 0 || game.ended) {
      if (p.skillCooldown > 0) floatText(p.x, p.y - 40, `冷却 ${p.skillCooldown.toFixed(1)}s`, "#cfc4d7", 10);
      return;
    }
    const exclusiveLevel = game.items[game.character === "sprout" ? "sproutcore" : game.character === "beat" ? "beatcore" : "mochicore"] || 0;
    const power = game.skillPower * (1 + exclusiveLevel * (game.character === "beat" ? .16 : .18));
    const character = CHARACTERS[game.character];
    p.skillCooldown = p.skillMax;
    game.shake = 1;
    if (game.character === "sprout") {
      game.skillFx = { type: "sprout", time: 1.1, maxTime: 1.1 };
      let compiled = 0;
      for (const plot of game.plots) {
        if (plot.state === "growing" && dist(plot, p) < 560) {
          plot.growth = Math.min(CROP_TYPES[plot.crop].grow, plot.growth + CROP_TYPES[plot.crop].grow * .58 * power);
          plot.wet = Math.max(plot.wet, 8);
          if (plot.growth >= CROP_TYPES[plot.crop].grow) maturePlot(plot);
          compiled++;
        }
        if (plot.state === "ready" && dist(plot, p) < 560) {
          const target = nearestEnemy(plot.x, plot.y, 700);
          const compileShots = 5 + exclusiveLevel;
          for (let i = 0; i < compileShots; i++) {
            const a = target ? Math.atan2(target.y - plot.y, target.x - plot.x) + (i - (compileShots - 1) / 2) * .16 : TAU * i / compileShots;
            game.bullets.push({ x: plot.x, y: plot.y, vx: Math.cos(a) * 650, vy: Math.sin(a) * 650, radius: 5, damage: p.damage * .85 * power, life: 1.2, pierce: 1, ricochet: 0, homing: 3, crit: false, cropColor: CROP_TYPES[plot.crop].color, dead: false });
          }
          compiled++;
        }
      }
      if (!compiled) for (const index of game.carriedSeeds) game.seeds[index] += 1;
      ringEffect(p.x, p.y, "#b79aff", 560);
      showToast(character.skill, compiled ? `编译 ${compiled} 株作物，成熟植株已执行齐射` : "附近没有作物，回收当前携带的四类种子各 1 枚");
    } else if (game.character === "beat") {
      game.skillFx = { type: "beat", time: .9, maxTime: .9 };
      const conductors = game.plots.filter((plot) => plot.state === "ready").length;
      const conductorPower = .48 + Math.min(8, conductors) * .19;
      let hits = 0;
      for (const enemy of game.enemies) if (!enemy.dead && dist(enemy, p) < 500) {
        damageEnemy(enemy, p.damage * conductorPower * power, true); hits++;
        game.particles.push({ x: enemy.x, y: enemy.y, vx: 0, vy: -170, life: .25, maxLife: .25, size: 12, color: "#fff071", alpha: 1, shape: "flash" });
      }
      const duration = (1.5 + Math.min(8, conductors) * .72) * power;
      game.overclockTime = Math.max(game.overclockTime, duration);
      ringEffect(p.x, p.y, "#fff171", 500);
      showToast(character.skill, `${conductors} 株成熟作物导电，雷击 ${hits} 个目标，超频 ${duration.toFixed(1)} 秒`);
      sound.boom();
    } else {
      game.skillFx = { type: "mochi", time: 1.25, maxTime: 1.25 };
      const shield = Math.round(28 * power);
      p.shield = Math.min(70, p.shield + shield);
      p.hp = Math.min(p.maxHp, p.hp + Math.round(14 * power));
      for (const plot of game.plots) if (plot.state !== "empty") { plot.wet = 12; if (plot.state === "growing") plot.growth += CROP_TYPES[plot.crop].grow * .22 * power; }
      for (const bullet of game.enemyBullets) if (dist(bullet, p) < 360) bullet.dead = true;
      ringEffect(p.x, p.y, "#8ff5df", 360); burst(p.x, p.y, "#c6fff3", 34, 250);
      showToast(character.skill, `护盾 +${shield}，全农区灌溉并净化附近弹幕`);
    }
    aiSay(`${character.skill}启动。今天也要一起活到天亮。`, 3.5);
    sound.level();
  }

  function updateRandomEvents(dt) {
    if (game.phase === "rest") return;
    if (game.eventTime > 0) {
      game.eventTime -= dt;
      game.eventBannerTime -= dt;
      if (game.eventBannerTime <= 0) ui.event.classList.add("hidden");
      if (game.eventTime <= 0) {
        game.activeEvent = null;
        ui.event.classList.add("hidden");
      }
      return;
    }
    game.eventTimer -= dt;
    if (game.eventTimer > 0 || game.boss) return;
    const events = [
      { id: "seedrain", name: "生物质雨", copy: "通用生物质从数据云坠落，可在休整轮采购种子" },
      { id: "growstorm", name: "生长季风", copy: "15 秒内作物生长速度提高三倍" },
      { id: "migration", name: "害兽团建", copy: "一大群高价值害兽正在迷路过来" },
      { id: "magstorm", name: "磁极反转", copy: "14 秒内全地图掉落物主动飞向 AI 娘" }
    ];
    const event = events[Math.floor(Math.random() * events.length)];
    game.activeEvent = event.id;
    game.eventTime = event.id === "growstorm" ? 15 : event.id === "magstorm" ? 14 : 12;
    game.eventBannerTime = 4.8;
    game.eventTimer = rand(65, 90);
    game.eventCount++;
    ui.event.querySelector("b").textContent = event.name;
    ui.event.querySelector("span").textContent = event.copy;
    ui.event.classList.remove("hidden");
    showToast(`随机事件 · ${event.name}`, event.copy);
    aiSay(event.id === "migration" ? "害兽也会团建？那我负责送它们集体下线。" : "检测到野生随机数！这次应该是好事。", 3.5);
    sound.level();
    if (event.id === "seedrain") {
      for (let i = 0; i < 18; i++) dropPickup("coin", game.player.x + rand(-280, 280), game.player.y + rand(-210, 210), 1);
    }
    if (event.id === "migration") {
      for (let i = 0; i < 8; i++) spawnEnemy(i % 4 === 0 ? "bloater" : i % 3 === 0 ? "wasp" : "leech");
    }
  }

  function updateOrbit(dt) {
    if (!game.orbitLevel) return;
    const link = cultivationState();
    if (!link.nearby && !game.harvestMomentum) return;
    game.orbitHitTimer = Math.max(0, game.orbitHitTimer - dt);
    if (game.orbitHitTimer > 0) return;
    const count = 1 + game.orbitLevel;
    for (let i = 0; i < count; i++) {
      const a = game.elapsed * 2.7 + TAU * i / count;
      const orb = { x: game.player.x + Math.cos(a) * 58, y: game.player.y + Math.sin(a) * 58 };
      for (const enemy of game.enemies) if (!enemy.dead && dist(orb, enemy) < enemy.radius + 13) {
        damageEnemy(enemy, game.player.damage * .55 * combatCropMultiplier(true), false);
        if (game.fusions.permafrost) enemy.frozen = Math.max(enemy.frozen || 0, 1.6);
      }
    }
    game.orbitHitTimer = .18;
  }

  function nearestEnemy(x, y, radius, excluded = null) {
    let best = null;
    let bestDistance = radius;
    for (const enemy of game.enemies) {
      if (enemy.dead || enemy === excluded) continue;
      const d = Math.hypot(enemy.x - x, enemy.y - y);
      if (d < bestDistance) { best = enemy; bestDistance = d; }
    }
    return best;
  }

  function shootPlayer() {
    const p = game.player;
    const weapon = WEAPONS[game.weapon];
    const auras = activeCropAuras();
    const hybrids = activeHybrids();
    const auraBoost = activeMutationBoost();
    if (p.attackMode === "melee") { swingMelee(auras, auraBoost); return; }
    const cloneShots = auras.has("clone") ? (game.fusions.mirrorgarden ? 2 : 1) : 0;
    const linkedShots = game.bloomShotLevel ? Math.min(game.bloomShotLevel, Math.floor(auras.size / 2) + (game.harvestMomentum >= 3 ? 1 : 0)) : 0;
    const count = weapon.shots + (p.multishot - 1) + cloneShots + linkedShots + (game.cloneTime > 0 ? 1 : 0);
    const totalSpread = count > 1 ? Math.max(weapon.spread, .12 * (count - 1)) : 0;
    for (let i = 0; i < count; i++) {
      const a = p.angle - totalSpread / 2 + (count === 1 ? 0 : (totalSpread * i) / (count - 1));
      const hybridCrit = hybrids.has("sunpepper") ? .08 : hybrids.has("prismpea") ? .1 : 0;
      const crit = chance(p.crit + (auras.has("sun") ? .18 : 0) + hybridCrit);
      game.bullets.push({
        x: p.x + Math.cos(a) * 20,
        y: p.y + Math.sin(a) * 20,
        vx: Math.cos(a) * p.bulletSpeed,
        vy: Math.sin(a) * p.bulletSpeed,
        radius: p.bulletSize + (crit ? 1.5 : 0),
        damage: p.damage * auraBoost * combatCropMultiplier(false) * stanceDamageMultiplier() * (crit ? 1.75 : 1),
        life: weapon.life,
        pierce: p.pierce + weapon.pierce + (auras.has("thorn") ? 1 : 0) + (hybrids.has("railpea") ? 1 : 0),
        ricochet: p.ricochet + ((auras.has("pepper") || auras.has("clone") || game.harvestMomentum >= 3) ? game.vineRicochet : 0),
        homing: p.homing + weapon.homing + ((auras.has("magnet") || auras.has("clone") || game.harvestMomentum >= 2) ? game.pollenGuidance : 0) + (auras.has("magnet") ? 4.2 * game.magnetPower : 0) + (game.fusions.stormseek && (auras.has("magnet") || game.harvestMomentum) ? 4 : 0) + (hybrids.has("railpea") ? 4 : 0),
        splash: (auras.has("pepper") ? 58 * game.pepperRadius * auraBoost : 0) + weapon.splash + (hybrids.has("sunpepper") ? 25 : 0),
        frost: (auras.has("mint") ? 1.9 * game.mintPower * auraBoost : 0) + (hybrids.has("steampepper") ? 1.05 : 0),
        cropColor: auras.size ? CROP_TYPES.find((crop) => auras.has(crop.id)).color : null,
        crit,
        dead: false
      });
    }
    game.particles.push({ x: p.x + Math.cos(p.angle) * 23, y: p.y + Math.sin(p.angle) * 23, vx: Math.cos(p.angle) * 60, vy: Math.sin(p.angle) * 60, life: .1, maxLife: .1, size: 9, color: "#ffe49a", alpha: 1, shape: "flash" });
    sound.shoot();
  }

  function stanceDamageMultiplier() {
    const level = game.items.anchor || 0;
    if (!level) return 1;
    const ratio = game.player.stationaryCharge / game.player.stationaryMax;
    return 1 + ratio * (.12 + level * .1) + (game.fusions.turret && ratio >= 1 ? .22 : 0);
  }

  function swingMelee(auras, auraBoost) {
    const p = game.player;
    const range = (p.meleeRange + (auras.has("thorn") ? 18 : 0) + game.harvestMomentum * 2.5) * (game.fusions.reaper ? 1.22 : 1);
    const arc = p.meleeArc + (auras.has("sun") ? .12 : 0) + (game.fusions.reaper ? .4 : 0);
    const damage = p.damage * p.meleePower * 1.92 * auraBoost * combatCropMultiplier(true) * stanceDamageMultiplier();
    let hits = 0;
    for (const enemy of game.enemies) {
      if (enemy.dead) continue;
      const d = dist(enemy, p);
      const delta = Math.abs(angleDelta(p.angle, Math.atan2(enemy.y - p.y, enemy.x - p.x)));
      if (d <= range + enemy.radius && delta <= arc / 2) {
        const crit = chance(p.crit + (auras.has("sun") ? .14 : 0));
        const cropEdge = auras.has("thorn") ? 1.13 : 1;
        damageEnemy(enemy, damage * cropEdge * (crit ? 1.7 : 1), crit);
        if (!enemy.dead && auras.has("clone")) damageEnemy(enemy, damage * .28, false);
        const push = norm(enemy.x - p.x, enemy.y - p.y);
        if (!isBossType(enemy.type)) { enemy.x += push.x * 24; enemy.y += push.y * 24; }
        if (auras.has("mint")) enemy.frozen = Math.max(enemy.frozen || 0, 1.35 * game.mintPower);
        if (auras.has("pepper")) for (const other of game.enemies) if (!other.dead && other !== enemy && dist(other, enemy) < 54) damageEnemy(other, damage * .22, false);
        hits++;
      }
    }
    if (hits && (auras.size || game.harvestMomentum)) {
      p.hp = Math.min(p.maxHp, p.hp + Math.min(game.fusions.reaper ? 5 : 1.8, hits * (game.fusions.reaper ? .7 : .2)));
      if (auras.has("magnet")) addOverclock(Math.min(8, hits));
    }
    game.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: .2, maxLife: .2, size: range, color: auras.size ? CROP_TYPES.find((crop) => auras.has(crop.id)).color : "#fff0a2", alpha: 1, shape: "slash", angle: p.angle, arc });
    game.shake = Math.max(game.shake, hits ? .2 : .06);
    sound.tone(hits ? 130 : 210, .08, "sawtooth", .035, hits ? -40 : 100);
  }

  function activeCropAuras() {
    const active = new Set();
    const radius = 205 * game.cropAura;
    for (const plot of game.plots) if (plot.state === "ready" && dist(plot, game.player) <= radius) {
      const id = CROP_TYPES[plot.crop].id;
      active.add(id);
      if (plot.comboPlant) {
        const combo = COMBO_PLANTS.find((entry) => entry.id === plot.comboPlant);
        if (combo) combo.pair.forEach((index) => active.add(CROP_TYPES[index].id));
      }
      if (id === "clone" && plot.mimicCrop !== null) active.add(CROP_TYPES[plot.mimicCrop].id);
    }
    return active;
  }

  function activeHybrids() {
    const active = new Set();
    const radius = 205 * game.cropAura;
    for (const plot of game.plots) if (plot.state === "ready" && plot.hybrid && dist(plot, game.player) <= radius) active.add(plot.hybrid);
    return active;
  }

  function activeMutationBoost() {
    const radius = 205 * game.cropAura;
    return game.plots.some((plot) => plot.state === "ready" && plot.mutation && dist(plot, game.player) <= radius) ? 1.35 : 1;
  }

  function updateBullets(dt) {
    for (const b of game.bullets) {
      if (!b.hitTargets) b.hitTargets = new Set();
      if (b.homing > 0) {
        const target = nearestEnemy(b.x, b.y, 230);
        if (target) {
          const speed = Math.hypot(b.vx, b.vy);
          const current = Math.atan2(b.vy, b.vx);
          const wanted = Math.atan2(target.y - b.y, target.x - b.x);
          const steered = current + angleDelta(current, wanted) * Math.min(1, b.homing * dt);
          b.vx = Math.cos(steered) * speed;
          b.vy = Math.sin(steered) * speed;
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -30 || b.x > WORLD_W + 30 || b.y < -30 || b.y > WORLD_H + 30) b.dead = true;
      for (const e of game.enemies) {
        if (e.dead || b.dead || b.hitTargets.has(e)) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
          b.hitTargets.add(e);
          damageEnemy(e, b.damage, b.crit);
          if (b.frost && !e.dead) {
            e.frozen = Math.max(e.frozen || 0, b.frost);
            burst(e.x, e.y, "#8be0ff", 5, 70);
          }
          if (b.splash) {
            ringEffect(e.x, e.y, "#ff765f", b.splash);
            for (const other of game.enemies) if (other !== e && !other.dead && dist(other, e) < b.splash) damageEnemy(other, b.damage * .36, false);
          }
          const bounceTarget = b.ricochet > 0 ? nearestEnemy(e.x, e.y, 310, e) : null;
          if (bounceTarget) {
            const speed = Math.hypot(b.vx, b.vy) * 1.04;
            const a = Math.atan2(bounceTarget.y - e.y, bounceTarget.x - e.x);
            b.x = e.x + Math.cos(a) * (e.radius + b.radius + 5);
            b.y = e.y + Math.sin(a) * (e.radius + b.radius + 5);
            b.vx = Math.cos(a) * speed;
            b.vy = Math.sin(a) * speed;
            b.ricochet--;
            b.life += .22;
            burst(e.x, e.y, "#ffe56d", 4, 75);
          } else if (b.pierce > 0) b.pierce--;
          else b.dead = true;
        }
      }
    }
    game.bullets = game.bullets.filter((b) => !b.dead);
  }

  function damageEnemy(enemy, amount, crit = false) {
    if ((enemy.frozen || 0) > 0) amount *= 1.22;
    if (isBossType(enemy.type)) {
      amount *= .72;
      amount = Math.min(amount, enemy.maxHp * .032);
    }
    enemy.hp -= amount;
    enemy.hit = .11;
    game.shake = Math.max(game.shake, crit ? .2 : .07);
    floatText(enemy.x, enemy.y - enemy.radius, `${Math.round(amount)}`, crit ? "#ffe169" : "#f5e7ca", crit ? 16 : 11);
    for (let i = 0; i < (crit ? 6 : 3); i++) game.particles.push({ x: enemy.x, y: enemy.y, vx: rand(-110, 110), vy: rand(-110, 110), life: rand(.14, .3), maxLife: .3, size: rand(2, 5), color: crit ? "#ffe169" : enemy.color, alpha: 1, shape: "square" });
    sound.hit();
    if (enemy.hp <= 0) killEnemy(enemy);
  }

  function killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    game.kills++;
    game.combo = game.comboTime > 0 ? game.combo + 1 : 1;
    game.comboTime = 2.6;
    const comboMultiplier = 1 + Math.min(2, game.combo * .06);
    const bossKill = isBossType(enemy.type);
    game.score += bossKill ? 500 + game.day * 140 : Math.round(enemy.xp * 1.4 * comboMultiplier);
    burst(enemy.x, enemy.y, enemy.color, bossKill ? 42 : 12, bossKill ? 260 : 150);
    if (bossKill) {
      sound.boom();
      game.shake = 1.4;
      for (let i = 0; i < 12; i++) dropPickup(i % 3 === 0 ? "water" : i % 3 === 1 ? "coin" : "xp", enemy.x + rand(-80, 80), enemy.y + rand(-80, 80), i % 3 === 2 ? 18 : 1);
      dropRelicChest(enemy.x, enemy.y, game.day);
      game.boss = null;
      game.hazards.length = 0;
      if (game.day === FINAL_DAY) setTimeout(() => finishRun(true), 900);
      else {
        showToast(`${bossDisplayName(enemy)} 已下线`, "阶段奖励到手，黎明即将到来");
        const reachDawn = () => {
          if (game.ended) return;
          if (state === "choice") { setTimeout(reachDawn, 500); return; }
          if (state === "playing") phaseTransition();
        };
        setTimeout(reachDawn, 850);
      }
      return;
    }
    if (enemy.type === "bloater") {
      for (let i = 0; i < 10; i++) enemyShoot(enemy, TAU * i / 10, 185, 7 + game.day);
      ringEffect(enemy.x, enemy.y, "#ff91b5", 105);
    }
    if (enemy.type === "glitch") {
      for (let i = 0; i < 2; i++) spawnEnemy("wasp", enemy.x + rand(-22, 22), enemy.y + rand(-22, 22));
      showToast("故障兽发生分裂", "特殊怪物死亡后会生成两只高速黄蜂");
    }
    if (enemy.affix === "splitting") {
      for (let i = 0; i < 2; i++) spawnEnemy("mite", enemy.x + rand(-24, 24), enemy.y + rand(-24, 24));
      floatText(enemy.x, enemy.y - 24, "精英分裂！", "#d89bf0", 12);
    }
    if (game.fusions.recursive && (game.harvestMomentum || activeCropAuras().has("thorn"))) spawnRecursiveBurst(enemy.x, enemy.y);
    if (game.combo === 10 || game.combo === 20 || game.combo === 35) {
      aiSay(`${game.combo} 连击！小芽的礼貌模块已自动卸载！`, 2.8);
      for (let i = 0; i < 4; i++) dropPickup("coin", enemy.x + rand(-25, 25), enemy.y + rand(-25, 25), 1);
      game.shake = .55;
    }
    const xpPieces = enemy.xp > 20 ? 3 : enemy.xp > 12 ? 2 : 1;
    for (let i = 0; i < xpPieces; i++) dropPickup("xp", enemy.x, enemy.y, enemy.xp / xpPieces);
    if (chance(.18 + game.dropLuck)) dropPickup("water", enemy.x + rand(-9, 9), enemy.y + rand(-9, 9), 1);
    if (chance(.42 + game.dropLuck)) dropPickup("coin", enemy.x + rand(-12, 12), enemy.y + rand(-12, 12), 1);
    const cloneCrop = game.plots.find((plot) => plot.state === "ready" && CROP_TYPES[plot.crop].id === "clone");
    if (cloneCrop && chance(cloneCrop.mutation ? .28 : .13)) dropPickup("xp", enemy.x + rand(-18, 18), enemy.y + rand(-18, 18), enemy.xp * .55);
  }

  function addOverclock(amount) {
    if (game.overclockTime > 0) {
      game.overclockTime = Math.min(11, game.overclockTime + amount * .025);
      return;
    }
    game.overclock = Math.min(100, game.overclock + amount);
    if (game.overclock >= 100) {
      game.overclock = 0;
      game.overclockTime = 8;
      game.shake = .8;
      burst(game.player.x, game.player.y, "#ff83ad", 32, 250);
      ringEffect(game.player.x, game.player.y, "#fff176", 180);
      aiSay("收成超频——这次火力真的是从地里长出来的！", 4);
      showToast("AI 收成超频", "作物积累的能量在 8 秒内提高攻速、移速与生长");
      sound.level();
    }
  }

  function spawnRecursiveBurst(x, y) {
    const p = game.player;
    for (let i = 0; i < 6; i++) {
      const a = (TAU * i) / 6 + game.elapsed;
      game.bullets.push({ x, y, vx: Math.cos(a) * 460, vy: Math.sin(a) * 460, radius: 3.5, damage: p.damage * .5, life: .78, pierce: 0, ricochet: 0, homing: 2, crit: false, recursive: true, dead: false });
    }
    ringEffect(x, y, "#81e083", 60);
  }

  function updateEnemies(dt) {
    const p = game.player;
    for (const e of game.enemies) {
      if (e.dead) continue;
      e.age += dt;
      e.hit = Math.max(0, e.hit - dt);
      e.attackTimer -= dt;
      e.shootTimer -= dt;
      e.specialTimer -= dt;
      e.frozen = Math.max(0, (e.frozen || 0) - dt);
      if (e.enter > 0) {
        e.enter -= dt;
        e.y += 36 * dt;
        continue;
      }

      if (isBossType(e.type)) {
        updateBoss(e, dt);
        continue;
      }

      if (game.phase !== "night") e.targetPlot = null;
      if (e.targetPlot && e.targetPlot.state === "empty") e.targetPlot = null;
      if (game.phase === "night" && e.type === "thief" && !e.targetPlot && e.specialTimer <= 0) { e.targetPlot = getVulnerablePlot(true); e.specialTimer = 1.2; }
      const target = e.targetPlot || p;
      let dx = target.x - e.x;
      let dy = target.y - e.y;
      let d = Math.hypot(dx, dy) || 1;
      const desired = norm(dx, dy);

      const chill = e.frozen > 0 ? .38 : 1;
      if (e.type === "healer") {
        const ally = game.enemies.filter((other) => other !== e && !other.dead && other.hp < other.maxHp).sort((a, b) => dist(a, e) - dist(b, e))[0];
        const healTarget = ally && dist(ally, e) < 520 ? ally : p;
        const healDir = norm(healTarget.x - e.x, healTarget.y - e.y);
        e.vx = lerp(e.vx, healDir.x * e.speed * chill, dt * 2.5); e.vy = lerp(e.vy, healDir.y * e.speed * chill, dt * 2.5);
        if (e.specialTimer <= 0) {
          let healed = 0;
          for (const other of game.enemies) if (other !== e && !other.dead && dist(other, e) < 245) { other.hp = Math.min(other.maxHp, other.hp + other.maxHp * .16); healed++; }
          ringEffect(e.x, e.y, "#8beba5", 245); floatText(e.x, e.y - 30, `修复 ×${healed}`, "#9af0ad", 12); e.specialTimer = 4.5;
        }
      } else if (e.type === "spitter" || e.type === "bloater") {
        const playerDist = dist(e, p);
        const moveSign = playerDist < 185 ? -1 : playerDist > 270 ? 1 : 0;
        e.vx = lerp(e.vx, (desired.x * e.speed * moveSign + Math.cos(e.age * 2 + e.seed) * 24) * chill, dt * 3);
        e.vy = lerp(e.vy, (desired.y * e.speed * moveSign + Math.sin(e.age * 2 + e.seed) * 24) * chill, dt * 3);
        if (e.shootTimer <= 0 && playerDist < 460) {
          enemyShoot(e, Math.atan2(p.y - e.y, p.x - e.x), 250, e.damage);
          e.shootTimer = e.type === "bloater" ? rand(2.1, 2.7) : rand(1.35, 1.85);
        }
      } else {
        const wobble = Math.sin(e.age * 4 + e.seed) * .22;
        const a = Math.atan2(desired.y, desired.x) + wobble;
        const charge = e.type === "boar" && d < 260 ? 1.2 : e.type === "wasp" ? 1.1 : e.type === "glitch" ? 1 + Math.max(0, Math.sin(e.age * 8)) * .9 : 1;
        e.vx = lerp(e.vx, Math.cos(a) * e.speed * charge * chill, dt * 5);
        e.vy = lerp(e.vy, Math.sin(a) * e.speed * charge * chill, dt * 5);
      }
      e.facing = Math.atan2(e.vy, e.vx);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.x = clamp(e.x, 20, WORLD_W - 20);
      e.y = clamp(e.y, 20, WORLD_H - 20);

      if (game.phase === "night" && enemyCanAttackCrops(e) && e.targetPlot && d < e.radius + e.targetPlot.radius && e.attackTimer <= 0) {
        if (e.type === "thief") {
          const stolen = e.targetPlot.crop;
          clearPlot(e.targetPlot);
          e.targetPlot = null;
          e.speed *= 1.35;
          showToast("掠种贼偷走了成熟作物", `${CROP_TYPES[stolen].name} 已丢失，优先击杀橙色窃贼`);
          updateMission("紧急：种子掠夺", "橙色掠种贼会直接偷走成熟作物并加速逃跑");
        } else damagePlot(e.targetPlot, e.damage * (e.type === "boar" ? 1.5 : 1));
        e.attackTimer = .72;
      } else if (dist(e, p) < e.radius + p.radius && e.attackTimer <= 0) {
        hurtPlayer(e.damage, e.x, e.y);
        if (e.affix === "leeching") { e.hp = Math.min(e.maxHp, e.hp + e.damage * 2); floatText(e.x, e.y - e.radius, "虹吸", "#ef7f9e", 10); }
        e.attackTimer = .75;
      }
    }
    game.enemies = game.enemies.filter((e) => !e.dead);
  }

  function updateBoss(e, dt) {
    const p = game.player;
    const hpRatio = e.hp / e.maxHp;
    const nextStage = hpRatio <= .33 ? 2 : hpRatio <= .66 ? 1 : 0;
    if (nextStage > (e.enrageStage || 0)) {
      e.enrageStage = nextStage;
      e.speed *= 1.14;
      e.damage *= 1.12;
      e.skillTimer = .28;
      e.shootTimer = .2;
      e.summonTimer = .55;
      game.freezeTimer = Math.max(game.freezeTimer, .55);
      game.shake = 1.2;
      ringEffect(e.x, e.y, nextStage === 1 ? "#ffca68" : "#ff547e", 230);
      burst(e.x, e.y, nextStage === 1 ? "#ffca68" : "#ff547e", 34, 250);
      showToast(`${bossDisplayName(e)} · 狂暴阶段 ${nextStage + 1}`, nextStage === 1 ? "攻击节奏加快，首领立即释放技能" : "最终阶段：弹幕、召唤与碰撞伤害全面提升");
      aiSay(nextStage === 1 ? "血量阈值触发！它换阶段了，别把爆发全交在第一管血。" : "最终阶段！保命、躲红圈，然后再输出！", 4);
      sound.boom();
    }
    e.skillTimer -= dt;
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    const preferred = e.type === "crowboss" ? 235 : hpRatio < .45 ? 210 : 280;
    const d = dist(e, p);
    const moveSign = d < preferred - 30 ? -1 : d > preferred + 30 ? 1 : 0;
    const stageSpeed = 1 + (e.enrageStage || 0) * .16;
    const orbitSpeed = (e.type === "crowboss" ? 96 : e.type === "slimeboss" ? 31 : 42) * stageSpeed;
    e.vx = lerp(e.vx, Math.cos(a) * e.speed * moveSign + Math.cos(e.age * .8) * orbitSpeed, dt * 1.5);
    e.vy = lerp(e.vy, Math.sin(a) * e.speed * moveSign + Math.sin(e.age * .8) * orbitSpeed, dt * 1.5);
    e.x = clamp(e.x + e.vx * dt, 70, WORLD_W - 70);
    e.y = clamp(e.y + e.vy * dt, 70, WORLD_H - 70);
    e.facing = a;

    if (e.skillTimer <= 0) {
      castBossSkill(e, a, hpRatio);
      e.skillTimer = (e.type === "crowboss" ? (hpRatio < .5 ? 3.4 : 4.4) : e.type === "slimeboss" ? (hpRatio < .5 ? 4 : 5.2) : (hpRatio < .5 ? 3 : 4.1)) * (1 - (e.enrageStage || 0) * .13) * (e.variant.skill || 1);
    }

    if (e.shootTimer <= 0) {
      if (e.type === "crowboss") {
        const wing = 3 + Math.floor((e.variant.shots || 0) / 2);
        const bulletSpeed = (355 + (1 - hpRatio) * 80) * (e.variant.id === "storm" ? 1.15 : 1);
        for (let i = -wing; i <= wing; i++) enemyShoot(e, a + i * .13, bulletSpeed, 9 + game.day);
        if (hpRatio < .5) for (let i = 0; i < 8; i++) enemyShoot(e, e.age + TAU * i / 8, 245, 9);
        e.shootTimer = hpRatio < .5 ? .72 : 1.05;
      } else if (e.type === "slimeboss") {
        const shots = (hpRatio < .5 ? 18 : 12) + (e.variant.id === "acid" ? 2 : 0);
        for (let i = 0; i < shots; i++) enemyShoot(e, e.age * .35 + TAU * i / shots, hpRatio < .5 ? 235 : 190, 12);
        e.shootTimer = hpRatio < .5 ? .82 : 1.15;
      } else if (hpRatio > .55) {
        const wing = 3 + Math.floor((e.variant.shots || 0) / 2);
        for (let i = -wing; i <= wing; i++) enemyShoot(e, a + i * .15, 315, 13);
        e.shootTimer = 1.12;
      } else {
        const shots = 18;
        const offset = e.age * .55;
        for (let i = 0; i < shots; i++) enemyShoot(e, offset + (TAU * i) / shots, 245, 12);
        e.shootTimer = .78;
      }
      game.shake = .25;
      sound.tone(115, .15, "sawtooth", .045, -30);
    }
    e.summonTimer -= dt;
    if (e.summonTimer <= 0) {
      const count = (hpRatio < .5 ? 5 : 3) + (e.enrageStage || 0) + (e.variant.summons || 0);
      const summonType = e.type === "crowboss" ? "wasp" : e.type === "slimeboss" ? "leech" : chance(.35) ? "bloater" : "spitter";
      for (let i = 0; i < count; i++) spawnEnemy(summonType, e.x + rand(-90, 90), e.y + rand(-90, 90));
      e.summonTimer = hpRatio < .5 ? 3.8 : 5.2;
      showToast(`${bossDisplayName(e)} 呼叫增援`, "首领机制升级，保持移动");
    }
    if (dist(e, p) < e.radius + p.radius && e.attackTimer <= 0) {
      hurtPlayer(e.damage, e.x, e.y);
      e.attackTimer = .8;
    }
  }

  function castBossSkill(e, angle, hpRatio) {
    if (e.type === "crowboss") {
      for (let i = -1; i <= 1; i++) game.hazards.push({ kind: "line", x: e.x, y: e.y, angle: angle + i * .2, length: 760, width: 54, time: .95, maxTime: .95, damage: 17, color: "#ff708d", dead: false });
      showToast("鸦王技能 · 三连俯冲", "红色直线锁定后会造成高伤害");
    } else if (e.type === "slimeboss") {
      for (let i = 0; i < (hpRatio < .5 ? 5 : 3); i++) {
        const a = TAU * i / (hpRatio < .5 ? 5 : 3);
        game.hazards.push({ kind: "circle", x: game.player.x + Math.cos(a) * (i ? 125 : 0), y: game.player.y + Math.sin(a) * (i ? 125 : 0), radius: 82 * (e.variant.hazard || 1), time: 1.15 + i * .08, maxTime: 1.55, damage: 15, color: "#73df9c", dead: false });
      }
      showToast("史莱姆技能 · 缓存泄漏", "绿色腐蚀区即将爆发，向空地移动");
    } else {
      game.hazards.push({ kind: "ring", x: game.player.x, y: game.player.y, radius: 150, width: 48, time: 1.15, maxTime: 1.15, damage: 19, color: "#e782c1", dead: false });
      game.hazards.push({ kind: "circle", x: game.player.x, y: game.player.y, radius: 64, time: 1.15, maxTime: 1.15, damage: 19, color: "#ffbd6d", dead: false });
      if (e.variant.cropHazard) {
        const targets = game.plots.filter((plot) => plot.state !== "empty").sort(() => Math.random() - .5).slice(0, 2);
        for (const plot of targets) game.hazards.push({ kind: "circle", x: plot.x, y: plot.y, radius: 52, time: 1.35, maxTime: 1.35, damage: 28, color: "#8fca67", cropOnly: true, targetPlot: plot, dead: false });
      }
      showToast("暴君技能 · 枯萎年轮", "中心与外环同时爆发，站在两者之间的安全带");
    }
    game.shake = .45;
    sound.tone(92, .3, "sawtooth", .04, 80);
  }

  function pointLineDistance(px, py, x, y, angle, length) {
    const x2 = x + Math.cos(angle) * length, y2 = y + Math.sin(angle) * length;
    const vx = x2 - x, vy = y2 - y, wx = px - x, wy = py - y;
    const t = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy), 0, 1);
    return Math.hypot(px - (x + vx * t), py - (y + vy * t));
  }

  function updateHazards(dt) {
    for (const hazard of game.hazards) {
      hazard.time -= dt;
      if (hazard.time > 0 || hazard.dead) continue;
      hazard.dead = true;
      let hit = false;
      if (!hazard.cropOnly && hazard.kind === "line") hit = pointLineDistance(game.player.x, game.player.y, hazard.x, hazard.y, hazard.angle, hazard.length) < hazard.width / 2 + game.player.radius;
      if (!hazard.cropOnly && hazard.kind === "circle") hit = Math.hypot(game.player.x - hazard.x, game.player.y - hazard.y) < hazard.radius + game.player.radius;
      if (!hazard.cropOnly && hazard.kind === "ring") hit = Math.abs(Math.hypot(game.player.x - hazard.x, game.player.y - hazard.y) - hazard.radius) < hazard.width / 2 + game.player.radius;
      if (hit) hurtPlayer(hazard.damage, hazard.x, hazard.y);
      if (hazard.cropOnly && hazard.targetPlot) damagePlot(hazard.targetPlot, hazard.damage);
      ringEffect(hazard.x, hazard.y, hazard.color, hazard.kind === "line" ? 95 : hazard.radius + (hazard.width || 0));
      burst(hazard.kind === "line" ? hazard.x + Math.cos(hazard.angle) * hazard.length * .55 : hazard.x, hazard.kind === "line" ? hazard.y + Math.sin(hazard.angle) * hazard.length * .55 : hazard.y, hazard.color, 22, 220);
      game.shake = .75; sound.boom();
    }
    game.hazards = game.hazards.filter((hazard) => !hazard.dead);
  }

  function enemyShoot(enemy, angle, speed, damage) {
    game.enemyBullets.push({
      x: enemy.x + Math.cos(angle) * enemy.radius,
      y: enemy.y + Math.sin(angle) * enemy.radius,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: isBossType(enemy.type) ? 7 : 5,
      damage,
      life: 4,
      dead: false,
      color: isBossType(enemy.type) ? (enemy.type === "crowboss" ? "#b3a2ee" : enemy.type === "slimeboss" ? "#83dfac" : "#de79bb") : "#c28ad0"
    });
  }

  function updateEnemyBullets(dt) {
    const p = game.player;
    for (const b of game.enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -30 || b.x > WORLD_W + 30 || b.y < -30 || b.y > WORLD_H + 30) b.dead = true;
      if (!b.dead && Math.hypot(b.x - p.x, b.y - p.y) < b.radius + p.radius) {
        b.dead = true;
        hurtPlayer(b.damage, b.x - b.vx, b.y - b.vy);
      }
    }
    game.enemyBullets = game.enemyBullets.filter((b) => !b.dead);
  }

  function hurtPlayer(amount, fromX, fromY) {
    const p = game.player;
    if (p.hurtCooldown > 0 || p.dashTime > 0 || game.ended) return;
    if (p.dodge > 0 && chance(p.dodge)) {
      p.hurtCooldown = .28;
      floatText(p.x, p.y - 34, "闪避！", "#d8b7ff", 14);
      ringEffect(p.x, p.y, "#d7b1ff", 58);
      sound.tone(740, .07, "sine", .025, 180);
      return;
    }
    amount *= p.armor;
    const anchorLevel = game.items.anchor || 0;
    if (anchorLevel) {
      const ratio = p.stationaryCharge / p.stationaryMax;
      amount *= 1 - ratio * (.07 + anchorLevel * .055 + (game.fusions.turret ? .08 : 0));
    }
    let remaining = amount;
    if (p.shield > 0) {
      const shieldBefore = p.shield;
      const absorbed = Math.min(p.shield, remaining);
      p.shield -= absorbed;
      remaining -= absorbed;
      floatText(p.x, p.y - 27, `护盾 -${Math.round(absorbed)}`, "#80d8cf", 11);
      ringEffect(p.x, p.y, "#79f4ee", 48);
      sound.tone(280, .08, "triangle", .045, 220);
      if (shieldBefore > 0 && p.shield <= 0) shieldBreak();
    }
    if ((game.items.anchor || 0) && p.stationaryCharge > 0) {
      const ratio = p.stationaryCharge / p.stationaryMax;
      ctx.strokeStyle = `rgba(123,224,171,${.25 + ratio * .65})`; ctx.lineWidth = 3 + ratio * 3;
      ctx.beginPath(); ctx.arc(0, 0, 34 + ratio * 12, 0, TAU); ctx.stroke();
      for (let i = 0; i < 4; i++) { const a = TAU * i / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28); ctx.lineTo(Math.cos(a) * (42 + ratio * 10), Math.sin(a) * (42 + ratio * 10)); ctx.stroke(); }
    }
    p.hp -= remaining;
    p.hurtCooldown = .62;
    const away = norm(p.x - fromX, p.y - fromY);
    p.x += away.x * 16;
    p.y += away.y * 16;
    game.shake = .72;
    game.flash = remaining > 0 ? .7 : 0;
    burst(p.x, p.y, remaining > 0 ? "#ff685e" : "#75eee7", 11, 150);
    if (remaining > 0) sound.hurt();
    if (p.hp <= 0) {
      p.hp = 0;
      finishRun(false);
    }
  }

  function shieldBreak() {
    game.shake = 1.05;
    game.shieldFlash = 1;
    ringEffect(game.player.x, game.player.y, "#7ff8f0", 210);
    burst(game.player.x, game.player.y, "#aafff6", 38, 290);
    floatText(game.player.x, game.player.y - 48, "护盾碎裂！", "#9efff6", 18);
    sound.tone(620, .18, "sine", .075, -420);
    setTimeout(() => sound.tone(180, .22, "sawtooth", .05, -80), 70);
    for (const enemy of game.enemies) if (!enemy.dead && dist(enemy, game.player) < 190) enemy.frozen = Math.max(enemy.frozen || 0, 1.25);
    aiSay("防火墙炸成烟花了！附近害兽已短暂宕机。", 3);
  }

  function updatePlots(dt) {
    for (const plot of game.plots) {
      plot.hit = Math.max(0, plot.hit - dt);
      plot.sway += dt;
      if (plot.state === "growing") {
        plot.wet = Math.max(0, plot.wet - dt);
        if (plot.wet > 0) {
          plot.growth += dt * game.cropGrowth * plot.growMod * (game.overclockTime > 0 ? 2 : 1) * (game.activeEvent === "growstorm" ? 3 : 1);
          if (plot.growth >= CROP_TYPES[plot.crop].grow) {
            maturePlot(plot);
          }
        }
      }
    }
  }

  function maturePlot(plot) {
    if (plot.state === "ready") return;
    plot.state = "ready";
    plot.growth = CROP_TYPES[plot.crop].grow;
    const diversity = new Set(game.plots.filter((other) => other.zone === plot.zone && other.crop !== null).map((other) => other.crop)).size;
    plot.mutation = chance(.05 + diversity * .055 + (plot.zone === "ruin" ? .13 : 0));
    const combo = COMBO_PLANTS.find((entry) => game.comboCards[entry.id] && game.plots.some((other) => {
      if (other === plot || other.zone !== plot.zone || other.state !== "ready" || other.comboPlant || dist(other, plot) >= 112) return false;
      return (entry.pair[0] === plot.crop && entry.pair[1] === other.crop) || (entry.pair[1] === plot.crop && entry.pair[0] === other.crop);
    }));
    if (combo) {
      const donor = game.plots.find((other) => other !== plot && other.zone === plot.zone && other.state === "ready" && !other.comboPlant && dist(other, plot) < 112 && ((combo.pair[0] === plot.crop && combo.pair[1] === other.crop) || (combo.pair[1] === plot.crop && combo.pair[0] === other.crop)));
      if (donor) {
        clearPlot(donor);
        plot.comboPlant = combo.id;
        plot.hybrid = null;
        plot.passiveTimer = 0;
        plot.maxHp = 165;
        plot.hp = plot.maxHp;
        game.comboPlantCount++;
        discoverEntry(`combo:${combo.id}`, 3);
        showToast(`组合完成 · ${combo.name}`, combo.copy);
        floatText(plot.x, plot.y - 58, combo.name, combo.color, 15);
        ringEffect(plot.x, plot.y, combo.color, 185);
        sound.boom();
      }
    }
    if (!plot.comboPlant) {
      const donor = game.plots.find((other) => other !== plot && other.zone === plot.zone && other.state === "ready" && other.crop !== plot.crop && !other.comboPlant && dist(other, plot) < 112);
      const hybrid = donor ? HYBRIDS.find((entry) => entry.pair.includes(plot.crop) && entry.pair.includes(donor.crop)) : null;
      if (hybrid) {
        const hybridChance = Math.min(.94, .34 + (plot.mutation ? .12 : 0) + game.hybridPity);
        if (chance(hybridChance)) {
          plot.hybrid = hybrid.id;
          game.hybridCount++;
          game.hybridPity = 0;
          recordHybridAchievement();
          discoverEntry(`hybrid:${hybrid.id}`, 2);
          showToast(`杂交成功 · ${hybrid.name}`, hybrid.copy);
          floatText(plot.x, plot.y - 52, hybrid.name, hybrid.color, 14);
          ringEffect(plot.x, plot.y, hybrid.color, 135);
        } else {
          game.hybridPity = Math.min(.48, game.hybridPity + .12);
          floatText(plot.x, plot.y - 48, `杂交积累 ${Math.round(game.hybridPity * 100)}%`, "#e0b8ff", 10);
        }
      }
    }
    if (!plot.comboPlant && CROP_TYPES[plot.crop].id === "clone") {
      const mimicDonor = game.plots.filter((other) => other !== plot && other.state === "ready" && CROP_TYPES[other.crop].id !== "clone").sort((a, b) => dist(a, plot) - dist(b, plot))[0];
      plot.mimicCrop = mimicDonor ? mimicDonor.crop : 2;
      floatText(plot.x, plot.y - 46, `模仿${CROP_TYPES[plot.mimicCrop].name}`, "#d9b1ff", 11);
    }
    burst(plot.x, plot.y - 4, plot.mutation ? "#fff178" : CROP_TYPES[plot.crop].color, plot.mutation ? 20 : 10, plot.mutation ? 160 : 85);
    if (plot.mutation) {
      ringEffect(plot.x, plot.y, "#fff178", 110);
      floatText(plot.x, plot.y - 35, "异变作物！", "#fff178", 14);
      showToast("多样化种植触发异变", "混种越丰富，作物越可能获得双倍收获和强化光环");
    }
    sound.tone(510, .16, "sine", .03, 220);
  }

  function updateCropPassives(dt) {
    game.cropPulseTimer -= dt;
    if (game.cropPulseTimer > 0) return;
    game.cropPulseTimer = 1;
    for (const plot of game.plots) {
      if (plot.state !== "ready") continue;
      const crop = CROP_TYPES[plot.crop];
      const pulsePower = plot.mutation ? 1.7 : 1;
      const hybrid = plot.hybrid;
      plot.passiveTimer -= 1;
      if (plot.comboPlant) {
        const combo = COMBO_PLANTS.find((entry) => entry.id === plot.comboPlant);
        if (plot.passiveTimer <= 0 && combo.id === "peacannon") {
          const target = nearestEnemy(plot.x, plot.y, 820);
          if (target) {
            const a = Math.atan2(target.y - plot.y, target.x - plot.x);
            game.bullets.push({ x: plot.x, y: plot.y, vx: Math.cos(a) * 680, vy: Math.sin(a) * 680, radius: 9, damage: game.player.damage * 2.55 * combatCropMultiplier(false), life: 1.7, pierce: 4, ricochet: 0, homing: 2.5, splash: 92, crit: false, cropColor: combo.color, dead: false });
            game.shake = Math.max(game.shake, .35);
            sound.boom();
          }
          plot.passiveTimer = 3;
        } else if (plot.passiveTimer <= 0 && combo.id === "solarforge") {
          dropPickup("sun", plot.x, plot.y - 18, 2);
          game.player.shield = Math.min(70, game.player.shield + 3);
          grantHarvestMomentum(1);
          ringEffect(plot.x, plot.y, combo.color, 150);
          plot.passiveTimer = 4;
        } else if (plot.passiveTimer <= 0 && combo.id === "cryoforge") {
          let hits = 0;
          for (const enemy of game.enemies) if (!enemy.dead && dist(enemy, plot) < 300) {
            damageEnemy(enemy, (30 + game.player.damage * .58) * combatCropMultiplier(false), false);
            enemy.frozen = Math.max(enemy.frozen || 0, 2.1);
            hits++;
          }
          if (hits) { ringEffect(plot.x, plot.y, combo.color, 300); burst(plot.x, plot.y, combo.color, 18, 210); sound.boom(); }
          plot.passiveTimer = 3;
        }
        continue;
      }
      if (crop.id === "sun" && plot.passiveTimer <= 0) {
        dropPickup("sun", plot.x, plot.y - 12, pulsePower);
        plot.passiveTimer = hybrid === "twinsun" ? 1.5 : plot.mutation ? 2 : 4;
        burst(plot.x, plot.y, crop.color, 5, 55);
      }
      if (crop.id === "thorn") {
        const target = nearestEnemy(plot.x, plot.y, 420);
        if (target) {
          const a = Math.atan2(target.y - plot.y, target.x - plot.x);
          const hybridCrit = hybrid === "prismpea" && chance(.32);
          game.bullets.push({ x: plot.x, y: plot.y, vx: Math.cos(a) * 540, vy: Math.sin(a) * 540, radius: 5, damage: game.player.damage * .46 * pulsePower * game.thornPower * (hybridCrit ? 1.7 : 1), life: 1.2, pierce: hybrid === "railpea" ? 3 : 1, ricochet: 0, homing: hybrid === "railpea" ? 7 : 1.6, crit: hybridCrit, cropColor: hybrid ? HYBRIDS.find((entry) => entry.id === hybrid).color : crop.color, dead: false });
        }
      }
      if (crop.id === "magnet") for (const item of game.pickups) if (dist(item, plot) < 300) { item.vx += (plot.x - item.x) * .35; item.vy += (plot.y - item.y) * .35; }
      if (crop.id === "mint") for (const enemy of game.enemies) if (!enemy.dead && dist(enemy, plot) < 220) enemy.frozen = Math.max(enemy.frozen || 0, .75 * pulsePower);
      if (crop.id === "clone") {
        const target = nearestEnemy(plot.x, plot.y, 520);
        if (target) { const a = Math.atan2(target.y - plot.y, target.x - plot.x); const copied = CROP_TYPES[plot.mimicCrop ?? 2].id; game.bullets.push({ x: plot.x, y: plot.y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, radius: 4, damage: game.player.damage * .4 * pulsePower, life: 1.2, pierce: copied === "thorn" ? 1 : 0, ricochet: 0, homing: copied === "magnet" ? 5 : 2, frost: copied === "mint" ? 1.2 : 0, splash: copied === "pepper" ? 48 : 0, crit: false, cropColor: crop.color, dead: false }); }
      }
    }
  }

  function damagePlot(plot, amount) {
    if (game.phase !== "night" || plot.state === "empty") return;
    plot.hp -= amount / (game.cropArmor * plot.armorMod);
    plot.hit = .2;
    floatText(plot.x, plot.y - 23, `-${Math.round(amount / (game.cropArmor * plot.armorMod))}`, "#ff9c76", 10);
    game.particles.push({ x: plot.x, y: plot.y, vx: rand(-75, 75), vy: rand(-100, -25), life: .4, maxLife: .4, size: 4, color: "#7b553d", alpha: 1, shape: "square" });
    if (plot.hp <= 0) {
      showToast(`${plot.crop !== null ? CROP_TYPES[plot.crop].name : "作物"}被啃毁`, "夜间害兽会优先攻击庄稼");
      burst(plot.x, plot.y, "#77513b", 13, 130);
      clearPlot(plot);
    }
  }

  function clearPlot(plot) {
    plot.state = "empty";
    plot.crop = null;
    plot.growth = 0;
    plot.wet = 0;
    plot.maxHp = 100;
    plot.hp = plot.maxHp;
    plot.mutation = false;
    plot.mimicCrop = null;
    plot.hybrid = null;
    plot.comboPlant = null;
    plot.passiveTimer = rand(1, 3);
  }

  function nearestPlot() {
    let best = null;
    let bestDist = Infinity;
    for (const plot of game.plots) {
      const d = dist(game.player, plot);
      if (d < bestDist) { best = plot; bestDist = d; }
    }
    return bestDist < 61 ? best : null;
  }

  function nearestChest() {
    return game.chests.filter((chest) => !chest.opened && dist(game.player, chest) < 74).sort((a, b) => dist(game.player, a) - dist(game.player, b))[0] || null;
  }

  function updateInteraction() {
    const chest = nearestChest();
    if (chest) {
      ui.context.querySelector("span").textContent = `开启第 ${chest.day} 夜遗物箱`;
      ui.context.classList.remove("hidden");
      if (input.interact) {
        input.interact = false;
        chest.opened = true;
        showRelicChoice(chest);
      }
      return;
    }
    const plot = nearestPlot();
    if (!plot) {
      if (game.selectedTool === "shovel" && (game.activeTools.shovel || 0) > 0) {
        ui.context.querySelector("span").textContent = `在当前位置开垦新田 · 耐久 ${game.activeTools.shovel}`;
        ui.context.classList.remove("hidden");
        if (input.interact) { input.interact = false; digPlot(); }
      } else {
        ui.context.classList.add("hidden");
        input.interact = false;
      }
      return;
    }
    let hint = "";
    if (plot.state === "empty") hint = game.seeds[game.selectedSeed] > 0 ? `播种${CROP_TYPES[game.selectedSeed].name}` : `${CROP_TYPES[game.selectedSeed].name}种子不足`;
    else if (plot.state === "ready" && plot.comboPlant) hint = `收获${COMBO_PLANTS.find((entry) => entry.id === plot.comboPlant).name}，永久获得本局属性`;
    else if (plot.state === "ready") hint = `收获${CROP_TYPES[plot.crop].name}`;
    else if (plot.wet <= 2) hint = game.water > 0 ? "浇水，恢复生长" : "缺少灌溉水";
    else hint = `成长中 ${Math.floor((plot.growth / CROP_TYPES[plot.crop].grow) * 100)}%`;
    ui.context.querySelector("span").textContent = hint;
    ui.context.classList.remove("hidden");
    if (!input.interact) return;
    input.interact = false;

    if (plot.state === "empty") {
      if (game.seeds[game.selectedSeed] <= 0) { floatText(plot.x, plot.y - 25, "种子不足", "#ff9b79", 12); return; }
      plantPlot(plot, game.selectedSeed, "手动播种");
    } else if (plot.state === "ready") {
      harvest(plot);
    } else if (plot.wet <= 2) {
      if (game.water <= 0) { floatText(plot.x, plot.y - 25, "没有水", "#ff9b79", 12); return; }
      game.water--;
      plot.wet = 10;
      burst(plot.x, plot.y, "#65c8dc", 8, 60);
      floatText(plot.x, plot.y - 24, "湿润", "#87ddec", 11);
      sound.water();
    }
  }

  function plantPlot(plot, seedIndex, source = "播种") {
    if (!plot || plot.state !== "empty" || game.seeds[seedIndex] <= 0 || !game.carriedSeeds.includes(seedIndex)) return false;
    plot.crop = seedIndex;
    plot.state = "growing";
    plot.growth = 0;
    plot.wet = 8;
    plot.hp = plot.maxHp;
    plot.comboPlant = null;
    game.seeds[seedIndex]--;
    discoverEntry(`crop:${CROP_TYPES[seedIndex].id}`, 1);
    burst(plot.x, plot.y, CROP_TYPES[seedIndex].color, 7, 70);
    if (source !== "手动播种") floatText(plot.x, plot.y - 26, source, CROP_TYPES[seedIndex].color, 10);
    sound.plant();
    return true;
  }

  function harvestComboPlant(plot) {
    const combo = COMBO_PLANTS.find((entry) => entry.id === plot.comboPlant);
    if (!combo) return;
    const stacks = game.comboHarvestStacks[combo.id] || 0;
    if (stacks >= 3) {
      showToast(`${combo.name}已达到属性上限`, "仍可收获资源，但该组合的本局属性最多叠加 3 次");
    } else {
      game.comboHarvestStacks[combo.id] = stacks + 1;
      if (combo.id === "peacannon") game.player.damage *= 1.1;
      else if (combo.id === "solarforge") { game.player.maxHp += 12; game.player.hp = Math.min(game.player.maxHp, game.player.hp + 12); }
      else if (combo.id === "cryoforge") { game.player.armor *= .9; game.player.dodge = Math.min(.32, game.player.dodge + .03); }
    }
    game.crops++;
    game.score += 110;
    game.coins += 6;
    grantHarvestMomentum(2);
    addOverclock(20);
    const statCopy = combo.id === "peacannon" ? "攻击力 +10%" : combo.id === "solarforge" ? "最大生命 +12" : "受伤 -10%，闪避 +3%";
    showToast(`组合收获 · ${combo.name}`, `${statCopy}；生物质 +6（属性最多叠加 3 次）`);
    floatText(plot.x, plot.y - 62, statCopy, combo.color, 14);
    ringEffect(plot.x, plot.y, combo.color, 260);
    burst(plot.x, plot.y, combo.color, 30, 230);
    sound.boom();
    clearPlot(plot);
  }

  function applyHybridHarvestStat(plot) {
    if (!plot.hybrid) return;
    const stacks = game.hybridStatStacks[plot.hybrid] || 0;
    if (stacks >= 5) return;
    game.hybridStatStacks[plot.hybrid] = stacks + 1;
    let copy = "";
    if (plot.hybrid === "sunpepper") { game.player.damage *= 1.03; copy = "攻击力 +3%"; }
    else if (plot.hybrid === "steampepper") { game.player.armor *= .97; copy = "所受伤害 -3%"; }
    else if (plot.hybrid === "prismpea") { game.player.crit = Math.min(.45, game.player.crit + .02); copy = "暴击率 +2%"; }
    else if (plot.hybrid === "railpea") { game.player.speed *= 1.02; copy = "移动速度 +2%"; }
    else if (plot.hybrid === "mirrorfrost") { game.player.dodge = Math.min(.32, game.player.dodge + .02); copy = "闪避率 +2%"; }
    else if (plot.hybrid === "twinsun") { game.player.maxHp += 4; game.player.hp += 4; copy = "最大生命 +4"; }
    if (copy) floatText(plot.x, plot.y - 58, `杂交属性 · ${copy}`, "#fff1a0", 12);
  }

  function harvest(plot) {
    if (plot.comboPlant) { harvestComboPlant(plot); return; }
    const type = plot.crop;
    const crop = CROP_TYPES[type];
    game.crops++;
    const harvestScale = plot.yieldMod * (plot.mutation ? 2 : 1);
    const effectYield = game.cropYield * harvestScale;
    const earlyYield = clamp(.58 + (game.day - 1) * .105, .58, 1);
    const scoreGain = Math.round(20 * game.cropYield * harvestScale * earlyYield);
    game.score += scoreGain;
    game.coins += Math.max(1, Math.floor(2.15 * game.cropYield * harvestScale * earlyYield));
    grantHarvestMomentum(1 + (plot.mutation ? 1 : 0));
    if (game.harvestShieldLevel) game.player.shield = Math.min(70, game.player.shield + 2 + game.harvestShieldLevel * 2);
    if (game.harvestCalibrator) {
      game.harvestCalibratorStacks = Math.min(15, (game.harvestCalibratorStacks || 0) + 1);
    }
    recordHarvestAchievement(crop.id);
    addOverclock(9);
    floatText(plot.x, plot.y - 30, `收获 +${scoreGain}`, crop.color, 14);
    floatText(game.player.x, game.player.y - 48, `丰收动能 ×${game.harvestMomentum}`, "#ffe36f", 11);
    burst(plot.x, plot.y, crop.color, 18, 165);
    sound.harvest();

    if (type === 0) {
      const radius = 150 * game.pepperRadius;
      for (const e of game.enemies) {
        if (!e.dead && Math.abs(e.y - plot.y) <= 78 * game.pepperRadius) damageEnemy(e, 54 * effectYield);
      }
      game.shake = .6;
      game.particles.push({ x: WORLD_W / 2, y: plot.y, vx: 0, vy: 0, life: .5, maxLife: .5, size: WORLD_W, color: crop.color, alpha: .8, shape: "lane" });
      sound.boom();
      if (game.fusions.hotchain) {
        const chainTargets = game.enemies.filter((e) => !e.dead && dist(e, plot) > radius).sort((a, b) => dist(a, plot) - dist(b, plot)).slice(0, 6);
        chainTargets.forEach((enemy, index) => {
          damageEnemy(enemy, 42 * effectYield * Math.pow(.82, index));
          ringEffect(enemy.x, enemy.y, index % 2 ? "#ffe15d" : "#ff6e7f", 75 + index * 8);
          burst(enemy.x, enemy.y, "#ffdd66", 9, 145);
        });
        if (chainTargets.length) aiSay(`链式爆辣命中 ${chainTargets.length} 只！建议不要品尝。`, 3);
      }
    } else if (type === 1) {
      const heal = Math.round(17 * game.sunPower * harvestScale);
      game.player.hp = Math.min(game.player.maxHp, game.player.hp + heal);
      game.player.shield = Math.min(60, game.player.shield + Math.round(9 * game.sunPower * harvestScale));
      floatText(game.player.x, game.player.y - 34, `生命 +${heal}`, "#ffe278", 13);
      if (game.fusions.solarwall) {
        let erased = 0;
        for (const bullet of game.enemyBullets) {
          if (dist(bullet, game.player) < 300) { bullet.dead = true; erased++; }
        }
        game.player.shield = Math.min(45, game.player.shield + 18);
        ringEffect(game.player.x, game.player.y, "#fff17a", 260);
        if (erased) floatText(game.player.x, game.player.y - 52, `净化弹幕 ×${erased}`, "#72dcd5", 12);
      }
    } else if (type === 2) {
      game.peaTime = Math.max(game.peaTime, 12 * game.thornPower * harvestScale);
      floatText(game.player.x, game.player.y - 34, `豌豆急射 ${Math.round(12 * game.thornPower * harvestScale)}s`, "#8ee785", 13);
      if (game.fusions.recursive) aiSay("递归豌豆上线：击杀会继续分裂火力。", 2.8);
    } else if (type === 3) {
      for (const item of game.pickups) { item.life = Math.max(item.life, 8); item.vx += (game.player.x - item.x) * .7; item.vy += (game.player.y - item.y) * .7; }
      let erased = 0;
      for (const bullet of game.enemyBullets) if (!bullet.dead) { bullet.dead = true; erased++; if (erased % 5 === 0) dropPickup("coin", bullet.x, bullet.y, 1); }
      addOverclock(38 * harvestScale);
      ringEffect(game.player.x, game.player.y, crop.color, 310);
      floatText(game.player.x, game.player.y - 34, `磁吸敌弹 ×${erased}`, crop.color, 14);
    } else if (type === 4) {
      let frozen = 0;
      for (const enemy of game.enemies) if (!enemy.dead) { enemy.frozen = Math.max(enemy.frozen || 0, 3.2 * game.mintPower * harvestScale); frozen++; }
      ringEffect(plot.x, plot.y, crop.color, 360);
      floatText(plot.x, plot.y - 34, `冻结 ×${frozen}`, crop.color, 14);
      if (game.fusions.permafrost) for (const enemy of game.enemies) if (!enemy.dead) damageEnemy(enemy, 28, false);
    } else if (type === 5) {
      game.cloneTime = Math.max(game.cloneTime, 15 * game.clonePower * harvestScale);
      const mimicName = CROP_TYPES[plot.mimicCrop ?? 2].name;
      floatText(game.player.x, game.player.y - 34, `模仿${mimicName} ${Math.round(15 * game.clonePower * harvestScale)}s`, crop.color, 14);
      ringEffect(game.player.x, game.player.y, crop.color, 180);
    }
    if (plot.hybrid === "sunpepper") {
      game.player.shield = Math.min(70, game.player.shield + 10);
      for (const enemy of game.enemies) if (!enemy.dead && dist(enemy, plot) < 290) damageEnemy(enemy, 46 * effectYield, true);
      ringEffect(plot.x, plot.y, "#ffb953", 290);
    } else if (plot.hybrid === "steampepper") {
      for (const enemy of game.enemies) if (!enemy.dead && Math.abs(enemy.y - plot.y) < 120) { enemy.frozen = Math.max(enemy.frozen || 0, 2.2); damageEnemy(enemy, 22 * effectYield); }
      ringEffect(plot.x, plot.y, "#a8e9ff", 230);
    } else if (plot.hybrid === "prismpea") {
      for (let i = 0; i < 8; i++) {
        const a = TAU * i / 8;
        game.bullets.push({ x: plot.x, y: plot.y, vx: Math.cos(a) * 610, vy: Math.sin(a) * 610, radius: 5, damage: game.player.damage * .75, life: 1.25, pierce: 1, ricochet: 0, homing: 3, crit: true, cropColor: "#f4ef77", dead: false });
      }
    } else if (plot.hybrid === "railpea") {
      addOverclock(35 * harvestScale);
    } else if (plot.hybrid === "mirrorfrost") {
      for (const enemy of game.enemies) if (!enemy.dead) damageEnemy(enemy, 24 * effectYield, false);
      ringEffect(plot.x, plot.y, "#b8c5ff", 430);
    } else if (plot.hybrid === "twinsun") {
      addOverclock(45 * harvestScale);
      game.player.shield = Math.min(70, game.player.shield + 12);
    }
    applyHybridHarvestStat(plot);
    clearPlot(plot);
  }

  function dropPickup(type, x, y, value = 1, variant = 0) {
    if (type === "xp" && hasTerrain("bridge") && x > 1100 && x < 1280) {
      x = x < 1190 ? 1086 : 1294;
    }
    const angle = rand(0, TAU);
    const speed = rand(55, 145);
    game.pickups.push({ type, x, y, value, variant, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: 16, dead: false });
  }

  function updatePickups(dt) {
    const p = game.player;
    for (const item of game.pickups) {
      item.age += dt;
      item.life -= dt;
      item.vx *= Math.pow(.045, dt);
      item.vy *= Math.pow(.045, dt);
      const d = dist(item, p);
      const magnetRadius = game.activeEvent === "magstorm" ? 4000 : p.magnet;
      if (d < magnetRadius) {
        const n = norm(p.x - item.x, p.y - item.y);
        const pull = game.activeEvent === "magstorm" ? 720 : 230 + (p.magnet - d) * 5;
        item.vx += n.x * pull * dt;
        item.vy += n.y * pull * dt;
      }
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      if (item.type === "xp" && hasTerrain("bridge") && item.x > 1100 && item.x < 1280) {
        item.x = item.x < 1190 ? 1086 : 1294;
        item.vx = 0;
      }
      if (d < p.radius + 12) collectPickup(item);
      if (item.life <= 0) item.dead = true;
    }
    game.pickups = game.pickups.filter((i) => !i.dead);
  }

  function collectPickup(item) {
    if (item.dead) return;
    item.dead = true;
    if (item.type === "xp") gainXp(item.value);
    if (item.type === "water") { game.water += item.value; floatText(item.x, item.y, "+水", "#80d9ea", 11); }
    if (item.type === "seed") { game.seeds[item.variant] += item.value; floatText(item.x, item.y, `+${CROP_TYPES[item.variant].name}`, CROP_TYPES[item.variant].color, 10); }
    if (item.type === "coin") { game.coins += item.value; game.score += 4; floatText(item.x, item.y, "+生物质", "#f3d66b", 10); if (game.phase === "rest") renderRestShop(); }
    if (item.type === "sun") { game.player.hp = Math.min(game.player.maxHp, game.player.hp + 2 * item.value * game.sunPower); addOverclock(7 * item.value * game.sunPower); floatText(item.x, item.y, "+阳光", "#ffe66e", 10); }
    burst(item.x, item.y, itemColor(item), 5, 60);
    sound.pickup();
  }

  function itemColor(item) {
    if (item.type === "xp") return "#71d7b8";
    if (item.type === "water") return "#76d5e7";
    if (item.type === "coin") return "#f3d66b";
    if (item.type === "sun") return "#ffe66e";
    return CROP_TYPES[item.variant].color;
  }

  function gainXp(amount) {
    const p = game.player;
    p.xp += amount * game.xpGain;
    if (p.xp >= p.xpNeed && state === "playing") {
      p.xp -= p.xpNeed;
      p.level++;
      p.xpNeed = Math.round(36 + p.level * 18);
      game.water++;
      for (const plot of game.plots) if (plot.state === "growing") plot.growth += CROP_TYPES[plot.crop].grow * .05;
      showChoice(p.level % 3 === 0 ? "milestone" : "level");
    }
  }

  const RELICS = [
    { id: "heartseed", icon: "♥", name: "原生心种", color: "#ff8197", copy: "最大生命 +30，立即恢复 30。", apply: () => { game.player.maxHp += 30; game.player.hp += 30; } },
    { id: "calibrator", icon: "◇", name: "收成校准核心", color: "#ffc65e", copy: "每次收获永久提高本局农战转化，最多累计 15 层。", apply: () => { game.harvestCalibrator = true; game.harvestCalibratorStacks = game.harvestCalibratorStacks || 0; } },
    { id: "hydraulic", icon: "»", name: "液压脚环", color: "#72d9cb", copy: "移动速度 +10%，冲刺冷却 -12%。", apply: () => { game.player.speed *= 1.1; game.player.dashMax *= .88; } },
    { id: "battery", icon: "Q", name: "陪伴电池", color: "#b493ff", copy: "AI 技能冷却 -16%，威力 +10%。", apply: () => { game.player.skillMax *= .84; game.skillPower *= 1.1; } },
    { id: "seedvault", icon: "♣", name: "初代种子库", color: "#83db82", copy: "作物成长 +18%，收获收益 +15%。", apply: () => { game.cropGrowth *= 1.18; game.cropYield *= 1.15; } },
    { id: "lens", icon: "◉", name: "拾荒者镜片", color: "#73cce5", copy: "经验 +18%，拾取范围 +55。", apply: () => { game.xpGain *= 1.18; game.player.magnet += 55; } }
  ];

  function showRelicChoice() {
    if (state !== "playing") return;
    state = "choice";
    game.pendingChoice = "relic";
    ui.choiceEyebrow.textContent = "必掉关键遗物";
    ui.choiceTitle.textContent = "选择一项底层参数改造";
    ui.choiceSubtitle.textContent = "遗物只在每夜宝箱出现；基础属性不会混入普通插件池";
    ui.choiceCards.innerHTML = "";
    const pool = RELICS.filter((relic) => !game.relics[relic.id]);
    const chosen = [];
    while (chosen.length < Math.min(3, pool.length)) {
      const index = Math.floor(Math.random() * pool.length);
      chosen.push(pool.splice(index, 1)[0]);
    }
    if (!chosen.length) chosen.push(RELICS[Math.floor(Math.random() * RELICS.length)]);
    chosen.forEach((relic, index) => {
      const card = document.createElement("button");
      card.className = "choice-card relic-card";
      card.style.setProperty("--card-color", relic.color);
      card.innerHTML = `<span class="card-index">0${index + 1}</span><span class="card-icon">${relic.icon}</span><span class="card-type">关键遗物</span><h3>${relic.name}</h3><p>${relic.copy}</p><strong>本轮永久生效 · 唯一</strong>`;
      card.addEventListener("click", () => chooseRelic(relic));
      ui.choiceCards.appendChild(card);
    });
    ui.choice.classList.remove("hidden");
    sound.level();
  }

  function chooseRelic(relic) {
    game.relics[relic.id] = true;
    relic.apply();
    game.upgrades.push(`遗物：${relic.name}`);
    ui.choice.classList.add("hidden");
    game.pendingChoice = null;
    state = "playing";
    showToast(`遗物共鸣 · ${relic.name}`, relic.copy);
    renderBuildDock();
    ringEffect(game.player.x, game.player.y, relic.color, 220);
    burst(game.player.x, game.player.y, relic.color, 30, 220);
    sound.level();
    canvas.focus();
  }

  const ITEMS = [
    { id: "spark", icon: "⚡", type: "收获插件", name: "光合节拍器", max: 3, color: "#ffca64", desc: () => "每层丰收动能额外缩短射击与挥砍间隔。", detail: "必须先收获作物才能获得攻速；满级可与豌豆训练融合。", apply: () => game.harvestTempoPower += .012 },
    { id: "split", icon: "⋔", type: "混种插件", name: "双生芽孢", max: 2, color: "#ff9c78", desc: () => "附近每存在两类成熟作物，可获得额外弹丸。", detail: "没有成熟作物时不提供直接火力。", apply: () => game.bloomShotLevel++ },
    { id: "bounce", icon: "↝", type: "藤蔓插件", name: "弹射藤蔓", max: 2, color: "#ef8eb7", desc: () => "辣椒、模仿菇光环或高丰收动能使弹丸额外弹射。", detail: "满级可与辣椒燃烧芯融合。", apply: () => game.vineRicochet++ },
    { id: "homing", icon: "⌁", type: "花粉插件", name: "导航花粉", max: 3, color: "#83d8dc", desc: () => "磁力菇、模仿菇光环或丰收动能赋予追踪。", detail: "追踪能力必须由作物激活。", apply: () => game.pollenGuidance += 2.8 },
    { id: "pepper", icon: "◆", type: "作物插件", name: "辣椒燃烧芯", max: 3, color: "#ff7180", desc: () => "火爆辣椒横扫宽度 +22%，收获收益 +3%。", detail: "满级可与弹射藤蔓或收割镰刀融合。", apply: () => { game.pepperRadius *= 1.22; game.cropYield *= 1.03; } },
    { id: "sun", icon: "●", type: "作物插件", name: "阳光缓存", max: 3, color: "#ffe06d", desc: () => "向日葵治疗、护盾与阳光收益提高 24%。", detail: "满级可与果皮防火墙融合。", apply: () => game.sunPower *= 1.24 },
    { id: "thorn", icon: "✦", type: "作物插件", name: "豌豆训练", max: 3, color: "#83db82", desc: () => "豌豆炮伤害和收获急射时长 +32%。", detail: "满级可与光合节拍器融合。", apply: () => game.thornPower *= 1.32 },
    { id: "shield", icon: "♡", type: "收获插件", name: "果皮防火墙", max: 2, color: "#92c8ff", desc: () => "每次收获恢复少量护盾。", detail: "护盾来源转移到种植循环，无法安装后直接获得。", apply: () => game.harvestShieldLevel++ },
    { id: "blade", icon: "☾", type: "近战核心", name: "收割镰刀", max: 3, color: "#ff9f6d", desc: (level) => level === 1 ? "攻击改为宽幅近战挥砍；成熟作物与丰收动能会显著放大伤害。" : "挥砍范围 +10，近战倍率 +12%。", detail: "基础范围、攻速和倍率已加强；满级可与辣椒燃烧芯融合。", apply: (level) => { game.player.attackMode = "melee"; if (level > 1) { game.player.meleeRange += 10; game.player.meleePower *= 1.12; } } },
    { id: "whetstone", icon: "▲", type: "近战农具", name: "丰收磨刀石", max: 3, color: "#f4c06d", desc: () => "丰收动能额外提高挥砍速度，扇形角度 +6%。", detail: "先收获再贴身，近战节奏才会完全启动。", apply: () => { game.meleeHarvestRate += .012; game.player.meleeArc *= 1.06; } },
    { id: "anchor", icon: "⌑", type: "不动流核心", name: "扎根协议", max: 3, color: "#78d6a3", desc: () => "靠近成熟作物或拥有丰收动能时，静止 3 秒蓄满并提高攻防。", detail: "离开农田会失去蓄力；满级可与量子水壶合成固定炮台。", apply: () => {} },
    { id: "brace", icon: "⊥", type: "不动流农具", name: "根系反冲架", max: 2, color: "#8ec8e8", desc: () => "缩短扎根蓄力时间，让农田阵地更快成型。", detail: "只改善扎根手感，不提供脱离作物的额外火力。", apply: () => { game.player.stationaryMax = Math.max(2.2, game.player.stationaryMax - .25); } },
    { id: "drone", icon: "◎", type: "伙伴插件", name: "守田无人机", max: 3, color: "#ae9bff", desc: () => "成熟作物在附近或拥有丰收动能时，无人机自动索敌。", detail: "离开农田且动能耗尽后停火；满级可与量子水壶融合。", apply: () => game.droneLevel++ },
    { id: "growth", icon: "♣", type: "农艺插件", name: "量子水壶", max: 3, color: "#78daa5", desc: () => "作物生长速度 +28%，立即获得 1 水。", detail: "满级可与守田无人机融合。", apply: () => { game.cropGrowth *= 1.28; game.water++; } },
    { id: "irrigator", icon: "💧", type: "克制农机", name: "脉冲滴灌器", max: 2, color: "#69cde0", desc: (level) => `每 ${level === 1 ? "10.5" : "8"} 秒为一株缺水作物补水，仍消耗 1 水。`, detail: "只处理一株且不创造水，避免自动化取代资源规划。", apply: () => {} },
    { id: "autoseeder", icon: "⚙", type: "克制农机", name: "单格播种机", max: 2, color: "#d5ad6b", desc: (level) => `每 ${level === 1 ? "13" : "10"} 秒在身边${level === 1 ? "小" : "中"}范围播种一格。`, detail: "消耗当前种子、不收获且要求玩家靠近田地。", apply: () => {} },
    { id: "magnet", icon: "◉", type: "采集插件", name: "拾荒磁芯", max: 2, color: "#77dce5", desc: () => "拾取范围提高 50%。", detail: "少绕路，多打怪，超频更快。", apply: () => game.player.magnet *= 1.5 },
    { id: "armor", icon: "⬡", type: "守田插件", name: "果冻土壤", max: 3, color: "#c2b185", desc: () => "作物受到的伤害降低 26%。", detail: "软乎乎，但害兽咬不动。", apply: () => game.cropArmor *= 1.35 },
    { id: "magnetplant", icon: "◉", type: "作物插件", name: "磁菇线圈", max: 3, color: "#5fd0db", desc: () => "磁力菇追踪与清弹收益提高 25%。", detail: "满级可与导航花粉融合。", apply: () => game.magnetPower *= 1.25 },
    { id: "mintplant", icon: "❄", type: "作物插件", name: "寒冰菌核", max: 3, color: "#7fcff2", desc: () => "寒冰菇冻结时长提高 24%。", detail: "满级可与环绕叶刃融合。", apply: () => game.mintPower *= 1.24 },
    { id: "cloneplant", icon: "♊", type: "作物插件", name: "模仿菌丝", max: 3, color: "#bd8df2", desc: () => "模仿菇持续时间提高 22%。", detail: "满级可与守田无人机融合。", apply: () => game.clonePower *= 1.22 },
    { id: "orbit", icon: "✺", type: "近战农具", name: "环绕叶刃", max: 3, color: "#91e2c7", desc: () => "成熟作物在附近或拥有丰收动能时，增加一枚环绕叶刃。", detail: "离开农田且动能耗尽后叶刃停转；满级可与寒冰菌核融合。", apply: () => game.orbitLevel++ },
    { id: "sproutcore", character: "sprout", icon: "⌁", type: "小芽专属", name: "递归丰收指令", max: 2, color: "#a88ee4", desc: (level) => `丰收编译催熟量与齐射数量提高 ${level * 18}%。`, detail: "只有小芽能够读取的农业底层指令。", apply: () => {} },
    { id: "beatcore", character: "beat", icon: "♫", type: "霹雳专属", name: "安可超频模块", max: 2, color: "#ff8a72", desc: (level) => `雷暴节拍伤害和超频时长提高 ${level * 16}%。`, detail: "让雷击的最后一拍重新成为第一拍。", apply: () => {} },
    { id: "mochicore", character: "mochi", icon: "○", type: "奶泡专属", name: "软体温室协议", max: 2, color: "#71d7c2", desc: (level) => `泡泡温室护盾、治疗和催熟提高 ${level * 18}%。`, detail: "奶泡把护理算法改写成了农田护盾。", apply: () => {} }
  ];

  const FUSIONS = [
    { id: "hotchain", name: "超辣链式反应", icon: "♨", color: "#ff7180", req: { pepper: 3, bounce: 2 }, copy: "辣椒燃烧芯 LV.3 × 弹射藤蔓 LV.2", effect: "火爆辣椒横扫后向场外害兽衰减爆炸" },
    { id: "solarwall", name: "太阳能防火墙", icon: "☀", color: "#ffe06d", req: { sun: 3, shield: 2 }, copy: "阳光缓存 LV.3 × 果皮防火墙 LV.2", effect: "护盾自动恢复，向日葵收获清除附近敌弹" },
    { id: "recursive", name: "递归豌豆算法", icon: "✣", color: "#83db82", req: { thorn: 3, spark: 3 }, copy: "豌豆训练 LV.3 × 光合节拍器 LV.3", effect: "每次击杀都会向四周分裂追踪弹幕" },
    { id: "farmbrain", name: "全自动农场主脑", icon: "◎", color: "#9c8df5", req: { drone: 3, growth: 3 }, copy: "守田无人机 LV.3 × 量子水壶 LV.3", effect: "无人机双发，并定期自动灌溉缺水作物" },
    { id: "stormseek", name: "磁暴追猎协议", icon: "⌁", color: "#5fd0db", req: { magnetplant: 3, homing: 3 }, copy: "磁菇线圈 LV.3 × 导航花粉 LV.3", effect: "所有弹丸获得强追踪，磁力菇收获牵引资源并清弹" },
    { id: "permafrost", name: "永冻叶轮", icon: "❉", color: "#7fcff2", req: { mintplant: 3, orbit: 3 }, copy: "寒冰菌核 LV.3 × 环绕叶刃 LV.3", effect: "叶刃持续冻结敌人，寒冰菇收获造成全图碎冰伤害" },
    { id: "mirrorgarden", name: "镜像农场集群", icon: "♊", color: "#bd8df2", req: { cloneplant: 3, drone: 3 }, copy: "模仿菌丝 LV.3 × 守田无人机 LV.3", effect: "模仿光环额外多发，无人机永久增加一发镜像弹" },
    { id: "reaper", name: "生命收割回路", icon: "☽", color: "#ff9f6d", req: { blade: 3, pepper: 3 }, copy: "收割镰刀 LV.3 × 辣椒燃烧芯 LV.3", effect: "辣椒农能扩展挥砍范围，命中多个目标时恢复生命" },
    { id: "turret", name: "固定丰收炮台", icon: "⌂", color: "#79d6a3", req: { anchor: 3, growth: 2 }, copy: "扎根协议 LV.3 × 量子水壶 LV.2", effect: "靠近成熟作物蓄满后额外增伤并持续恢复护盾" }
  ];

  const LOADOUT_ITEM_REQUIREMENTS = {
    pepper: [0], sun: [1], thorn: [2], magnetplant: [3], mintplant: [4], cloneplant: [5],
    bounce: [0, 5], homing: [3, 5]
  };

  function itemMatchesLoadout(item) {
    const required = LOADOUT_ITEM_REQUIREMENTS[item.id];
    return !required || required.some((index) => game.carriedSeeds.includes(index));
  }

  function showChoice(mode) {
    if (state !== "playing") return;
    state = "choice";
    game.pendingChoice = mode;
    sound.level();
    const milestone = mode === "milestone";
    ui.choiceEyebrow.textContent = milestone ? `三级属性节点 · LV.${game.player.level}` : mode === "dawn" ? "稀有农艺补给" : `战斗数据转译 · LV.${game.player.level}`;
    ui.choiceTitle.textContent = milestone ? "选择一项人物基础属性" : mode === "dawn" ? "AI 娘从废品堆里翻出了农场零件" : "把战斗经验写回种植系统";
    ui.choiceSubtitle.textContent = milestone ? "人物属性只会在等级 3、6、9……出现；普通等级不会混入这些数值" : mode === "dawn" ? "黎明补给只提供与四种携带种子相符的作物插件" : "天赋池已按本轮携带种子过滤；同名插件可以升级并完成融合";
    ui.choiceCards.innerHTML = "";
    const pool = milestone
      ? STAT_TALENTS.filter((item) => (game.statTalents[item.id] || 0) < item.max)
      : ITEMS.filter((item) => itemMatchesLoadout(item) && (!item.character || item.character === game.character) && (game.items[item.id] || 0) < item.max);
    const chosen = [];
    if (!milestone && mode === "dawn") {
      const exclusive = pool.find((item) => item.character === game.character);
      if (exclusive) chosen.push(exclusive);
    }
    if (!milestone && mode === "level" && !game.items.blade && !game.items.anchor) {
      const core = pool.find((item) => item.id === (chance(.5) ? "blade" : "anchor"));
      if (core) chosen.push(core);
    }
    const levels = milestone ? game.statTalents : game.items;
    const progressing = pool.filter((item) => levels[item.id]).sort((a, b) => (levels[b.id] / b.max) - (levels[a.id] / a.max));
    if (progressing.length && !chosen.includes(progressing[0])) chosen.push(progressing[0]);
    const complement = milestone ? null : pool.find((item) => !chosen.includes(item) && FUSIONS.some((fusion) => !game.fusions[fusion.id] && fusion.req[item.id] && Object.keys(fusion.req).some((id) => id !== item.id && game.items[id])));
    if (complement) chosen.push(complement);
    while (chosen.length < 3 && pool.length) {
      const index = Math.floor(Math.random() * pool.length);
      const candidate = pool.splice(index, 1)[0];
      if (!chosen.includes(candidate)) chosen.push(candidate);
    }
    chosen.forEach((item, index) => {
      const currentLevel = levels[item.id] || 0;
      const nextLevel = currentLevel + 1;
      const fusionReady = !milestone && wouldUnlockFusion(item.id, nextLevel);
      const recipe = milestone ? null : FUSIONS.find((fusion) => !game.fusions[fusion.id] && fusion.req[item.id]);
      const card = document.createElement("button");
      card.className = `choice-card${fusionReady ? " fusion-ready" : ""}${milestone ? " relic-card" : ""}`;
      card.style.setProperty("--card-color", item.color);
      card.innerHTML = `<span class="card-index">0${index + 1}</span><span class="card-icon">${item.icon}</span><span class="card-type">${item.type}</span><h3>${item.name}</h3><p>${item.desc(nextLevel)}</p><span class="item-level">LV.${currentLevel} → LV.${nextLevel}</span><strong>${milestone ? "仅在每 3 级出现" : fusionReady ? "选择后立即完成融合！" : recipe ? `合成线索：${recipe.name}` : item.detail}</strong>`;
      card.addEventListener("click", () => milestone ? chooseStatTalent(item) : chooseItem(item));
      ui.choiceCards.appendChild(card);
    });
    ui.choice.classList.remove("hidden");
  }

  function chooseStatTalent(item) {
    const newLevel = (game.statTalents[item.id] || 0) + 1;
    game.statTalents[item.id] = newLevel;
    item.apply(newLevel);
    game.upgrades.push(`${item.name} LV.${newLevel}`);
    ui.choice.classList.add("hidden");
    game.pendingChoice = null;
    state = "playing";
    showToast(`三级属性 · ${item.name}`, item.desc(newLevel));
    renderBuildDock();
    sound.level();
    canvas.focus();
  }

  function chooseItem(item) {
    const newLevel = (game.items[item.id] || 0) + 1;
    game.items[item.id] = newLevel;
    item.apply(newLevel);
    game.upgrades.push(`${item.name} LV.${newLevel}`);
    game.upgradeCounts[item.id] = newLevel;
    ui.choice.classList.add("hidden");
    game.pendingChoice = null;
    state = "playing";
    showToast(`安装 · ${item.name} LV.${newLevel}`, item.desc(newLevel));
    renderBuildDock();
    checkFusions();
    sound.tone(620, .2, "triangle", .05, 320);
    canvas.focus();
  }

  function wouldUnlockFusion(itemId, nextLevel) {
    return FUSIONS.some((fusion) => {
      if (game.fusions[fusion.id] || !fusion.req[itemId]) return false;
      return Object.entries(fusion.req).every(([id, level]) => (id === itemId ? nextLevel : (game.items[id] || 0)) >= level);
    });
  }

  function checkFusions() {
    const fusion = FUSIONS.find((candidate) => !game.fusions[candidate.id] && Object.entries(candidate.req).every(([id, level]) => (game.items[id] || 0) >= level));
    if (!fusion) return;
    game.fusions[fusion.id] = true;
    game.fusionCount++;
    discoverEntry(`fusion:${fusion.id}`, 2);
    game.upgrades.push(`融合：${fusion.name}`);
    game.freezeTimer = 1.55;
    ui.fusionTitle.textContent = fusion.name;
    ui.fusionCopy.textContent = `${fusion.copy} · ${fusion.effect}`;
    ui.fusion.classList.remove("hidden");
    ui.fusion.style.animation = "none";
    void ui.fusion.offsetWidth;
    ui.fusion.style.animation = "fusion-in 1.65s ease both";
    setTimeout(() => ui.fusion.classList.add("hidden"), 1650);
    renderBuildDock();
    burst(game.player.x, game.player.y, fusion.color, 38, 280);
    ringEffect(game.player.x, game.player.y, fusion.color, 260);
    sound.level();
    sound.boom();
  }

  function renderBuildDock() {
    if (!game || !ui.buildItems) return;
    const owned = ITEMS.filter((item) => game.items[item.id]);
    const fused = FUSIONS.filter((fusion) => game.fusions[fusion.id]);
    const relics = RELICS.filter((relic) => game.relics[relic.id]);
    const comboCards = COMBO_PLANTS.filter((combo) => game.comboCards[combo.id]);
    const statTalents = STAT_TALENTS.filter((item) => game.statTalents[item.id]);
    const merchantItems = MERCHANT_ITEMS.filter((item) => game.merchantOwned[item.id] && item.id !== "shovel");
    const weaponIcon = game.weapon === "wand" ? "✧" : game.weapon === "rail" ? "━" : game.weapon === "shotgun" ? "≋" : "▸";
    ui.buildItems.innerHTML = `<span class="build-item fused" title="主武器：${WEAPONS[game.weapon].name}" style="--item-color:#df7898">${weaponIcon}<b>W</b></span>` + relics.map((relic) => `<span class="build-item fused" title="遗物：${relic.name}" style="--item-color:${relic.color}">${relic.icon}<b>◆</b></span>`).join("") + merchantItems.map((item) => `<span class="build-item" title="商店：${item.name}" style="--item-color:#f0c47c">${item.icon}<b>商</b></span>`).join("") + statTalents.map((item) => `<span class="build-item" title="属性：${item.name} LV.${game.statTalents[item.id]}" style="--item-color:${item.color}">${item.icon}<b>${game.statTalents[item.id]}</b></span>`).join("") + comboCards.map((combo) => `<span class="build-item fused" title="组合卡：${combo.name}" style="--item-color:${combo.color}">${combo.icon}<b>卡</b></span>`).join("") + owned.map((item) => `<span class="build-item" title="${item.name} LV.${game.items[item.id]}" style="--item-color:${item.color}">${item.icon}<b>${game.items[item.id]}</b></span>`).join("") + fused.map((fusion) => `<span class="build-item fused" title="融合：${fusion.name}">${fusion.icon}<b>★</b></span>`).join("");
  }

  function renderCharacterDetail() {
    const character = CHARACTERS[selectedCharacter];
    ui.characterDetailIcon.textContent = character.skillIcon;
    ui.characterDetailSkill.textContent = `主动 · ${character.skill}`;
    ui.characterDetailCd.textContent = `${character.skillCd} 秒`;
    ui.characterDetailCopy.textContent = character.skillDetail;
    ui.characterDetailPassive.textContent = `被动：${character.passive}　专属插件：${character.exclusive}　定位：${character.role}`;
  }

  function updateParticles(dt) {
    for (const p of game.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(.08, dt);
      p.vy *= Math.pow(.08, dt);
    }
    game.particles = game.particles.filter((p) => p.life > 0);
    for (const f of game.floaters) {
      f.life -= dt;
      f.y -= 28 * dt;
    }
    game.floaters = game.floaters.filter((f) => f.life > 0);
  }

  function burst(x, y, color, count = 10, speed = 120) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const v = rand(speed * .25, speed);
      game.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.22, .56), maxLife: .56, size: rand(2, 6), color, alpha: 1, shape: chance(.2) ? "circle" : "square" });
    }
  }

  function ringEffect(x, y, color, radius) {
    game.particles.push({ x, y, vx: 0, vy: 0, life: .45, maxLife: .45, size: radius, color, alpha: .9, shape: "ring" });
  }

  function floatText(x, y, text, color = "#fff", size = 12) {
    game.floaters.push({ x, y, text, color, size, life: .85, maxLife: .85 });
  }

  function finishRun(victory) {
    if (game.ended) return;
    game.ended = true;
    state = "end";
    input.mouse.down = false;
    const earned = Math.max(1, Math.floor((Math.max(1, Math.floor(game.score / 230)) + game.fusionCount + Math.floor(game.hybridCount / 2) + game.comboPlantCount * 2 + (victory ? 4 : 0)) * game.crystalBonus));
    meta.crystals += earned;
    meta.best = Math.max(meta.best, game.score);
    meta.runs = (meta.runs || 0) + 1;
    storage.save(meta);
    updateMetaDisplay();

    ui.end.classList.toggle("victory", victory);
    ui.endBadge.textContent = victory ? "本轮完成" : "本轮终止";
    const character = CHARACTERS[game.character];
    const personalEndings = {
      sprout: { title: "小芽把明天写进了土壤", copy: "种子库启动后，小芽删除了原本只追求产量的最高指令。她给自己的新任务命名为“陪你看完每一次发芽”。" },
      beat: { title: "霹雳为新世界写下第一首歌", copy: "电网仍然沉默，霹雳却用灌溉泵和温室风扇拼出一段节拍。幸存者循着音乐而来，农田第一次变成了舞台。" },
      mochi: { title: "奶泡确认希望可以食用", copy: "第一批新粮成熟时，奶泡修改了护理数据库：希望的营养价值未知，但能让人愿意活到下一顿饭。她决定继续观察一辈子。" }
    };
    const ending = personalEndings[game.character];
    ui.endTitle.textContent = victory ? ending.title : `${character.name}保存了这次记忆`;
    ui.endCopy.textContent = victory
      ? `${ending.copy} 本轮完成 ${game.fusionCount} 次插件融合、${game.hybridCount} 次杂交与 ${game.comboPlantCount} 株组合植株。`
      : game.crops ? `夜色吞没了农田，但${character.name}在关机前备份了全部数据。芽晶会让下一次生存更有准备。` : `“别担心，”${character.name}说，“末日已经发生过一次，不会比重来更可怕。”`;
    ui.endScore.textContent = game.score;
    ui.endKills.textContent = game.kills;
    ui.endCrops.textContent = game.crops;
    ui.endCrystals.textContent = `+${earned}`;
    ui.buildSummary.innerHTML = game.upgrades.length ? game.upgrades.map((u) => `<span>${u}</span>`).join("") : "本轮尚未形成构筑";
    ui.hud.classList.add("hidden");
    ui.end.classList.remove("hidden");
  }

  function selectSeed(index) {
    if (!game) return;
    if (!game.carriedSeeds.includes(index)) {
      floatText(game.player.x, game.player.y - 38, "本轮未携带", "#ff9b79", 11);
      return;
    }
    game.selectedSeed = index;
    game.selectedTool = null;
    document.querySelectorAll(".seed-card").forEach((el, i) => el.classList.toggle("active", i === index));
    updateActiveToolUi();
  }

  function selectActiveTool(id) {
    if (!game || !game.activeTools[id]) return;
    game.selectedTool = id;
    document.querySelectorAll(".seed-card").forEach((el) => el.classList.remove("active"));
    updateActiveToolUi();
  }

  function hotbarOptions() {
    if (!game) return [];
    const options = game.carriedSeeds.map((index) => ({ kind: "seed", id: index }));
    if ((game.activeTools.shovel || 0) > 0) options.push({ kind: "tool", id: "shovel" });
    return options;
  }

  function cycleHotbar(direction) {
    const options = hotbarOptions();
    if (!options.length) return;
    let current = options.findIndex((option) => game.selectedTool ? option.kind === "tool" && option.id === game.selectedTool : option.kind === "seed" && option.id === game.selectedSeed);
    if (current < 0) current = 0;
    const next = options[(current + direction + options.length) % options.length];
    if (next.kind === "seed") selectSeed(next.id);
    else selectActiveTool(next.id);
    sound.tone(350 + ((current + direction + options.length) % options.length) * 22, .035, "triangle", .015, 55);
  }

  function updateActiveToolUi() {
    if (!game || !ui.activeTool) return;
    const durability = game.activeTools.shovel || 0;
    ui.activeTool.classList.toggle("hidden", durability <= 0);
    ui.activeTool.classList.toggle("selected", game.selectedTool === "shovel");
    ui.activeToolName.textContent = game.selectedTool === "shovel" ? "折叠开荒铲 · 已选中" : "折叠开荒铲";
    ui.activeToolCount.textContent = `${durability} / 5`;
  }

  function digPlot() {
    if (!game || game.selectedTool !== "shovel" || (game.activeTools.shovel || 0) <= 0) return false;
    const x = clamp(game.player.x, 65, WORLD_W - 65);
    const y = clamp(game.player.y, 65, WORLD_H - 65);
    if (hasTerrain("bridge") && x > 1090 && x < 1290) {
      showToast("这里挖不到土", "河床和桥面无法开垦，请移动到岸边");
      return false;
    }
    if (game.plots.some((plot) => Math.hypot(plot.x - x, plot.y - y) < 78)) {
      showToast("田块过于密集", "离现有田块更远一点再使用开荒铲");
      return false;
    }
    const zone = FIELD_ZONES.slice().sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    game.plots.push(makePlot(x, y, zone.id, true));
    game.activeTools.shovel--;
    ringEffect(x, y, "#e7b979", 92);
    burst(x, y, "#9b6c49", 16, 110);
    floatText(x, y - 34, `开垦新田 · 耐久 ${game.activeTools.shovel}`, "#ffe0a4", 12);
    sound.tone(125, .12, "square", .04, -35);
    if (game.activeTools.shovel <= 0) {
      showToast("折叠开荒铲耗尽", "五块新田已经成为本轮永久地形");
      selectSeed(game.selectedSeed);
    } else updateActiveToolUi();
    return true;
  }

  function updateMetaDisplay() {
    ui.best.textContent = meta.best || 0;
    ui.crystals.textContent = meta.crystals || 0;
    ui.metaBonus.textContent = `${meta.runs || 0} RUNS`;
    document.querySelectorAll("[data-meta]").forEach((button) => {
      const id = button.dataset.meta;
      const level = meta.modules[id] || 0;
      const cost = 3 + level * 3;
      button.querySelector("em").textContent = level >= 8 ? "MAX" : `LV.${level}`;
      button.querySelector("strong").textContent = level >= 8 ? "已满级" : `◆ ${cost}`;
      button.disabled = level >= 8 || meta.crystals < cost;
    });
  }

  function upgradeMeta(id) {
    const level = meta.modules[id] || 0;
    if (level >= 8) return;
    const cost = 3 + level * 3;
    if (meta.crystals < cost) return;
    meta.crystals -= cost;
    meta.modules[id] = level + 1;
    storage.save(meta);
    updateMetaDisplay();
    sound.tone(520, .18, "triangle", .05, 300);
  }

  function updateHud() {
    if (!game) return;
    const p = game.player;
    const character = CHARACTERS[game.character];
    ui.hpFill.style.width = `${clamp(p.hp / p.maxHp, 0, 1) * 100}%`;
    ui.hpText.textContent = p.shield > 0 ? `${Math.ceil(p.hp)} / ${p.maxHp}  +${Math.ceil(p.shield)}盾` : `${Math.ceil(p.hp)} / ${p.maxHp}`;
    ui.xpFill.style.width = `${clamp(p.xp / p.xpNeed, 0, 1) * 100}%`;
    ui.xpText.textContent = `LV.${p.level}`;
    ui.score.textContent = game.score;
    ui.water.textContent = game.water;
    ui.coins.textContent = game.coins;
    ui.dash.style.transform = `scaleX(${clamp(1 - p.dashCooldown / p.dashMax, 0, 1)})`;
    const dashReady = p.dashCooldown <= 0;
    ui.dashLabel.textContent = "冲刺";
    ui.dashState.textContent = dashReady ? "就绪" : `${p.dashCooldown.toFixed(1)}s`;
    ui.dashState.closest(".dash-status").classList.toggle("ready", dashReady);
    const overclockActive = game.overclockTime > 0;
    ui.overclockFill.style.width = `${overclockActive ? 100 : game.overclock}%`;
    ui.overclockText.textContent = overclockActive ? `${game.overclockTime.toFixed(1)}s` : `${Math.floor(game.overclock)}%`;
    ui.overclockFill.closest(".overclock-meter").classList.toggle("active", overclockActive);
    ui.skillName.textContent = character.skill;
    ui.skillIcon.textContent = character.skillIcon;
    ui.skillCopy.textContent = p.skillCooldown > 0 ? `冷却 ${p.skillCooldown.toFixed(1)} 秒` : character.skillCopy;
    ui.skillFill.style.transform = `scaleX(${clamp(1 - p.skillCooldown / p.skillMax, 0, 1)})`;
    ui.skillFill.closest(".skill-status").classList.toggle("ready", p.skillCooldown <= 0);
    ui.skillFill.closest(".skill-status").classList.toggle("cooling", p.skillCooldown > 0);
    ui.skillReady.textContent = p.skillCooldown <= 0 ? "就绪 · Q" : `${p.skillCooldown.toFixed(1)}s`;
    const hasAnchor = Boolean(game.items.anchor);
    ui.stance.classList.toggle("hidden", !hasAnchor);
    if (hasAnchor) {
      const stanceRatio = clamp(p.stationaryCharge / p.stationaryMax, 0, 1);
      ui.stanceFill.style.width = `${stanceRatio * 100}%`;
      ui.stanceText.textContent = stanceRatio >= 1 ? "满蓄力" : `${Math.floor(stanceRatio * 100)}%`;
      ui.stance.classList.toggle("charged", stanceRatio >= 1);
    }
    ui.combo.classList.toggle("hidden", game.combo < 2);
    ui.combo.querySelector("span").textContent = game.combo;
    game.seeds.forEach((value, i) => { $(`seed-${i}`).textContent = value; });
    updateActiveToolUi();

    const night = game.phase === "night";
    const resting = game.phase === "rest";
    ui.phaseLabel.textContent = `第 ${game.day}/${FINAL_DAY} ${night ? "夜" : resting ? "休整" : "日"} · ${night ? (bossTypeForDay(game.day) ? "首领" : "守田") : resting ? "采购播种" : "探索"}`;
    ui.phaseIcon.textContent = night ? "☾" : resting ? "♨" : "☀";
    const dur = currentDuration();
    if (night && bossTypeForDay(game.day) && game.boss) {
      ui.clockText.textContent = game.day === FINAL_DAY ? "决 战" : "首 领";
      ui.phaseFill.style.width = `${clamp(game.boss.hp / game.boss.maxHp, 0, 1) * 100}%`;
      ui.threat.textContent = `${bossDisplayName(game.boss)} · ${Math.ceil(Math.max(0, game.boss.hp))} HP`;
    } else if (resting) {
      ui.clockText.textContent = "不限时";
      ui.phaseFill.style.width = "100%";
      ui.threat.textContent = "安全休整 · 切换种子、采购、播种，准备好后按 F 入夜";
    } else {
      ui.clockText.textContent = formatTime(dur - game.phaseTime);
      ui.phaseFill.style.width = `${clamp(1 - game.phaseTime / dur, 0, 1) * 100}%`;
      ui.threat.textContent = night ? "威胁高涨 · 只有特定害兽会攻击作物" : resting ? "安全窗口 · 购买种子并布置农田" : game.day === FINAL_DAY ? "最后的白昼" : "探索大地图 · 收集生物质与经验";
    }
    ui.phaseFill.style.background = night ? "linear-gradient(90deg, #69578f, #c1709a)" : resting ? "linear-gradient(90deg, #58baa1, #9be4b2)" : "linear-gradient(90deg, #f7a947, #f8d66d)";
  }

  function draw() {
    idleTime += .016;
    const t = game ? game.elapsed : idleTime;
    drawBackground(t, game ? game.phase : "day", game ? game.phaseTime / currentDuration() : .3);
    if (game) {
      const shakeAmount = game.shake * 8;
      ctx.save();
      ctx.translate(rand(-shakeAmount, shakeAmount), rand(-shakeAmount, shakeAmount));
      drawFarm();
      drawChests();
      drawPickups();
      drawBullets();
      drawEnemies();
      drawPlayer();
      drawParticles();
      drawFloaters();
      ctx.restore();
      drawWorldOverlay();
    } else {
      drawIdleFarm(t);
    }
    if (state === "playing") drawCrosshair();
    requestAnimationFrame(frame);
  }

  function frame(now) {
    const dt = Math.min(.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    drawFrameOnly();
  }

  function drawFrameOnly() {
    idleTime += .016;
    const t = game ? game.elapsed : idleTime;
    drawBackground(t, game ? game.phase : "day", game ? game.phaseTime / currentDuration() : .3);
    if (game) {
      const shakeAmount = game.shake * 8;
      ctx.save();
      ctx.beginPath(); ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h); ctx.clip();
      ctx.translate(rand(-shakeAmount, shakeAmount), rand(-shakeAmount, shakeAmount));
      ctx.translate(VIEW.x + VIEW.w / 2 - game.camera.x, VIEW.y + VIEW.h / 2 - game.camera.y);
      drawWorldScenery(t);
      drawFarm();
      drawHazards();
      drawChests();
      drawPickups();
      drawBullets();
      drawEnemies();
      drawPlayer();
      drawParticles();
      drawFloaters();
      ctx.restore();
      drawWorldOverlay();
    } else drawIdleFarm(t);
    if (state === "playing") drawCrosshair();
    requestAnimationFrame(frame);
  }

  function drawBackground(t, phase, progress) {
    const night = phase === "night";
    let sky = night ? "#5f6088" : "#b7e5ac";
    if (!night && progress > .74) sky = "#e6bd8b";
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = night ? "#667b7d" : "#9bd18d";
    ctx.fillRect(196, 72, W - 196, H - 72);
    ctx.strokeStyle = night ? "#c2c5de26" : "#ffffff30";
    ctx.lineWidth = 1;
    for (let x = 210; x < W; x += 36) {
      ctx.beginPath(); ctx.moveTo(x, 75); ctx.lineTo(x - 70, H); ctx.stroke();
    }
    for (let y = 88; y < H; y += 32) {
      ctx.beginPath(); ctx.moveTo(196, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.fillStyle = night ? "#383951" : "#eee8ff";
    ctx.fillRect(0, 0, 196, H);
    ctx.fillStyle = night ? "#34354cbb" : "#fff8e8b8";
    ctx.fillRect(196, 0, W - 196, 72);
    ctx.fillStyle = night ? "rgba(64,54,102,.24)" : progress > .74 ? "rgba(255,145,132,.12)" : "rgba(255,244,167,.035)";
    ctx.fillRect(196, 72, W - 196, H - 72);
  }

  function drawWorldScenery(t) {
    const night = game.phase === "night";
    ctx.fillStyle = night ? "#657b7b" : "#9bd18d";
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.strokeStyle = night ? "#d5d7f21c" : "#ffffff22";
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD_W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); ctx.stroke(); }
    for (let y = 0; y <= WORLD_H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); ctx.stroke(); }
    drawTerrainFeatures();
    for (const s of scenery) {
      if (Math.abs(s.x - WORLD_W / 2) < 230 && Math.abs(s.y - WORLD_H / 2) < 210) continue;
      const sway = Math.sin(t * 1.7 + s.x) * 2;
      ctx.strokeStyle = night ? "#8ca49a" : s.tone === 0 ? "#72b875" : s.tone === 1 ? "#5da96a" : "#a0b85c";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + sway, s.y - s.size * 2.1); ctx.stroke();
      ctx.fillStyle = night ? "#c6b9d7" : s.tone === 2 ? "#ffe17d" : s.tone === 1 ? "#ff9eb8" : "#eef7a2";
      ctx.beginPath(); ctx.arc(s.x + sway, s.y - s.size * 2.4, 2.2, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = "#fff8"; ctx.lineWidth = 10; ctx.strokeRect(5, 5, WORLD_W - 10, WORLD_H - 10);
  }

  function drawTerrainFeatures() {
    if (hasTerrain("bridge")) {
      const segments = [[0, 180], [330, 660], [820, 1140], [1300, WORLD_H]];
      for (const [top, bottom] of segments) {
        ctx.fillStyle = "#2b3144"; ctx.fillRect(1110, top, 160, bottom - top);
        ctx.strokeStyle = "#dfad78"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(1110, top); ctx.lineTo(1110, bottom); ctx.moveTo(1270, top); ctx.lineTo(1270, bottom); ctx.stroke();
      }
      for (const [top, bottom] of [[180,330],[660,820],[1140,1300]]) {
        ctx.fillStyle = "#8b674e"; ctx.fillRect(1110, top, 160, bottom - top);
        ctx.strokeStyle = "#d6b078"; ctx.lineWidth = 3;
        for (let x = 1118; x < 1270; x += 18) { ctx.beginPath(); ctx.moveTo(x, top + 5); ctx.lineTo(x, bottom - 5); ctx.stroke(); }
      }
    }
    if (hasTerrain("greenhouse")) {
      const zone = zonePosition("solar");
      ctx.strokeStyle = "#ffd97d99"; ctx.lineWidth = 7; ctx.setLineDash([18, 12]);
      ctx.beginPath(); ctx.ellipse(FIELD_ZONES[1].x, FIELD_ZONES[1].y, 210, 120, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#fff4b8"; ctx.beginPath(); ctx.arc(zone.x, zone.y, 10, 0, TAU); ctx.fill();
    }
    if (hasTerrain("irrigation")) {
      const s = game.irrigation;
      ctx.save(); ctx.translate(s.x, s.y);
      ctx.fillStyle = s.captured ? "#68dcc4" : s.contested ? "#ef7780" : "#f1cf73";
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, 33, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#4e566b"; ctx.fillRect(-7, -24, 14, 48); ctx.fillRect(-24, -7, 48, 14);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 6; ctx.globalAlpha = .7; ctx.beginPath(); ctx.arc(0, 0, 48, -Math.PI / 2, -Math.PI / 2 + TAU * (s.captured ? 1 : s.progress / 3)); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = "#fff"; ctx.font = "900 10px 'Microsoft YaHei'"; ctx.textAlign = "center"; ctx.fillText(s.captured ? "已占领" : s.contested ? "争夺中" : "靠近占领", 0, 58); ctx.restore();
    }
  }

  function zonePosition(zoneId) {
    const plots = game.plots.filter((plot) => plot.zone === zoneId);
    if (!plots.length) return FIELD_ZONES.find((zone) => zone.id === zoneId);
    return { x: plots.reduce((sum, plot) => sum + plot.x, 0) / plots.length, y: plots.reduce((sum, plot) => sum + plot.y, 0) / plots.length };
  }

  function drawIdleFarm(t) {
    ctx.save();
    ctx.globalAlpha = .35;
    ctx.translate(Math.sin(t * .2) * 4, 0);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const x = 535 + c * 70;
      const y = 315 + r * 70;
      ctx.fillStyle = "#3a2c27";
      ctx.beginPath(); ctx.ellipse(x, y, 29, 21, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = CROP_TYPES[(r + c) % 3].color;
      ctx.beginPath(); ctx.arc(x, y - 8 - Math.sin(t + c) * 2, 6, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawFarm() {
    ctx.save();
    for (const zone of FIELD_ZONES) {
      const center = zonePosition(zone.id);
      const farmX = center.x - 105, farmY = center.y - 95;
      ctx.fillStyle = game.phase === "night" ? "#505769db" : `${zone.color}c9`;
      ctx.strokeStyle = zone.color; ctx.lineWidth = 5;
      roundRect(farmX, farmY, 210, 190, 23); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = game.phase === "night" ? "#34364a42" : "#7e6e5338"; ctx.lineWidth = 2;
      for (let x = farmX + 14; x < farmX + 205; x += 20) { ctx.beginPath(); ctx.moveTo(x, farmY + 8); ctx.lineTo(x - 28, farmY + 181); ctx.stroke(); }
      ctx.fillStyle = "#3f354ecc"; ctx.beginPath(); ctx.roundRect(center.x - 76, farmY - 18, 152, 28, 10); ctx.fill();
      ctx.fillStyle = "#fff9eb"; ctx.textAlign = "center"; ctx.font = "900 11px 'Microsoft YaHei'"; ctx.fillText(zone.name, center.x, farmY - 5);
      ctx.fillStyle = "#e0d6e7"; ctx.font = "7px 'Microsoft YaHei'"; ctx.fillText(zone.copy, center.x, farmY + 5);
    }
    for (const plot of game.plots) drawPlot(plot);
    drawMerchantNpc();
    ctx.restore();
  }

  function drawMerchantNpc() {
    const home = zonePosition("home");
    const x = home.x + 155, y = home.y + 118;
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#51445f"; ctx.beginPath(); ctx.ellipse(0, 14, 26, 12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#f5c47d"; ctx.fillRect(-15, -20, 30, 35);
    ctx.fillStyle = "#7a5d43"; ctx.beginPath(); ctx.arc(0, -28, 18, 0, TAU); ctx.fill();
    ctx.fillStyle = "#dd6e62"; ctx.beginPath(); ctx.moveTo(-23, -34); ctx.lineTo(23, -34); ctx.lineTo(12, -48); ctx.lineTo(-12, -48); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-6, -29, 3, 0, TAU); ctx.arc(6, -29, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = "#3d3043"; ctx.beginPath(); ctx.arc(-6, -29, 1.4, 0, TAU); ctx.arc(6, -29, 1.4, 0, TAU); ctx.fill();
    ctx.fillStyle = game.phase === "rest" ? "#fff7c2" : "#e6dce9"; ctx.strokeStyle = "#50445f"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-48, -76, 96, 22, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#40354c"; ctx.textAlign = "center"; ctx.font = "900 9px 'Microsoft YaHei'";
    ctx.fillText(game.phase === "rest" ? "阿栓商店营业中" : "阿栓 · 休整见", 0, -62);
    ctx.restore();
  }

  function drawHazards() {
    for (const hazard of game.hazards) {
      const pulse = .2 + Math.sin(game.elapsed * 18) * .08;
      ctx.save(); ctx.globalAlpha = .55; ctx.fillStyle = hazard.color; ctx.strokeStyle = "#fff2"; ctx.lineWidth = 3;
      if (hazard.kind === "line") {
        ctx.translate(hazard.x, hazard.y); ctx.rotate(hazard.angle);
        ctx.fillRect(0, -hazard.width / 2, hazard.length, hazard.width);
        ctx.strokeRect(0, -hazard.width / 2, hazard.length, hazard.width);
      } else if (hazard.kind === "circle") {
        ctx.globalAlpha = pulse + .22; ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius, 0, TAU); ctx.fill(); ctx.stroke();
      } else {
        ctx.globalAlpha = pulse + .2; ctx.lineWidth = hazard.width; ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = "#fff"; ctx.font = "900 12px ui-monospace"; ctx.textAlign = "center";
      const tx = hazard.kind === "line" ? hazard.x + Math.cos(hazard.angle) * hazard.length * .5 : hazard.x;
      const ty = hazard.kind === "line" ? hazard.y + Math.sin(hazard.angle) * hazard.length * .5 : hazard.y;
      ctx.fillText(hazard.time.toFixed(1), tx, ty);
      ctx.restore();
    }
  }

  function drawPlot(plot) {
    const crop = plot.crop !== null ? CROP_TYPES[plot.crop] : null;
    ctx.save();
    ctx.translate(plot.x, plot.y);
    if (plot.state === "ready") {
      ctx.globalAlpha = .075 + Math.sin(plot.sway * 3) * .02;
      ctx.fillStyle = plot.mutation ? "#fff178" : crop.color;
      ctx.beginPath(); ctx.arc(0, 0, 205 * game.cropAura, 0, TAU); ctx.fill();
      ctx.globalAlpha = .28;
      ctx.strokeStyle = plot.mutation ? "#fff178" : crop.color; ctx.lineWidth = plot.mutation ? 4 : 2;
      ctx.setLineDash([8, 9]); ctx.beginPath(); ctx.arc(0, 0, 205 * game.cropAura, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    if (plot.hit > 0) ctx.translate(rand(-3, 3), rand(-2, 2));

    ctx.fillStyle = plot.wet > 0 ? "#352b2c" : "#493329";
    ctx.strokeStyle = plot.hit > 0 ? "#ff8c6a" : "#6c4a35";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 5, 29, 22, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#80604955";
    ctx.lineWidth = 1;
    for (let i = -14; i <= 14; i += 7) { ctx.beginPath(); ctx.moveTo(i - 5, -7); ctx.lineTo(i + 5, 15); ctx.stroke(); }

    if (plot.state !== "empty") {
      const ratio = clamp(plot.growth / crop.grow, 0, 1);
      const scale = .35 + ratio * .75;
      const sway = Math.sin(plot.sway * 2.4) * (2 + ratio * 2);
      ctx.strokeStyle = "#477845";
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 7); ctx.quadraticCurveTo(sway, -9 * scale, sway * .5, -27 * scale); ctx.stroke();
      ctx.fillStyle = "#5e9f54";
      ctx.beginPath(); ctx.ellipse(-7 + sway * .3, -9 * scale, 8 * scale, 4 * scale, -.4, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(7 + sway * .5, -16 * scale, 8 * scale, 4 * scale, .4, 0, TAU); ctx.fill();
      if (ratio > .45) {
        ctx.shadowColor = plot.mutation ? "#fff178" : crop.color;
        ctx.shadowBlur = plot.state === "ready" ? 14 : 4;
        ctx.fillStyle = plot.hit ? "#fff" : crop.color;
        drawCropFruit(crop.id, sway * .5, -30 * scale, 7 + ratio * 5);
        ctx.shadowBlur = 0;
        if (plot.mutation) {
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.globalAlpha = .9;
          ctx.beginPath(); ctx.arc(sway * .5, -30 * scale, 15 + Math.sin(plot.sway * 5) * 2, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
        }
        if (plot.hybrid) {
          const hybrid = HYBRIDS.find((entry) => entry.id === plot.hybrid);
          const left = CROP_TYPES[hybrid.pair[0]], right = CROP_TYPES[hybrid.pair[1]];
          ctx.fillStyle = left.color; drawCropFruit(left.id, -9, -31 * scale, 8 + ratio * 3);
          ctx.fillStyle = right.color; drawCropFruit(right.id, 9, -31 * scale, 8 + ratio * 3);
          ctx.strokeStyle = hybrid.color; ctx.lineWidth = 3; ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.moveTo(-20, -31 * scale); ctx.lineTo(0, -47 * scale); ctx.lineTo(20, -31 * scale); ctx.lineTo(0, -15 * scale); ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = "#30273a"; ctx.beginPath(); ctx.roundRect(-32, -64 * scale, 64, 14, 6); ctx.fill();
          ctx.fillStyle = hybrid.color; ctx.font = "900 7px 'Microsoft YaHei'"; ctx.textAlign = "center"; ctx.fillText(`杂交 · ${hybrid.name}`, 0, -54 * scale);
          if (plot.state === "ready") { ctx.fillStyle = "#fff"; ctx.font = "900 6px 'Microsoft YaHei'"; ctx.fillText("E 收获永久属性", 0, -43 * scale); }
        }
        if (plot.comboPlant) {
          const combo = COMBO_PLANTS.find((entry) => entry.id === plot.comboPlant);
          ctx.fillStyle = "#44384f"; ctx.strokeStyle = combo.color; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.roundRect(-29, -54 * scale, 58, 40, 10); ctx.fill(); ctx.stroke();
          if (combo.id === "peacannon") {
            ctx.fillStyle = combo.color; ctx.fillRect(-22, -48 * scale, 17, 7); ctx.fillRect(5, -48 * scale, 17, 7);
            ctx.beginPath(); ctx.arc(-12, -31 * scale, 9, 0, TAU); ctx.arc(12, -31 * scale, 9, 0, TAU); ctx.fill();
          } else if (combo.id === "solarforge") {
            ctx.fillStyle = combo.color; ctx.beginPath(); ctx.arc(0, -34 * scale, 14, 0, TAU); ctx.fill();
            ctx.strokeStyle = "#fff4a8"; ctx.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 17, -34 * scale + Math.sin(a) * 17); ctx.lineTo(Math.cos(a) * 24, -34 * scale + Math.sin(a) * 24); ctx.stroke(); }
          } else {
            ctx.fillStyle = "#ff7c68"; ctx.beginPath(); ctx.arc(-9, -34 * scale, 11, 0, TAU); ctx.fill();
            ctx.fillStyle = "#8ddcff"; ctx.beginPath(); ctx.arc(9, -34 * scale, 11, 0, TAU); ctx.fill();
          }
          ctx.fillStyle = "#30273a"; ctx.beginPath(); ctx.roundRect(-38, -76 * scale, 76, 14, 6); ctx.fill();
          ctx.fillStyle = combo.color; ctx.font = "900 7px 'Microsoft YaHei'"; ctx.textAlign = "center"; ctx.fillText(`组合 · ${combo.name}`, 0, -66 * scale);
          if (plot.state === "ready") { ctx.fillStyle = "#fff"; ctx.font = "900 6px 'Microsoft YaHei'"; ctx.fillText("E 收获强化属性", 0, -57 * scale); }
        }
      }
      if (plot.state === "growing") {
        ctx.fillStyle = "#0b0a0cbb";
        ctx.fillRect(-23, 25, 46, 4);
        ctx.fillStyle = plot.wet > 0 ? crop.color : "#765849";
        ctx.fillRect(-23, 25, 46 * ratio, 4);
      } else {
        ctx.strokeStyle = crop.color;
        ctx.globalAlpha = .45 + Math.sin(plot.sway * 4) * .2;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, -10, 28 + Math.sin(plot.sway * 3) * 2, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    if (plot.state !== "empty" && plot.hp < plot.maxHp) {
      ctx.fillStyle = "#160e10cc"; ctx.fillRect(-20, -35, 40, 4);
      ctx.fillStyle = "#d65a50"; ctx.fillRect(-20, -35, 40 * (plot.hp / plot.maxHp), 4);
    }
    ctx.restore();
  }

  function drawCropFruit(type, x, y, size) {
    ctx.beginPath();
    if (type === "pepper") {
      ctx.moveTo(x, y - size); ctx.lineTo(x + size, y); ctx.lineTo(x, y + size); ctx.lineTo(x - size, y); ctx.closePath();
    } else if (type === "thorn" || type === "mint") {
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 4;
        const r = i % 2 === 0 ? size : size * .45;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
    } else if (type === "clone") {
      ctx.arc(x - size * .35, y, size * .75, 0, TAU); ctx.moveTo(x + size * 1.1, y); ctx.arc(x + size * .35, y, size * .75, 0, TAU);
    } else if (type === "magnet") {
      ctx.arc(x, y, size, 0, TAU); ctx.moveTo(x + size * .45, y); ctx.arc(x, y, size * .45, 0, TAU);
    } else ctx.arc(x, y, size, 0, TAU);
    ctx.fill();
  }

  function drawPlayer() {
    const p = game.player;
    const character = CHARACTERS[game.character];
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.hurtCooldown > 0 && Math.floor(p.hurtCooldown * 20) % 2 === 0) ctx.globalAlpha = .35;
    if (game.overclockTime > 0) {
      ctx.strokeStyle = `rgba(255,238,104,${.45 + Math.sin(game.elapsed * 12) * .2})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 27 + Math.sin(game.elapsed * 8) * 4, 0, TAU); ctx.stroke();
    }
    if (p.shield > 0) {
      ctx.strokeStyle = "#72e1dbcc"; ctx.lineWidth = 4; ctx.shadowColor = "#79dbcf"; ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.arc(0, 0, 25, -.8, Math.PI + .8); ctx.stroke(); ctx.shadowBlur = 0;
    }

    for (let i = 0; i < game.droneLevel; i++) {
      const a = game.elapsed * 2.3 + (TAU * i) / game.droneLevel;
      const x = Math.cos(a) * 31;
      const y = Math.sin(a) * 22;
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#7b66a0"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(x - 7, y - 6, 14, 12, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ff7fa7"; ctx.beginPath(); ctx.arc(x + 2, y, 2.3, 0, TAU); ctx.fill();
    }
    for (let i = 0; game.orbitLevel > 0 && i < 1 + game.orbitLevel; i++) {
      const a = game.elapsed * 2.7 + TAU * i / (1 + game.orbitLevel);
      const x = Math.cos(a) * 58, y = Math.sin(a) * 58;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + game.elapsed * 5); ctx.fillStyle = game.fusions.permafrost ? "#b9efff" : "#8de0b8"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(0, -6); ctx.lineTo(11, 0); ctx.lineTo(0, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }

    ctx.rotate(p.angle);
    drawAiBody(game.character, character);
    if (p.attackMode === "melee") {
      ctx.strokeStyle = "#fff5c1"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(17, 8); ctx.lineTo(38, 8); ctx.stroke();
      ctx.strokeStyle = "#ff9f6d"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(38, -6, 18, .45, 2.05); ctx.stroke();
    } else drawWeaponModel(game.weapon);
    ctx.restore();
  }

  function drawWeaponModel(weapon) {
    ctx.save(); ctx.translate(12, 0); ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
    if (weapon === "shotgun") {
      ctx.fillStyle = "#e98b67"; ctx.beginPath(); ctx.roundRect(0, -8, 34, 16, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#5e5269"; for (let y = -6; y <= 6; y += 6) ctx.fillRect(28, y - 2, 11, 4);
    } else if (weapon === "rail") {
      ctx.fillStyle = "#6bc7d1"; ctx.beginPath(); ctx.roundRect(-2, -6, 48, 12, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffe36b"; ctx.fillRect(12, -3, 25, 6); ctx.fillStyle = "#5a4c67"; ctx.fillRect(42, -4, 13, 8);
    } else if (weapon === "wand") {
      ctx.strokeStyle = "#a887de"; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(38, 0); ctx.stroke();
      ctx.fillStyle = "#83e0c4"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(43, 0, 9 + Math.sin(game.elapsed * 6) * 2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff07b"; ctx.beginPath(); ctx.arc(43, 0, 3, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = "#fffaf0"; ctx.beginPath(); ctx.roundRect(0, -7, 34, 14, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ff668f"; ctx.beginPath(); ctx.arc(33, 0, 5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawAiBody(type, character) {
    ctx.fillStyle = "#51445e48";
    ctx.beginPath(); ctx.ellipse(-3, 15, 19, 8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#fff8ec"; ctx.lineWidth = 4; ctx.lineJoin = "round";
    if (type === "beat") {
      ctx.fillStyle = character.body; ctx.beginPath(); ctx.moveTo(-15,-10); ctx.lineTo(9,-14); ctx.lineTo(18,3); ctx.lineTo(5,18); ctx.lineTo(-16,8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ef6e83";
      for (const side of [-1,1]) { ctx.beginPath(); ctx.moveTo(-8,side*10); ctx.lineTo(-25,side*22); ctx.lineTo(-17,side*4); ctx.lineTo(-32,side*7); ctx.lineTo(-14,side*28); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = character.color; ctx.beginPath(); ctx.moveTo(-16,-12); ctx.lineTo(7,-18); ctx.lineTo(14,-4); ctx.lineTo(1,9); ctx.lineTo(-17,4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff5e5"; ctx.beginPath(); ctx.roundRect(-7,-10,17,14,7); ctx.fill();
      ctx.fillStyle = "#fff171"; ctx.fillRect(1,-8,8,3); ctx.fillRect(3,-2,6,3);
      ctx.fillStyle = "#55445f"; ctx.beginPath(); ctx.arc(1,-7,1.7,0,TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.strokeStyle="#8c5367"; ctx.lineWidth=3; ctx.beginPath(); ctx.roundRect(7,-9,25,7,3); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect(7,2,22,7,3); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#ffcf4e"; ctx.fillRect(27,-7,7,4); ctx.fillRect(25,4,7,4);
    } else if (type === "mochi") {
      ctx.fillStyle = "#bdf5ea"; ctx.beginPath(); ctx.arc(-3,1,21,0,TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = character.color; ctx.beginPath(); ctx.arc(-5,-5,17,0,TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff8ea"; ctx.beginPath(); ctx.arc(1,-4,11,0,TAU); ctx.fill();
      ctx.fillStyle = "#4b5d64"; ctx.beginPath(); ctx.arc(5,-7,1.7,0,TAU); ctx.arc(6,0,1.7,0,TAU); ctx.fill();
      ctx.strokeStyle="#65bda9"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(5,-3,5,-.5,.5); ctx.stroke();
      ctx.fillStyle="#8ee3d8"; for(const side of [-1,1]) { ctx.beginPath(); ctx.arc(-18,side*13,7,0,TAU); ctx.fill(); ctx.strokeStyle="#fff"; ctx.stroke(); }
      ctx.fillStyle="#fff"; ctx.strokeStyle="#5c938f"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(19,-3,11,0,TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#73d8c6"; ctx.beginPath(); ctx.arc(25,-3,5,0,TAU); ctx.fill();
    } else {
      ctx.fillStyle = character.body; ctx.beginPath(); ctx.moveTo(-12,-7); ctx.lineTo(7,-12); ctx.lineTo(15,5); ctx.lineTo(2,17); ctx.lineTo(-14,7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = character.color; ctx.beginPath(); ctx.arc(-4,-5,14,0,TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff6e5"; ctx.beginPath(); ctx.arc(0,-3,10,0,TAU); ctx.fill();
      ctx.fillStyle = "#51445f"; ctx.beginPath(); ctx.arc(4,-6,1.7,0,TAU); ctx.arc(5,1,1.7,0,TAU); ctx.fill();
      ctx.strokeStyle = "#e06f91"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(3,-2,4,-.5,.5); ctx.stroke();
      ctx.strokeStyle = "#6c5887"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8,-17); ctx.lineTo(-10,-25); ctx.stroke();
      ctx.fillStyle = game.overclockTime > 0 ? "#fff06a" : "#70d9dc"; ctx.beginPath(); ctx.arc(-11,-27,4,0,TAU); ctx.fill(); ctx.strokeStyle="#fff"; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle="#fffaf0"; ctx.strokeStyle="#75648c"; ctx.lineWidth=3; ctx.beginPath(); ctx.roundRect(6,-8,22,10,5); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#ff668f"; ctx.beginPath(); ctx.arc(27,-3,4,0,TAU); ctx.fill();
    }
  }

  function drawEnemies() {
    for (const e of game.enemies) {
      if (e.dead) continue;
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.enter > 0) ctx.scale(1 + e.enter * .4, 1 + e.enter * .4);
      if (e.affix) {
        ctx.strokeStyle = e.eliteColor; ctx.lineWidth = 4; ctx.globalAlpha = .7 + Math.sin(e.age * 5) * .18;
        ctx.beginPath(); ctx.arc(0, 0, e.radius + 8, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.rotate(e.facing);
      if (e.hit > 0) ctx.filter = "brightness(2.6)";
      ctx.fillStyle = "#11101955";
      ctx.beginPath(); ctx.ellipse(0, e.radius * .65, e.radius, e.radius * .42, 0, 0, TAU); ctx.fill();
      if (e.type === "mite") drawMite(e);
      else if (e.type === "spitter") drawSpitter(e);
      else if (e.type === "boar") drawBoar(e);
      else if (isBossType(e.type)) drawBoss(e);
      else drawExtraEnemy(e);
      ctx.filter = "none";
      ctx.restore();
      if (e.affix) { ctx.fillStyle = e.eliteColor; ctx.font = "900 9px 'Microsoft YaHei'"; ctx.textAlign = "center"; ctx.fillText(`${ELITE_AFFIXES.find((a) => a.id === e.affix).icon}${e.eliteName}`, e.x, e.y - e.radius - 16); }
      if (isBossType(e.type) || e.affix || e.hp < e.maxHp * .98) drawEnemyHealth(e);
    }
  }

  function drawMite(e) {
    ctx.strokeStyle = "#714c70"; ctx.lineWidth = 4;
    for (const side of [-1, 1]) for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(i * 3, side * 7); ctx.lineTo(-6 + i * 4, side * (17 + Math.sin(e.age * 9 + i) * 3)); ctx.stroke();
    }
    ctx.fillStyle = e.hit ? "#fff" : "#ff8d9e";
    ctx.beginPath(); ctx.ellipse(0, 0, 15, 11, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#fff4e7"; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = "#5c465e"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(10, -2); ctx.moveTo(10, -5); ctx.lineTo(5, -2); ctx.moveTo(5, 5); ctx.lineTo(10, 2); ctx.moveTo(10, 5); ctx.lineTo(5, 2); ctx.stroke();
  }

  function drawSpitter(e) {
    ctx.fillStyle = e.hit ? "#fff" : "#8a72b5";
    for (let i = 0; i < 7; i++) {
      const a = (TAU * i) / 7;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 13, Math.sin(a) * 13, 6, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = e.hit ? "#fff" : "#b994d6";
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill(); ctx.strokeStyle = "#fff4e7"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#55445f"; ctx.beginPath(); ctx.arc(8, 0, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(10, -1, 1.8, 0, TAU); ctx.fill();
  }

  function drawBoar(e) {
    ctx.fillStyle = e.hit ? "#fff" : "#77caa0";
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 17, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = "#fff4e7"; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = "#a8dfb6"; ctx.beginPath(); ctx.ellipse(16, 0, 12, 11, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#efe1ba"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(18, -5); ctx.quadraticCurveTo(31, -11, 27, -17); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18, 5); ctx.quadraticCurveTo(31, 11, 27, 17); ctx.stroke();
    ctx.fillStyle = "#55445f"; ctx.beginPath(); ctx.arc(19, -5, 2, 0, TAU); ctx.arc(19, 5, 2, 0, TAU); ctx.fill();
  }

  function drawExtraEnemy(e) {
    const isWasp = e.type === "wasp";
    ctx.fillStyle = e.hit ? "#fff" : e.color; ctx.strokeStyle = "#fff4e7"; ctx.lineWidth = 3;
    if (isWasp) {
      ctx.beginPath(); ctx.ellipse(-4, 0, 16, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#584750"; for (let x = -9; x < 8; x += 8) ctx.fillRect(x, -8, 4, 16);
      ctx.fillStyle = "#dff8ffbb"; ctx.beginPath(); ctx.ellipse(-5, -11, 10, 5, -.3, 0, TAU); ctx.ellipse(-5, 11, 10, 5, .3, 0, TAU); ctx.fill();
    } else if (e.type === "thief") {
      ctx.fillStyle = e.hit ? "#fff" : "#e58e54"; ctx.beginPath(); ctx.roundRect(-15,-12,29,24,9); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#6d5064"; ctx.beginPath(); ctx.arc(-15,0,10,0,TAU); ctx.fill();
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.roundRect(0,-8,13,16,6); ctx.fill();
      ctx.fillStyle="#4e3c4d"; ctx.fillRect(6,-6,3,4); ctx.fillRect(6,2,3,4);
      ctx.strokeStyle="#ffe078"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(13,-6); ctx.lineTo(22,0); ctx.lineTo(13,6); ctx.stroke();
    } else if (e.type === "healer") {
      ctx.fillStyle=e.hit?"#fff":"#72c58d"; ctx.beginPath(); ctx.arc(0,0,19,0,TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle="#eaffed"; ctx.fillRect(-4,-12,8,24); ctx.fillRect(-12,-4,24,8);
      ctx.strokeStyle="#91efad88"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,25+Math.sin(e.age*5)*3,0,TAU); ctx.stroke();
    } else if (e.type === "glitch") {
      ctx.save(); ctx.translate(Math.sin(e.age*22)*3,0); ctx.fillStyle=e.hit?"#fff":"#70b7e8";
      ctx.fillRect(-15,-15,30,30); ctx.strokeRect(-15,-15,30,30); ctx.fillStyle="#ff7faa"; ctx.fillRect(-10,-8,9,6); ctx.fillStyle="#fff16e"; ctx.fillRect(4,2,12,5); ctx.restore();
    } else {
      const lobes = e.type === "bloater" ? 8 : 5;
      for (let i = 0; i < lobes; i++) { const a = TAU * i / lobes; ctx.beginPath(); ctx.arc(Math.cos(a) * e.radius * .55, Math.sin(a) * e.radius * .55, e.radius * .48, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.arc(0, 0, e.radius * .65, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(e.radius * .25, -4, 4, 0, TAU); ctx.fill();
    }
  }

  function drawBoss(e) {
    ctx.rotate(-e.facing);
    if (e.type === "crowboss") { drawCrowBoss(e); return; }
    if (e.type === "slimeboss") { drawSlimeBoss(e); return; }
    const bossColor = e.type === "crowboss" ? "#51496f" : e.type === "slimeboss" ? "#4f9f7f" : "#72547e";
    ctx.strokeStyle = bossColor; ctx.lineWidth = 8;
    for (let i = 0; i < 8; i++) {
      const a = (TAU * i) / 8 + e.age * .18;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 24, Math.sin(a) * 24); ctx.lineTo(Math.cos(a) * 58, Math.sin(a) * 58); ctx.stroke();
    }
    ctx.fillStyle = e.hit ? "#fff" : e.color;
    ctx.beginPath(); ctx.arc(0, 0, e.radius * .86, 0, TAU); ctx.fill(); ctx.strokeStyle = "#fff3e6"; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = "#684c72";
    ctx.beginPath(); ctx.arc(0, 0, 29, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ff95bd";
    for (let i = 0; i < 6; i++) {
      const a = (TAU * i) / 6 - e.age * .35;
      ctx.beginPath(); ctx.arc(Math.cos(a) * 20, Math.sin(a) * 20, 5, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = "#ffe46f";
    ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(0, -13); ctx.lineTo(10, -4); ctx.lineTo(0, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(-9, -4, 4, 0, TAU); ctx.arc(9, -4, 4, 0, TAU); ctx.fill();
    ctx.fillStyle = "#47374f";
    ctx.beginPath(); ctx.arc(-8, -3, 2, 0, TAU); ctx.arc(8, -3, 2, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#ffb0c8"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 9, 9, Math.PI + .25, TAU - .25); ctx.stroke();
  }

  function drawCrowBoss(e) {
    const flap = Math.sin(e.age * 7) * 10;
    ctx.fillStyle = e.hit ? "#fff" : "#51496f"; ctx.strokeStyle = "#fff3e6"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-19, -8); ctx.quadraticCurveTo(-65, -43 - flap, -78, 4); ctx.quadraticCurveTo(-49, -5, -24, 19); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(19, -8); ctx.quadraticCurveTo(65, -43 - flap, 78, 4); ctx.quadraticCurveTo(49, -5, 24, 19); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = e.hit ? "#fff" : "#6b5a91"; ctx.beginPath(); ctx.arc(0, 0, 38, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-12, -7, 7, 0, TAU); ctx.arc(12, -7, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = "#3d304e"; ctx.beginPath(); ctx.arc(-10, -6, 3, 0, TAU); ctx.arc(10, -6, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffe169"; ctx.beginPath(); ctx.moveTo(-13, 3); ctx.lineTo(0, 25); ctx.lineTo(13, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ff86a7"; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(-12 + i * 12, -35 - Math.abs(i - 1) * 4, 6, 0, TAU); ctx.fill(); }
  }

  function drawSlimeBoss(e) {
    const wobble = Math.sin(e.age * 5) * 5;
    ctx.fillStyle = e.hit ? "#fff" : "#69bf91"; ctx.strokeStyle = "#f4fff2"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-48, 30); ctx.quadraticCurveTo(-58, -18 + wobble, -29, -42); ctx.quadraticCurveTo(0, -60 - wobble, 29, -42); ctx.quadraticCurveTo(58, -18 - wobble, 48, 30); ctx.quadraticCurveTo(22, 48 + wobble, 0, 37); ctx.quadraticCurveTo(-22, 48 - wobble, -48, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#a5e6b8"; ctx.globalAlpha = .7; ctx.beginPath(); ctx.ellipse(-18, -25, 15, 9, -.4, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-15, -4, 8, 0, TAU); ctx.arc(15, -4, 8, 0, TAU); ctx.fill();
    ctx.fillStyle = "#395e55"; ctx.beginPath(); ctx.arc(-13, -2, 3, 0, TAU); ctx.arc(13, -2, 3, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#397967"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 12, 13, .1, Math.PI - .1); ctx.stroke();
  }

  function drawEnemyHealth(e) {
    const boss = isBossType(e.type);
    const width = boss ? 110 : e.radius * 2;
    const y = e.y - e.radius - 12;
    ctx.fillStyle = "#140f14cc"; ctx.fillRect(e.x - width / 2, y, width, boss ? 7 : 4);
    ctx.fillStyle = boss ? e.color : "#d65b50"; ctx.fillRect(e.x - width / 2, y, width * clamp(e.hp / e.maxHp, 0, 1), boss ? 7 : 4);
  }

  function drawBullets() {
    ctx.save();
    for (const b of game.bullets) {
      ctx.fillStyle = b.crit ? "#fff47c" : (b.cropColor || "#ffe7a2");
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = b.crit ? 12 : 6;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, TAU); ctx.fill();
    }
    for (const b of game.enemyBullets) {
      ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 9;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, TAU); ctx.fill();
      ctx.strokeStyle = "#f2c5e1"; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();
  }

  function drawPickups() {
    for (const item of game.pickups) {
      const bounce = Math.sin(item.age * 6) * 3;
      ctx.save(); ctx.translate(item.x, item.y + bounce);
      ctx.fillStyle = itemColor(item); ctx.shadowColor = itemColor(item); ctx.shadowBlur = 10;
      if (item.type === "xp") { ctx.rotate(item.age); ctx.fillRect(-5, -5, 10, 10); }
      else if (item.type === "water") { ctx.beginPath(); ctx.moveTo(0, -9); ctx.quadraticCurveTo(9, 2, 0, 9); ctx.quadraticCurveTo(-9, 2, 0, -9); ctx.fill(); }
      else if (item.type === "coin") { ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.fillStyle = "#805c29"; ctx.fillRect(-2, -4, 4, 8); }
      else if (item.type === "sun") { ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill(); ctx.strokeStyle = "#fff6b0"; ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = TAU * i / 8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * 14, Math.sin(a) * 14); ctx.stroke(); } }
      else { drawCropFruit(CROP_TYPES[item.variant].id, 0, 0, 8); }
      ctx.restore();
    }
  }

  function drawChests() {
    for (const chest of game.chests) {
      if (chest.opened) continue;
      const bob = Math.sin(chest.pulse * 3) * 3;
      ctx.save(); ctx.translate(chest.x, chest.y + bob);
      ctx.shadowColor = "#ffe06d"; ctx.shadowBlur = 18 + Math.sin(chest.pulse * 5) * 6;
      ctx.fillStyle = "#8b5c49"; ctx.strokeStyle = "#fff0a8"; ctx.lineWidth = 4;
      roundRect(-22, -15, 44, 31, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#f4c95e"; ctx.fillRect(-22, -4, 44, 8); ctx.fillRect(-5, -15, 10, 31);
      ctx.fillStyle = "#fff5b5"; ctx.fillRect(-3, -2, 6, 9);
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of game.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1) * (p.alpha || 1);
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = p.color; ctx.fillStyle = p.color;
      if (p.shape === "ring") {
        const progress = 1 - p.life / p.maxLife;
        ctx.lineWidth = 5 * (1 - progress);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * progress, 0, TAU); ctx.stroke();
      } else if (p.shape === "slash") { ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife * .25), p.angle - p.arc / 2, p.angle + p.arc / 2); ctx.stroke(); }
      else if (p.shape === "lane") { ctx.globalAlpha *= .45; ctx.fillRect(p.x - p.size / 2, p.y - 55, p.size, 110); }
      else if (p.shape === "circle") { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
      else if (p.shape === "flash") { ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(p.vy, p.vx)); ctx.fillRect(0, -p.size / 2, p.size * 1.5, p.size); }
      else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }

  function drawFloaters() {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const f of game.floaters) {
      ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
      ctx.font = `900 ${f.size}px "Microsoft YaHei", sans-serif`;
      ctx.lineWidth = 4; ctx.strokeStyle = "#17131a"; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawWorldOverlay() {
    if (game.phase === "night") {
      ctx.fillStyle = "rgba(18,20,43,.18)";
      ctx.fillRect(196, 72, W - 196, H - 72);
    }
    const blackout = game.phase === "night" && (hasTerrain("blackout") || (game.boss && game.boss.variant && game.boss.variant.blackout));
    if (blackout) {
      const lights = [{ x: game.player.x, y: game.player.y, radius: 145 }];
      for (const plot of game.plots) if (plot.state === "ready" && CROP_TYPES[plot.crop].id === "sun") lights.push({ x: plot.x, y: plot.y, radius: 175 });
      ctx.save(); ctx.fillStyle = "rgba(7,8,22,.73)"; ctx.beginPath(); ctx.rect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
      for (const light of lights) {
        const sx = VIEW.x + VIEW.w / 2 + light.x - game.camera.x;
        const sy = VIEW.y + VIEW.h / 2 + light.y - game.camera.y;
        ctx.moveTo(sx + light.radius, sy); ctx.arc(sx, sy, light.radius, 0, TAU, true);
      }
      ctx.fill("evenodd"); ctx.restore();
      ctx.fillStyle = "#fff1a8"; ctx.font = "900 9px 'Microsoft YaHei'"; ctx.textAlign = "center"; ctx.fillText("停电区：向日葵可扩大视野", VIEW.x + VIEW.w / 2, VIEW.y + 18);
    }
    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255,60,55,${game.flash * .18})`;
      ctx.fillRect(196, 72, W - 196, H - 72);
    }
    if (game.shieldFlash > 0) {
      ctx.fillStyle = `rgba(105,255,244,${game.shieldFlash * .22})`;
      ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
    }
    drawSkillFx();
    const hpRatio = game.player.hp / game.player.maxHp;
    if (hpRatio < .32) {
      const alpha = (.32 - hpRatio) * (1.2 + Math.sin(game.elapsed * 6) * .35);
      const gradient = ctx.createRadialGradient(VIEW.x + VIEW.w / 2, VIEW.y + VIEW.h / 2, VIEW.h * .22, VIEW.x + VIEW.w / 2, VIEW.y + VIEW.h / 2, VIEW.w * .62);
      gradient.addColorStop(0, "transparent"); gradient.addColorStop(1, `rgba(176,25,48,${alpha})`);
      ctx.fillStyle = gradient; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
    }
    drawMiniMap();
    if (game.toast.time > 0) {
      const fade = Math.min(1, game.toast.time * 2, (3.2 - game.toast.time) * 2);
      ctx.save(); ctx.globalAlpha = clamp(fade, 0, 1); ctx.textAlign = "center";
      ctx.fillStyle = "rgba(14,12,17,.78)"; ctx.fillRect(470, 116, 390, 64);
      ctx.strokeStyle = "#f0d69155"; ctx.strokeRect(470.5, 116.5, 389, 63);
      ctx.fillStyle = "#fff0ce"; ctx.font = "900 18px 'Microsoft YaHei'"; ctx.fillText(game.toast.text, 665, 141);
      ctx.fillStyle = "#b8ad9d"; ctx.font = "10px 'Microsoft YaHei'"; ctx.fillText(game.toast.sub, 665, 161);
      ctx.restore();
    }
  }

  function drawSkillFx() {
    if (!game.skillFx) return;
    const fx = game.skillFx;
    const progress = 1 - fx.time / fx.maxTime;
    const sx = VIEW.x + VIEW.w / 2 + game.player.x - game.camera.x;
    const sy = VIEW.y + VIEW.h / 2 + game.player.y - game.camera.y;
    ctx.save(); ctx.globalAlpha = clamp(1 - progress, 0, 1);
    if (fx.type === "sprout") {
      ctx.strokeStyle = "#b89cff"; ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(sx, sy, 45 + progress * 380 + i * 34, progress * 2 + i, progress * 2 + i + Math.PI * 1.35); ctx.stroke(); }
      ctx.fillStyle = "#83dc83"; for (let i = 0; i < 10; i++) { const a = TAU * i / 10 + progress * 3; ctx.save(); ctx.translate(sx + Math.cos(a) * (55 + progress * 260), sy + Math.sin(a) * (55 + progress * 260)); ctx.rotate(a); ctx.fillRect(-7, -3, 14, 6); ctx.restore(); }
    } else if (fx.type === "beat") {
      ctx.fillStyle = `rgba(255,241,108,${.3 * (1 - progress)})`; ctx.fillRect(VIEW.x, VIEW.y, VIEW.w, VIEW.h);
      ctx.strokeStyle = "#fff276"; ctx.lineWidth = 7;
      for (let i = 0; i < 5; i++) { const x = VIEW.x + VIEW.w * (i + .5) / 5; ctx.beginPath(); ctx.moveTo(x, VIEW.y); ctx.lineTo(x + (i % 2 ? -38 : 38), sy - 45); ctx.lineTo(x - 20, sy + 22); ctx.lineTo(x + 30, VIEW.y + VIEW.h); ctx.stroke(); }
    } else {
      ctx.strokeStyle = "#86ead7"; ctx.lineWidth = 5;
      for (let i = 0; i < 9; i++) { const a = TAU * i / 9; const d = 35 + progress * 240; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * d, sy + Math.sin(a) * d, 12 + progress * 24, 0, TAU); ctx.stroke(); }
    }
    ctx.restore();
  }

  function drawMiniMap() {
    const x = W - 135, y = 282, w = 105, h = 66;
    ctx.save(); ctx.fillStyle = "#fffaf0d9"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#72647f"; ctx.font = "900 7px 'Microsoft YaHei'"; ctx.textAlign = "left"; ctx.fillText("农区雷达", x + 8, y + 11);
    for (const zone of FIELD_ZONES) { const center = zonePosition(zone.id); ctx.fillStyle = zone.color; ctx.beginPath(); ctx.arc(x + 7 + center.x / WORLD_W * (w - 14), y + 16 + center.y / WORLD_H * (h - 22), 4, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#ef668d"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 7 + game.player.x / WORLD_W * (w - 14), y + 16 + game.player.y / WORLD_H * (h - 22), 4.5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function drawCrosshair() {
    const m = input.mouse;
    ctx.save(); ctx.translate(m.x, m.y); ctx.strokeStyle = input.mouse.down ? "#ffe379" : "#f2e8d1cc"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.stroke();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11); ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); ctx.stroke(); }
    ctx.restore();
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) / rect.width) * W, y: ((event.clientY - rect.top) / rect.height) * H };
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
    if (state === "start" && (key === "enter" || key === " ")) { openStory(); return; }
    if (state === "story" && (key === "enter" || key === " ")) { advanceStory(); return; }
    if (state === "end" && (key === "r" || key === "enter")) { startRun(); return; }
    if (key === "p" && (state === "playing" || state === "paused")) {
      if (state === "playing") { state = "paused"; ui.pause.classList.remove("hidden"); input.mouse.down = false; }
      else { state = "playing"; ui.pause.classList.add("hidden"); canvas.focus(); }
      return;
    }
    if (state !== "playing") return;
    input.keys.add(key);
    if (key === "e") input.interact = true;
    if (key === "q") input.skill = true;
    if (key === " ") input.dash = true;
    if (key === "f" && game.phase === "rest") { phaseTransition(); return; }
    if (["1", "2", "3", "4"].includes(key)) selectSeed(game.carriedSeeds[Number(key) - 1]);
  });
  window.addEventListener("keyup", (event) => input.keys.delete(event.key.toLowerCase()));
  window.addEventListener("blur", () => { input.keys.clear(); input.mouse.down = false; if (state === "playing") { state = "paused"; ui.pause.classList.remove("hidden"); } });
  canvas.addEventListener("mousemove", (event) => Object.assign(input.mouse, pointerPosition(event)));
  canvas.addEventListener("mousedown", (event) => { if (event.button === 0 && state === "playing") { input.mouse.down = true; sound.init(); } });
  canvas.addEventListener("wheel", (event) => { if (state === "playing") { event.preventDefault(); cycleHotbar(event.deltaY > 0 ? 1 : -1); } }, { passive: false });
  window.addEventListener("mouseup", (event) => { if (event.button === 0) input.mouse.down = false; });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  $("start-btn").addEventListener("click", openStory);
  $("codex-btn").addEventListener("click", openCodex);
  $("codex-close").addEventListener("click", closeCodex);
  $("story-next").addEventListener("click", advanceStory);
  $("story-skip").addEventListener("click", startRun);
  $("restart-btn").addEventListener("click", startRun);
  $("resume-btn").addEventListener("click", () => { state = "playing"; ui.pause.classList.add("hidden"); canvas.focus(); });
  $("restart-pause-btn").addEventListener("click", startRun);
  $("home-pause-btn").addEventListener("click", goHome);
  $("home-end-btn").addEventListener("click", goHome);
  ui.merchantRefresh.addEventListener("click", refreshMerchant);
  ui.restContinue.addEventListener("click", () => { if (game && game.phase === "rest") phaseTransition(); });
  document.querySelectorAll(".seed-card").forEach((button) => button.addEventListener("click", () => selectSeed(Number(button.dataset.seed))));
  document.querySelectorAll(".weapon-card").forEach((button) => {
    button.title = WEAPONS[button.dataset.weapon].copy;
    button.addEventListener("click", () => {
      selectedWeapon = button.dataset.weapon;
      document.querySelectorAll(".weapon-card").forEach((card) => card.classList.toggle("active", card === button));
      sound.tone(360, .08, "square", .035, 120);
    });
  });
  document.querySelectorAll(".loadout-seed").forEach((button) => button.addEventListener("click", () => {
    const index = Number(button.dataset.loadoutSeed);
    if (selectedSeedLoadout.includes(index)) {
      button.classList.add("limit"); setTimeout(() => button.classList.remove("limit"), 550);
      return;
    }
    selectedSeedLoadout.shift();
    selectedSeedLoadout.push(index);
    document.querySelectorAll(".loadout-seed").forEach((entry) => entry.classList.toggle("active", selectedSeedLoadout.includes(Number(entry.dataset.loadoutSeed))));
    ui.seedLoadoutCount.textContent = `${selectedSeedLoadout.length} / 4`;
    updateLoadoutAvailability();
    sound.tone(460, .08, "triangle", .035, 100);
  }));
  document.querySelectorAll(".character-card").forEach((button) => button.addEventListener("click", () => {
    selectedCharacter = button.dataset.character;
    document.querySelectorAll(".character-card").forEach((card) => card.classList.toggle("active", card === button));
    const character = CHARACTERS[selectedCharacter];
    document.querySelector(".ai-mascot em").textContent = character.code;
    document.querySelector(".ai-mascot").dataset.character = selectedCharacter;
    document.querySelector(".ai-mascot .face b").textContent = selectedCharacter === "beat" ? ">ᴗ<" : selectedCharacter === "mochi" ? "˶ᵔ ᵕ ᵔ˶" : "˙ᴗ˙";
    document.querySelector(".pitch b").textContent = `${character.name} ${character.code}`;
    renderCharacterDetail();
    sound.tone(430, .08, "triangle", .04, 180);
  }));
  document.querySelectorAll("[data-meta]").forEach((button) => button.addEventListener("click", () => upgradeMeta(button.dataset.meta)));
  ui.sound.addEventListener("click", () => { sound.enabled = !sound.enabled; ui.sound.classList.toggle("muted", !sound.enabled); if (sound.enabled) sound.tone(520, .08, "sine", .04, 180); });

  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    window.__wildrootDebug = {
      snapshot: () => game ? ({ day: game.day, phase: game.phase, phaseTime: game.phaseTime, character: game.character, weapon: game.weapon, carriedSeeds: [...game.carriedSeeds], selectedSeed: game.selectedSeed, selectedTool: game.selectedTool, activeTools: { ...game.activeTools }, skill: CHARACTERS[game.character].skill, skillCooldown: game.player.skillCooldown, level: game.player.level, pendingChoice: game.pendingChoice, damage: game.player.damage, armor: game.player.armor, speed: game.player.speed, dodge: game.player.dodge, crit: game.player.crit, hp: game.player.hp, maxHp: game.player.maxHp, water: game.water, seeds: [...game.seeds], biomass: game.coins, terrain: activeTerrainIds(), plots: game.plots.length, growingPlots: game.plots.filter((plot) => plot.state === "growing").length, dryPlots: game.plots.filter((plot) => plot.state === "growing" && plot.wet <= 2).length, hybrids: game.hybridCount, comboPlants: game.comboPlantCount, comboCards: Object.keys(game.comboCards), comboHarvestStacks: { ...game.comboHarvestStacks }, hybridStatStacks: { ...game.hybridStatStacks }, harvestMomentum: game.harvestMomentum, cropMultiplier: combatCropMultiplier(game.player.attackMode === "melee"), elites: game.enemies.filter((enemy) => enemy.affix).map((enemy) => enemy.affix), enemyCount: game.enemies.length, boss: game.boss ? { type: game.boss.type, variant: game.boss.variant.id, hp: game.boss.hp, maxHp: game.boss.maxHp, stage: game.boss.enrageStage } : null, hazards: game.hazards.length, shield: game.player.shield, shieldFlash: game.shieldFlash, activeEvent: game.activeEvent, nextEventIn: game.eventTimer, merchantRefreshes: game.merchantRefreshes, merchantRefreshCost: 2 + game.merchantRefreshes * 2, merchantStock: [...game.merchantStock], statTalents: { ...game.statTalents }, attackMode: game.player.attackMode, stationary: game.player.stationaryCharge, chests: game.chests.filter((chest) => !chest.opened).length, relics: Object.keys(game.relics), bullets: game.bullets.slice(-3).map((b) => ({ splash: b.splash || 0, frost: b.frost || 0, homing: b.homing, pierce: b.pierce })) }) : null,
      readyCrop: (index) => { const plot = game.plots[0]; plot.crop = index; plot.state = "ready"; plot.growth = CROP_TYPES[index].grow; game.player.x = plot.x; game.player.y = plot.y + 100; },
      breakShield: () => { game.player.shield = 8; game.player.hurtCooldown = 0; hurtPlayer(12, game.player.x - 30, game.player.y); },
      summonBoss: (type) => { game.enemies.length = 0; game.boss = null; game.bossSpawned = false; game.phase = "night"; game.day = type === "crowboss" ? 2 : type === "slimeboss" ? 4 : 5; spawnBoss(type); },
      castBossSkill: () => { game.freezeTimer = 0; if (game.boss) { game.boss.enter = 0; game.boss.skillTimer = 0; } },
      useSkill: () => { game.player.skillCooldown = 0; activateSkill(); },
      install: (id, level = 1) => { const item = ITEMS.find((entry) => entry.id === id); if (!item) return; for (let i = game.items[id] || 0; i < Math.min(level, item.max); i++) { game.items[id] = i + 1; item.apply(i + 1); } checkFusions(); renderBuildDock(); },
      dropChest: () => { game.nightChestDays[game.day] = false; dropRelicChest(game.player.x + 25, game.player.y, game.day); },
      hurtBoss: (ratio) => { if (game.boss) game.boss.hp = game.boss.maxHp * ratio; },
      endRun: () => finishRun(false),
      eventNow: (id = null) => { if (!id) { game.activeEvent = null; game.eventTime = 0; game.eventTimer = 0; return; } if (game.phase === "rest") game.phase = "day"; game.activeEvent = id; game.eventTime = 12; game.eventBannerTime = 4.8; ui.event.classList.remove("hidden"); ui.event.querySelector("b").textContent = id; },
      toRest: () => { game.phase = "day"; game.phaseTime = currentDuration(); game.freezeTimer = 0; update(.02); },
      buySeed: (index) => { game.coins = Math.max(game.coins, 2); buySeed(index); },
      forceHybrid: (hybridId) => { const h = HYBRIDS.find((entry) => entry.id === hybridId); if (!h) return false; const plots = game.plots.filter((plot) => plot.zone === "home").slice(0, 2); clearPlot(plots[0]); clearPlot(plots[1]); plots[0].crop = h.pair[0]; plots[0].state = "ready"; plots[0].growth = CROP_TYPES[h.pair[0]].grow; plots[1].crop = h.pair[1]; plots[1].state = "growing"; plots[1].growth = CROP_TYPES[h.pair[1]].grow; const original = Math.random; Math.random = () => 0; maturePlot(plots[1]); Math.random = original; return plots[1].hybrid; },
      unlockCombo: (comboId) => { const combo = COMBO_PLANTS.find((entry) => entry.id === comboId); if (!combo) return false; meta.achievements[combo.achievement] = Date.now(); storage.save(meta); renderRestShop(); return true; },
      buyCombo: (comboId) => { const combo = COMBO_PLANTS.find((entry) => entry.id === comboId); if (!combo) return false; game.phase = "rest"; game.coins = Math.max(game.coins, combo.cost); buyComboCard(comboId); return Boolean(game.comboCards[comboId]); },
      forceCombo: (comboId) => { const combo = COMBO_PLANTS.find((entry) => entry.id === comboId); if (!combo) return false; game.comboCards[comboId] = true; const plots = game.plots.filter((plot) => plot.zone === "home").slice(0, 2); clearPlot(plots[0]); clearPlot(plots[1]); plots[0].crop = combo.pair[0]; plots[0].state = "ready"; plots[0].growth = CROP_TYPES[combo.pair[0]].grow; plots[1].crop = combo.pair[1]; plots[1].state = "growing"; plots[1].growth = CROP_TYPES[combo.pair[1]].grow; maturePlot(plots[1]); return plots[1].comboPlant; },
      harvestReady: (index = 0) => { const plot = game.plots[index]; if (!plot || plot.state !== "ready") return false; harvest(plot); return true; },
      harvestSpecial: (kind, id) => { const made = kind === "combo" ? window.__wildrootDebug.forceCombo(id) : window.__wildrootDebug.forceHybrid(id); if (!made) return false; const index = game.plots.findIndex((plot) => kind === "combo" ? plot.comboPlant === id : plot.hybrid === id); if (index < 0) return false; harvest(game.plots[index]); return true; },
      availableItemIds: () => ITEMS.filter((item) => itemMatchesLoadout(item)).map((item) => item.id),
      openChoice: (mode = "milestone") => { state = "playing"; showChoice(mode); return [...ui.choiceCards.querySelectorAll("h3")].map((node) => node.textContent); },
      chooseStat: (id) => { const item = STAT_TALENTS.find((entry) => entry.id === id); if (!item) return false; chooseStatTalent(item); return true; },
      refreshShop: () => { game.phase = "rest"; game.coins = Math.max(game.coins, 50); const before = game.coins; refreshMerchant(); return before - game.coins; },
      buyShop: (id) => { game.phase = "rest"; game.coins = Math.max(game.coins, 50); if (!game.merchantStock.includes(id)) game.merchantStock[0] = id; buyMerchantItem(id); return Boolean(game.merchantOwned[id]); },
      selectTool: (id = "shovel") => { selectActiveTool(id); return game.selectedTool; },
      digHere: (x = game.player.x + 120, y = game.player.y + 120) => { game.player.x = x; game.player.y = y; return digPlot(); },
      wheel: (direction = 1) => { cycleHotbar(direction); return game.selectedTool || game.selectedSeed; },
      dropRiverXp: () => { dropPickup("xp", 1190, 500, 1); const item = game.pickups.at(-1); return { x: item.x, y: item.y }; },
      spawnPool: (day = 5) => enemySpawnPool(day),
      setTerrain: (id = "bridge") => { game.terrainDays[game.day - 1] = id; updateTerrainUi(); return activeTerrainIds(); },
      plantEmpty: (seedIndex = game.selectedSeed) => { const plot = game.plots.find((entry) => entry.state === "empty"); if (!plot) return false; game.seeds[seedIndex] = Math.max(1, game.seeds[seedIndex]); return plantPlot(plot, seedIndex, "调试播种"); },
      dryCrop: (seedIndex = game.selectedSeed) => { const plot = game.plots.find((entry) => entry.state === "empty"); if (!plot) return false; plot.crop = seedIndex; plot.state = "growing"; plot.growth = 0; plot.wet = 0; plot.hp = plot.maxHp; return true; },
      triggerFarmTools: () => { game.autoWaterTimer = 0; game.autoSeedTimer = 0; game.water = Math.max(2, game.water); game.seeds[game.selectedSeed] = Math.max(2, game.seeds[game.selectedSeed]); },
      tick: (seconds) => { for (let elapsed = 0; elapsed < seconds; elapsed += .05) update(.05); return true; }
    };
  }

  renderCharacterDetail();
  updateMetaDisplay();
  requestAnimationFrame(frame);
})();
