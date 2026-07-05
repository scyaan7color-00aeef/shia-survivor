'use strict';
/* =========================================================
 * シア・サバイバー — サバイバーライク（Vampire Survivors系）
 * 単一ページ・完全オフライン・外部ライブラリなし
 * 敵/アイテムは絵文字フォールバック付きで、assets/ に画像を
 * 置くだけで自動的に差し替わる設計。
 * ========================================================= */

/* ===== 定数（ゲームバランスはここに集約） ===== */
const CONFIG = {
  // プレイヤー
  PLAYER: {
    BASE_HP: 100,
    BASE_SPEED: 170,        // px/秒
    RADIUS: 18,             // 当たり判定半径
    DRAW_W: 60,             // 描画サイズ（192x208 を約0.31倍）
    DRAW_H: 65,
    PICKUP_RADIUS: 70,      // アイテム自動回収半径
    INVULN_TIME: 0.6,       // 被弾後の無敵時間（秒）
    HIT_ANIM_TIME: 0.45,    // failedアニメを見せる時間（秒）
  },
  // 自動攻撃（武器の初期値）
  WEAPON: {
    DAMAGE: 10,
    INTERVAL: 0.75,         // 発射間隔（秒）
    BULLET_SPEED: 380,      // 弾速 px/秒
    RANGE: 340,             // 射程 px
    BULLET_COUNT: 1,        // 同時発射数
    PIERCE: 0,              // 貫通数（0=1体で消滅）
    BULLET_RADIUS: 6,
    SPREAD_DEG: 9,          // 複数弾の拡散角（度）
  },
  // スポーン・難易度カーブ
  SPAWN: {
    BASE_INTERVAL: 1.2,     // 開始時のスポーン間隔（秒）
    MIN_INTERVAL: 0.22,     // 最短スポーン間隔
    RAMP_TIME: 300,         // この秒数かけて間隔が最短まで縮む
    MARGIN: 40,             // 画面外スポーンのはみ出し距離
    MAX_ENEMIES: 220,       // 同時最大数（処理落ち防止）
    HP_SCALE_PER_MIN: 0.85, // 1分あたり敵HP +85%
    SPEED_SCALE_PER_MIN: 0.06, // 1分あたり敵速度 +6%
    BOSS_INTERVAL: 90,      // ボス出現周期（秒）
  },
  // 経験値：次のレベルに必要な量
  XP_BASE: 8,
  XP_PER_LEVEL: 6,
  // ドロップ
  DROP: {
    COIN_CHANCE: 0.30,      // 通常敵のコインドロップ率
    HEART_CHANCE: 0.03,     // 回復ハートのドロップ率
    HEART_HEAL: 25,
    MAGNET_CHANCE: 0.012,   // マグネット（全ジェム回収）のドロップ率
    BOMB_CHANCE: 0.012,     // 爆弾（全体ダメージ）のドロップ率
    SHIELD_CHANCE: 0.010,   // 一時無敵のドロップ率
    PICKUP_ATTRACT_SPEED: 420, // 吸い寄せ速度 px/秒
    COLLECT_DIST: 22,       // 実際に回収される距離
    LIFETIME: 45,           // ドロップの寿命（秒）
    BOMB_DAMAGE: 60,        // 画面全体ダメージの威力（時間で増加）
    SHIELD_TIME: 6,         // 一時無敵の持続（秒）
  },
  // 追加武器：弾分裂（スプリット）
  SPLIT: {
    COUNT_BASE: 2,          // Lv1 で分裂する破片数
    SPREAD_DEG: 42,         // 破片の拡散角（度・全体）
    FRAG_DAMAGE_MULT: 0.6,  // 破片のダメージ倍率（元弾比）
    FRAG_LIFE: 0.28,        // 破片の寿命（秒）＝短射程
    FRAG_SPEED: 300,        // 破片の速度
    FRAG_RADIUS: 5,
  },
  // 追加武器：薙ぎ払い（スイープ・近接扇状）
  SWEEP: {
    INTERVAL_BASE: 1.6,     // Lv1 の発動間隔（秒）
    INTERVAL_MULT: 0.9,     // レベルごとに間隔 ×0.9
    DAMAGE_BASE: 14,        // Lv1 の威力
    DAMAGE_PER_LV: 0.45,    // レベルごとに +45%
    RADIUS_BASE: 105,       // Lv1 の届く距離
    RADIUS_PER_LV: 0.12,    // レベルごとに +12%
    ARC_DEG: 180,           // 扇の角度（度）
    KNOCK: 120,             // ノックバック強さ
    ANIM_TIME: 0.32,        // 振りモーションの見せ時間
  },
  // 追加武器：衝撃波（ショックウェーブ・円形リング）
  SHOCK: {
    INTERVAL_BASE: 3.2,     // Lv1 の発動間隔（秒）
    INTERVAL_MULT: 0.88,    // レベルごとに間隔 ×0.88
    DAMAGE_BASE: 18,        // Lv1 の威力
    DAMAGE_PER_LV: 0.5,     // レベルごとに +50%
    MAX_RADIUS_BASE: 160,   // Lv1 の到達半径
    MAX_RADIUS_PER_LV: 0.15,// レベルごとに +15%
    SPEED: 520,             // リングの広がる速度 px/秒
    BAND: 26,               // リングの当たり判定の帯幅
    KNOCK: 200,             // ノックバック強さ
  },
  KNOCK_DECAY: 9,           // ノックバック減衰係数（大きいほど速く止まる）
  SHAKE_DECAY: 5,           // 画面シェイク減衰
  BEST_KEY: 'cyanissimo_survivor_best',      // 旧・最長記録（互換のため書き続ける）
  RANKS_KEY: 'cyanissimo_survivor_ranks_v1', // 新・ランキング（上位N件）
  NAME_KEY: 'cyanissimo_survivor_name',      // プレイヤー名
  RANK_MAX: 10,             // ランキング保持件数
  // メタ通貨・進化・音のキー
  STARDUST_KEY: 'cyanissimo_survivor_stardust',    // 星屑（転生通貨）残高
  PRESTIGE_KEY: 'cyanissimo_survivor_prestige_v1', // 恒久強化の取得段数
  HISTORY_KEY: 'cyanissimo_survivor_history_v1',   // プレイ履歴（時系列）
  HISTORY_MAX: 15,           // 履歴の保持件数
  EVO_EVERY_LEVELS: 4,       // 進化（昇格）候補を出すレベル間隔（Lv4/8/12…）
  SFX_KEY: 'cyanissimo_survivor_sfx',              // 効果音ON/OFF
  FEEDBACK_KEY: 'cyanissimo_survivor_feedback_v1', // フィードバック（ローカル保存＋Googleフォーム送信）
  FEEDBACK_FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSfgaZPdV1Qavr-BABAamBR41MleNkEdvfe1f94zzLZNZoi1eQ/formResponse', // Googleフォーム回答エンドポイント
  FEEDBACK_FORM_ENTRY: 'entry.846507698',          // 「感想・要望・バグ報告など」段落フィールドのID
  EVO_MAX_PER_RUN: 3,        // 1ランの進化上限（進化研究で+1）
  EVO_PASSIVE_REQ: 2,        // 進化に必要なパッシブLv（進化研究で-1・緩和済み）
  EVO_CORE_REQ: 4,           // 進化に必要な武器コアLv（Maxでなくても届く＝緩和済み）
  CORE_MAX: { multi: 6, sweep: 6, shock: 6, funnel: 5 }, // 参考：各コアの最大Lv
};

/* ===== 主役スプライトシート仕様（1536x1872 / 8列x9行 / 1コマ192x208） ===== */
const SPRITE_SHEET = {
  src: 'assets/cyanissimo_sprites.webp',
  fallbackSrc: 'assets/cyanissimo_sprites.png',
  frameW: 192,
  frameH: 208,
  cols: 8,
  // 行 → アニメ定義（frames=その行の使用コマ数、fps=再生速度）
  anims: {
    idle:     { row: 0, frames: 6, fps: 6 },
    runRight: { row: 1, frames: 8, fps: 12 },
    runLeft:  { row: 2, frames: 8, fps: 12 },
    waving:   { row: 3, frames: 4, fps: 8 },
    jumping:  { row: 4, frames: 5, fps: 10 },
    failed:   { row: 5, frames: 8, fps: 12 },
    waiting:  { row: 6, frames: 6, fps: 6 },
    running:  { row: 7, frames: 6, fps: 12 },
    review:   { row: 8, frames: 6, fps: 6 },
  },
};

/* ===== 敵タイプ定義 =====
 * sprite: assets/ に同名ファイルを置けば絵文字から画像に自動で差し替わる */
const ENEMY_TYPES = {
  blob: { // 基本のザコ
    name: 'ブロブ', emoji: '👾', sprite: 'assets/enemy_blob.png',
    radius: 15, hp: 12, speed: 55, dmg: 8, xp: 1,
    coinChance: 0.30, coinValue: 1, size: 34, unlockAt: 0, weight: 10,
  },
  bat: { // 速いが脆い
    name: 'コウモリ', emoji: '🦇', sprite: 'assets/enemy_bat.png',
    radius: 12, hp: 7, speed: 110, dmg: 6, xp: 1,
    coinChance: 0.25, coinValue: 1, size: 28, unlockAt: 40, weight: 6,
    wobble: true, // ふらふら飛ぶ
  },
  ghost: { // 群れで湧く
    name: 'ゴースト', emoji: '👻', sprite: 'assets/enemy_ghost.png',
    radius: 13, hp: 9, speed: 72, dmg: 7, xp: 1,
    coinChance: 0.25, coinValue: 1, size: 30, unlockAt: 90, weight: 5,
    groupMin: 4, groupMax: 7, // まとめて湧く数
  },
  charger: { // 突進タイプ：ためて一気にダッシュ
    name: 'チャージャー', emoji: '🐗', sprite: 'assets/enemy_charger.png',
    radius: 16, hp: 20, speed: 60, dmg: 12, xp: 2,
    coinChance: 0.35, coinValue: 1, size: 36, unlockAt: 60, weight: 4,
    charge: { cooldown: 2.4, dashTime: 0.6, dashMult: 4.2 }, // 突進パラメータ
  },
  slime: { // 分裂スライム：倒すと2体の小スライムに割れる
    name: 'スライム', emoji: '🟢', sprite: 'assets/enemy_slime.png',
    radius: 16, hp: 22, speed: 48, dmg: 9, xp: 2,
    coinChance: 0.3, coinValue: 1, size: 34, unlockAt: 120, weight: 4,
    splitInto: { type: 'slimeMini', count: 2 },
  },
  slimeMini: { // 小スライム（通常抽選外・分裂で出現）
    name: 'コスライム', emoji: '🟩', sprite: 'assets/enemy_slime_mini.png',
    radius: 10, hp: 7, speed: 78, dmg: 5, xp: 1,
    coinChance: 0.15, coinValue: 1, size: 22, unlockAt: 0, weight: 0,
  },
  archer: { // 射手：距離を取って弾を撃つ
    name: 'アーチャー', emoji: '🏹', sprite: 'assets/enemy_archer.png',
    radius: 13, hp: 16, speed: 62, dmg: 10, xp: 3,
    coinChance: 0.4, coinValue: 2, size: 32, unlockAt: 240, weight: 3,
    ranged: { range: 300, keep: 220, interval: 2.2, bulletSpeed: 210, bulletDmg: 9 },
  },
  shield: { // 盾型：とても硬いが遅い
    name: 'シールダー', emoji: '🛡️', sprite: 'assets/enemy_shield.png',
    radius: 20, hp: 90, speed: 30, dmg: 14, xp: 5,
    coinChance: 0.9, coinValue: 4, size: 44, unlockAt: 240, weight: 2,
  },
  golem: { // 遅いが硬い
    name: 'ゴーレム', emoji: '🗿', sprite: 'assets/enemy_golem.png',
    radius: 21, hp: 60, speed: 32, dmg: 16, xp: 4,
    coinChance: 0.8, coinValue: 3, size: 46, unlockAt: 150, weight: 3,
  },
  wisp: { // 素早いジグザグの鬼火
    name: 'ウィスプ', emoji: '🔥', sprite: 'assets/enemy_wisp.png',
    radius: 12, hp: 14, speed: 128, dmg: 9, xp: 2,
    coinChance: 0.3, coinValue: 1, size: 26, unlockAt: 200, weight: 4,
    wobble: true,
  },
  brute: { // のっそり歩く大型・高HP高火力
    name: 'ブルート', emoji: '👹', sprite: 'assets/enemy_brute.png',
    radius: 24, hp: 130, speed: 34, dmg: 20, xp: 6,
    coinChance: 0.9, coinValue: 4, size: 52, unlockAt: 260, weight: 2,
  },
  boss: { // 定期的に現れる強敵（weight=0 で通常抽選外）
    name: 'デスロード', emoji: '💀', sprite: 'assets/enemy_boss.png',
    radius: 32, hp: 380, speed: 44, dmg: 25, xp: 25,
    coinChance: 1, coinValue: 20, size: 72, unlockAt: 0, weight: 0,
    isBoss: true,
  },
};

/* ===== ドロップ品定義（画像差し替え可） ===== */
const PICKUP_TYPES = {
  gem:    { emoji: '💎', sprite: 'assets/gem.png',    size: 20 },
  coin:   { emoji: '🪙', sprite: 'assets/coin.png',   size: 20 },
  heart:  { emoji: '💖', sprite: 'assets/heart.png',  size: 22 },
  magnet: { emoji: '🧲', sprite: 'assets/magnet.png', size: 26 }, // 全ジェム一括回収
  bomb:   { emoji: '💣', sprite: 'assets/bomb.png',   size: 26 }, // 画面全体ダメージ
  shield: { emoji: '🛡️', sprite: 'assets/shield.png', size: 26 }, // 一時無敵
};

/* ===== 弾の見た目（画像差し替え可・無ければ光る弾を描画） ===== */
const BULLET_SPRITE = 'assets/bullet.png';

/* ===== レベルアップ強化プール（suga.W指定の再編版） =====
 * 弾/球コアのカードは職業（アーキタイプ）ごとに効果と説明文が変わる。
 * 写像は ARCHETYPES[arch].applyBullet 等に集約（データ駆動）。
 * archs = 提示する職業を限定（貫通=射手のみ 等） */
const UPGRADE_POOL = [
  // --- 弾/球コア（職業で効果が変わる中核カード） ---
  { id: 'bullet', emoji: '⚔️', name: '弾強化', max: 6,
    desc: '攻撃力+20%、弾を1発追加（2回目以降は弾も大きくなる）',
    apply: p => {
      const taken = p.upgradeLevels['bullet'] || 0; // 適用前のLv（0=1回目）
      p.damageMult *= 1.20;
      archOf(p).applyBullet(p, taken);
    } },
  { id: 'firespeed', emoji: '⚡', name: '弾速＆連射', max: 6,
    desc: '弾速+15%、攻撃間隔−10%',
    apply: p => { p.intervalMult *= 0.90; archOf(p).applyFirespeed(p); } },
  { id: 'split', emoji: '✨', name: '着弾分裂', max: 5,
    desc: '弾が着弾時に破片へ分裂する（弾数を引き継ぐ）',
    apply: p => { archOf(p).applySplit(p); } },
  { id: 'pierce', emoji: '🏹', name: '貫通', max: 1, archs: ['gunner'],
    desc: 'すべての弾が敵を貫通するようになる（1回のみ）',
    apply: p => { p.pierce = 999; } },
  // --- 追加武器（多段強化・取得すると新しい攻撃が増える） ---
  { id: 'funnel', emoji: '🛰️', name: 'ファンネル', max: 5,
    desc: '周囲を回る援護ビットが敵を自動で撃つ（Lvで数・威力・射程が上昇）',
    apply: p => {} },
  { id: 'sweep', emoji: '🌀', name: '薙ぎ払い', max: 6,
    desc: '釘バットを反時計回りに振る近接攻撃（Lv3で2連撃・Lv5で二刀＆各2連撃）', apply: p => {} },
  { id: 'shock', emoji: '💥', name: '衝撃波', max: 6,
    desc: '周囲へ衝撃波リングを放つ（Lvで範囲と威力が上昇）', apply: p => {} },
  // --- パッシブ ---
  { id: 'range',  emoji: '🔭', name: '射程アップ',     desc: '弾・ビットの射程+15%',    max: 6, apply: p => { p.rangeMult *= 1.15; } },
  { id: 'speed',  emoji: '👟', name: '移動速度アップ', desc: '移動速度+10%',            max: 6, apply: p => { p.moveSpeedMult *= 1.10; } },
  { id: 'magnet', emoji: '🧲', name: '回収範囲アップ', desc: 'アイテムの回収範囲+30%',  max: 6, apply: p => { p.pickupRadius *= 1.30; } },
  { id: 'hp',     emoji: '❤️', name: '最大HPアップ',   desc: '最大HP+20（同時に20回復）', max: 99, apply: p => { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); } },
];
// カードの説明/名前を職業（アーキタイプ）に応じて返す
function cardDesc(u) {
  const p = S.player;
  if (p) {
    const arch = ARCHETYPES[p.archetype];
    if (arch && arch.cardDesc && arch.cardDesc[u.id]) return arch.cardDesc[u.id];
  }
  return u.desc;
}
function cardName(u) {
  const p = S.player;
  if (p) {
    const arch = ARCHETYPES[p.archetype];
    if (arch && arch.cardName && arch.cardName[u.id]) return arch.cardName[u.id];
  }
  return u.name;
}

/* ===== ショップ（一時停止中にコインで購入・買うたび値上がり） ===== */
const SHOP_ITEMS = [
  { id: 'potion', emoji: '🧪', name: '回復ポーション', desc: 'HPを50%回復',        basePrice: 25, apply: p => { p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.5); } },
  { id: 'tome',   emoji: '📕', name: '攻撃の書',       desc: '攻撃力+10%',         basePrice: 40, apply: p => { p.damageMult *= 1.10; } },
  { id: 'magnetS',emoji: '🧲', name: '磁石',           desc: '回収範囲+20%',       basePrice: 30, apply: p => { p.pickupRadius *= 1.20; } },
];

/* ===== 武器進化レシピ =====
 * core = 進化元の武器コア（multi=弾/ sweep=薙ぎ払い/ shock=衝撃波）
 * passive = 必要パッシブ（Lv EVO_PASSIVE_REQ 以上）
 * group = 同グループの進化は1ラン1つ（コア消費） */
const EVO_GROUP = { bullet: 'bullet', sweep: 'sweep', shock: 'shock', funnel: 'funnel' };
const EVOLUTIONS = [
  // --- 弾コアの進化（職業ごとに別レシピ。arch = その職業のみ提示） ---
  // 射手（シア）
  { id: 'lance',   emoji: '🔱', name: '拡散貫通ランス', core: 'bullet', passive: 'pierce', passiveReq: 1, arch: 'gunner',
    material: '弾強化Lv4＋貫通', desc: '正面へ貫通するランスを3本発射。貫くごとに威力が下がり、最後に小爆発' },
  { id: 'railgun', emoji: '☄️', name: '彗星レールガン', core: 'bullet', passive: 'range', arch: 'gunner',
    material: '弾強化Lv4＋射程Lv2', desc: '予告のあと、画面端まで貫く極太レーザーを放つ' },
  // 魔導士（ソフィア）
  { id: 'orbnova',  emoji: '💥', name: '星団ノヴァ',     core: 'bullet', passive: 'firespeed', arch: 'mage',
    material: '魔球強化Lv4＋弾速＆連射Lv2', desc: '魔法球が周期的に爆発し、小爆発が最大3連鎖する' },
  { id: 'familiar', emoji: '🧚', name: '使い魔ビット',   core: 'bullet', passive: 'magnet', arch: 'mage',
    material: '魔球強化Lv4＋回収範囲Lv2', desc: '自律する2体の使い魔が敵を追って魔弾を撃ち続ける' },
  // 剣士
  { id: 'crescentstorm', emoji: '🌪️', name: '旋回剣嵐', core: 'bullet', passive: 'speed', arch: 'swordsman',
    material: '斬撃強化Lv4＋移動速度Lv2', desc: '二枚の剣風が周囲を旋回し続け、定期的に斬撃を四方へ放つ' },
  { id: 'iai',     emoji: '⚡', name: '居合・虚空一閃', core: 'bullet', passive: 'range', arch: 'swordsman',
    material: '斬撃強化Lv4＋射程Lv2', desc: '一拍の溜めの後、画面を貫く一閃で直線上の敵をまとめて両断する' },
  // 錬金術師
  { id: 'chainflask', emoji: '🧨', name: '連鎖大爆薬',   core: 'bullet', passive: 'range', arch: 'alchemist',
    material: '投擲強化Lv4＋射程Lv2', desc: '爆発が敵を巻き込んで最大3連鎖し、爆発半径も拡大する' },
  { id: 'elixir',  emoji: '🌼', name: 'エリクサー床',   core: 'bullet', passive: 'hp', arch: 'alchemist',
    material: '投擲強化Lv4＋最大HPLv2', desc: '毒沼が黄金の床に変わり、敵を溶かしつつ自分は上に立つと回復する' },
  // 教師
  { id: 'lecture', emoji: '📢', name: '一斉講義',       core: 'bullet', passive: 'firespeed', arch: 'teacher',
    material: 'チョーク増量Lv4＋弾速＆連射Lv2', desc: '定期的に全方位へチョークを乱射する。通常の連射も継続' },
  { id: 'detention', emoji: '📏', name: '居残り結界',   core: 'bullet', passive: 'magnet', arch: 'teacher',
    material: 'チョーク増量Lv4＋回収範囲Lv2', desc: '敵の密集地に拘束フィールドを展開し、大幅スロー＋継続ダメージ' },
  // --- 以下は全職業共通の進化 ---
  { id: 'bits',    emoji: '🛰️', name: '蒼銀ビット陣',   core: 'funnel', passive: 'firespeed',
    material: 'ファンネルLv4＋弾速＆連射Lv2', desc: 'ファンネルの上位。ビットが増え、威力と射程が大幅に上昇' },
  { id: 'scythe',  emoji: '🌙', name: '旋回大鎌',       core: 'sweep', passive: 'firespeed',
    material: '薙ぎ払いLv4＋弾速＆連射Lv2', desc: '緑の光刃が360°を薙ぎ続け、一定間隔で斬撃リングを放つ' },
  { id: 'ward',    emoji: '🌸', name: '月影結界',       core: 'sweep', passive: 'hp',
    material: '薙ぎ払いLv4＋最大HPLv2', desc: '被弾を1回防ぐ結界を定期的に張り、更新時に周囲を斬り飛ばす' },
  { id: 'nova',    emoji: '💫', name: '連鎖星爆',       core: 'shock', passive: 'range',
    material: '衝撃波Lv4＋射程Lv2', desc: '衝撃波でとどめを刺すと魔法陣が発火し、小爆発が最大4連鎖する' },
];

/* =========================================================
 * アーキタイプ（職業）定義 — データ駆動の中核
 * 各職業ごとに { 基本攻撃(update), 強化カードの写像(applyBullet等),
 * カード説明/名前の差し替え(cardDesc/cardName), エフェクト色 } を1箇所に集約。
 * キャラ定義(CHARACTERS)の class でどの職業になるかが決まる。
 * 進化レシピは EVOLUTIONS 側の arch フィールドで職業に紐づく。
 * ========================================================= */
function archOf(p) { return ARCHETYPES[p.archetype] || ARCHETYPES.gunner; }
const ARCHETYPES = {
  // 射手（シア）＝従来の魔法弾。最寄りの敵へ自動射撃
  gunner: {
    name: '射手', emoji: '🎯',
    shock: { main: '#a5b4fc', glow: '#e0e7ff' }, beam: '#93c5fd',
    cardDesc: {}, cardName: {},
    splitFragments: true, // 着弾分裂カードが「実際に弾を分裂」させる職業（他職はカード効果が別物）
    applyBullet(p, taken) { p.bulletCount += 1; if (taken >= 1) p.bulletSizeMult *= 1.15; },
    applyFirespeed(p) { p.bulletSpeedMult *= 1.15; },
    applySplit(p) {},
    update(dt) { updateGunner(dt); },
  },
  // 魔導士（ソフィア）＝緑の魔法球が周回・貫通
  mage: {
    name: '魔導士', emoji: '🔮',
    shock: { main: '#86efac', glow: '#dcfce7' }, beam: '#86efac',
    cardName: { bullet: '魔球強化' },
    cardDesc: {
      bullet: '威力+20%、魔法球を1つ追加（2回目以降は球も大きくなる）',
      firespeed: '球の回転が速くなり、手数が増える',
      split: '魔法球の回転半径が広がる',
    },
    applyBullet(p, taken) { p.orbCount += 1; if (taken >= 1) p.orbSizeMult *= 1.15; },
    applyFirespeed(p) { p.orbSpeedMult *= 1.15; },
    applySplit(p) { p.orbRadiusMult *= 1.15; },
    update(dt) { updateMage(dt); },
  },
  // 剣士＝斬撃弾を飛ばす＋近距離の扇斬り
  swordsman: {
    name: '剣士', emoji: '⚔️',
    shock: { main: '#7dd3fc', glow: '#e0f2fe' }, beam: '#7dd3fc',
    cardName: { bullet: '斬撃強化', split: '豪剣' },
    cardDesc: {
      bullet: '威力+20%、連撃+1（2回目以降は斬撃も大きくなる）',
      firespeed: '斬撃が速く飛び、振りの間隔も短くなる',
      split: '斬撃が大きくなる（幅+18%）',
      range: '斬撃の射程+15%',
    },
    applyBullet(p, taken) { p.bulletCount += 1; if (taken >= 1) p.slashWidthMult *= 1.15; },
    applyFirespeed(p) { p.bulletSpeedMult *= 1.15; },
    applySplit(p) { p.slashWidthMult *= 1.18; },
    update(dt) { updateSwordsman(dt); },
  },
  // 錬金術師＝ポーション爆弾（着弾で爆発＋毒沼）
  alchemist: {
    name: '錬金術師', emoji: '⚗️',
    shock: { main: '#c4b5fd', glow: '#ede9fe' }, beam: '#a78bfa',
    cardName: { bullet: '投擲強化', split: '粘性毒沼' },
    cardDesc: {
      bullet: '威力+20%、投擲数+1（2回目以降は爆発半径も拡大）',
      firespeed: '投擲が速く、間隔も短くなる',
      split: '毒沼の持続時間+25%',
      range: '投擲距離+15%',
    },
    applyBullet(p, taken) { p.bulletCount += 1; if (taken >= 1) p.bulletSizeMult *= 1.15; },
    applyFirespeed(p) { p.bulletSpeedMult *= 1.15; },
    applySplit(p) { p.poolDurMult *= 1.25; },
    update(dt) { updateAlchemist(dt); },
  },
  // 教師＝チョーク連射（壁反射）＋黒板消しトラップ。経験値ボーナス持ち
  teacher: {
    name: '教師', emoji: '📚',
    shock: { main: '#fde68a', glow: '#fef9c3' }, beam: '#fcd34d',
    cardName: { bullet: 'チョーク増量', split: '反射授業' },
    cardDesc: {
      bullet: '威力+20%、チョーク+1本（2回目以降はチョークも大きくなる）',
      firespeed: 'チョークの連射速度アップ',
      split: 'チョークの壁反射回数+1',
      range: 'チョークの射程+15%',
    },
    applyBullet(p, taken) { p.bulletCount += 1; if (taken >= 1) p.bulletSizeMult *= 1.15; },
    applyFirespeed(p) { p.bulletSpeedMult *= 1.15; },
    applySplit(p) { p.chalkBounce += 1; },
    init(p) { p.xpGainMult = 1.15; }, // 経験値補助（教師の固有ボーナス）
    update(dt) { updateTeacher(dt); },
  },
};

/* ===== キャラクター定義 =====
 * class = アーキタイプ（職業）。sheet/sheetPng = スプライトシート（差し替え可能）。
 * fallbackChar = 専用シートが無い間に代用するキャラ（画像を置けば自動で切り替わる）。 */
const CHARACTERS = {
  shia: {
    name: 'シア', emoji: '🩵', class: 'gunner',
    sheet: 'assets/cyanissimo_sprites.webp', sheetPng: 'assets/cyanissimo_sprites.png',
    desc: '魔法弾を撃つオールラウンダー。弾を強化して拡散ランスや彗星レールガンへ進化。',
  },
  sophia: {
    name: 'ソフィア', emoji: '💚', class: 'mage',
    sheet: 'assets/sophia_sprites.webp', sheetPng: 'assets/sophia_sprites.png',
    desc: '緑の魔法球が等間隔で周回し敵を貫く。進化で星団ノヴァ／使い魔ビット。',
  },
  swordsman: {
    name: '剣士', emoji: '⚔️', class: 'swordsman', fallbackChar: 'shia',
    sheet: 'assets/swordsman_sprites.webp', sheetPng: 'assets/swordsman_sprites.png',
    desc: '飛ぶ斬撃と近距離の扇斬りで戦う。進化で旋回剣嵐／居合・虚空一閃。',
  },
  alchemist: {
    name: '錬金術師', emoji: '⚗️', class: 'alchemist', fallbackChar: 'sophia',
    sheet: 'assets/alchemist_sprites.webp', sheetPng: 'assets/alchemist_sprites.png',
    desc: 'ポーション爆弾で爆発と毒沼を作る。進化で連鎖大爆薬／エリクサー床。',
  },
  teacher: {
    name: '教師', emoji: '📚', class: 'teacher', fallbackChar: 'shia',
    sheet: 'assets/teacher_sprites.webp', sheetPng: 'assets/teacher_sprites.png',
    desc: 'チョーク連射（壁反射）と黒板消しトラップ。経験値+15%。進化で一斉講義／居残り結界。',
  },
};

/* ===== 背景ゾーン（ボスを倒すたびに次の雰囲気へ。先頭＝初期背景で不変） =====
 * img：Codex製の背景アート（1024x576）。読み込めたら画像、無ければ従来の
 * 単色＋グリッドの手続き背景にフォールバック（drawBackground参照）。 */
const ZONES = [
  { name: '夜の草原',   bg: '#101830', grid: 'rgba(120,160,255,0.07)', img: 'assets/bg_zone1.png' }, // 初期
  { name: '翠玉の森',   bg: '#0f2119', grid: 'rgba(120,255,180,0.07)', img: 'assets/bg_zone2.png' },
  { name: '紫水晶の谷', bg: '#221230', grid: 'rgba(200,140,255,0.08)', img: 'assets/bg_zone3.png' },
  { name: '緋色の荒野', bg: '#2a1418', grid: 'rgba(255,150,150,0.08)', img: 'assets/bg_zone4.png' },
  { name: '蒼氷の海',   bg: '#0d1e2b', grid: 'rgba(120,210,255,0.08)', img: 'assets/bg_zone5.png' },
  { name: '黄昏の砂丘', bg: '#241f10', grid: 'rgba(255,220,120,0.08)', img: 'assets/bg_zone6.png' },
];

/* ===== 転生（プレステージ）恒久強化ツリー =====
 * 星屑（メタ通貨）で購入。localStorage永続。 */
const PRESTIGE_TREE = [
  { id: 'atk',    emoji: '⚔️', name: '攻撃基礎',     max: 5, prices: [20, 45, 90, 170, 320], desc: '与ダメージ+4%（1段ごと）' },
  { id: 'hp',     emoji: '❤️', name: '生存基礎',     max: 5, prices: [18, 40, 80, 155, 300], desc: '最大HP+6%（1段ごと）' },
  { id: 'mag',    emoji: '🧲', name: '回収磁力',     max: 5, prices: [15, 35, 75, 140, 260], desc: '回収範囲+8%（1段ごと）' },
  { id: 'gold',   emoji: '💰', name: '商才',         max: 5, prices: [25, 55, 110, 210, 400], desc: 'コイン獲得+6%（1段ごと）' },
  { id: 'start',  emoji: '🚀', name: '開始ブースト', max: 3, prices: [80, 220, 520], desc: '開始レベル+1（1段ごと）' },
  { id: 'choice', emoji: '🔀', name: '選択肢拡張',   max: 2, prices: [120, 300], desc: '1段目：リロール解禁／2段目：バニッシュ解禁' },
  { id: 'evo',    emoji: '🔬', name: '進化研究',     max: 3, prices: [160, 380, 800], desc: '1段目：進化の出現率↑／2段目：必要Lv−1／3段目：進化上限+1' },
  { id: 'revive', emoji: '🪽', name: '復活の護符',   max: 1, prices: [600], desc: '1ランにつき1回、HP30%で復活' },
];

/* =========================================================
 * 画像ローダー：読み込めたら画像、失敗したら絵文字にフォールバック
 * ========================================================= */
const imageCache = new Map(); // src → { img, ok }
function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const entry = { img: new Image(), ok: false };
  entry.img.onload = () => { entry.ok = true; };
  entry.img.onerror = () => { entry.ok = false; };
  entry.img.src = src;
  imageCache.set(src, entry);
  return entry;
}

/* =========================================================
 * 転生（星屑）ストレージ
 * ========================================================= */
function loadStardust() {
  try { return Math.max(0, parseInt(localStorage.getItem(CONFIG.STARDUST_KEY)) || 0); } catch { return 0; }
}
function saveStardust(n) {
  try { localStorage.setItem(CONFIG.STARDUST_KEY, String(Math.max(0, Math.floor(n)))); } catch {}
}
function loadPrestige() {
  try { return JSON.parse(localStorage.getItem(CONFIG.PRESTIGE_KEY)) || {}; } catch { return {}; }
}
function savePrestige(obj) {
  try { localStorage.setItem(CONFIG.PRESTIGE_KEY, JSON.stringify(obj)); } catch {}
}
function prestigeLv(id) { return (loadPrestige()[id] || 0); }

// ラン終了時の星屑付与量
function computeStardust(coins, timeSec, bossKills) {
  return Math.floor(coins / 120) + Math.floor((timeSec / 60) * 1.5) + bossKills * 5;
}

/* ===== プレイ履歴（時系列・ランキングとは別に直近の結果を保持） ===== */
function loadHistory() {
  try { const h = JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY)); return Array.isArray(h) ? h : []; }
  catch { return []; }
}
function saveHistory(list) {
  try { localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(list)); } catch {}
}
// 1件追加（新しい順で先頭・上限まで）
function pushHistory(entry) {
  const list = loadHistory();
  list.unshift(entry);
  saveHistory(list.slice(0, CONFIG.HISTORY_MAX));
}

/* =========================================================
 * 効果音（WebAudioでコード生成＝オフライン・完全自己完結）
 * ========================================================= */
const SFX = (() => {
  let actx = null;
  let enabled = (() => { try { return localStorage.getItem(CONFIG.SFX_KEY) !== 'off'; } catch { return true; } })();
  // BGM「月の降る街」(作曲:KK / DOVA-SYNDROME) を assets/bgm.mp3 からループ。音ON/OFFに連動（2026-07-03）
  let bgm = null;
  function bgmEl() {
    if (!bgm) { try { bgm = new Audio('assets/bgm.mp3'); bgm.loop = true; bgm.volume = 0.32; } catch {} }
    return bgm;
  }
  function bgmPlay() { if (!enabled) return; const b = bgmEl(); if (!b) return; const p = b.play(); if (p && p.catch) p.catch(() => {}); }
  function bgmPause() { if (bgm) { try { bgm.pause(); } catch {} } }
  function ctxOf() {
    if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
    return actx;
  }
  function resume() { const c = ctxOf(); if (c && c.state === 'suspended') c.resume(); bgmPlay(); }
  // 単音（周波数slideありでピッチベンド可）
  function tone(freq, dur, type, gain, slideTo, delay) {
    if (!enabled) return;
    const c = ctxOf(); if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.08, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  // 短いノイズ（被弾など）
  function noise(dur, gain) {
    if (!enabled) return;
    const c = ctxOf(); if (!c) return;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain(); g.gain.value = gain || 0.12;
    src.connect(g).connect(c.destination); src.start();
  }
  return {
    resume,
    isEnabled: () => enabled,
    toggle() { enabled = !enabled; try { localStorage.setItem(CONFIG.SFX_KEY, enabled ? 'on' : 'off'); } catch {} if (enabled) { resume(); } else { bgmPause(); } return enabled; },
    xp()      { tone(880, 0.07, 'triangle', 0.05, 1300); },
    coin()    { tone(1180, 0.10, 'sine', 0.06, 1560); tone(1560, 0.12, 'sine', 0.04, null, 0.05); },
    levelup() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.07, null, i * 0.06)); },
    evolve()  { tone(70, 0.5, 'sine', 0.16, 40); [784, 988, 1318, 1568, 2093].forEach((f, i) => tone(f, 0.5, 'triangle', 0.06, null, 0.05 + i * 0.07)); },
    hurt()    { noise(0.16, 0.14); tone(160, 0.12, 'sawtooth', 0.06, 80); },
    boss()    { tone(110, 0.6, 'sawtooth', 0.12, 70); tone(110, 0.6, 'square', 0.05, 66, 0.15); },
    hit()     { tone(320, 0.04, 'square', 0.03, 220); },
  };
})();

/* ===== ヒットストップ（一瞬だけ世界を止める手触り） ===== */
function hitStop(ms) { S.hitStop = Math.max(S.hitStop || 0, ms / 1000); }

/* ===== オーディオ解錠：最初のユーザー操作で必ず resume（autoplay制限対策） =====
 * click / touch / keydown いずれでも一度だけ発火し、以後は解除。
 * これで「音ONなのに鳴らない」を防ぐ（iOS/モバイル含む）。 */
function unlockAudioOnce() {
  SFX.resume();
  window.removeEventListener('pointerdown', unlockAudioOnce);
  window.removeEventListener('touchstart', unlockAudioOnce);
  window.removeEventListener('keydown', unlockAudioOnce);
  window.removeEventListener('click', unlockAudioOnce);
}
window.addEventListener('pointerdown', unlockAudioOnce, { passive: true });
window.addEventListener('touchstart', unlockAudioOnce, { passive: true });
window.addEventListener('keydown', unlockAudioOnce);
window.addEventListener('click', unlockAudioOnce);

/* ===== DOM 取得 ===== */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const ui = {
  hud: $('hud'), xpbar: $('xpbar'), hpbar: $('hpbar'), hpText: $('hp-text'),
  levelText: $('level-text'), timerText: $('timer-text'),
  coinText: $('coin-text'), killText: $('kill-text'),
  titleScreen: $('title-screen'), bestText: $('best-text'), startBtn: $('start-btn'),
  rankingTitle: $('ranking-title'),
  levelupScreen: $('levelup-screen'), upgradeCards: $('upgrade-cards'),
  pauseScreen: $('pause-screen'), shopItems: $('shop-items'), resumeBtn: $('resume-btn'),
  pauseBtn: $('pause-btn'), pauseHomeBtn: $('pause-home-btn'),
  // フィードバック
  feedbackBtn: $('feedback-btn'), feedbackScreen: $('feedback-screen'),
  feedbackText: $('feedback-text'), feedbackThanks: $('feedback-thanks'),
  feedbackSend: $('feedback-send'), feedbackClose: $('feedback-close'),
  gameoverScreen: $('gameover-screen'), resultStats: $('result-stats'),
  newrecordText: $('newrecord-text'), retryBtn: $('retry-btn'), homeBtn: $('home-btn'),
  nameInput: $('name-input'), nameSave: $('name-save'), rankingGameover: $('ranking-gameover'),
  // 追加UI
  weaponBar: $('weapon-bar'),                  // 左上の取得武器/パッシブ一覧
  levelupControls: $('levelup-controls'),      // リロール/バニッシュ
  sfxToggle: $('sfx-toggle'), sfxToggleTitle: $('sfx-toggle-title'),
  prestigeBtn: $('prestige-btn'), prestigeScreen: $('prestige-screen'),
  prestigeItems: $('prestige-items'), prestigeClose: $('prestige-close'),
  stardustText: $('stardust-text'), stardustGain: $('stardust-gain'),
  // キャラ選択
  charSelect: $('char-select'),
  // 追加GUI
  rankingBtn: $('ranking-btn'), rankingScreen: $('ranking-screen'),
  rankingFull: $('ranking-full'), rankingClose: $('ranking-close'),
  dexBtn: $('dex-btn'), dexScreen: $('dex-screen'), dexItems: $('dex-items'), dexClose: $('dex-close'),
  historyBtn: $('history-btn'), historyScreen: $('history-screen'),
  historyItems: $('history-items'), historyClose: $('history-close'),
};

/* ===== キャンバスサイズ（アリーナ＝画面全体・固定アリーナ方式） ===== */
let viewW = 0, viewH = 0;
function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.round(viewW * dpr);
  canvas.height = Math.round(viewH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* =========================================================
 * ゲーム状態
 * ========================================================= */
const S = {
  mode: 'title', // 'title' | 'playing' | 'levelup' | 'paused' | 'gameover'
  selectedCharacter: 'shia', // 選択中のキャラ
  time: 0,       // 生存時間（秒）
  kills: 0,
  coins: 0,
  spawnTimer: 0,
  bossTimer: 0,
  player: null,
  enemies: [],
  bullets: [],
  pickups: [],
  particles: [],  // ヒットエフェクト・ダメージ数字
  effects: [],    // 薙ぎ払いの弧・衝撃波リング等（描画＆判定つき）
  pools: [],      // 地面の設置物（毒沼・エリクサー床・拘束結界・黒板消し・粉塵）
  enemyBullets: [], // 敵の遠距離弾
  telegraphs: [],   // 予告範囲攻撃（赤円→発動）
  shopBought: {}, // ショップ購入回数（値上がり計算用）
  banner: null,   // 画面中央の告知（ボス出現など） { text, t }
  shake: 0,       // 画面シェイクの強さ（減衰）
  hitStop: 0,     // ヒットストップ残り時間（秒）
  bossKills: 0,   // ボス撃破数（星屑計算用）
  zone: 0,        // 背景ゾーン（ボス撃破で進む）
  bossRushTimer: 0, // ボスラッシュ用
  evoCinematic: null, // 進化演出 { t, name, emoji }
  banishMode: false,  // バニッシュ待機中フラグ
};

/* ===== プレイヤー生成（転生ボーナスを反映） ===== */
function createPlayer() {
  const pr = loadPrestige();
  const lv = id => (pr[id] || 0);
  const maxHp = Math.round(CONFIG.PLAYER.BASE_HP * (1 + 0.06 * lv('hp')));
  const charKey = S.selectedCharacter || 'shia';
  const p = {
    character: charKey, // 選択キャラ
    archetype: (CHARACTERS[charKey] || CHARACTERS.shia).class || 'gunner', // 職業（アーキタイプ）
    x: viewW / 2, y: viewH / 2,
    hp: maxHp, maxHp,
    level: 1, xp: 0,
    facing: 1,              // 1=右向き, -1=左向き
    moving: false,
    animTime: 0,            // アニメ経過時間
    hitTimer: 0,            // 被弾アニメ残り時間
    invulnTimer: 0,         // 被弾後の無敵残り時間
    buffInvulnTimer: 0,     // シールドアイテムによる無敵残り時間
    fireTimer: 0,           // 次弾までの残り時間
    sweepTimer: 0,          // 薙ぎ払いの次発動まで
    shockTimer: 0,          // 衝撃波の次発動まで
    actionTimer: 0,         // 攻撃モーション（振り等）の残り時間
    actionAnim: null,       // 攻撃モーション中に表示するアニメ名
    lastDir: { x: 1, y: 0 },// 直近の移動方向（近接の向き決めに使う）
    // 強化で変わるステータス（転生ボーナス込み）
    damageMult: 1 + 0.04 * lv('atk'),
    intervalMult: 1, bulletSpeedMult: 1, rangeMult: 1,
    bulletCount: CONFIG.WEAPON.BULLET_COUNT,
    pierce: CONFIG.WEAPON.PIERCE,
    moveSpeedMult: 1,
    pickupRadius: CONFIG.PLAYER.PICKUP_RADIUS * (1 + 0.08 * lv('mag')),
    coinGainMult: 1 + 0.06 * lv('gold'),
    upgradeLevels: {},      // 強化ID → 取得回数
    // 弾/球のサイズ倍率（弾強化の2段目以降で拡大）
    bulletSizeMult: 1, orbSizeMult: 1,
    // 進化した弾コアの定期光線タイマー
    evoBeamTimer: 1.2,
    // ソフィアの魔法球（緑・そろってCW・等間隔・貫通）
    orbCount: 2, orbAngle: 0, orbSpeedMult: 1, orbRadiusMult: 1, orbs: [],
    // 進化状態
    evolutions: {},         // 進化ID → true
    evoCount: 0,            // 進化した回数
    evolvedCore: { bullet: null, sweep: null, shock: null, funnel: null }, // コアごとの進化先
    // 進化武器の内部状態
    bits: [],               // ファンネル／蒼銀ビット
    railTimer: 3, railCharge: 0, railAngle: 0,
    scytheAngle: 0, scytheTick: 0, scytheRingTimer: 3,
    wardTimer: 0, wardCharges: 0,
    // 選択肢拡張・復活（転生）
    rerollsLeft: lv('choice') >= 1 ? 1 : 0,
    banishLeft: lv('choice') >= 2 ? 1 : 0,
    bannedIds: {},          // バニッシュした強化ID
    reviveLeft: lv('revive'),
    // 開始ブースト：開始時に付与するレベルアップ回数
    pendingStartLevels: lv('start'),
    // --- 職業（アーキタイプ）別の内部状態 ---
    xpGainMult: 1,           // 経験値倍率（教師の固有ボーナス等）
    // 剣士
    slashWidthMult: 1,       // 斬撃の大きさ（豪剣）
    slashQueue: [],          // 連撃の予約（{t}）
    fanTimer: 2.0,           // 扇斬りの次発動まで
    crescentAngle: 0, crescentTick: 0, crescentBurst: 2.5, // 進化：旋回剣嵐
    iaiTimer: 3, iaiCharge: 0, iaiAngle: 0,                // 進化：居合
    // 錬金術師
    poolDurMult: 1,          // 毒沼の持続倍率（粘性毒沼）
    // 教師
    chalkBounce: 1,          // チョークの壁反射回数（反射授業で+1）
    trapTimer: 4,            // 黒板消しトラップの次設置まで
    lectureTimer: 3, detentionTimer: 4, // 進化タイマー
    // 魔導士の進化
    familiars: [], orbNovaTimer: 2.5,
    // 薙ぎ払いの連撃予約（Lv3/Lv5の昇格コンボ）
    pendingSwings: [],
  };
  const arch = ARCHETYPES[p.archetype];
  if (arch && arch.init) arch.init(p); // 職業固有の初期化（教師の経験値+15%等）
  return p;
}

// 進化研究による必要パッシブLv・進化上限
function evoPassiveReq() { return Math.max(1, CONFIG.EVO_PASSIVE_REQ - (prestigeLv('evo') >= 2 ? 1 : 0)); }
function evoMaxPerRun() { return CONFIG.EVO_MAX_PER_RUN + (prestigeLv('evo') >= 3 ? 1 : 0); }

// プレイヤーの強化レベル取得ヘルパー
function upLv(id) { return (S.player.upgradeLevels[id] || 0); }

function xpToNext(level) {
  return CONFIG.XP_BASE + (level - 1) * CONFIG.XP_PER_LEVEL;
}

/* =========================================================
 * 入力（キーボード＋仮想スティック）
 * ========================================================= */
const keys = new Set();
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  keys.add(e.key.toLowerCase());
  if ((e.key === 'Escape' || e.key.toLowerCase() === 'p')) togglePause();
});
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

// 仮想スティック：画面のどこをドラッグしてもOK（タッチ開始点が基点）
const stick = { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0, id: null };
const STICK_MAX = 60; // スティックの最大振れ幅 px

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.changedTouches[0];
  stick.active = true;
  stick.id = t.identifier;
  stick.baseX = t.clientX; stick.baseY = t.clientY;
  stick.dx = 0; stick.dy = 0;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier !== stick.id) continue;
    let dx = t.clientX - stick.baseX;
    let dy = t.clientY - stick.baseY;
    const len = Math.hypot(dx, dy);
    if (len > STICK_MAX) { dx = dx / len * STICK_MAX; dy = dy / len * STICK_MAX; }
    stick.dx = dx; stick.dy = dy;
  }
}, { passive: false });

function endTouch(e) {
  for (const t of e.changedTouches) {
    if (t.identifier === stick.id) {
      stick.active = false; stick.dx = 0; stick.dy = 0; stick.id = null;
    }
  }
}
canvas.addEventListener('touchend', endTouch);
canvas.addEventListener('touchcancel', endTouch);

// 現在の移動入力を -1〜1 のベクトルで返す
function getInputVector() {
  let x = 0, y = 0;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (stick.active && (stick.dx || stick.dy)) {
    x = stick.dx / STICK_MAX;
    y = stick.dy / STICK_MAX;
  }
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  return { x, y };
}

/* =========================================================
 * スポーン
 * ========================================================= */
function currentSpawnInterval() {
  const t = Math.min(S.time / CONFIG.SPAWN.RAMP_TIME, 1);
  return CONFIG.SPAWN.BASE_INTERVAL + (CONFIG.SPAWN.MIN_INTERVAL - CONFIG.SPAWN.BASE_INTERVAL) * t;
}

function enemyHpScale()    { return 1 + (S.time / 60) * CONFIG.SPAWN.HP_SCALE_PER_MIN; }
function enemySpeedScale() { return 1 + (S.time / 60) * CONFIG.SPAWN.SPEED_SCALE_PER_MIN; }

// 画面外のランダムな縁の座標を返す
function randomEdgePosition() {
  const m = CONFIG.SPAWN.MARGIN;
  const side = Math.floor(Math.random() * 4);
  switch (side) {
    case 0: return { x: Math.random() * viewW, y: -m };          // 上
    case 1: return { x: Math.random() * viewW, y: viewH + m };   // 下
    case 2: return { x: -m, y: Math.random() * viewH };          // 左
    default: return { x: viewW + m, y: Math.random() * viewH };  // 右
  }
}

// 解禁済みタイプから重み付き抽選
function pickEnemyType() {
  const pool = Object.entries(ENEMY_TYPES)
    .filter(([, t]) => t.weight > 0 && S.time >= t.unlockAt);
  const total = pool.reduce((s, [, t]) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const [key, t] of pool) {
    r -= t.weight;
    if (r <= 0) return key;
  }
  return pool[pool.length - 1][0];
}

function spawnEnemy(typeKey, pos, hpMult) {
  const t = ENEMY_TYPES[typeKey];
  const p = pos || randomEdgePosition();
  const hp = t.hp * enemyHpScale() * (hpMult || 1);
  S.enemies.push({
    type: typeKey,
    x: p.x, y: p.y,
    hp: hp, maxHp: hp,
    speed: t.speed * enemySpeedScale(),
    radius: t.radius,
    dmg: t.dmg,
    wobblePhase: Math.random() * Math.PI * 2,
    flashTimer: 0,          // 被弾時の白フラッシュ
    knockX: 0, knockY: 0,   // ノックバック速度（減衰）
    chargeTimer: t.charge ? rnd(0.5, t.charge.cooldown) : 0, // 突進までの残り
    dashTimer: 0,           // 突進中の残り時間
    orbCd: 0,               // ソフィアの魔法球の再ヒット間隔
    shootTimer: t.ranged ? rnd(0.5, t.ranged.interval) : 0,  // 遠距離攻撃まで
    patternTimer: t.isBoss ? 3 : 0, // ボスの技クールダウン
    elite: false,
  });
  return S.enemies[S.enemies.length - 1];
}

function updateSpawning(dt) {
  S.spawnTimer -= dt;
  if (S.spawnTimer <= 0 && S.enemies.length < CONFIG.SPAWN.MAX_ENEMIES) {
    S.spawnTimer = currentSpawnInterval();
    const typeKey = pickEnemyType();
    const t = ENEMY_TYPES[typeKey];
    if (t.groupMin) {
      // 群れタイプ：近い位置にまとめて湧く
      const n = t.groupMin + Math.floor(Math.random() * (t.groupMax - t.groupMin + 1));
      const base = randomEdgePosition();
      for (let i = 0; i < n; i++) {
        spawnEnemy(typeKey, { x: base.x + (Math.random() - 0.5) * 80, y: base.y + (Math.random() - 0.5) * 80 });
      }
    } else {
      spawnEnemy(typeKey);
    }
  }
  // ボス：一定周期で1体（3分で最初の小ボス）
  S.bossTimer += dt;
  const bossEvery = S.time < 180 ? 170 : CONFIG.SPAWN.BOSS_INTERVAL; // 序盤は1回だけ小ボス
  if (S.bossTimer >= bossEvery) {
    S.bossTimer = 0;
    const boss = spawnEnemy('boss');
    if (S.time < 190) { boss.hp *= 0.5; boss.maxHp *= 0.5; } // 3分の小ボスは控えめ
    S.banner = { text: '💀 強敵出現！', t: 2.5 };
    SFX.boss();
  }
  // 5分以降：エリート（硬い護衛付き）を時々
  if (S.time > 300) {
    S.eliteTimer = (S.eliteTimer || 0) + dt;
    if (S.eliteTimer >= 40) {
      S.eliteTimer = 0;
      const el = spawnEnemy('shield');
      el.elite = true; el.hp *= 3; el.maxHp *= 3; el.radius += 6;
      S.banner = { text: '⚠️ エリート出現！', t: 2.0 };
    }
  }
  // ボスラッシュ：4分半以降、過去のボスが“通常敵”として複数出現（HP控えめ・技なし・ゾーン非進行）
  if (S.time > 270) {
    S.bossRushTimer += dt;
    if (S.bossRushTimer >= 55) {
      S.bossRushTimer = 0;
      const n = 2 + Math.floor(Math.random() * 2); // 2〜3体
      for (let i = 0; i < n; i++) {
        const m = spawnEnemy('boss');
        m.isMinion = true;          // ボス撃破カウント・ゾーン進行にしない
        m.patternTimer = 1e9;       // 技を撃たない
        m.hp *= 0.35; m.maxHp *= 0.35;
        m.speed *= 1.1; m.radius -= 4;
      }
      S.banner = { text: '💀 ボスラッシュ！', t: 2.0 };
      SFX.boss();
    }
  }
}

/* =========================================================
 * 自動攻撃
 * ========================================================= */
function nearestEnemy(px, py, maxDist) {
  let best = null, bestD = maxDist;
  for (const e of S.enemies) {
    const d = Math.hypot(e.x - px, e.y - py);
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

// 基本攻撃は職業（アーキタイプ）ごとの update に委譲（データ駆動）
function updateWeapon(dt) {
  archOf(S.player).update(dt);
}

/* ===== 射手（シア）：最寄りの敵へ自動射撃 ===== */
function updateGunner(dt) {
  const p = S.player;
  // 進化した弾コアは専用ロジックへ
  if (p.evolvedCore.bullet === 'railgun') { updateRailgun(dt); return; }

  p.fireTimer -= dt;
  if (p.fireTimer > 0) return;
  const range = CONFIG.WEAPON.RANGE * p.rangeMult;
  const target = nearestEnemy(p.x, p.y, range);
  if (!target) return; // 射程内に敵がいなければ撃たない
  p.fireTimer = CONFIG.WEAPON.INTERVAL * p.intervalMult;
  const baseAngle = Math.atan2(target.y - p.y, target.x - p.x);

  // 進化：拡散貫通ランス（正面扇状に3本の貫通ランス）
  if (p.evolvedCore.bullet === 'lance') {
    const speed = 460 * p.bulletSpeedMult;
    for (let i = -1; i <= 1; i++) {
      const a = baseAngle + i * (14 * Math.PI / 180);
      S.bullets.push({
        x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        dmg: CONFIG.WEAPON.DAMAGE * p.damageMult * 2.2,
        pierce: 999, dmgDecay: 0.88, explodeOnEnd: true,
        life: (range * 1.4) / speed, radius: 11 * p.bulletSizeMult, hitSet: new Set(), isLance: true,
      });
    }
    return;
  }

  // 通常弾
  const n = p.bulletCount;
  const spread = CONFIG.WEAPON.SPREAD_DEG * Math.PI / 180;
  for (let i = 0; i < n; i++) {
    const offset = (i - (n - 1) / 2) * spread;
    const a = baseAngle + offset;
    const speed = CONFIG.WEAPON.BULLET_SPEED * p.bulletSpeedMult;
    S.bullets.push({
      x: p.x, y: p.y,
      vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      dmg: CONFIG.WEAPON.DAMAGE * p.damageMult,
      pierce: p.pierce,
      life: range / speed,
      radius: CONFIG.WEAPON.BULLET_RADIUS * p.bulletSizeMult,
      hitSet: new Set(),
    });
  }
}

/* ===== 通常カード＆進化：ファンネル／蒼銀ビット陣 =====
 * funnel カードで取得・強化でき、進化(bits)で上位化する（両方ここで処理）。 */
function updateFunnels(dt) {
  const p = S.player;
  const lv = upLv('funnel');
  const evolved = p.evolvedCore.funnel === 'bits';
  if (lv <= 0 && !evolved) { p.bits.length = 0; return; }
  // 数：通常は 1+lv（最大4）、進化で 3〜5
  const count = evolved ? Math.min(5, 3 + Math.floor(p.level / 10)) : Math.min(4, 1 + lv);
  const orbitR = evolved ? 88 : 74;
  // ファンネルはLvで射程が伸びる（ソフィアの射程強化はここに統合）
  const range = (evolved ? 340 : 230 + (lv - 1) * 34) * p.rangeMult;
  const dmgMult = (evolved ? 1.1 : 0.55 + 0.12 * (lv - 1)); // Lvで威力UP
  const fireInt = (evolved ? 0.55 : 0.85) * p.intervalMult;
  const spin = evolved ? 2.6 : 2.0;
  while (p.bits.length < count) p.bits.push({ phase: (Math.PI * 2 / count) * p.bits.length, fire: rnd(0, 0.5) });
  if (p.bits.length > count) p.bits.length = count;
  for (const b of p.bits) {
    b.phase += dt * spin;
    const bx = p.x + Math.cos(b.phase) * orbitR, by = p.y + Math.sin(b.phase) * orbitR;
    b.x = bx; b.y = by; b.evolved = evolved;
    b.fire -= dt;
    if (b.fire <= 0) {
      const target = nearestEnemy(bx, by, range);
      if (target) {
        b.fire = fireInt;
        const a = Math.atan2(target.y - by, target.x - bx);
        const speed = 360 * (p.bulletSpeedMult || 1);
        S.bullets.push({
          x: bx, y: by, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
          dmg: CONFIG.WEAPON.DAMAGE * p.damageMult * dmgMult,
          pierce: p.pierce, life: range / speed, radius: evolved ? 7 : 5, hitSet: new Set(),
        });
      } else { b.fire = 0.15; }
    }
  }
}

/* ===== ソフィア：緑の魔法球2つが左右逆回りで周回・貫通 ===== */
function updateOrbs(dt) {
  const p = S.player;
  const count = Math.min(6, p.orbCount);
  const radius = 78 * p.orbRadiusMult;             // 収束してくる敵を捉えやすい距離
  const orbHit = 21 * p.orbSizeMult;               // 球の当たり半径（弾強化2段目以降で拡大）
  // 球1ヒットは魔法弾より重い（当てにくさの見返り。手数/範囲では劣る設計）
  const dmg = CONFIG.WEAPON.DAMAGE * p.damageMult * 1.7;
  p.orbAngle += dt * 2.6 * p.orbSpeedMult;         // 全球そろって時計回り(CW)
  p.orbs = [];
  for (let i = 0; i < count; i++) {
    // 全球を等間隔に配置＝重ならない（例：2球なら常に180°反対側）
    const ang = p.orbAngle + (Math.PI * 2 / count) * i;
    const ox = p.x + Math.cos(ang) * radius, oy = p.y + Math.sin(ang) * radius;
    p.orbs.push({ x: ox, y: oy, dir: 1, r: orbHit * 0.85 });
    // 貫通：範囲内の敵に、敵ごとの再ヒット間隔つきでダメージ
    for (const e of S.enemies) {
      if (e.dead || e.orbCd > 0) continue;
      if (Math.hypot(e.x - ox, e.y - oy) < orbHit + e.radius) {
        e.orbCd = 0.28;
        damageEnemy(e, dmg, ox, oy, 40);
      }
    }
  }
  S.enemies = S.enemies.filter(e => !e.dead);
}

/* ===== 魔導士（ソフィア）：周回する魔法球＋進化（星団ノヴァ／使い魔） ===== */
function updateMage(dt) {
  const p = S.player;
  updateOrbs(dt);
  // 進化：星団ノヴァ＝魔法球が周期的に爆発し小爆発が連鎖
  if (p.evolvedCore.bullet === 'orbnova') {
    p.orbNovaTimer -= dt;
    if (p.orbNovaTimer <= 0) {
      p.orbNovaTimer = 2.6;
      for (const o of p.orbs) {
        S.effects.push({ kind: 'magiccircle', x: o.x, y: o.y, r: 42, t: 0.5, maxT: 0.5 });
        explodeAt(o.x, o.y, 76, CONFIG.WEAPON.DAMAGE * p.damageMult * 1.4, 3, 90);
      }
      SFX.hit();
    }
  }
  // 進化：使い魔ビット＝自律する2体が敵を追って魔弾を撃つ
  if (p.evolvedCore.bullet === 'familiar') updateFamiliars(dt);
}

function updateFamiliars(dt) {
  const p = S.player;
  while (p.familiars.length < 2) {
    p.familiars.push({ x: p.x + rnd(-40, 40), y: p.y + rnd(-40, 40), fire: rnd(0, 0.5) });
  }
  const range = 320 * p.rangeMult;
  for (const f of p.familiars) {
    const target = nearestEnemy(f.x, f.y, 9999);
    // 追跡：敵と一定距離（110px）を保つ。敵がいなければ主人の側へ
    const goal = target || p;
    const dx = goal.x - f.x, dy = goal.y - f.y;
    const d = Math.hypot(dx, dy) || 1;
    const keep = target ? 110 : 60;
    const dir = d > keep ? 1 : -0.6;
    f.x += dx / d * 230 * dir * dt;
    f.y += dy / d * 230 * dir * dt;
    f.fire -= dt;
    if (f.fire <= 0 && target && Math.hypot(target.x - f.x, target.y - f.y) < range) {
      f.fire = 0.7 * p.intervalMult;
      const a = Math.atan2(target.y - f.y, target.x - f.x);
      const speed = 400 * p.bulletSpeedMult;
      S.bullets.push({
        x: f.x, y: f.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        dmg: CONFIG.WEAPON.DAMAGE * p.damageMult * 0.9,
        pierce: 0, life: range / speed, radius: 6, hitSet: new Set(), isMagic: true,
      });
    }
  }
}

/* ===== 進化：彗星レールガン（予告→極太貫通レーザー） ===== */
function updateRailgun(dt) {
  const p = S.player;
  if (p.railCharge > 0) {
    p.railCharge -= dt;
    if (p.railCharge <= 0) fireRailBeam(p.railAngle);
    return;
  }
  p.railTimer -= dt;
  if (p.railTimer <= 0) {
    const target = nearestEnemy(p.x, p.y, 9999);
    if (!target) { p.railTimer = 0.3; return; }
    p.railTimer = 4.2;              // 低頻度
    p.railCharge = 0.55;            // チャージ予告
    p.railAngle = Math.atan2(target.y - p.y, target.x - p.x);
    S.effects.push({ kind: 'railcharge', get x() { return S.player.x; }, get y() { return S.player.y; }, angle: p.railAngle, t: 0.55, maxT: 0.55 });
    SFX.boss();
  }
}

function fireRailBeam(angle) { fireLineAttack(angle, 6, 26, null); }

// 汎用：直線攻撃（レールガン／居合が共用）。color を渡すとビームの色が変わる
function fireLineAttack(angle, dmgMult, band, color) {
  const p = S.player;
  const dmg = CONFIG.WEAPON.DAMAGE * p.damageMult * dmgMult;
  const dirx = Math.cos(angle), diry = Math.sin(angle);
  for (const e of S.enemies) {
    const rx = e.x - p.x, ry = e.y - p.y;
    const proj = rx * dirx + ry * diry;      // 前方距離
    if (proj < 0) continue;                  // 後ろは当たらない
    const perp = Math.abs(rx * -diry + ry * dirx); // 直交距離
    if (perp <= band + e.radius) damageEnemy(e, ENEMY_TYPES[e.type].isBoss ? dmg * 1.5 : dmg, p.x, p.y, 120);
  }
  S.enemies = S.enemies.filter(e => !e.dead);
  S.effects.push({ kind: 'railbeam', x: p.x, y: p.y, angle, t: 0.18, maxT: 0.18, color });
  S.shake = Math.max(S.shake, 10);
  hitStop(55);
  SFX.evolve();
}

/* =========================================================
 * 剣士：斬撃弾（連撃）＋近距離の扇斬り
 * 進化：旋回剣嵐（二枚刃が周回＋定期4方向斬撃）／居合・虚空一閃（直線両断）
 * ========================================================= */
function updateSwordsman(dt) {
  const p = S.player;
  if (p.evolvedCore.bullet === 'crescentstorm') { updateCrescentStorm(dt); return; }
  if (p.evolvedCore.bullet === 'iai') { updateIai(dt); return; }
  // 連撃キューの消化（bulletCount 回、0.12秒間隔で斬撃を放つ）
  for (const q of p.slashQueue) q.t -= dt;
  while (p.slashQueue.length && p.slashQueue[0].t <= 0) { p.slashQueue.shift(); fireSlash(); }
  // 発動判定
  p.fireTimer -= dt;
  const range = CONFIG.WEAPON.RANGE * 0.8 * p.rangeMult;
  if (p.fireTimer <= 0) {
    const target = nearestEnemy(p.x, p.y, range);
    if (target) {
      p.fireTimer = 0.95 * p.intervalMult;
      for (let i = 0; i < p.bulletCount; i++) p.slashQueue.push({ t: i * 0.12 });
      p.actionAnim = 'waving'; p.actionTimer = 0.25; p.animTime = 0;
    }
  }
  // 扇斬り：敵が近くにいる時だけ発動する近接の追加打点
  p.fanTimer -= dt;
  if (p.fanTimer <= 0) {
    const near = nearestEnemy(p.x, p.y, 130);
    if (!near) { p.fanTimer = 0.4; return; }
    p.fanTimer = 2.3 * p.intervalMult;
    const center = Math.atan2(near.y - p.y, near.x - p.x);
    const radius = 118 * p.rangeMult;
    const half = 65 * Math.PI / 180;
    const dmg = CONFIG.WEAPON.DAMAGE * p.damageMult * 1.3;
    let hitCount = 0;
    for (const e of S.enemies) {
      const dx = e.x - p.x, dy = e.y - p.y;
      if (Math.hypot(dx, dy) > radius + e.radius) continue;
      if (Math.abs(normalizeAngle(Math.atan2(dy, dx) - center)) <= half) {
        damageEnemy(e, dmg, p.x, p.y, 100); hitCount++;
      }
    }
    if (hitCount > 0) { S.shake = Math.max(S.shake, 4); SFX.hit(); }
    S.effects.push({ kind: 'fanslash', get x() { return S.player.x; }, get y() { return S.player.y; }, center, half, radius, t: 0.22, maxT: 0.22 });
    p.actionAnim = 'waving'; p.actionTimer = 0.22; p.animTime = 0;
    S.enemies = S.enemies.filter(e => !e.dead);
  }
}

// 斬撃弾を1発放つ（発射時に最寄りの敵へ向き直す＝連撃の追尾感）
function fireSlash() {
  const p = S.player;
  const range = CONFIG.WEAPON.RANGE * 0.8 * p.rangeMult;
  const target = nearestEnemy(p.x, p.y, range + 80);
  const a = target ? Math.atan2(target.y - p.y, target.x - p.x)
                   : Math.atan2(p.lastDir.y, p.lastDir.x);
  const speed = 430 * p.bulletSpeedMult;
  S.bullets.push({
    x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
    dmg: CONFIG.WEAPON.DAMAGE * p.damageMult * 1.5,
    pierce: 2, // 斬撃は数体を切り裂く
    life: range / speed, radius: 15 * p.slashWidthMult, hitSet: new Set(), isSlash: true,
  });
}

// 進化：旋回剣嵐＝二枚の剣風が周回し、定期的に4方向へ斬撃を放つ
function updateCrescentStorm(dt) {
  const p = S.player;
  p.crescentAngle += dt * 3.8;
  const orbitR = 100, band = 40;
  const dmg = CONFIG.WEAPON.DAMAGE * p.damageMult * 1.5;
  p.crescentTick -= dt;
  if (p.crescentTick <= 0) {
    p.crescentTick = 0.2;
    for (let i = 0; i < 2; i++) {
      const ang = p.crescentAngle + Math.PI * i;
      const bx = p.x + Math.cos(ang) * orbitR, by = p.y + Math.sin(ang) * orbitR;
      for (const e of S.enemies) {
        if (Math.hypot(e.x - bx, e.y - by) <= band + e.radius) damageEnemy(e, dmg * 0.5, p.x, p.y, 70);
      }
    }
    S.enemies = S.enemies.filter(e => !e.dead);
  }
  p.crescentBurst -= dt;
  if (p.crescentBurst <= 0) {
    p.crescentBurst = 2.4;
    const speed = 430 * p.bulletSpeedMult;
    for (let i = 0; i < 4; i++) {
      const a = p.crescentAngle + (Math.PI / 2) * i;
      S.bullets.push({
        x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        dmg: dmg, pierce: 3, life: 0.8, radius: 16 * p.slashWidthMult, hitSet: new Set(), isSlash: true,
      });
    }
    p.actionAnim = 'waving'; p.actionTimer = 0.25; p.animTime = 0;
  }
}

// 進化：居合・虚空一閃＝一拍の溜めの後、画面を貫く一閃
function updateIai(dt) {
  const p = S.player;
  if (p.iaiCharge > 0) {
    p.iaiCharge -= dt;
    if (p.iaiCharge <= 0) {
      fireLineAttack(p.iaiAngle, 4.5, 22, '#bae6fd');
      p.actionAnim = 'waving'; p.actionTimer = 0.3; p.animTime = 0;
    }
    return;
  }
  p.iaiTimer -= dt;
  if (p.iaiTimer <= 0) {
    const target = nearestEnemy(p.x, p.y, 9999);
    if (!target) { p.iaiTimer = 0.3; return; }
    p.iaiTimer = 3.4;
    p.iaiCharge = 0.4;
    p.iaiAngle = Math.atan2(target.y - p.y, target.x - p.x);
    S.effects.push({ kind: 'railcharge', get x() { return S.player.x; }, get y() { return S.player.y; }, angle: p.iaiAngle, t: 0.4, maxT: 0.4, color: '#7dd3fc' });
  }
}

/* =========================================================
 * 錬金術師：ポーション爆弾（着弾で爆発＋毒沼）
 * 進化：連鎖大爆薬（爆発が連鎖・拡大）／エリクサー床（金の床＝敵を溶かし自分は回復）
 * ========================================================= */
function updateAlchemist(dt) {
  const p = S.player;
  p.fireTimer -= dt;
  if (p.fireTimer > 0) return;
  const range = 300 * p.rangeMult;
  // 投擲対象：最寄りの敵＋範囲内のランダムな敵（bulletCount 個まで）
  const inRange = S.enemies.filter(e => !e.dead && Math.hypot(e.x - p.x, e.y - p.y) < range);
  if (!inRange.length) return;
  p.fireTimer = 1.5 * p.intervalMult;
  inRange.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
  const targets = [inRange[0]];
  while (targets.length < p.bulletCount && inRange.length > targets.length) {
    const cand = inRange[Math.floor(Math.random() * inRange.length)];
    if (!targets.includes(cand)) targets.push(cand);
    else targets.push(inRange[targets.length]); // 重複したら近い順で埋める
  }
  for (const t of targets.slice(0, p.bulletCount)) throwPotion(t.x + rnd(-16, 16), t.y + rnd(-16, 16));
  p.actionAnim = 'waving'; p.actionTimer = 0.25; p.animTime = 0;
}

function throwPotion(tx, ty) {
  const p = S.player;
  const d = Math.hypot(tx - p.x, ty - p.y) || 1;
  const speed = 300 * p.bulletSpeedMult;
  const life = Math.max(0.22, d / speed);
  const a = Math.atan2(ty - p.y, tx - p.x);
  S.bullets.push({
    x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
    dmg: CONFIG.WEAPON.DAMAGE * p.damageMult * 1.6,
    pierce: 0, life, totalLife: life, radius: 9, hitSet: new Set(),
    isPotion: true, noCollide: true, // 山なりに飛び越えるため道中は当たらない
  });
}

// ポーション着弾：爆発＋毒沼（進化で連鎖／エリクサー床）
function potionLand(b) {
  const p = S.player;
  const chain = p.evolvedCore.bullet === 'chainflask';
  const elixir = p.evolvedCore.bullet === 'elixir';
  const r = 64 * p.bulletSizeMult * (chain ? 1.3 : 1);
  explodeAt(b.x, b.y, r, b.dmg, chain ? 3 : 0, 110);
  S.pools.push({
    kind: elixir ? 'elixir' : 'poison',
    x: b.x, y: b.y, r: 54 * p.bulletSizeMult,
    dur: 3.2 * p.poolDurMult, maxDur: 3.2 * p.poolDurMult,
    tick: 0, dps: CONFIG.WEAPON.DAMAGE * p.damageMult * (elixir ? 1.1 : 0.9),
  });
  SFX.hit();
}

/* =========================================================
 * 教師：チョーク連射（壁反射）＋黒板消しトラップ。経験値+15%
 * 進化：一斉講義（定期全方位乱射）／居残り結界（拘束フィールド）
 * ========================================================= */
function updateTeacher(dt) {
  const p = S.player;
  // 通常のチョーク連射（速いテンポ・低威力・壁反射つき）
  p.fireTimer -= dt;
  const range = CONFIG.WEAPON.RANGE * p.rangeMult;
  if (p.fireTimer <= 0) {
    const target = nearestEnemy(p.x, p.y, range);
    if (target) {
      p.fireTimer = 0.55 * p.intervalMult;
      const baseA = Math.atan2(target.y - p.y, target.x - p.x);
      const n = p.bulletCount;
      const spread = CONFIG.WEAPON.SPREAD_DEG * Math.PI / 180;
      for (let i = 0; i < n; i++) fireChalk(baseA + (i - (n - 1) / 2) * spread, 1);
    }
  }
  // 黒板消しトラップ：定期的に足元へ設置（最大3個）。敵が触れると粉塵爆発＋スロー
  p.trapTimer -= dt;
  if (p.trapTimer <= 0) {
    p.trapTimer = 5;
    if (S.pools.filter(x => x.kind === 'eraser').length < 3) {
      S.pools.push({ kind: 'eraser', x: p.x, y: p.y, r: 24, dur: 20, maxDur: 20, dmg: CONFIG.WEAPON.DAMAGE * p.damageMult * 2.2 });
    }
  }
  // 進化：一斉講義＝定期的に全方位へチョーク乱射（通常連射も継続）
  if (p.evolvedCore.bullet === 'lecture') {
    p.lectureTimer -= dt;
    if (p.lectureTimer <= 0) {
      p.lectureTimer = 3.2;
      for (let i = 0; i < 12; i++) fireChalk((Math.PI * 2 / 12) * i + rnd(-0.08, 0.08), 0.85);
      p.actionAnim = 'waving'; p.actionTimer = 0.25; p.animTime = 0;
      SFX.hit();
    }
  }
  // 進化：居残り結界＝敵の密集地に拘束フィールド（大幅スロー＋継続ダメージ）
  if (p.evolvedCore.bullet === 'detention') {
    p.detentionTimer -= dt;
    if (p.detentionTimer <= 0 && S.enemies.length) {
      p.detentionTimer = 6;
      // 密集地：近傍130px内の敵数が最も多い敵の位置（最大40体サンプル）
      let best = S.enemies[0], bestN = -1;
      for (let i = 0; i < Math.min(40, S.enemies.length); i++) {
        const c = S.enemies[i];
        let n = 0;
        for (const e of S.enemies) { if (Math.hypot(e.x - c.x, e.y - c.y) < 130) n++; }
        if (n > bestN) { bestN = n; best = c; }
      }
      S.pools.push({ kind: 'detention', x: best.x, y: best.y, r: 120, dur: 3.5, maxDur: 3.5, tick: 0, slow: 0.35, dps: CONFIG.WEAPON.DAMAGE * S.player.damageMult * 0.8 });
      S.banner = { text: '📏 居残り！', t: 1.0 };
    }
  }
}

function fireChalk(a, mult) {
  const p = S.player;
  const speed = 430 * p.bulletSpeedMult;
  const range = CONFIG.WEAPON.RANGE * p.rangeMult;
  S.bullets.push({
    x: p.x, y: p.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
    dmg: CONFIG.WEAPON.DAMAGE * p.damageMult * 0.7 * (mult || 1),
    pierce: 0, life: (range / speed) * (1 + 0.7 * p.chalkBounce),
    radius: 5 * p.bulletSizeMult, hitSet: new Set(),
    isChalk: true, bounce: p.chalkBounce, // 画面端で反射する回数
  });
}

/* ===== 地面の設置物（毒沼・エリクサー床・拘束結界・黒板消し・粉塵） ===== */
function updatePools(dt) {
  const p = S.player;
  for (const pool of S.pools) {
    pool.dur -= dt;
    if (pool.dur <= 0) { pool.dead = true; continue; }
    // 黒板消しトラップ：敵が触れたら粉塵爆発＋スローの粉塵を残す
    if (pool.kind === 'eraser') {
      for (const e of S.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - pool.x, e.y - pool.y) < pool.r + e.radius) {
          pool.dead = true;
          explodeAt(pool.x, pool.y, 80, pool.dmg, 0, 140);
          S.pools.push({ kind: 'dust', x: pool.x, y: pool.y, r: 86, dur: 1.8, maxDur: 1.8, tick: 0, slow: 0.5, dps: 0 });
          break;
        }
      }
      continue;
    }
    // ダメージ床（0.5秒ごとのティック）
    pool.tick -= dt;
    if (pool.tick <= 0 && pool.dps > 0) {
      pool.tick = 0.5;
      for (const e of S.enemies) {
        if (!e.dead && Math.hypot(e.x - pool.x, e.y - pool.y) < pool.r + e.radius) {
          damageEnemy(e, pool.dps * 0.5, pool.x, pool.y, 0);
        }
      }
      S.enemies = S.enemies.filter(e => !e.dead);
    }
    // エリクサー床：上に立つと回復
    if (pool.kind === 'elixir' && Math.hypot(p.x - pool.x, p.y - pool.y) < pool.r) {
      p.hp = Math.min(p.maxHp, p.hp + 6 * dt);
    }
  }
  S.pools = S.pools.filter(x => !x.dead);
}

/* ===== 進化した弾コアの“昇格した感”：定期的に光線を放つ ===== */
function updateEvoAura(dt) {
  const p = S.player;
  if (!p.evolvedCore.bullet) return;
  p.evoBeamTimer -= dt;
  if (p.evoBeamTimer > 0) return;
  p.evoBeamTimer = 1.1;
  const n = 3, reach = 340;
  const base = Math.random() * Math.PI * 2;
  const dmg = CONFIG.WEAPON.DAMAGE * p.damageMult * 0.9;
  for (let i = 0; i < n; i++) {
    const a = base + (Math.PI * 2 / n) * i;
    const dirx = Math.cos(a), diry = Math.sin(a);
    for (const e of S.enemies) {
      const rx = e.x - p.x, ry = e.y - p.y;
      const proj = rx * dirx + ry * diry;
      if (proj < 0 || proj > reach) continue;
      const perp = Math.abs(rx * -diry + ry * dirx);
      if (perp <= 14 + e.radius) damageEnemy(e, dmg, p.x, p.y, 60);
    }
    S.effects.push({ kind: 'evobeam', x: p.x, y: p.y, angle: a, len: reach, t: 0.22, maxT: 0.22 });
  }
  S.enemies = S.enemies.filter(e => !e.dead);
}

/* ===== 汎用：爆発（連鎖対応） ===== */
function explodeAt(x, y, radius, dmg, chain, knock) {
  S.effects.push({ kind: 'boom', x, y, r: 0, maxR: radius, t: 0.25, maxT: 0.25 });
  const killed = [];
  for (const e of S.enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - x, e.y - y) <= radius + e.radius) {
      damageEnemy(e, dmg, x, y, knock || 90);
      if (e.dead) killed.push(e);
    }
  }
  S.enemies = S.enemies.filter(e => !e.dead);
  // 連鎖：倒した敵の1体から次の爆発
  if (chain > 0 && killed.length) {
    const k = killed[0];
    explodeAt(k.x, k.y, radius * 0.85, dmg * 0.8, chain - 1, knock);
  }
}

/* =========================================================
 * 更新（メインロジック）
 * ========================================================= */
function updatePlayer(dt) {
  const p = S.player;
  const input = getInputVector();
  p.moving = (input.x !== 0 || input.y !== 0);
  if (input.x !== 0) p.facing = input.x > 0 ? 1 : -1;
  if (p.moving) p.lastDir = { x: input.x, y: input.y }; // 近接の向き決めに使う

  const speed = CONFIG.PLAYER.BASE_SPEED * p.moveSpeedMult;
  p.x += input.x * speed * dt;
  p.y += input.y * speed * dt;
  // アリーナ（画面）内にクランプ
  const r = CONFIG.PLAYER.RADIUS;
  p.x = Math.max(r, Math.min(viewW - r, p.x));
  p.y = Math.max(r, Math.min(viewH - r, p.y));

  p.animTime += dt;
  p.hitTimer = Math.max(0, p.hitTimer - dt);
  p.invulnTimer = Math.max(0, p.invulnTimer - dt);
  p.buffInvulnTimer = Math.max(0, p.buffInvulnTimer - dt);
  p.actionTimer = Math.max(0, p.actionTimer - dt);
  if (p.actionTimer <= 0) p.actionAnim = null;
}

function updateEnemies(dt) {
  const p = S.player;
  for (const e of S.enemies) {
    const t = ENEMY_TYPES[e.type];
    let dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    // コウモリはふらふら蛇行
    if (t.wobble) {
      e.wobblePhase += dt * 6;
      const w = Math.sin(e.wobblePhase) * 0.6;
      const nx = dx - dy * w, ny = dy + dx * w;
      const nl = Math.hypot(nx, ny) || 1;
      dx = nx / nl; dy = ny / nl;
    }
    // 射手：一定距離を保ちつつ弾を撃つ
    if (t.ranged) {
      if (d < t.ranged.keep) { dx = -dx; dy = -dy; } // 近すぎたら後退
      e.shootTimer -= dt;
      if (e.shootTimer <= 0 && d < t.ranged.range) {
        e.shootTimer = t.ranged.interval;
        fireEnemyBullet(e.x, e.y, p.x, p.y, t.ranged.bulletSpeed, t.ranged.bulletDmg);
      }
    }
    // ボスの技（予告円→発動）
    if (t.isBoss) {
      e.patternTimer -= dt;
      if (e.patternTimer <= 0) { e.patternTimer = 4.5; bossAttack(e); }
    }
    // 突進タイプ：ためて一気に加速
    let speedMul = 1;
    if (t.charge) {
      if (e.dashTimer > 0) {
        e.dashTimer -= dt;
        speedMul = t.charge.dashMult;
      } else {
        e.chargeTimer -= dt;
        if (e.chargeTimer <= 0 && d < 320) { // 近づいたら突進開始
          e.dashTimer = t.charge.dashTime;
          e.chargeTimer = t.charge.cooldown;
        }
      }
    }
    // 設置物によるスロー（居残り結界・黒板消しの粉塵）
    for (const pool of S.pools) {
      if (pool.slow && Math.hypot(e.x - pool.x, e.y - pool.y) < pool.r + e.radius) {
        speedMul *= pool.slow;
        break;
      }
    }
    e.x += dx * e.speed * speedMul * dt;
    e.y += dy * e.speed * speedMul * dt;
    // ノックバック適用＆減衰
    e.x += e.knockX * dt;
    e.y += e.knockY * dt;
    const decay = Math.max(0, 1 - CONFIG.KNOCK_DECAY * dt);
    e.knockX *= decay; e.knockY *= decay;
    e.flashTimer = Math.max(0, e.flashTimer - dt);
    if (e.orbCd > 0) e.orbCd -= dt;

    // プレイヤーへの接触ダメージ
    if (p.invulnTimer <= 0 && p.buffInvulnTimer <= 0 && d < e.radius + CONFIG.PLAYER.RADIUS) {
      if (playerTakeHit(e.dmg)) return; // 死亡＆復活なしなら終了
    }
  }
}

/* ===== 敵の遠距離弾 ===== */
function fireEnemyBullet(fx, fy, tx, ty, speed, dmg) {
  const a = Math.atan2(ty - fy, tx - fx);
  S.enemyBullets.push({ x: fx, y: fy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, radius: 7, life: 4 });
}

function updateEnemyBullets(dt) {
  const p = S.player;
  for (const b of S.enemyBullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < -40 || b.x > viewW + 40 || b.y < -40 || b.y > viewH + 40) { b.dead = true; continue; }
    if (Math.hypot(b.x - p.x, b.y - p.y) < b.radius + CONFIG.PLAYER.RADIUS) {
      b.dead = true;
      if (playerTakeHit(b.dmg)) return;
    }
  }
  S.enemyBullets = S.enemyBullets.filter(b => !b.dead);
}

/* ===== ボスの技（予告→発動・5パターン） ===== */
function bossAttack(e) {
  const p = S.player;
  const pat = Math.floor(Math.random() * 5);
  if (pat === 0) {
    // 落雷：プレイヤー足元に予告円→発動（複数）
    for (let i = 0; i < 3; i++) {
      S.telegraphs.push({ x: p.x + rnd(-60, 60), y: p.y + rnd(-60, 60), radius: 84, t: 1.0, maxT: 1.0, dmg: 22, knock: 200 });
    }
  } else if (pat === 1) {
    // 扇状弾幕：全方位に放射
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 / 12) * i + rnd(-0.1, 0.1);
      S.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, dmg: 12, radius: 7, life: 4 });
    }
  } else if (pat === 2) {
    // 雑魚召喚
    for (let i = 0; i < 3; i++) spawnEnemy('bat', { x: e.x + rnd(-30, 30), y: e.y + rnd(-30, 30) });
  } else if (pat === 3) {
    // 二重リング弾幕：内外で速度差をつけた全方位弾
    for (let i = 0; i < 14; i++) {
      const a = (Math.PI * 2 / 14) * i;
      S.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, dmg: 10, radius: 7, life: 4.5 });
      const a2 = a + Math.PI / 14;
      S.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a2) * 230, vy: Math.sin(a2) * 230, dmg: 10, radius: 6, life: 4 });
    }
  } else {
    // 狙い撃ちの三連弾
    const a0 = Math.atan2(p.y - e.y, p.x - e.x);
    for (let i = -1; i <= 1; i++) {
      const a = a0 + i * 0.22;
      S.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, dmg: 14, radius: 7, life: 4 });
    }
  }
}

// 予告範囲攻撃の更新（満ちたら発動しダメージ）
function updateTelegraphs(dt) {
  const p = S.player;
  for (const tg of S.telegraphs) {
    tg.t -= dt;
    if (tg.t <= 0) {
      tg.dead = true;
      S.effects.push({ kind: 'boom', x: tg.x, y: tg.y, r: 0, maxR: tg.radius, t: 0.25, maxT: 0.25 });
      S.shake = Math.max(S.shake, 8);
      if (Math.hypot(p.x - tg.x, p.y - tg.y) < tg.radius) {
        if (playerTakeHit(tg.dmg)) return;
      }
    }
  }
  S.telegraphs = S.telegraphs.filter(tg => !tg.dead);
}

// プレイヤー被弾の共通処理。戻り値 true = 死亡確定（呼び出し側は return する）
function playerTakeHit(dmg) {
  const p = S.player;
  if (p.invulnTimer > 0 || p.buffInvulnTimer > 0) return false;
  // 月影結界：1回分の被弾を肩代わり
  if (p.wardCharges > 0) {
    p.wardCharges -= 1;
    p.invulnTimer = CONFIG.PLAYER.INVULN_TIME;
    S.banner = { text: '🌸 結界が守った！', t: 1.0 };
    return false;
  }
  p.hp -= dmg;
  p.invulnTimer = CONFIG.PLAYER.INVULN_TIME;
  p.hitTimer = CONFIG.PLAYER.HIT_ANIM_TIME;
  p.animTime = 0;
  S.shake = Math.max(S.shake, 7);
  addDamageText(p.x, p.y - 30, `-${Math.round(dmg)}`, '#f87171');
  addHurtParticles(p.x, p.y);
  SFX.hurt();
  if (p.hp <= 0) {
    // 復活の護符（転生）
    if (p.reviveLeft > 0) {
      p.reviveLeft -= 1;
      p.hp = Math.round(p.maxHp * 0.3);
      p.buffInvulnTimer = 2.5;
      S.banner = { text: '🪽 復活！', t: 1.6 };
      detonateReviveNova();
      return false;
    }
    p.hp = 0; gameOver(); return true;
  }
  return false;
}

// 復活時に周囲を吹き飛ばす（立て直しの猶予）
function detonateReviveNova() {
  for (const e of S.enemies) damageEnemy(e, 40 * enemyHpScale(), S.player.x, S.player.y, 320);
  S.enemies = S.enemies.filter(e => !e.dead);
  S.effects.push({ kind: 'shock', x: S.player.x, y: S.player.y, r: 0, maxR: 260, dmg: 0, speed: 900, hitSet: new Set() });
  S.shake = Math.max(S.shake, 14);
}

// 敵にノックバックを与える（発生源から外向きに押す）
function applyKnockback(e, fromX, fromY, force) {
  if (ENEMY_TYPES[e.type].isBoss) force *= 0.25; // ボスは押されにくい
  let dx = e.x - fromX, dy = e.y - fromY;
  const d = Math.hypot(dx, dy) || 1;
  e.knockX += dx / d * force;
  e.knockY += dy / d * force;
}

// あらゆる攻撃源から敵にダメージを与える共通処理
function damageEnemy(e, dmg, srcX, srcY, knock) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flashTimer = 0.1;
  addDamageText(e.x, e.y - e.radius - 6, Math.round(dmg), '#fbbf24');
  if (knock) applyKnockback(e, srcX, srcY, knock);
  if (e.hp <= 0) { e.dead = true; onEnemyKilled(e); }
}

// 弾分裂：着弾点から破片弾を放射状に生成（弾数を引き継いで増える）
function spawnSplitFragments(x, y, baseDmg) {
  const p = S.player;
  if (!archOf(p).splitFragments) return; // 分裂は射手のみ（他職の分裂カードは別効果）
  const lv = upLv('split');
  if (lv <= 0) return;
  // 破片数 ＝ 基本2 ＋ 分裂Lv ＋ 弾強化で増えた弾数（「弾数を引き継ぐ」）
  const n = CONFIG.SPLIT.COUNT_BASE + (lv - 1) + Math.max(0, p.bulletCount - CONFIG.WEAPON.BULLET_COUNT);
  const start = Math.random() * Math.PI * 2; // 向きはランダム基準
  for (let i = 0; i < n; i++) {
    const a = start + (Math.PI * 2 / n) * i; // 放射状に均等分散
    S.bullets.push({
      x, y,
      vx: Math.cos(a) * CONFIG.SPLIT.FRAG_SPEED,
      vy: Math.sin(a) * CONFIG.SPLIT.FRAG_SPEED,
      dmg: baseDmg * CONFIG.SPLIT.FRAG_DAMAGE_MULT,
      pierce: 0,
      life: CONFIG.SPLIT.FRAG_LIFE,
      radius: CONFIG.SPLIT.FRAG_RADIUS,
      hitSet: new Set(),
      isFragment: true, // 破片はさらに分裂しない
    });
  }
}

function updateBullets(dt) {
  for (const b of S.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    // チョークの壁反射（画面端で跳ね返る）
    if (b.bounce > 0) {
      if ((b.x < 0 && b.vx < 0) || (b.x > viewW && b.vx > 0)) { b.vx = -b.vx; b.bounce -= 1; }
      if ((b.y < 0 && b.vy < 0) || (b.y > viewH && b.vy > 0)) { b.vy = -b.vy; b.bounce -= 1; }
    }
    if (b.life <= 0) {
      b.dead = true;
      if (b.isPotion) potionLand(b);                                  // ポーションは狙った地点で爆発
      else if (b.explodeOnEnd) explodeAt(b.x, b.y, 70, b.dmg * 0.9, 0, 120); // ランス着弾の小爆発
      // 貫通弾（貫通カード取得後）も、敵に触れていれば射程の切れ目で分裂する
      else if (b.hitAny && !b.isFragment) spawnSplitFragments(b.x, b.y, b.dmg);
      continue;
    }
    if (b.noCollide) continue; // ポーションは道中の敵に当たらない（山なり投擲）
    // 敵との衝突（円と円）
    for (const e of S.enemies) {
      if (e.dead || b.hitSet.has(e)) continue;
      const d = Math.hypot(e.x - b.x, e.y - b.y);
      if (d < e.radius + b.radius) {
        b.hitSet.add(e);
        b.hitAny = true;
        addHitParticles(b.x, b.y);
        damageEnemy(e, b.dmg, b.x, b.y, b.isFragment ? 0 : 20);
        if (b.dmgDecay) b.dmg *= b.dmgDecay; // ランスは貫くごとに威力減
        if (b.pierce > 0) {
          b.pierce -= 1;
        } else {
          if (b.explodeOnEnd) explodeAt(b.x, b.y, 70, b.dmg * 0.9, 0, 120);
          // 貫通を撃ち切った通常弾は着弾点で分裂
          else if (!b.isFragment) spawnSplitFragments(b.x, b.y, b.dmg);
          b.dead = true;
          break;
        }
      }
    }
  }
  S.bullets = S.bullets.filter(b => !b.dead);
  S.enemies = S.enemies.filter(e => !e.dead);
}

/* ===== 進化：旋回大鎌（常時回る鎌＋斬撃リング） ===== */
function updateScythe(dt) {
  const p = S.player;
  const baseLv = Math.max(1, upLv('sweep'));
  const dmg = CONFIG.SWEEP.DAMAGE_BASE * (1 + CONFIG.SWEEP.DAMAGE_PER_LV * (baseLv - 1));
  const orbitR = 96, band = 42;
  p.scytheAngle += dt * 3.4; // 旋回
  // 0.22秒ごとに鎌の当たり判定帯にいる敵へダメージ
  p.scytheTick -= dt;
  if (p.scytheTick <= 0) {
    p.scytheTick = 0.22;
    const bladeX = p.x + Math.cos(p.scytheAngle) * orbitR;
    const bladeY = p.y + Math.sin(p.scytheAngle) * orbitR;
    for (const e of S.enemies) {
      if (Math.hypot(e.x - bladeX, e.y - bladeY) <= band + e.radius) {
        damageEnemy(e, dmg * 0.5, p.x, p.y, 70);
      }
    }
    S.enemies = S.enemies.filter(e => !e.dead);
  }
  // 一定間隔で全方位斬撃リング
  p.scytheRingTimer -= dt;
  if (p.scytheRingTimer <= 0) {
    p.scytheRingTimer = 2.6;
    S.effects.push({ kind: 'shock', x: p.x, y: p.y, r: 0, maxR: 190, dmg: dmg * 1.2, speed: 560, hitSet: new Set() });
    p.actionAnim = 'waving'; p.actionTimer = 0.3; p.animTime = 0;
  }
}

/* ===== 進化：月影結界（被弾軽減バリア＋更新時ノックバック斬） ===== */
function updateWard(dt) {
  const p = S.player;
  p.wardTimer -= dt;
  if (p.wardTimer <= 0) {
    p.wardTimer = 5.0;                 // 5秒ごとに結界を更新
    p.wardCharges = Math.min(1, p.wardCharges + 1);
    // 更新時に周囲へノックバック斬撃
    const baseLv = Math.max(1, upLv('sweep'));
    const dmg = CONFIG.SWEEP.DAMAGE_BASE * (1 + CONFIG.SWEEP.DAMAGE_PER_LV * (baseLv - 1)) * 1.3;
    S.effects.push({ kind: 'shock', x: p.x, y: p.y, r: 0, maxR: 150, dmg, speed: 620, hitSet: new Set() });
    p.actionAnim = 'waving'; p.actionTimer = 0.3; p.animTime = 0;
  }
}

/* ===== 追加武器：薙ぎ払い（扇状の近接攻撃） ===== */
function updateSweep(dt) {
  const p = S.player;
  // 進化した薙ぎ払いコアは専用ロジックへ
  if (p.evolvedCore.sweep === 'scythe') { updateScythe(dt); return; }
  if (p.evolvedCore.sweep === 'ward') { updateWard(dt); return; }
  const lv = upLv('sweep');
  if (lv <= 0) return;
  // 予約済みの振り（昇格コンボ）を消化
  for (const q of p.pendingSwings) q.t -= dt;
  while (p.pendingSwings.length && p.pendingSwings[0].t <= 0) {
    performSweepSwing(p.pendingSwings.shift().center, lv);
  }
  p.sweepTimer -= dt;
  if (p.sweepTimer > 0) return;
  p.sweepTimer = CONFIG.SWEEP.INTERVAL_BASE * Math.pow(CONFIG.SWEEP.INTERVAL_MULT, lv - 1);

  const radius = CONFIG.SWEEP.RADIUS_BASE * (1 + CONFIG.SWEEP.RADIUS_PER_LV * (lv - 1));
  // 向き：最寄りの敵、いなければ直近の移動方向
  const target = nearestEnemy(p.x, p.y, radius + 60);
  const center = target ? Math.atan2(target.y - p.y, target.x - p.x)
                        : Math.atan2(p.lastDir.y, p.lastDir.x);
  // 昇格コンボ：Lv3以上＝一度振った後、続けて反時計回りにもう一振り（反対側の半円を薙ぐ）
  //             Lv5以上＝バットが二本になり、それぞれ2連撃（計4振りで360°×2）
  const swings = lv >= 3 ? 2 : 1;
  const bats = lv >= 5 ? 2 : 1;
  const gap = CONFIG.SWEEP.ANIM_TIME * 0.85; // 連撃の間合い
  p.pendingSwings = [];
  for (let bt = 0; bt < bats; bt++) {
    for (let sw = 0; sw < swings; sw++) {
      // 2振り目は反時計回りに続けて反対側の半円へ（-PI）。2本目のバットは反対側から。
      const c = center + Math.PI * bt - Math.PI * sw;
      if (bt === 0 && sw === 0) performSweepSwing(c, lv);
      else p.pendingSwings.push({ t: gap * sw + (bt ? gap * 0.5 : 0), center: c });
    }
  }
  p.pendingSwings.sort((a, b) => a.t - b.t);
}

// 釘バットの一振り（扇内ダメージ＋モーション＋エフェクト）
function performSweepSwing(center, lv) {
  const p = S.player;
  const radius = CONFIG.SWEEP.RADIUS_BASE * (1 + CONFIG.SWEEP.RADIUS_PER_LV * (lv - 1));
  const dmg = CONFIG.SWEEP.DAMAGE_BASE * (1 + CONFIG.SWEEP.DAMAGE_PER_LV * (lv - 1));
  const half = CONFIG.SWEEP.ARC_DEG * Math.PI / 180 / 2;
  // 扇内の敵にダメージ＋ノックバック（釘バットの打撃）
  let hitCount = 0;
  for (const e of S.enemies) {
    const dx = e.x - p.x, dy = e.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > radius + e.radius) continue;
    let diff = Math.abs(normalizeAngle(Math.atan2(dy, dx) - center));
    if (diff <= half) { damageEnemy(e, dmg, p.x, p.y, CONFIG.SWEEP.KNOCK); hitCount++; }
  }
  // 打撃感：当たったら軽くシェイク＆打撃音
  if (hitCount > 0) { S.shake = Math.max(S.shake, 5); SFX.hit(); }
  // 振りモーション＆エフェクト（バットはプレイヤーの手元に追従して振られる）
  p.actionAnim = 'waving'; p.actionTimer = CONFIG.SWEEP.ANIM_TIME; p.animTime = 0;
  S.effects.push({ kind: 'sweep', get x() { return S.player.x; }, get y() { return S.player.y; }, center, half, radius, t: CONFIG.SWEEP.ANIM_TIME, maxT: CONFIG.SWEEP.ANIM_TIME });
  S.enemies = S.enemies.filter(e => !e.dead);
}

/* ===== 追加武器：衝撃波（広がる円形リング） ===== */
function updateShock(dt) {
  const p = S.player;
  const lv = upLv('shock');
  if (lv <= 0) return;
  p.shockTimer -= dt;
  if (p.shockTimer > 0) return;
  p.shockTimer = CONFIG.SHOCK.INTERVAL_BASE * Math.pow(CONFIG.SHOCK.INTERVAL_MULT, lv - 1);

  const maxR = CONFIG.SHOCK.MAX_RADIUS_BASE * (1 + CONFIG.SHOCK.MAX_RADIUS_PER_LV * (lv - 1));
  const dmg = CONFIG.SHOCK.DAMAGE_BASE * (1 + CONFIG.SHOCK.DAMAGE_PER_LV * (lv - 1));
  S.effects.push({ kind: 'shock', x: p.x, y: p.y, r: 0, maxR, dmg, speed: CONFIG.SHOCK.SPEED, hitSet: new Set() });
  p.actionAnim = 'jumping'; p.actionTimer = 0.3; p.animTime = 0;
  S.shake = Math.max(S.shake, 4);
}

// 弧・リング等のエフェクトを更新（衝撃波はここで判定も行う）
// visualOnly=true（レベルアップ選択中・リザルト中）：描画用タイマーだけ進め、
// 敵へのダメージ判定は一切行わない。衝撃波リングは凍結（進めると敵を素通りしてしまうため）。
function updateEffects(dt, visualOnly) {
  const nova = S.player && S.player.evolvedCore.shock === 'nova';
  for (const fx of S.effects) {
    if (fx.kind === 'sweep' || fx.kind === 'boom' || fx.kind === 'railcharge' || fx.kind === 'railbeam' || fx.kind === 'evobeam' || fx.kind === 'magiccircle' || fx.kind === 'fanslash') {
      if (fx.kind === 'boom') fx.r = fx.maxR * (1 - fx.t / fx.maxT); // 爆発の広がり演出
      fx.t -= dt;
      if (fx.t <= 0) fx.dead = true;
    } else if (fx.kind === 'shock') {
      if (visualOnly) continue; // 一時停止状態ではリングを凍結＝ダメージも拡大もしない
      fx.r += fx.speed * dt;
      for (const e of S.enemies) {
        if (e.dead || fx.hitSet.has(e)) continue;
        const d = Math.hypot(e.x - fx.x, e.y - fx.y);
        // リング（拡大する帯）の付近にいる敵だけヒット＝内側や後から入った敵には当たらない
        if (Math.abs(d - fx.r) <= CONFIG.SHOCK.BAND + e.radius) {
          fx.hitSet.add(e); // 同じ衝撃波では1回だけ判定
          damageEnemy(e, fx.dmg, fx.x, fx.y, CONFIG.SHOCK.KNOCK);
          // 進化：連鎖星爆（衝撃波で倒すと敵の位置に魔法陣が発火＋小爆発が連鎖）
          if (nova && e.dead) {
            S.effects.push({ kind: 'magiccircle', x: e.x, y: e.y, r: 46, t: 0.5, maxT: 0.5 });
            explodeAt(e.x, e.y, 80, fx.dmg * 0.8, 4, 100);
          }
        }
      }
      if (fx.r >= fx.maxR) fx.dead = true;
    }
  }
  S.effects = S.effects.filter(fx => !fx.dead);
  S.enemies = S.enemies.filter(e => !e.dead);
}

// 角度を -PI〜PI に正規化
function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function onEnemyKilled(e) {
  const t = ENEMY_TYPES[e.type];
  S.kills += 1;
  if (t.isBoss && !e.isMinion) {
    S.bossKills += 1; hitStop(120); S.shake = Math.max(S.shake, 10); SFX.boss();
    // 背景ゾーンを次へ
    S.zone = (S.zone + 1) % ZONES.length;
    S.banner = { text: `🌄 ${ZONES[S.zone].name} へ`, t: 2.2 };
  }
  // 経験値ジェム
  S.pickups.push(makePickup('gem', e.x, e.y, t.xp));
  // コイン
  if (Math.random() < t.coinChance) {
    S.pickups.push(makePickup('coin', e.x + rnd(-14, 14), e.y + rnd(-14, 14), t.coinValue));
  }
  // 回復ハート（低確率）
  if (Math.random() < CONFIG.DROP.HEART_CHANCE) {
    S.pickups.push(makePickup('heart', e.x + rnd(-14, 14), e.y + rnd(-14, 14), CONFIG.DROP.HEART_HEAL));
  }
  // 特殊アイテム（さらに低確率・重複しないよう1種のみ）
  const r = Math.random();
  if (r < CONFIG.DROP.MAGNET_CHANCE) {
    S.pickups.push(makePickup('magnet', e.x, e.y, 0));
  } else if (r < CONFIG.DROP.MAGNET_CHANCE + CONFIG.DROP.BOMB_CHANCE) {
    S.pickups.push(makePickup('bomb', e.x, e.y, 0));
  } else if (r < CONFIG.DROP.MAGNET_CHANCE + CONFIG.DROP.BOMB_CHANCE + CONFIG.DROP.SHIELD_CHANCE) {
    S.pickups.push(makePickup('shield', e.x, e.y, 0));
  }
  // 分裂スライム：小スライムを飛び散らせる
  if (t.splitInto) {
    for (let i = 0; i < t.splitInto.count; i++) {
      spawnEnemy(t.splitInto.type,
        { x: e.x + rnd(-18, 18), y: e.y + rnd(-18, 18) },
        1); // 子はスケール標準
    }
  }
  addKillParticles(e.x, e.y, t.radius);
}

function makePickup(kind, x, y, value) {
  return { kind, x, y, value, life: CONFIG.DROP.LIFETIME, bobPhase: Math.random() * Math.PI * 2 };
}

function updatePickups(dt) {
  const p = S.player;
  for (const it of S.pickups) {
    it.life -= dt;
    it.bobPhase += dt * 4;
    if (it.life <= 0) { it.dead = true; continue; }
    const d = Math.hypot(p.x - it.x, p.y - it.y);
    // 回収半径内なら吸い寄せ
    if (d < p.pickupRadius) {
      const pull = CONFIG.DROP.PICKUP_ATTRACT_SPEED * dt;
      it.x += (p.x - it.x) / d * Math.min(pull, d);
      it.y += (p.y - it.y) / d * Math.min(pull, d);
    }
    if (d < CONFIG.DROP.COLLECT_DIST) {
      it.dead = true;
      collectPickup(it);
    }
  }
  S.pickups = S.pickups.filter(it => !it.dead);
}

function collectPickup(it) {
  const p = S.player;
  if (it.kind === 'gem') {
    p.xp += it.value * (p.xpGainMult || 1); // 教師は経験値+15%
    SFX.xp();
    maybeLevelUp(); // 1レベルずつ提示（複数レベル分は選択後に順番に処理）
  } else if (it.kind === 'coin') {
    S.coins += Math.round(it.value * p.coinGainMult); // 商才（転生）で増量
    SFX.coin();
  } else if (it.kind === 'heart') {
    p.hp = Math.min(p.maxHp, p.hp + it.value);
    addDamageText(p.x, p.y - 34, `+${it.value}`, '#4ade80');
  } else if (it.kind === 'magnet') {
    // 全ジェム＆コインを即回収
    let got = 0;
    for (const o of S.pickups) {
      if (o === it || o.dead) continue;
      if (o.kind === 'gem') { p.xp += o.value * (p.xpGainMult || 1); o.dead = true; got++; }
      else if (o.kind === 'coin') { S.coins += Math.round(o.value * p.coinGainMult); o.dead = true; got++; }
    }
    // まとめて入ったXPでレベルアップ判定（余剰分は選択後に順番に処理）
    maybeLevelUp();
    S.banner = { text: '🧲 全回収！', t: 1.4 };
  } else if (it.kind === 'bomb') {
    detonateBomb();
  } else if (it.kind === 'shield') {
    p.buffInvulnTimer = Math.max(p.buffInvulnTimer, CONFIG.DROP.SHIELD_TIME);
    S.banner = { text: '🛡️ 無敵！', t: 1.4 };
  }
}

// 画面全体ダメージ（爆弾）
function detonateBomb() {
  const dmg = CONFIG.DROP.BOMB_DAMAGE * enemyHpScale(); // 時間経過に合わせて威力も増加
  for (const e of S.enemies) damageEnemy(e, dmg, S.player.x, S.player.y, 160);
  S.enemies = S.enemies.filter(e => !e.dead);
  S.shake = Math.max(S.shake, 12);
  S.effects.push({ kind: 'shock', x: S.player.x, y: S.player.y, r: 0, maxR: Math.max(viewW, viewH), dmg: 0, speed: 900, hitSet: new Set() });
  S.banner = { text: '💣 爆発！', t: 1.4 };
}

/* ===== エフェクト（パーティクル＆ダメージ数字） ===== */
function rnd(a, b) { return a + Math.random() * (b - a); }

function addDamageText(x, y, txt, color) {
  if (S.particles.length > 150) return; // 出しすぎ防止
  S.particles.push({ kind: 'text', x, y, txt: String(txt), color, t: 0.7, vy: -50 });
}

function addHitParticles(x, y) {
  if (S.particles.length > 150) return;
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2;
    S.particles.push({ kind: 'dot', x, y, vx: Math.cos(a) * rnd(40, 130), vy: Math.sin(a) * rnd(40, 130), t: 0.3, color: '#7dd3fc' });
  }
}

function addKillParticles(x, y, r) {
  if (S.particles.length > 150) return;
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * Math.PI * 2;
    S.particles.push({ kind: 'dot', x, y, vx: Math.cos(a) * rnd(60, 180), vy: Math.sin(a) * rnd(60, 180), t: 0.45, color: '#c4b5fd' });
  }
}

function addHurtParticles(x, y) {
  if (S.particles.length > 150) return;
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    S.particles.push({ kind: 'dot', x, y, vx: Math.cos(a) * rnd(60, 160), vy: Math.sin(a) * rnd(60, 160), t: 0.4, color: '#f87171' });
  }
}

function addLevelUpParticles(x, y) {
  if (S.particles.length > 150) return;
  for (let i = 0; i < 14; i++) {
    const a = (Math.PI * 2 / 14) * i;
    S.particles.push({ kind: 'dot', x, y, vx: Math.cos(a) * rnd(120, 220), vy: Math.sin(a) * rnd(120, 220), t: 0.6, color: '#fde68a' });
  }
}

function updateParticles(dt) {
  for (const pt of S.particles) {
    pt.t -= dt;
    if (pt.t <= 0) { pt.dead = true; continue; }
    pt.x += (pt.vx || 0) * dt;
    pt.y += (pt.vy || 0) * dt;
  }
  S.particles = S.particles.filter(pt => !pt.dead);
}

/* =========================================================
 * 描画
 * ========================================================= */
// キャラごとにスプライトシート（webp優先→png）をロード
const charSheets = {};
for (const [key, ch] of Object.entries(CHARACTERS)) {
  charSheets[key] = { webp: loadImage(ch.sheet), png: loadImage(ch.sheetPng) };
}
loadImage(BULLET_SPRITE);
// 薙ぎ払い（釘バット）はコード描画のみ＝sweep.png/nailbat.pngはロードしない
// （コード描画はスイング半径に合わせて劣化なく拡縮でき、残像トレイルとも一体のため）
loadImage('assets/shockwave.png');  // 衝撃波エフェクト（旧フォールバック）
loadImage('assets/magic_circle_blue.png');   // 衝撃波の魔法陣（シア＝射手用）
loadImage('assets/magic_circle_green.png');  // 衝撃波の魔法陣（ソフィア＝魔導士用）
for (const z of ZONES) { if (z.img) loadImage(z.img); } // ゾーン背景アート
for (const t of Object.values(ENEMY_TYPES)) loadImage(t.sprite);
for (const t of Object.values(PICKUP_TYPES)) loadImage(t.sprite);

// 現在のキャラのシート（読めなければ相手方→null）
function getSheet() {
  const key = (S.player && S.player.character) || S.selectedCharacter || 'shia';
  const cs = charSheets[key];
  if (cs) {
    if (cs.webp.ok) return cs.webp.img;
    if (cs.png.ok) return cs.png.img;
  }
  // フォールバック：シアのシート
  if (charSheets.shia.webp.ok) return charSheets.shia.webp.img;
  if (charSheets.shia.png.ok) return charSheets.shia.png.img;
  return null;
}

function drawBackground() {
  // ゾーン（ボス撃破ごとに変化・先頭は初期背景）
  const z = ZONES[Math.min(S.zone, ZONES.length - 1)] || ZONES[0];
  // 背景アート（1024x576）：画面全体をカバーするよう拡大して中央配置
  const bgImg = z.img ? imageCache.get(z.img) : null;
  if (bgImg && bgImg.ok) {
    const iw = bgImg.img.naturalWidth || 1024, ih = bgImg.img.naturalHeight || 576;
    const scale = Math.max(viewW / iw, viewH / ih); // cover
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(bgImg.img, (viewW - dw) / 2, (viewH - dh) / 2, dw, dh);
    // 敵・弾の視認性を保つため、ごく薄く暗めのベールを重ねる
    ctx.fillStyle = 'rgba(5,8,20,0.18)';
    ctx.fillRect(0, 0, viewW, viewH);
    return;
  }
  // フォールバック：従来の単色＋薄いグリッド
  ctx.fillStyle = z.bg;
  ctx.fillRect(0, 0, viewW, viewH);
  ctx.strokeStyle = z.grid;
  ctx.lineWidth = 1;
  const grid = 64;
  ctx.beginPath();
  for (let x = 0; x <= viewW; x += grid) { ctx.moveTo(x, 0); ctx.lineTo(x, viewH); }
  for (let y = 0; y <= viewH; y += grid) { ctx.moveTo(0, y); ctx.lineTo(viewW, y); }
  ctx.stroke();
}

// 絵文字を中央揃えで描く共通処理
function drawEmoji(emoji, x, y, size) {
  ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, x, y);
}

// 画像があれば画像、無ければ絵文字（差し替え設計の要）
function drawSpriteOrEmoji(spritePath, emoji, x, y, size) {
  const entry = imageCache.get(spritePath);
  if (entry && entry.ok) {
    ctx.drawImage(entry.img, x - size / 2, y - size / 2, size, size);
  } else {
    drawEmoji(emoji, x, y, size);
  }
}

function currentPlayerAnim() {
  const p = S.player;
  if (S.mode === 'gameover') return 'failed';
  if (p.hitTimer > 0) return 'failed';
  if (S.mode === 'levelup') return 'waving';
  if (p.actionTimer > 0 && p.actionAnim) return p.actionAnim; // 攻撃モーション（薙ぎ払い/衝撃波）
  if (p.moving) return p.facing >= 0 ? 'runRight' : 'runLeft';
  return 'idle';
}

function drawPlayer() {
  const p = S.player;
  const animName = currentPlayerAnim();
  const anim = SPRITE_SHEET.anims[animName];
  const frame = Math.floor(p.animTime * anim.fps) % anim.frames;
  const sheet = getSheet();
  const { DRAW_W, DRAW_H } = CONFIG.PLAYER;

  // 足元の影
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + DRAW_H / 2 - 4, DRAW_W * 0.32, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 無敵中は点滅
  if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 12) % 2 === 0) ctx.globalAlpha = 0.45;

  if (sheet) {
    const sx = frame * SPRITE_SHEET.frameW;
    const sy = anim.row * SPRITE_SHEET.frameH;
    ctx.drawImage(sheet, sx, sy, SPRITE_SHEET.frameW, SPRITE_SHEET.frameH,
      p.x - DRAW_W / 2, p.y - DRAW_H / 2, DRAW_W, DRAW_H);
  } else {
    // シートが読めない時の予備（円）
    ctx.fillStyle = '#7dd3fc';
    ctx.beginPath();
    ctx.arc(p.x, p.y, CONFIG.PLAYER.RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // シールド（一時無敵）中は輝く円で表示
  if (p.buffInvulnTimer > 0) {
    ctx.strokeStyle = `rgba(125, 211, 252, ${0.5 + 0.35 * Math.sin(S.time * 12)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, DRAW_W * 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemies() {
  for (const e of S.enemies) {
    const t = ENEMY_TYPES[e.type];
    // 被弾フラッシュ（少し明るく＆拡大）
    const flash = e.flashTimer > 0;
    if (flash) { ctx.globalAlpha = 0.85; }
    drawSpriteOrEmoji(t.sprite, t.emoji, e.x, e.y, t.size * (flash ? 1.12 : 1));
    ctx.globalAlpha = 1;
    // ダメージを受けた敵にはHPバー（敵＝赤／ボスは赤でやや太く長く）
    if (e.hp < e.maxHp) {
      const boss = t.isBoss;
      const w = boss ? t.size * 1.35 : t.size;
      const h = boss ? 7 : 4;
      const ratio = Math.max(0, e.hp / e.maxHp);
      const yBar = e.y - t.size / 2 - (boss ? 14 : 10);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(e.x - w / 2, yBar, w, h);
      ctx.fillStyle = boss ? '#dc2626' : '#f43f5e'; // ボスは濃いめの赤
      ctx.fillRect(e.x - w / 2, yBar, w * ratio, h);
    }
  }
}

// 剣士の斬撃弾：進行方向に開いた三日月
function drawSlashBullet(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.atan2(b.vy, b.vx));
  const r = b.radius * 1.7;
  ctx.strokeStyle = 'rgba(125,211,252,0.95)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(-r * 0.45, 0, r, -1.15, 1.15); ctx.stroke();
  ctx.strokeStyle = 'rgba(240,250,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(-r * 0.45, 0, r, -1.0, 1.0); ctx.stroke();
  ctx.restore();
}

// 教師のチョーク：回転する小さな棒
function drawChalkBullet(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(Math.atan2(b.vy, b.vx));
  const L = b.radius * 2.4, W = b.radius;
  ctx.fillStyle = '#fefce8';
  ctx.strokeStyle = '#eab308'; ctx.lineWidth = 1;
  ctx.fillRect(-L / 2, -W / 2, L, W);
  ctx.strokeRect(-L / 2, -W / 2, L, W);
  ctx.restore();
}

// 錬金術師のポーション：山なりに飛ぶ瓶（影つき）
function drawPotionBullet(b) {
  const prog = 1 - b.life / (b.totalLife || 1);
  const h = Math.sin(prog * Math.PI) * 38; // 放物線の高さ
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(b.x, b.y, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  drawEmoji('🧪', b.x, b.y - h, 20);
}

function drawBullets() {
  const entry = imageCache.get(BULLET_SPRITE);
  for (const b of S.bullets) {
    if (b.isSlash) { drawSlashBullet(b); continue; }
    if (b.isChalk) { drawChalkBullet(b); continue; }
    if (b.isPotion) { drawPotionBullet(b); continue; }
    if (b.isMagic) {
      // 使い魔の魔弾（緑）
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2);
      g.addColorStop(0, 'rgba(220,255,225,1)');
      g.addColorStop(0.5, 'rgba(74,222,128,0.8)');
      g.addColorStop(1, 'rgba(34,197,94,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 2, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    if (entry && entry.ok) {
      ctx.drawImage(entry.img, b.x - b.radius * 1.6, b.y - b.radius * 1.6, b.radius * 3.2, b.radius * 3.2);
    } else {
      // 光る魔法弾
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2);
      g.addColorStop(0, 'rgba(190, 235, 255, 1)');
      g.addColorStop(0.5, 'rgba(80, 170, 255, 0.8)');
      g.addColorStop(1, 'rgba(80, 170, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPickups() {
  for (const it of S.pickups) {
    const t = PICKUP_TYPES[it.kind];
    const bob = Math.sin(it.bobPhase) * 3; // ふわふわ上下
    // 寿命間近は点滅
    if (it.life < 5 && Math.floor(it.life * 6) % 2 === 0) continue;
    drawSpriteOrEmoji(t.sprite, t.emoji, it.x, it.y + bob, t.size);
  }
}

function drawParticles() {
  for (const pt of S.particles) {
    if (pt.kind === 'text') {
      ctx.globalAlpha = Math.min(1, pt.t / 0.3);
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = pt.color;
      ctx.fillText(pt.txt, pt.x, pt.y);
    } else {
      ctx.globalAlpha = Math.min(1, pt.t / 0.2);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawStick() {
  if (!stick.active) return;
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#e8ecf5';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(stick.baseX, stick.baseY, STICK_MAX, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.arc(stick.baseX + stick.dx, stick.baseY + stick.dy, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

// 釘バットが反時計回りに180°を薙ぐ描画（外部画像なし・コード描画）
// バットはプレイヤーの手元(fx.x, fx.y はgetterで追従)から伸び、curA へ回転して振られる
function drawNailBatSweep(fx) {
  const prog = 1 - fx.t / fx.maxT;              // 0→1
  const startA = fx.center + fx.half;           // CCW開始（上側）
  const curA = fx.center + (fx.half - fx.half * 2 * prog); // 現在の振り角
  const R = fx.radius;
  const alpha = Math.min(1, fx.t / fx.maxT);
  ctx.save();
  ctx.translate(fx.x, fx.y);
  // 振りの残像＝先端付近を通る細い弧の帯（現在角→開始角）
  ctx.globalAlpha = alpha * 0.38;
  ctx.strokeStyle = 'rgba(200,225,255,0.6)';
  ctx.lineWidth = R * 0.10;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(0, 0, R * 0.86, curA, startA); ctx.stroke();
  ctx.globalAlpha = alpha * 0.6;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, R * 0.86, curA, startA); ctx.stroke();
  // 釘バット本体（現在角へ回転して描く。太さは半径に比例）
  ctx.globalAlpha = 1;                          // バットは常にくっきり
  ctx.rotate(curA);
  const h0 = R * 0.20, h1 = R * 0.98;           // 握り元→先端
  const wNear = R * 0.05, wFar = R * 0.12;      // 手元→先端の太さ（先太り）
  const spikeLen = R * 0.10, spikeHalf = R * 0.032;
  // 黒い縁取り（シルエット）：暗背景・トレイルの中でも埋もれない
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = R * 0.17; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(h1, 0); ctx.stroke();
  // グリップ（濃茶）＋手元のポメル（丸い握り末端）
  ctx.strokeStyle = '#4a3626'; ctx.lineWidth = wNear * 1.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(h0, 0); ctx.stroke();
  ctx.fillStyle = '#3b2a1c'; ctx.strokeStyle = '#241a12'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, wNear * 1.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // トゲ（釘）：胴の外側に並べる（先に描いて胴で根元を隠す）＝白〜銀の三角
  ctx.fillStyle = '#f1f5f9';
  ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1;
  for (let s = 0; s < 5; s++) {
    const tt = 0.42 + s * 0.14;
    const px = h0 + (h1 - h0) * tt;
    const w = wNear + (wFar - wNear) * tt;
    ctx.beginPath(); ctx.moveTo(px - spikeHalf, -w); ctx.lineTo(px + spikeHalf, -w); ctx.lineTo(px, -w - spikeLen); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px - spikeHalf, w); ctx.lineTo(px + spikeHalf, w); ctx.lineTo(px, w + spikeLen); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // 先端の釘
  ctx.beginPath(); ctx.moveTo(h1, -wFar); ctx.lineTo(h1, wFar); ctx.lineTo(h1 + spikeLen * 1.6, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  // バット胴（先太りの木製・グラデ＋輪郭）
  const bg = ctx.createLinearGradient(h0, 0, h1, 0);
  bg.addColorStop(0, '#8a5a30'); bg.addColorStop(1, '#c78a4e');
  ctx.beginPath();
  ctx.moveTo(h0, -wNear);
  ctx.lineTo(h1, -wFar);
  ctx.quadraticCurveTo(h1 + wFar, 0, h1, wFar);
  ctx.lineTo(h0, wNear);
  ctx.closePath();
  ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = '#5b3d1f'; ctx.lineWidth = 2; ctx.stroke();
  // 金属バンド（グリップ上の締めテープ・トゲの手前側）
  {
    const tt = 0.30;
    const px = h0 + (h1 - h0) * tt;
    const w = wNear + (wFar - wNear) * tt;
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = Math.max(2, R * 0.028);
    ctx.beginPath(); ctx.moveTo(px, -w); ctx.lineTo(px, w); ctx.stroke();
  }
  // 木目のハイライト（上辺に沿って明るい筋）
  ctx.strokeStyle = 'rgba(255,235,200,0.5)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(h0, -wNear * 0.3); ctx.lineTo(h1, -wFar * 0.4); ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// 衝撃波リングの色（職業ごとにARCHETYPESで定義）
function shockColors() {
  return (S.player && archOf(S.player).shock) || { main: '#a5b4fc', glow: '#e0e7ff' };
}

/* ===== 地面の設置物（毒沼・エリクサー床・拘束結界・黒板消し・粉塵）の描画 ===== */
function drawPools() {
  for (const pool of S.pools) {
    const fade = Math.min(1, pool.dur / 0.8); // 消える間際にフェードアウト
    if (pool.kind === 'eraser') {
      // 黒板消しトラップ：小さな四角い消し具
      ctx.globalAlpha = fade;
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 2;
      ctx.fillRect(pool.x - 14, pool.y - 8, 28, 16);
      ctx.strokeRect(pool.x - 14, pool.y - 8, 28, 16);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(pool.x - 14, pool.y - 8, 28, 6);
      ctx.globalAlpha = 1;
      continue;
    }
    let fill, rim;
    if (pool.kind === 'poison')       { fill = 'rgba(132,204,22,0.20)';  rim = 'rgba(163,230,53,0.55)'; }
    else if (pool.kind === 'elixir')  { fill = 'rgba(253,224,71,0.22)';  rim = 'rgba(253,230,138,0.65)'; }
    else if (pool.kind === 'detention'){ fill = 'rgba(251,191,36,0.14)'; rim = 'rgba(253,230,138,0.8)'; }
    else                               { fill = 'rgba(203,213,225,0.20)'; rim = 'rgba(226,232,240,0.5)'; } // dust
    ctx.globalAlpha = fade;
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(pool.x, pool.y, pool.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rim; ctx.lineWidth = 2;
    if (pool.kind === 'detention') ctx.setLineDash([8, 6]); // 結界は破線
    ctx.beginPath(); ctx.arc(pool.x, pool.y, pool.r, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // 泡（毒沼・エリクサー）
    if (pool.kind === 'poison' || pool.kind === 'elixir') {
      ctx.fillStyle = rim;
      for (let i = 0; i < 3; i++) {
        const a = pool.dur * 2 + i * 2.1;
        ctx.beginPath();
        ctx.arc(pool.x + Math.cos(a) * pool.r * 0.5, pool.y + Math.sin(a * 1.3) * pool.r * 0.5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawEffects() {
  for (const fx of S.effects) {
    if (fx.kind === 'sweep') {
      // 釘バットは常にコード描画（sweep.png＝旧弧エフェクトは使わない）
      drawNailBatSweep(fx);
    } else if (fx.kind === 'boom') {
      const a = Math.max(0, fx.t / fx.maxT);
      const g = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, Math.max(1, fx.r));
      g.addColorStop(0, `rgba(255,236,170,${0.85 * a})`);
      g.addColorStop(0.6, `rgba(255,150,80,${0.5 * a})`);
      g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, Math.max(1, fx.r), 0, Math.PI * 2); ctx.fill();
    } else if (fx.kind === 'railcharge') {
      // チャージ予告：伸びる細いガイド線＋点滅
      const a = 1 - fx.t / fx.maxT;
      ctx.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(fx.t * 30));
      ctx.strokeStyle = fx.color || '#a5b4fc';
      ctx.lineWidth = 2 + 4 * a;
      const len = Math.max(viewW, viewH) * 1.5;
      ctx.beginPath();
      ctx.moveTo(fx.x, fx.y);
      ctx.lineTo(fx.x + Math.cos(fx.angle) * len, fx.y + Math.sin(fx.angle) * len);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'railbeam') {
      // 発射：極太レーザー
      const a = fx.t / fx.maxT;
      const len = Math.max(viewW, viewH) * 1.5;
      const ex = fx.x + Math.cos(fx.angle) * len, ey = fx.y + Math.sin(fx.angle) * len;
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#e0e7ff'; ctx.lineWidth = 26 * a + 6;
      ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = fx.color || '#818cf8'; ctx.lineWidth = 14 * a + 3;
      ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'evobeam') {
      // 進化した弾コアの光線
      const a = fx.t / fx.maxT;
      const col = (S.player && archOf(S.player).beam) || '#93c5fd';
      const ex = fx.x + Math.cos(fx.angle) * fx.len, ey = fx.y + Math.sin(fx.angle) * fx.len;
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = col; ctx.lineWidth = 8 * a + 2;
      ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3 * a + 1;
      ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'magiccircle') {
      // 連鎖星爆の発火：回転する魔法陣
      const prog = 1 - fx.t / fx.maxT;
      const a = Math.max(0, fx.t / fx.maxT);
      const R = fx.r * (0.6 + 0.4 * prog);
      ctx.save(); ctx.translate(fx.x, fx.y); ctx.rotate(prog * 3);
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R * 0.66, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 / 6) * i;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * R * 0.66, Math.sin(ang) * R * 0.66);
        ctx.lineTo(Math.cos(ang) * R, Math.sin(ang) * R);
        ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    } else if (fx.kind === 'shock') {
      const alpha = Math.max(0, 1 - fx.r / fx.maxR);
      // 魔法陣アート：シア（射手）＝青／ソフィア（魔導士）＝緑。回転させながら拡大。
      // 他職業・画像未読込時は従来描画（shockwave.png→図形リング）にフォールバック
      const arch = S.player && S.player.archetype;
      const circleSrc = arch === 'gunner' ? 'assets/magic_circle_blue.png'
                      : arch === 'mage'   ? 'assets/magic_circle_green.png' : null;
      const circle = circleSrc ? imageCache.get(circleSrc) : null;
      if (circle && circle.ok && fx.r > 1) {
        ctx.save();
        ctx.translate(fx.x, fx.y);
        ctx.rotate(S.time * 2.2 + fx.r * 0.006); // 拡大しつつゆっくり回転
        ctx.globalAlpha = Math.min(1, alpha + 0.15);
        ctx.drawImage(circle.img, -fx.r, -fx.r, fx.r * 2, fx.r * 2);
        ctx.restore();
        ctx.globalAlpha = 1;
        continue;
      }
      const img = imageCache.get('assets/shockwave.png');
      if (img && img.ok) {
        ctx.globalAlpha = alpha;
        ctx.drawImage(img.img, fx.x - fx.r, fx.y - fx.r, fx.r * 2, fx.r * 2);
        ctx.globalAlpha = 1;
      } else {
        const col = shockColors();
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = col.main;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = alpha * 0.35;
        ctx.strokeStyle = col.glow;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(fx.x, fx.y, fx.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
}

function drawBanner() {
  if (!S.banner) return;
  ctx.globalAlpha = Math.min(1, S.banner.t);
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f87171';
  ctx.fillText(S.banner.text, viewW / 2, viewH * 0.28);
  ctx.globalAlpha = 1;
}

// 進化武器の常設ビジュアル（ビット／大鎌／結界／魔法球）
function drawEvolvedWeapons() {
  const p = S.player;
  // ソフィアの緑の魔法球（貫通）
  for (const o of p.orbs) {
    const rr = (o.r || 16);
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, rr);
    g.addColorStop(0, 'rgba(190,255,200,1)');
    g.addColorStop(0.5, 'rgba(74,222,128,0.85)');
    g.addColorStop(1, 'rgba(34,197,94,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(o.x, o.y, rr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ecfccb';
    ctx.beginPath(); ctx.arc(o.x, o.y, rr * 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // ファンネル／蒼銀ビット
  for (const b of p.bits) {
    if (b.x == null) continue;
    const r = b.evolved ? 13 : 10;
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
    g.addColorStop(0, 'rgba(220,240,255,1)');
    g.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
  }
  // 旋回大鎌の進化＝緑の太い光線が360°を薙ぐ
  if (p.evolvedCore.sweep === 'scythe') {
    const R = 112;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.scytheAngle);
    const grad = ctx.createLinearGradient(0, 0, R, 0);
    grad.addColorStop(0, 'rgba(134,239,172,0.95)');
    grad.addColorStop(1, 'rgba(74,222,128,0)');
    ctx.strokeStyle = grad; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, 0); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,255,240,0.9)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, 0); ctx.stroke();
    ctx.restore();
    // 掃いた残像の弧
    ctx.globalAlpha = 0.25; ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.9, p.scytheAngle - 1.3, p.scytheAngle); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // 月影結界
  if (p.evolvedCore.sweep === 'ward' && p.wardCharges > 0) {
    ctx.globalAlpha = 0.6 + 0.2 * Math.sin(S.time * 6);
    ctx.strokeStyle = '#f9a8d4'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x, p.y, CONFIG.PLAYER.DRAW_W * 0.62, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawEnemyBullets() {
  for (const b of S.enemyBullets) {
    ctx.fillStyle = '#fb7185';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(251,113,133,0.35)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius + 3, 0, Math.PI * 2); ctx.fill();
  }
}

function drawTelegraphs() {
  for (const tg of S.telegraphs) {
    const a = 1 - tg.t / tg.maxT; // 0→1 で満ちる
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(tg.t * 18);
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = '#fecdd3'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(tg.x, tg.y, tg.radius * a, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// 画面外のボス／エリート方向を画面端の矢印で示す
function drawOffscreenArrows() {
  const p = S.player;
  for (const e of S.enemies) {
    if (!ENEMY_TYPES[e.type].isBoss && !e.elite) continue;
    if (e.x >= 0 && e.x <= viewW && e.y >= 0 && e.y <= viewH) continue;
    const ang = Math.atan2(e.y - p.y, e.x - p.x);
    const margin = 26;
    const ex = Math.max(margin, Math.min(viewW - margin, e.x));
    const ey = Math.max(margin, Math.min(viewH - margin, e.y));
    ctx.save();
    ctx.translate(ex, ey); ctx.rotate(ang);
    ctx.fillStyle = ENEMY_TYPES[e.type].isBoss ? '#f43f5e' : '#fbbf24';
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -8); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

// 進化演出（暗転→魔法陣→名前）
function drawEvoCinematic() {
  const c = S.evoCinematic;
  if (!c) return;
  const p = S.player;
  const prog = 1 - c.t / 1.1;            // 0→1
  const dim = Math.min(0.55, prog < 0.25 ? prog / 0.25 * 0.55 : 0.55 * (1 - Math.max(0, (prog - 0.6) / 0.4)));
  ctx.fillStyle = `rgba(6,10,24,${Math.max(0, dim)})`;
  ctx.fillRect(0, 0, viewW, viewH);
  // 魔法陣（回転する二重円＋放射線）
  const R = 60 + prog * 90;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(prog * 4);
  ctx.globalAlpha = Math.max(0, 1 - prog);
  ctx.strokeStyle = '#a5b4fc'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, R * 0.7, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 / 8) * i;
    ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function render() {
  drawBackground();
  if (!S.player) return;
  // 画面シェイク（アリーナ要素だけ揺らす）
  const shaking = S.shake > 0.3;
  if (shaking) {
    ctx.save();
    ctx.translate(rnd(-S.shake, S.shake), rnd(-S.shake, S.shake));
  }
  drawPools();      // 地面の設置物（最下層＝敵やアイテムの下に敷く）
  drawTelegraphs();
  drawPickups();
  drawEffects();
  drawEnemies();
  drawEvolvedWeapons();
  drawPlayer();
  drawBullets();
  drawEnemyBullets();
  drawParticles();
  if (shaking) ctx.restore();
  drawOffscreenArrows();
  drawEvoCinematic();
  drawStick();
  drawBanner();
}

/* ===== HUD 更新 ===== */
function formatTime(sec) {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateHud() {
  const p = S.player;
  ui.hpbar.style.width = `${Math.max(0, p.hp / p.maxHp * 100)}%`;
  ui.hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  ui.xpbar.style.width = `${Math.min(100, p.xp / xpToNext(p.level) * 100)}%`;
  ui.levelText.textContent = `Lv ${p.level}`;
  ui.timerText.textContent = formatTime(S.time);
  ui.coinText.textContent = `🪙 ${S.coins}`;
  ui.killText.textContent = `💥 ${S.kills}`;
}

/* =========================================================
 * 画面遷移（タイトル / レベルアップ / ポーズ / ゲームオーバー）
 * ========================================================= */
function loadBest() {
  try { return JSON.parse(localStorage.getItem(CONFIG.BEST_KEY)) || null; }
  catch { return null; }
}
function saveBest(b) {
  try { localStorage.setItem(CONFIG.BEST_KEY, JSON.stringify(b)); } catch { /* 保存不可でも続行 */ }
}

/* ===== ランキング（ローカル・上位N件） =====
 * スコアは生存時間主体（time*10 + kills*5 + level*20）。
 * 旧セーブ（最長記録1件）は初回に自動マイグレーションして取り込む。 */
function computeScore(rec) {
  return Math.round(rec.time * 10 + rec.kills * 5 + rec.level * 20);
}

function loadRanks() {
  let ranks = [];
  try { ranks = JSON.parse(localStorage.getItem(CONFIG.RANKS_KEY)) || []; }
  catch { ranks = []; }
  if (!Array.isArray(ranks)) ranks = [];
  // 旧セーブのマイグレーション：ランキングが空で旧記録があれば取り込む
  if (ranks.length === 0) {
    const best = loadBest();
    if (best && typeof best.time === 'number') {
      ranks.push({
        id: 'legacy', name: '（旧記録）',
        time: best.time, kills: best.kills || 0, level: best.level || 1,
        score: computeScore({ time: best.time, kills: best.kills || 0, level: best.level || 1 }),
        date: '',
      });
      saveRanks(ranks);
    }
  }
  return ranks;
}

function saveRanks(ranks) {
  try { localStorage.setItem(CONFIG.RANKS_KEY, JSON.stringify(ranks)); } catch { /* 続行 */ }
}

function getPlayerName() {
  try { return localStorage.getItem(CONFIG.NAME_KEY) || 'シア'; } catch { return 'シア'; }
}
function setPlayerName(name) {
  try { localStorage.setItem(CONFIG.NAME_KEY, name); } catch { /* 続行 */ }
}

/* ★スコア確定フック：ここ1箇所で記録を確定する。
 * 現在はローカル保存のみ。将来オンライン共有する時はこの中で
 * サーバ送信（fetch等）を差し込めば良い（呼び出し側は変更不要）。 */
function submitScore(record) {
  const ranks = loadRanks();
  ranks.push(record);
  ranks.sort((a, b) => b.score - a.score);
  const trimmed = ranks.slice(0, CONFIG.RANK_MAX);
  saveRanks(trimmed);
  // 旧キーも最長記録として更新（後方互換）
  const best = loadBest();
  if (!best || record.time > best.time) {
    saveBest({ time: record.time, kills: record.kills, level: record.level });
  }
  const rank = trimmed.findIndex(r => r.id === record.id);
  // TODO(オンライン): ここで submitScoreOnline(record) を呼べば共有できる
  return { rank, ranks: trimmed, listed: rank >= 0 };
}

// ランキング表のHTMLを生成（highlightId のエントリを強調）
function renderRankingHTML(ranks, highlightId) {
  if (!ranks.length) return '<p class="rank-empty">まだ記録がありません</p>';
  const rows = ranks.map((r, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const hl = r.id === highlightId ? ' rank-hl' : '';
    return `<div class="rank-row${hl}">
      <span class="rank-pos">${medal}</span>
      <span class="rank-name">${escapeHtml(r.name)}</span>
      <span class="rank-score">${r.score}</span>
      <span class="rank-sub">${formatTime(r.time)}・${r.kills}体・Lv${r.level}</span>
    </div>`;
  }).join('');
  return `<div class="rank-table">${rows}</div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ===== 左上：取得武器/パッシブ一覧（進化可能なら光る） ===== */
function updateWeaponBar() {
  if (!ui.weaponBar || !S.player) return;
  const p = S.player;
  const evoAvail = availableEvolutions();
  const glowCores = new Set(evoAvail.map(ev => ev.core));      // 光らせるコアID
  const glowPass = new Set(evoAvail.map(ev => ev.passive));
  let html = '';
  // 進化済みの武器
  for (const id of Object.keys(p.evolutions)) {
    const ev = EVOLUTIONS.find(e => e.id === id);
    if (ev) html += `<span class="wb-icon wb-evo" title="${ev.name}">${ev.emoji}</span>`;
  }
  // 取得中の強化（Lv付き）
  for (const u of UPGRADE_POOL) {
    const lv = p.upgradeLevels[u.id] || 0;
    if (lv <= 0) continue;
    if (EVO_GROUP[u.id] && p.evolvedCore[EVO_GROUP[u.id]]) continue; // 進化済みコアは非表示
    const glow = glowCores.has(u.id) || glowPass.has(u.id) ? ' wb-glow' : '';
    html += `<span class="wb-icon${glow}" title="${u.name}">${u.emoji}<b>${lv}</b></span>`;
  }
  ui.weaponBar.innerHTML = html;
}

/* ===== 転生（プレステージ）ショップ ===== */
function prestigePrice(item) {
  const lv = prestigeLv(item.id);
  return lv >= item.max ? null : item.prices[lv];
}

function renderPrestigeShop() {
  const dust = loadStardust();
  if (ui.stardustText) ui.stardustText.textContent = `✨ 星屑：${dust}`;
  if (!ui.prestigeItems) return;
  ui.prestigeItems.innerHTML = '';
  for (const item of PRESTIGE_TREE) {
    const lv = prestigeLv(item.id);
    const price = prestigePrice(item);
    const maxed = price === null;
    const btn = document.createElement('button');
    btn.className = 'shop-item';
    btn.disabled = maxed || dust < price;
    btn.innerHTML = `
      <span class="card-emoji">${item.emoji}</span>
      <span><span class="card-name">${item.name} <span class="pr-lv">Lv${lv}/${item.max}</span></span><br>
        <span class="card-desc">${item.desc}</span></span>
      <span class="price">${maxed ? '✅ MAX' : '✨ ' + price}</span>`;
    if (!maxed) btn.addEventListener('click', () => buyPrestige(item));
    ui.prestigeItems.appendChild(btn);
  }
}

function buyPrestige(item) {
  const dust = loadStardust();
  const price = prestigePrice(item);
  if (price === null || dust < price) return;
  saveStardust(dust - price);
  const pr = loadPrestige();
  pr[item.id] = (pr[item.id] || 0) + 1;
  savePrestige(pr);
  SFX.coin();
  renderPrestigeShop();
}

function showPrestige() {
  if (!ui.prestigeScreen) return;
  renderPrestigeShop();
  ui.prestigeScreen.classList.remove('hidden');
}
function hidePrestige() {
  if (ui.prestigeScreen) ui.prestigeScreen.classList.add('hidden');
}

/* ===== 効果音トグル表示 ===== */
function refreshSfxButtons() {
  const label = SFX.isEnabled() ? '🔊 音ON' : '🔈 音OFF';
  if (ui.sfxToggle) ui.sfxToggle.textContent = SFX.isEnabled() ? '🔊' : '🔈';
  if (ui.sfxToggleTitle) ui.sfxToggleTitle.textContent = label;
}

/* ===== キャラクター選択（スプライトの立ち絵つき） ===== */
// キャラのシート画像（webp→png）を返す。未ロードなら null。
function getCharSheetImg(key) {
  const cs = charSheets[key];
  if (!cs) return null;
  if (cs.webp.ok) return cs.webp.img;
  if (cs.png.ok) return cs.png.img;
  return null;
}
// キャラの idle 先頭コマ（row0,col0＝192×208）をサムネcanvasに描く
function drawCharThumb(cv, key) {
  const ctx2 = cv.getContext('2d');
  ctx2.clearRect(0, 0, cv.width, cv.height);
  const img = getCharSheetImg(key);
  if (img) {
    // 立ち絵：idleフレームを縦長のまま収める
    ctx2.imageSmoothingEnabled = true;
    ctx2.drawImage(img, 0, 0, SPRITE_SHEET.frameW, SPRITE_SHEET.frameH, 0, 0, cv.width, cv.height);
  } else {
    // 未ロード時は絵文字で仮表示
    ctx2.font = `${cv.width * 0.5}px serif`;
    ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle';
    ctx2.fillText(CHARACTERS[key].emoji, cv.width / 2, cv.height / 2);
  }
}

function renderCharSelect() {
  if (!ui.charSelect) return;
  ui.charSelect.innerHTML = '';
  let needRedraw = false;
  for (const [key, ch] of Object.entries(CHARACTERS)) {
    const btn = document.createElement('button');
    btn.className = 'char-card' + (S.selectedCharacter === key ? ' selected' : '');
    const cv = document.createElement('canvas');
    cv.width = 84; cv.height = 91; cv.className = 'char-thumb';
    const label = document.createElement('div');
    label.innerHTML = `<span class="char-name">${ch.emoji} ${ch.name}</span>
      <span class="char-desc">${ch.desc}</span>`;
    btn.appendChild(cv);
    btn.appendChild(label);
    drawCharThumb(cv, key);
    if (!getCharSheetImg(key)) needRedraw = true;
    btn.addEventListener('click', () => { S.selectedCharacter = key; SFX.resume(); renderCharSelect(); });
    ui.charSelect.appendChild(btn);
  }
  // 立ち絵がまだ読めていなければ、ロード後に再描画
  if (needRedraw && S.mode === 'title') setTimeout(renderCharSelect, 250);
}

/* ===== ランキング確認画面 ===== */
function showRankingView() {
  if (!ui.rankingScreen) return;
  if (ui.rankingFull) ui.rankingFull.innerHTML = renderRankingHTML(loadRanks());
  ui.rankingScreen.classList.remove('hidden');
}
function hideRankingView() { if (ui.rankingScreen) ui.rankingScreen.classList.add('hidden'); }

/* ===== 敵モンスター図鑑 ===== */
function showDex() {
  if (!ui.dexScreen) return;
  if (ui.dexItems) {
    const descs = {
      blob: '基本の雑魚。数で押し寄せる。', bat: '素早く脆い。ふらふらと飛ぶ。',
      ghost: '群れで一斉に湧く。', charger: '力を溜めて一気に突進する。',
      slime: '倒すと小スライム2体に分裂する。', slimeMini: '分裂で生まれる小型。',
      archer: '距離を取りながら矢を放つ。', shield: 'とても硬いが動きは遅い。',
      wisp: '素早くジグザグに迫る鬼火。', brute: '大型で高HP・高火力。',
      golem: '動きは遅いが非常に硬い。', boss: '定期出現の強敵。予告攻撃・弾幕・召喚を使う。',
    };
    let html = '';
    for (const [key, t] of Object.entries(ENEMY_TYPES)) {
      html += `<div class="dex-row">
        <span class="dex-emoji">${t.emoji}</span>
        <span><span class="dex-name">${t.name}</span><br><span class="dex-desc">${descs[key] || ''}</span></span>
        <span class="dex-stat">HP${t.hp}・攻${t.dmg}</span>
      </div>`;
    }
    ui.dexItems.innerHTML = html;
  }
  ui.dexScreen.classList.remove('hidden');
}
function hideDex() { if (ui.dexScreen) ui.dexScreen.classList.add('hidden'); }

/* ===== プレイ履歴（時系列一覧） ===== */
function formatDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const p = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function showHistory() {
  if (!ui.historyScreen) return;
  const list = loadHistory();
  if (ui.historyItems) {
    if (!list.length) {
      ui.historyItems.innerHTML = '<p class="rank-empty">まだプレイ履歴がありません</p>';
    } else {
      ui.historyItems.innerHTML = list.map(h => {
        const emoji = (CHARACTERS[h.char] || {}).emoji || '🎮';
        return `<div class="hist-row">
          <span class="hist-emoji">${emoji}</span>
          <span class="hist-main">
            <span class="hist-name">${escapeHtml(h.charName || '')}・${formatTime(h.time)}</span><br>
            <span class="hist-sub">💥${h.kills}体 ⭐Lv${h.level} 🌄${escapeHtml(h.zoneName || '')} ✨${h.dust}</span>
          </span>
          <span class="hist-at">${formatDateTime(h.at)}</span>
        </div>`;
      }).join('');
    }
  }
  ui.historyScreen.classList.remove('hidden');
}
function hideHistory() { if (ui.historyScreen) ui.historyScreen.classList.add('hidden'); }

function showTitle() {
  S.mode = 'title';
  renderCharSelect();
  const ranks = loadRanks();
  ui.bestText.textContent = ranks.length
    ? `🏆 最高スコア：${ranks[0].score}（${escapeHtml(ranks[0].name)}）`
    : 'まだ記録なし — 初プレイ！';
  if (ui.rankingTitle) ui.rankingTitle.innerHTML = renderRankingHTML(ranks.slice(0, 5));
  if (ui.prestigeBtn) ui.prestigeBtn.textContent = `🌌 転生（✨${loadStardust()}）`;
  refreshSfxButtons();
  ui.titleScreen.classList.remove('hidden');
  ui.hud.classList.add('hidden');
  // 途中で戻ってきた場合に備え、ラン中のオーバーレイは確実に閉じる
  ui.levelupScreen.classList.add('hidden');
  ui.pauseScreen.classList.add('hidden');
}

function startGame() {
  SFX.resume(); // ユーザー操作を機に音を有効化
  S.mode = 'playing';
  S.time = 0; S.kills = 0; S.coins = 0; S.bossKills = 0;
  S.zone = 0; S.bossRushTimer = 0;
  S.spawnTimer = 0.5; S.bossTimer = 0;
  S.hitStop = 0; S.evoCinematic = null; S.banishMode = false;
  S.player = createPlayer();
  S.enemies = []; S.bullets = []; S.pickups = []; S.particles = []; S.effects = [];
  S.pools = [];
  S.enemyBullets = []; S.telegraphs = [];
  S.shopBought = {}; S.banner = null; S.shake = 0;
  ui.titleScreen.classList.add('hidden');
  ui.gameoverScreen.classList.add('hidden');
  ui.levelupScreen.classList.add('hidden');
  ui.pauseScreen.classList.add('hidden');
  if (ui.prestigeScreen) ui.prestigeScreen.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  updateWeaponBar();
  lastTime = performance.now(); // dt の飛びを防ぐ
  // 開始ブースト（転生）：開始時に即レベルアップ選択
  const boost = S.player.pendingStartLevels || 0;
  S.player.pendingStartLevels = 0;
  if (boost > 0) {
    S.player.level += boost;
    showLevelUp();
  }
}

/* --- 進化候補：条件を満たす進化を返す --- */
function availableEvolutions() {
  const p = S.player;
  if (p.evoCount >= evoMaxPerRun()) return [];
  const baseReq = evoPassiveReq();
  // ピティ：Lv16以降まだ1度も進化していなければ条件を1段緩めて確実に届かせる
  const pity = (p.level >= 16 && p.evoCount === 0) ? 1 : 0;
  const coreReq = Math.max(2, CONFIG.EVO_CORE_REQ - pity);
  return EVOLUTIONS.filter(ev => {
    if (ev.char && ev.char !== p.character) return false;        // キャラ限定進化
    if (p.evolutions[ev.id]) return false;                       // 取得済み
    const group = EVO_GROUP[ev.core];
    if (p.evolvedCore[group]) return false;                      // 同コアは進化済み
    if (upLv(ev.core) < coreReq) return false;                   // コアLv不足（Maxでなくても届く）
    // 進化研究＋ピティで必要Lvが下がる。ev.passiveReq があればそれを基準に。
    const req = Math.max(1, (ev.passiveReq != null ? ev.passiveReq : baseReq) - (prestigeLv('evo') >= 2 ? 1 : 0) - pity);
    if (upLv(ev.passive) < req) return false;                    // パッシブ不足
    return true;
  });
}

/* --- 通常強化候補（バニッシュ・進化済みコア・キャラ制限を除外＋モメンタム重み付け） ---
 * すでに投資したカードや、進化コア/その素材パッシブを優先提示して
 * 「1ランで確実に進化へ届く」ビルド収束を助ける。 */
function pickUpgradeChoices() {
  const p = S.player;
  // 進化に関わるID（コア＆素材パッシブ）を集める＝優先度を上げる対象
  const evoRelevant = new Set();
  for (const ev of EVOLUTIONS) {
    if (ev.char && ev.char !== p.character) continue;
    if (p.evolvedCore[EVO_GROUP[ev.core]]) continue;
    evoRelevant.add(ev.core); evoRelevant.add(ev.passive);
  }
  const available = UPGRADE_POOL.filter(u => {
    if ((p.upgradeLevels[u.id] || 0) >= u.max) return false;
    if (p.bannedIds[u.id]) return false;
    if (u.archs && !u.archs.includes(p.archetype)) return false;         // 職業限定カード（貫通=射手のみ 等）
    if (u.id === 'range' && p.character === 'sophia') return false;      // ソフィアの射程はファンネルに統合
    if (EVO_GROUP[u.id] && p.evolvedCore[EVO_GROUP[u.id]]) return false; // 進化済みコアは除外
    return true;
  });
  // 重み付き抽選：既に取ったカード＋進化関連を厚めに（進化へ確実に届くよう収束を促す）
  const weighted = available.map(u => {
    let w = 1;
    const lv = p.upgradeLevels[u.id] || 0;
    if (lv > 0) w += 2.4;                 // モメンタム（ビルド収束）
    if (evoRelevant.has(u.id)) w += 2.0;  // 進化への導線（コア＆素材パッシブ）
    if (u.id === 'speed' || u.id === 'magnet') w *= 0.6; // 純ユーティリティは控えめ
    return { u, w };
  });
  // 重み付きシャッフル（Efraimidis–Spirakis）
  return weighted
    .map(x => ({ u: x.u, k: Math.pow(Math.random(), 1 / x.w) }))
    .sort((a, b) => b.k - a.k)
    .map(x => x.u);
}

/* --- レベルアップ選択肢を組み立て --- */
// 進化（昇格）候補は「レベル4ごと（Lv4/8/12…）」だけ提示する
function isEvolutionLevel() {
  return (S.player.level % CONFIG.EVO_EVERY_LEVELS) === 0;
}

function buildLevelChoices() {
  const CHOICES = 4; // レベルアップの選択肢は4択（2026-07-04 3択→4択）
  const cards = [];
  if (isEvolutionLevel()) {
    const evos = availableEvolutions().sort(() => Math.random() - 0.5);
    // 進化研究Lv1以上で出現率アップ（=最大2枠まで進化提示）
    const evoSlots = prestigeLv('evo') >= 1 ? 2 : 1;
    for (const ev of evos) { cards.push({ kind: 'evo', ev }); if (cards.length >= evoSlots) break; }
  }
  for (const u of pickUpgradeChoices()) { if (cards.length >= CHOICES) break; cards.push({ kind: 'up', up: u }); }
  return cards.slice(0, CHOICES);
}

/* --- レベルアップの直列化 ---
 * 同一フレームに複数ジェム/マグネットでXPが一気に溜まっても、選択画面は必ず
 * 「1レベルずつ」提示する。既に選択中(levelup)ならXPを貯めるだけにして、
 * chooseCard() 側の余剰XP再チェックで次のレベルを順番に消費する。
 * これで選択肢の上書き（＝選択権の喪失）を防ぐ。 */
function maybeLevelUp() {
  const p = S.player;
  if (S.mode === 'levelup') return; // 選択中は積むだけ（chooseCardが順次処理）
  if (p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level += 1;
    showLevelUp();
  }
}

function showLevelUp() {
  S.mode = 'levelup';
  S.player.animTime = 0; // wavingアニメを頭から
  addLevelUpParticles(S.player.x, S.player.y);
  SFX.levelup();
  renderLevelUp(buildLevelChoices());
  ui.levelupScreen.classList.remove('hidden');
}

function renderLevelUp(choices) {
  const p = S.player;
  ui.upgradeCards.innerHTML = '';
  if (choices.length === 0) {
    S.coins += 30;
    addDamageText(p.x, p.y - 40, '+30🪙', '#fbbf24');
    resumeFromLevelUp();
    return;
  }
  for (const c of choices) {
    const btn = document.createElement('button');
    if (c.kind === 'evo') {
      btn.className = 'upgrade-card evo-card';
      btn.innerHTML = `
        <span class="card-emoji">${c.ev.emoji}</span>
        <span><span class="card-name">✦進化✦ ${c.ev.name}</span><br>
          <span class="card-desc">${c.ev.desc}</span>
          <span class="evo-tag">🧩 ${c.ev.material}</span></span>`;
      btn.addEventListener('click', () => { if (S.banishMode) return; chooseCard(c); });
    } else {
      const lv = p.upgradeLevels[c.up.id] || 0;
      const lvLabel = c.up.max === 1 ? '取得' : `Lv ${lv} → ${lv + 1}`;
      btn.className = 'upgrade-card';
      btn.innerHTML = `
        <span class="card-emoji">${c.up.emoji}</span>
        <span><span class="card-name">${c.up.name}</span><br><span class="card-desc">${cardDesc(c.up)}</span></span>
        <span class="card-lv">${lvLabel}</span>`;
      btn.addEventListener('click', () => chooseCard(c));
    }
    ui.upgradeCards.appendChild(btn);
  }
  renderLevelControls(choices);
}

// リロール／バニッシュ操作
function renderLevelControls(choices) {
  if (!ui.levelupControls) return;
  const p = S.player;
  ui.levelupControls.innerHTML = '';
  if (p.rerollsLeft > 0) {
    const b = document.createElement('button');
    b.className = 'lv-ctrl';
    b.textContent = `🔀 リロール（残${p.rerollsLeft}）`;
    b.addEventListener('click', () => { p.rerollsLeft -= 1; S.banishMode = false; renderLevelUp(buildLevelChoices()); });
    ui.levelupControls.appendChild(b);
  }
  if (p.banishLeft > 0) {
    const b = document.createElement('button');
    b.className = 'lv-ctrl' + (S.banishMode ? ' active' : '');
    b.textContent = S.banishMode ? '🚫 消す強化を選んで' : `🚫 バニッシュ（残${p.banishLeft}）`;
    b.addEventListener('click', () => { S.banishMode = !S.banishMode; renderBanishState(choices); });
    ui.levelupControls.appendChild(b);
  }
}

// バニッシュ待機中はカードをクリックで消せるよう差し替え
function renderBanishState(choices) {
  const cards = ui.upgradeCards.querySelectorAll('.upgrade-card');
  choices.forEach((c, i) => {
    const el = cards[i];
    if (!el) return;
    el.classList.toggle('banish-target', S.banishMode && c.kind === 'up');
  });
  // クリック挙動を張り替え
  choices.forEach((c, i) => {
    const el = cards[i];
    if (!el) return;
    el.onclick = () => {
      if (S.banishMode) {
        if (c.kind !== 'up') return;               // 進化はバニッシュ不可
        S.player.bannedIds[c.up.id] = true;
        S.player.banishLeft -= 1;
        S.banishMode = false;
        renderLevelUp(buildLevelChoices());
      } else {
        chooseCard(c);
      }
    };
  });
  renderLevelControls(choices);
}

function chooseCard(c) {
  const p = S.player;
  S.banishMode = false;
  if (c.kind === 'evo') { doEvolve(c.ev); }
  else {
    c.up.apply(p);
    p.upgradeLevels[c.up.id] = (p.upgradeLevels[c.up.id] || 0) + 1;
  }
  // 余剰XPで連続レベルアップ
  if (p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level += 1;
    showLevelUp();
    return;
  }
  resumeFromLevelUp();
}

// 進化を実行（元Lv引き継ぎ・コア消費・演出）
function doEvolve(ev) {
  const p = S.player;
  p.evolutions[ev.id] = true;
  p.evoCount += 1;
  p.evolvedCore[EVO_GROUP[ev.core]] = ev.id;
  // 武器別の初期化
  if (ev.id === 'railgun') p.railTimer = 2.0;
  if (ev.id === 'scythe') { p.scytheAngle = 0; p.scytheRingTimer = 2.0; }
  if (ev.id === 'ward') { p.wardTimer = 0.1; p.wardCharges = 0; }
  if (ev.id === 'bits') p.bits = [];
  // 演出：暗転→魔法陣→バナー＋音＋ヒットストップ
  S.evoCinematic = { t: 1.1, name: ev.name, emoji: ev.emoji };
  SFX.evolve();
  hitStop(80);
  S.shake = Math.max(S.shake, 8);
  S.banner = { text: `✦ ${ev.emoji} ${ev.name} ✦`, t: 2.2 };
}

function resumeFromLevelUp() {
  ui.levelupScreen.classList.add('hidden');
  S.mode = 'playing';
  lastTime = performance.now();
}

/* --- 一時停止＆ショップ --- */
function shopPrice(item) {
  const bought = S.shopBought[item.id] || 0;
  return Math.round(item.basePrice * Math.pow(1.35, bought));
}

function renderShop() {
  ui.shopItems.innerHTML = '';
  for (const item of SHOP_ITEMS) {
    const price = shopPrice(item);
    const btn = document.createElement('button');
    btn.className = 'shop-item';
    btn.disabled = S.coins < price;
    btn.innerHTML = `
      <span class="card-emoji">${item.emoji}</span>
      <span><span class="card-name">${item.name}</span><br><span class="card-desc">${item.desc}</span></span>
      <span class="price">🪙 ${price}</span>`;
    btn.addEventListener('click', () => {
      if (S.coins < price) return;
      S.coins -= price;
      S.shopBought[item.id] = (S.shopBought[item.id] || 0) + 1;
      item.apply(S.player);
      updateHud();
      renderShop(); // 値段・購入可否を更新
    });
    ui.shopItems.appendChild(btn);
  }
}

// ラン中に取得した強化/武器の一覧（Lv付き）
function renderAcquiredCards() {
  const el = document.getElementById('acquired-cards');
  if (!el || !S.player) return;
  const p = S.player;
  let html = '';
  for (const id of Object.keys(p.evolutions)) {
    const ev = EVOLUTIONS.find(e => e.id === id);
    if (ev) html += `<span class="wb-icon wb-evo" title="${ev.name}">${ev.emoji}</span>`;
  }
  for (const u of UPGRADE_POOL) {
    const lv = p.upgradeLevels[u.id] || 0;
    if (lv <= 0) continue;
    if (EVO_GROUP[u.id] && p.evolvedCore[EVO_GROUP[u.id]]) continue;
    html += `<span class="wb-icon" title="${u.name}">${u.emoji}<b>${u.max === 1 ? '✓' : lv}</b></span>`;
  }
  el.innerHTML = html || '<span class="dex-desc">まだ強化なし</span>';
}

function togglePause() {
  if (S.mode === 'playing') {
    S.mode = 'paused';
    renderShop();
    renderAcquiredCards();
    ui.pauseScreen.classList.remove('hidden');
  } else if (S.mode === 'paused') {
    ui.pauseScreen.classList.add('hidden');
    S.mode = 'playing';
    lastTime = performance.now();
  }
}

/* --- ゲームオーバー --- */
let lastRecord = null; // 直近の記録（名前編集で再保存するため保持）

function gameOver() {
  S.mode = 'gameover';
  const p = S.player;
  const score = computeScore({ time: S.time, kills: S.kills, level: p.level });
  // 星屑（転生通貨）を付与＝周回で強くなる
  const dustGain = computeStardust(S.coins, S.time, S.bossKills);
  saveStardust(loadStardust() + dustGain);
  // プレイ履歴を保存（時系列）
  pushHistory({
    char: p.character,
    charName: (CHARACTERS[p.character] || {}).name || p.character,
    time: Math.round(S.time), kills: S.kills, level: p.level,
    zone: S.zone, zoneName: (ZONES[S.zone] || {}).name || '', dust: dustGain,
    score, at: new Date().toISOString(),
  });
  if (ui.stardustGain) ui.stardustGain.textContent = `✨ 獲得星屑：+${dustGain}（累計 ${loadStardust()}）`;
  ui.resultStats.innerHTML = `
    🎯 スコア：<b>${score}</b><br>
    ⏱ 生存時間：<b>${formatTime(S.time)}</b><br>
    💥 撃破数：<b>${S.kills}</b>体（ボス ${S.bossKills}）<br>
    ⭐ 到達レベル：<b>Lv ${p.level}</b><br>
    🪙 集めたコイン：<b>${S.coins}</b>`;

  // 記録を作って submitScore フックで確定（ローカル保存）
  lastRecord = {
    id: 'r' + Date.now() + '_' + Math.floor(Math.random() * 1e4),
    name: getPlayerName(),
    time: S.time, kills: S.kills, level: p.level, score,
    date: new Date().toISOString().slice(0, 10),
  };
  const result = submitScore(lastRecord);

  // ランクインしたか表示
  if (result.listed && result.rank === 0) {
    ui.newrecordText.textContent = '🏆 新記録！ 堂々の1位！';
    ui.newrecordText.classList.remove('hidden');
  } else if (result.listed) {
    ui.newrecordText.textContent = `🎉 ランキング ${result.rank + 1} 位にランクイン！`;
    ui.newrecordText.classList.remove('hidden');
  } else {
    ui.newrecordText.classList.add('hidden');
  }

  // 名前入力欄をセット
  if (ui.nameInput) ui.nameInput.value = getPlayerName();
  renderGameoverRanking();
  ui.gameoverScreen.classList.remove('hidden');
}

function renderGameoverRanking() {
  const ranks = loadRanks();
  if (ui.rankingGameover) {
    ui.rankingGameover.innerHTML = renderRankingHTML(ranks, lastRecord ? lastRecord.id : null);
  }
}

// 名前を保存 → 直近記録の名前を更新して再保存＆再描画
function saveNameAndUpdate() {
  if (!ui.nameInput) return;
  let name = (ui.nameInput.value || '').trim().slice(0, 12) || 'シア';
  setPlayerName(name);
  if (lastRecord) {
    const ranks = loadRanks();
    const entry = ranks.find(r => r.id === lastRecord.id);
    if (entry) { entry.name = name; saveRanks(ranks); }
    lastRecord.name = name;
  }
  renderGameoverRanking();
  if (ui.newrecordText && !ui.newrecordText.classList.contains('hidden')) { /* そのまま */ }
}

/* ===== フィードバック受付 =====
 * ★送信フック：submitFeedback(text) の1箇所で確定する。
 * 現在は localStorage（CONFIG.FEEDBACK_KEY）へ蓄積するのみ。
 * 将来オンライン送信する時はこの中で fetch 等を差し込めば良い
 * （呼び出し側・UIは変更不要）。 */
function loadFeedback() {
  try { const l = JSON.parse(localStorage.getItem(CONFIG.FEEDBACK_KEY)); return Array.isArray(l) ? l : []; }
  catch { return []; }
}
function submitFeedback(text) {
  const entry = { text: String(text).slice(0, 1000), at: new Date().toISOString(), name: getPlayerName() };
  const list = loadFeedback();
  list.push(entry);
  try { localStorage.setItem(CONFIG.FEEDBACK_KEY, JSON.stringify(list.slice(-50))); } catch { return false; }
  // オンライン送信：Googleフォームの回答へ送る（no-corsで投げっぱなし。失敗してもローカルには残る）
  try {
    if (CONFIG.FEEDBACK_FORM_URL && CONFIG.FEEDBACK_FORM_ENTRY) {
      const body = new URLSearchParams();
      const who = entry.name ? `[${entry.name}] ` : ''; // 名前があれば本文頭に付与（フォームは1フィールド）
      body.append(CONFIG.FEEDBACK_FORM_ENTRY, who + entry.text);
      fetch(CONFIG.FEEDBACK_FORM_URL, { method: 'POST', mode: 'no-cors', body }).catch(() => {});
    }
  } catch { /* 送信失敗はローカル保存で担保 */ }
  return true;
}
function showFeedback() {
  if (!ui.feedbackScreen) return;
  if (ui.feedbackThanks) ui.feedbackThanks.classList.add('hidden');
  if (ui.feedbackSend) ui.feedbackSend.disabled = false;
  ui.feedbackScreen.classList.remove('hidden');
  if (ui.feedbackText) ui.feedbackText.focus();
}
function hideFeedback() { if (ui.feedbackScreen) ui.feedbackScreen.classList.add('hidden'); }
function handleFeedbackSend() {
  const text = (ui.feedbackText && ui.feedbackText.value || '').trim();
  if (!text) return; // 空は送らない
  if (submitFeedback(text)) {
    ui.feedbackText.value = '';
    if (ui.feedbackThanks) ui.feedbackThanks.classList.remove('hidden'); // 御礼表示
    if (ui.feedbackSend) ui.feedbackSend.disabled = true;                // 連打防止
    SFX.coin();
    setTimeout(() => { if (ui.feedbackSend) ui.feedbackSend.disabled = false; }, 1200);
  }
}

/* ===== ボタン類 ===== */
/* HUD内ボタン（ゲーム中に表示＝プレイ中に押す）用のタップ束縛。
 * ★モバイル多点タッチ対策：移動でジョイスティックを掴んでいる指がある状態で
 *   別の指でHUDボタンを押すと、その“2本目の指”では click が合成されず反応しない。
 *   そこで touchstart でも発火させ、合成clickの二重発火は preventDefault で抑止する。 */
function bindHudTap(el, fn) {
  if (!el) return;
  let touched = false;
  el.addEventListener('touchstart', (e) => {
    touched = true;
    if (e.cancelable) e.preventDefault(); // 合成clickを抑止（二重発火防止）
    e.stopPropagation();                   // ジョイスティック等へ伝播させない
    fn();
  }, { passive: false });
  el.addEventListener('click', () => {
    if (touched) { touched = false; return; } // touchで処理済みなら無視
    fn();
  });
}
ui.startBtn.addEventListener('click', startGame);
ui.retryBtn.addEventListener('click', startGame);
ui.resumeBtn.addEventListener('click', togglePause);
bindHudTap(ui.pauseBtn, () => { if (S.mode === 'playing' || S.mode === 'paused') togglePause(); });
if (ui.nameSave) ui.nameSave.addEventListener('click', saveNameAndUpdate);
if (ui.nameInput) ui.nameInput.addEventListener('change', saveNameAndUpdate);
if (ui.prestigeBtn) ui.prestigeBtn.addEventListener('click', showPrestige);
if (ui.prestigeClose) ui.prestigeClose.addEventListener('click', hidePrestige);
if (ui.rankingBtn) ui.rankingBtn.addEventListener('click', showRankingView);
if (ui.rankingClose) ui.rankingClose.addEventListener('click', hideRankingView);
if (ui.dexBtn) ui.dexBtn.addEventListener('click', showDex);
if (ui.dexClose) ui.dexClose.addEventListener('click', hideDex);
if (ui.feedbackBtn) ui.feedbackBtn.addEventListener('click', showFeedback);
if (ui.feedbackClose) ui.feedbackClose.addEventListener('click', hideFeedback);
if (ui.feedbackSend) ui.feedbackSend.addEventListener('click', handleFeedbackSend);
// 一時停止→ホーム（タイトル）へ戻る（ランは破棄）
if (ui.pauseHomeBtn) ui.pauseHomeBtn.addEventListener('click', () => {
  ui.pauseScreen.classList.add('hidden');
  showTitle();
});
if (ui.historyBtn) ui.historyBtn.addEventListener('click', showHistory);
if (ui.historyClose) ui.historyClose.addEventListener('click', hideHistory);
// ゲームオーバー→ホーム（タイトル）へ戻る
if (ui.homeBtn) ui.homeBtn.addEventListener('click', () => { ui.gameoverScreen.classList.add('hidden'); showTitle(); });
bindHudTap(ui.sfxToggle, () => { SFX.toggle(); refreshSfxButtons(); }); // ゲーム中の音量ボタンも多点タッチ対策
if (ui.sfxToggleTitle) ui.sfxToggleTitle.addEventListener('click', () => { SFX.toggle(); refreshSfxButtons(); });

/* =========================================================
 * メインループ
 * ========================================================= */
let lastTime = performance.now();

let wbTick = 0; // 武器バー更新の間引き用

function tick(now) {
  let dt = Math.min((now - lastTime) / 1000, 0.05); // タブ復帰時の暴発防止
  lastTime = now;

  // 進化演出タイマー（常に進める）
  if (S.evoCinematic) { S.evoCinematic.t -= dt; if (S.evoCinematic.t <= 0) S.evoCinematic = null; }

  // ヒットストップ中は世界を止める（描画は続ける＝手触りの“溜め”）
  if (S.hitStop > 0) {
    S.hitStop -= dt;
    render();
    requestAnimationFrame(tick);
    return;
  }

  if (S.mode === 'playing') {
    S.time += dt;
    updatePlayer(dt);
    if (S.mode === 'playing') { // updatePlayer中にgameOverはしない（敵接触で判定）
      updateSpawning(dt);
      updateEnemies(dt);
    }
    if (S.mode === 'playing') { updateTelegraphs(dt); updateEnemyBullets(dt); }
    if (S.mode === 'playing' || S.mode === 'levelup') {
      updateWeapon(dt);
      updateFunnels(dt);
      updateEvoAura(dt);
      updateSweep(dt);
      updateShock(dt);
      updatePools(dt); // 設置物（毒沼・トラップ等）— 未接続だとS.poolsが溜まり続けるので必ず呼ぶ
      updateBullets(dt);
      updateEffects(dt);
      updatePickups(dt);
    }
    updateParticles(dt);
    if (S.banner) { S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }
    if (S.shake > 0) S.shake = Math.max(0, S.shake - S.shake * CONFIG.SHAKE_DECAY * dt - dt * 2);
    updateHud();
    if ((wbTick += dt) > 0.25) { wbTick = 0; updateWeaponBar(); }
  } else if (S.mode === 'levelup' || S.mode === 'gameover') {
    // 選択中・リザルト中はアニメ／描画タイマーだけ進める（敵へのダメージ判定はしない）
    if (S.player) S.player.animTime += dt;
    updateEffects(dt, true);
    updateParticles(dt);
    if (S.shake > 0) S.shake = Math.max(0, S.shake - S.shake * CONFIG.SHAKE_DECAY * dt - dt * 2);
  }

  render();
  requestAnimationFrame(tick);
}

/* ===== 起動 ===== */
showTitle();
requestAnimationFrame(tick);
