const game = (() => {
/** Flora Keep browser rules, ported from the Android GameEngine.
 * All timestamps are epoch milliseconds; growth is 0..1, moisture/health 0..100.
 * Functions never mutate their inputs. Persistence belongs to the application.
 */
const CATALOG = Object.freeze([
  { id: 'daisy', name: 'Ромашка', latinName: 'Matricaria chamomilla', fact: 'То, что выглядит одним цветком ромашки, — соцветие из множества маленьких цветков.', price: 300, growthHours: 6, incomePerHour: 80, color: '#f4cd53' },
  { id: 'lavender', name: 'Лаванда', latinName: 'Lavandula angustifolia', fact: 'У лаванды узкие листья, а небольшие цветки собраны в колосовидные соцветия.', price: 600, growthHours: 8, incomePerHour: 110, color: '#a78bcd' },
  { id: 'sunflower', name: 'Подсолнечник', latinName: 'Helianthus annuus', fact: 'Молодые подсолнечники поворачиваются вслед за солнцем. Зрелые соцветия обычно обращены на восток.', price: 900, growthHours: 12, incomePerHour: 150, color: '#f0b83e' },
  { id: 'tulip', name: 'Тюльпан', latinName: 'Tulipa gesneriana', fact: 'Тюльпан — луковичное растение: в луковице хранится запас питательных веществ для нового роста.', price: 1200, growthHours: 16, incomePerHour: 180, color: '#e38b91' },
  { id: 'mint', name: 'Мята', latinName: 'Mentha spicata', fact: 'У мяты супротивные листья: два листа растут напротив друг друга на одном уровне стебля.', price: 1500, growthHours: 20, incomePerHour: 220, color: '#79b995' },
  { id: 'cactus', name: 'Кактус', latinName: 'Mammillaria elongata', fact: 'У кактусов колючки растут из ареол — небольших участков на стебле. В мясистом стебле запасается влага.', price: 1900, growthHours: 24, incomePerHour: 260, color: '#81a77a' },
  { id: 'rose', name: 'Роза', latinName: 'Rosa gallica', fact: 'То, что обычно называют шипами розы, ботаники называют шипиками: это выросты наружных тканей стебля.', price: 2500, growthHours: 36, incomePerHour: 330, color: '#ca769b' },
  { id: 'monstera', name: 'Монстера', latinName: 'Monstera deliciosa', fact: 'У молодых листьев монстеры края обычно цельные. По мере взросления появляются характерные прорези и отверстия.', price: 3200, growthHours: 48, incomePerHour: 420, color: '#4a8b6a' },
  { id: 'fern', name: 'Папоротник', latinName: 'Nephrolepis exaltata', fact: 'Лист папоротника называют вайей; у нефролеписа он разделён на множество небольших сегментов.', price: 1100, growthHours: 14, incomePerHour: 165, color: '#78a271' },
  { id: 'orchid', name: 'Орхидея', latinName: 'Phalaenopsis', fact: 'Многие фаленопсисы — эпифиты: в природе они используют другие растения как опору.', price: 2100, growthHours: 28, incomePerHour: 290, color: '#d0a3cb' },
  { id: 'aloe', name: 'Алоэ', latinName: 'Aloe vera', fact: 'Мясистые листья алоэ собираются в розетку и содержат запасающую воду ткань.', price: 1350, growthHours: 18, incomePerHour: 200, color: '#91ad82' },
].map(s => Object.freeze({ ...s,
  category: ['mint', 'monstera', 'fern'].includes(s.id) ? 'leaves' : ['cactus', 'aloe'].includes(s.id) ? 'succulents' : 'flowers',
  waterPerHour: ({daisy:4,lavender:3,sunflower:4.5,tulip:3.5,mint:5,cactus:1.5,rose:4,monstera:3,fern:5.5,orchid:2.5,aloe:1.8})[s.id],
})));

const MAX_PLANTS = 100;
const WELL_COOLDOWN_MS = 30 * 60 * 1000;
const OFFLINE_CAP_MS = 24 * 60 * 60 * 1000;
const BOOST_DURATION_MS = 4 * 60 * 60 * 1000;
const WATER_PRICE = 250;
const FERTILIZER_PRICE = 350;
const SUPER_FERTILIZER_PRICE = 1000;
const PROPAGATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const RECOVERY_DURATION_MS = 2 * 60 * 60 * 1000;
const REPOT_PRICE = 200;
const CATALOG_DOCUMENT = Object.freeze({ format: 'FloraKeepCatalog', version: 1, species: CATALOG });
const MAX_COINS = 2147483647;
const HOUR_MS = 3600000;
const STEP_MS = 5 * 60 * 1000;
const BOUNDARY_EPSILON = 1e-9;
const MULCH_DURATION_MS = 8 * HOUR_MS;
const DEFAULT_ENVIRONMENT = Object.freeze({water:1, growth:1});
const SITES = Object.freeze({center: {water:1, growth:1}, window: {water:1.2, growth:1.15}, shade: {water:.85, growth:.9}});
const SUBSTRATES = Object.freeze({standard: {water:1, growth:1}, porous: {water:1.15, growth:1.1}, retaining: {water:.8, growth:.9}});
const speciesById = new Map(CATALOG.map(species => [species.id, species]));
const { min, max, ceil, abs } = Math;
const clamp = (value, low, high) => max(low, min(high, value));
const success = (state, message) => ({ state, message, success: true });
const failure = (state, message) => ({ state, message, success: false });
const safeIdentity = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value) && !['__proto__','constructor','prototype'].includes(value);

function initialState(_now = Date.now()) {
  return { coins: 1500, water: 5, fertilizer: 2, superFertilizer: 0, plants: [], discovered: [], lastWellAt: 0, selectedPlantId: null, researchBySpecies: {}, careProfile: 'classic', vacationUntil: 0, vacationStartedAt: 0, vacationUpdatedAt: 0, claimedTasks: [], importedPlantIds: [] };
}

function researchLevel(state, speciesId) {
  return min(5, Math.floor(max(0, researchCare(state, speciesId)) / 3));
}

function researchCare(state, speciesId) {
  const recorded = state.researchBySpecies[speciesId];
  if (recorded != null) return recorded;
  let care = 0;
  for (const plant of state.plants) if (plant.speciesId === speciesId) care += plant.research;
  return care;
}

function incomePerHour(state, species) {
  return species.incomePerHour * (1 + researchLevel(state, species.id) * .1);
}

function price(state, speciesId) {
  const species = speciesById.get(speciesId);
  if (!species) return null;
  if (!state.discovered.length && !state.plants.length) return 0;
  return Math.trunc(species.price * (1 + researchLevel(state, speciesId) * 0.1));
}

function needsWater(specimen) { return specimen.moisture <= 70 + BOUNDARY_EPSILON; }

/** Simulate at most the first 24 hours, then discard the rest of an absence.
 * Splitting at drying and boost expiry preserves their exact boundaries.
 */
function environment(profile, specimen) {
  if (profile !== 'studio') return DEFAULT_ENVIRONMENT;
  const site = SITES[specimen.site] || SITES.center;
  const substrate = SUBSTRATES[specimen.substrate] || SUBSTRATES.standard;
  return {water:site.water * substrate.water, growth:site.growth * substrate.growth};
}

function specimenWaterRate(profile, specimen, species, modifiers) {
  const base = profile === 'natural' || profile === 'studio' ? species.waterPerHour : 4;
  return base * (specimen.potSize === 2 ? .8 : 1) * modifiers.water;
}

function waterRate(state, specimen) {
  const profile = state.careProfile;
  return specimenWaterRate(profile, specimen, speciesById.get(specimen.speciesId), environment(profile, specimen));
}

function dryingHours(specimen, rate, moistureToLose, now) {
  const mulchHours = Math.max(0, (specimen.mulchUntil || 0) - now) / HOUR_MS;
  const coveredHours = Math.min(mulchHours, Math.max(0, moistureToLose) / (rate * .7));
  return coveredHours + Math.max(0, moistureToLose - coveredHours * rate * .7) / rate;
}

function advanceSpecimen(profile, original, species, now, vacationEnd, vacationStart, hourlyIncome) {
  const paused = max(0, min(now, vacationEnd) - max(original.lastUpdated, vacationStart));
  // Vacation starts after all specimens are advanced. Imported timestamps may
  // predate the pause, so only the overlapping interval suspends care timers.
  const activeStart = original.lastUpdated + paused;
  const end = activeStart + min(max(0, now - activeStart), OFFLINE_CAP_MS);
  const boostExpiry = original.boostUntil > original.lastUpdated ? original.boostUntil + paused : original.boostUntil;
  const recoveryExpiry = (original.recoveryUntil || 0) > original.lastUpdated ? original.recoveryUntil + paused : original.recoveryUntil || 0;
  const mulchExpiry = (original.mulchUntil || 0) > original.lastUpdated ? original.mulchUntil + paused : 0;
  let time = activeStart;
  let growth = clamp(original.growth, 0, 1);
  let moisture = clamp(original.moisture, 0, 100);
  let health = clamp(original.health, 0, 100);
  let earned = max(0, original.earned);
  let matureHours = original.matureHours || 0;
  const modifiers = environment(profile, original);
  const baseRate = specimenWaterRate(profile, original, species, modifiers);
  const mulchedRate = baseRate * .7;
  const hasBoost = original.boost > 1;
  const boostedGrowth = modifiers.growth * clamp(original.boost, 1, 2.5);
  while (time < end) {
    // Expirations are applied below. With no water or health, this specimen's
    // growth, income and condition cannot change during the rest of the step.
    if (moisture === 0 && health === 0) break;
    let step = min(STEP_MS, end - time);
    const boosted = hasBoost && boostExpiry > time;
    const recovering = recoveryExpiry > time;
    const mulched = mulchExpiry > time;
    const rate = mulched ? mulchedRate : baseRate;
    if (boosted) step = min(step, boostExpiry - time);
    if (recovering) step = min(step, recoveryExpiry - time);
    if (mulched) step = min(step, mulchExpiry - time);
    if (moisture > 0) step = min(step, max(1, ceil(moisture / rate * HOUR_MS)));
    const hours = step / HOUR_MS;
    // Recovery only applies during the simulated wet part of the absence.
    if (recovering && moisture > .000001) health = min(100, health + hours * 25);
    if (moisture > .000001 && health > 0) {
      const multiplier = boosted ? boostedGrowth : modifiers.growth;
      const hoursUntilMature = (1 - growth) * species.growthHours / multiplier;
      const adultHours = max(0, hours - hoursUntilMature);
      growth = min(1, growth + hours * multiplier / species.growthHours);
      if (growth >= 1 - BOUNDARY_EPSILON) growth = 1;
      earned += adultHours * hourlyIncome;
      matureHours += adultHours;
    } else if (moisture <= .000001) {
      health = max(0, health - hours * 8);
    }
    moisture = max(0, moisture - hours * rate);
    if (moisture < .000001) moisture = 0;
    time += step;
  }
  if (abs(moisture - 70) <= BOUNDARY_EPSILON) moisture = 70;
  return { ...original, lastUpdated: now, growth, moisture, health, earned, matureHours,
    propagatedAt: original.propagatedAt ? original.propagatedAt + paused : 0,
    ...(original.mulchUntil ? {mulchUntil:mulchExpiry > now ? mulchExpiry : 0} : {}),
    recoveryUntil: recoveryExpiry > now ? recoveryExpiry : 0,
    boost: boostExpiry > now ? original.boost : 1,
    boostUntil: boostExpiry > now ? boostExpiry : 0 };
}

function advance(state, now = Date.now()) {
  if (!Number.isFinite(now) || now < 0) return state;
  const vacationEnd = state.vacationUntil || 0;
  const vacationStart = state.vacationStartedAt || 0;
  const globalPause = max(0, min(now, vacationEnd) - max(state.vacationUpdatedAt || vacationStart, vacationStart));
  const incomes = new Map();
  const plants = state.plants.map(original => {
    if (now <= original.lastUpdated) return original;
    const species = speciesById.get(original.speciesId);
    if (!incomes.has(species.id)) incomes.set(species.id, incomePerHour(state, species));
    return advanceSpecimen(state.careProfile, original, species, now, vacationEnd, vacationStart, incomes.get(species.id));
  });
  return { ...state, plants,
    lastWellAt: state.lastWellAt > 0 ? state.lastWellAt + globalPause : 0,
    vacationUntil: vacationEnd > now ? vacationEnd : 0,
    vacationStartedAt: vacationEnd > now ? vacationStart : 0,
    vacationUpdatedAt: vacationEnd > now ? max(state.vacationUpdatedAt || 0, now) : 0 };
}

function id() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  // getRandomValues remains available on insecure LAN previews where UUID may not.
  if (globalThis.crypto?.getRandomValues) return Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), v => v.toString(16).padStart(8, '0')).join('-');
  return `plant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function createSpecimen(speciesId, now, parentLineageId = null) {
  const identity = id();
  return { id: identity, lineageId: identity, parentLineageId, speciesId, plantedAt: now, lastUpdated: now, growth: 0, moisture: 100, health: 100, boost: 1, boostUntil: 0, research: 0, earned: 0, potSize: 1, propagatedAt: 0, recoveryUntil: 0, matureHours: 0 };
}

function plant(state, speciesId, now = Date.now()) {
  const fresh = advance(state, now);
  const species = speciesById.get(speciesId);
  if (!species) return failure(fresh, 'Такого растения нет в каталоге');
  if (fresh.plants.length >= MAX_PLANTS) return failure(fresh, 'В саду уже 100 растений');
  const cost = price(fresh, speciesId);
  if (fresh.coins < cost) return failure(fresh, `Недостаточно монет: нужно ${cost}`);
  const specimen = createSpecimen(speciesId, now);
  return success({ ...fresh, coins: fresh.coins - cost, plants: [...fresh.plants, specimen], discovered: [...new Set([...fresh.discovered, speciesId])], selectedPlantId: specimen.id }, `${species.name} посажена. Позаботимся о ростке!`);
}

function watered(specimen) {
  return { ...specimen, moisture: Math.min(100, specimen.moisture + 60), health: Math.min(100, specimen.health + 15), research: Math.min(MAX_COINS, specimen.research + 1) };
}

function addResearch(state, plants) {
  const progress = { ...state.researchBySpecies };
  for (const specimen of plants) {
    const old = progress[specimen.speciesId] ?? researchCare(state, specimen.speciesId);
    progress[specimen.speciesId] = Math.min(MAX_COINS, old + 1);
  }
  return { ...state, researchBySpecies: progress };
}

function water(state, plantId, now = Date.now()) {
  const fresh = advance(state, now);
  const specimen = fresh.plants.find(p => p.id === plantId);
  if (!specimen) return failure(fresh, 'Растение не найдено');
  if (!needsWater(specimen)) return failure(fresh, 'Почва ещё влажная. Полив пока не нужен');
  if (fresh.water <= 0) return failure(fresh, 'Вода закончилась. Наберите её бесплатно в колодце');
  return success({ ...addResearch(fresh, [specimen]), water: fresh.water - 1, plants: fresh.plants.map(p => p.id === plantId ? watered(p) : p) }, 'Растение полито. Жужа довольна!');
}

function waterAll(state, now = Date.now()) {
  const fresh = advance(state, now);
  const thirsty = careQueue(fresh,now).filter(needsWater);
  if (!thirsty.length) return failure(fresh, 'Все растения уже политы');
  if (fresh.water <= 0) return failure(fresh, 'Наберите воду в колодце — это бесплатно');
  const targets = thirsty.slice(0, fresh.water);
  const ids = new Set(targets.map(p => p.id));
  return success({ ...addResearch(fresh, targets), water: fresh.water - targets.length, plants: fresh.plants.map(p => ids.has(p.id) ? watered(p) : p) }, targets.length === thirsty.length ? `Полито растений: ${targets.length}` : `Полито ${targets.length} из ${thirsty.length}. Нужна ещё вода`);
}

function fertilize(state, plantId, superBoost = false, now = Date.now()) {
  const fresh = advance(state, now);
  const specimen = fresh.plants.find(p => p.id === plantId);
  if (!specimen) return failure(fresh, 'Растение не найдено');
  if (specimen.growth >= 1) return failure(fresh, 'Растение уже выросло. Удобрение ему не нужно');
  if (specimen.moisture <= 0 || specimen.health <= 0) return failure(fresh, 'Сначала полейте растение');
  const multiplier = superBoost ? 2.5 : 1.5;
  if (specimen.boostUntil > now && specimen.boost >= multiplier) return failure(fresh, 'Ускорение уже действует');
  const stock = superBoost ? 'superFertilizer' : 'fertilizer';
  if (fresh[stock] <= 0) return failure(fresh, 'Удобрение закончилось. Его можно купить в запасах');
  return success({ ...fresh, [stock]: fresh[stock] - 1, plants: fresh.plants.map(p => p.id === plantId ? { ...p, boost: multiplier, boostUntil: now + BOOST_DURATION_MS } : p) }, `Рост ускорен в ${multiplier} раза на 4 часа`);
}

function buy(state, supply, quantity = 1) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) return failure(state, 'Выберите количество от 1 до 999');
  const types = { WATER: ['water', WATER_PRICE], FERTILIZER: ['fertilizer', FERTILIZER_PRICE], SUPER_FERTILIZER: ['superFertilizer', SUPER_FERTILIZER_PRICE], water: ['water', WATER_PRICE], fertilizer: ['fertilizer', FERTILIZER_PRICE], superFertilizer: ['superFertilizer', SUPER_FERTILIZER_PRICE] };
  if (!Object.hasOwn(types, supply)) return failure(state, 'Такого предмета нет в запасах');
  const [key, unitPrice] = types[supply];
  const cost = unitPrice * quantity;
  if (state.coins < cost) return failure(state, `Недостаточно монет: нужно ${cost}`);
  if (state[key] + quantity > 999) return failure(state, 'В запасах помещается до 999 единиц каждого предмета');
  const names = {water:'чистая вода',fertilizer:'удобрение',superFertilizer:'суперудобрение'};
  return success({ ...state, coins: state.coins - cost, [key]: state[key] + quantity }, `Покупка: ${names[key]} ×${quantity} за ${cost} монет`);
}

function collect(state, now = Date.now()) {
  const fresh = advance(state, now);
  const total = Math.min(Math.floor(fresh.plants.reduce((sum, p) => sum + p.earned, 0) + 0.0000001), MAX_COINS - fresh.coins);
  if (total <= 0) return failure(fresh, 'Доход пока накапливается. Его приносят взрослые растения');
  let remaining = total;
  const plants = fresh.plants.map(p => {
    const taken = Math.min(remaining, p.earned);
    remaining -= taken;
    return { ...p, earned: Math.max(0, p.earned - taken) };
  });
  return success({ ...fresh, coins: fresh.coins + total, plants }, `Собрано монет: ${total}`);
}

function drawWater(state, now = Date.now()) {
  const fresh = advance(state, now);
  if (fresh.water >= 999) return failure(fresh, 'Запас воды полон');
  if (fresh.lastWellAt > 0 && (now < fresh.lastWellAt || now - fresh.lastWellAt < WELL_COOLDOWN_MS)) {
    const left = now < fresh.lastWellAt ? WELL_COOLDOWN_MS : WELL_COOLDOWN_MS - (now - fresh.lastWellAt);
    return failure(fresh, `Колодец наполнится через ${Math.ceil(left / 60000)} мин`);
  }
  return success({ ...fresh, water: fresh.water + 1, lastWellAt: Math.max(1, now) }, 'Из колодца набрана вода: +1 бесплатно');
}

function remove(state, plantId) {
  if (!state.plants.some(p => p.id === plantId)) return failure(state, 'Растение не найдено');
  if (state.plants.length === 1) return failure(state, 'Последнее растение остаётся в саду. Сначала посадите ещё одно');
  const plants = state.plants.filter(p => p.id !== plantId);
  return success({ ...state, plants, selectedPlantId: state.selectedPlantId === plantId ? plants[0].id : state.selectedPlantId }, 'Растение убрано из сада. Знания о нём сохранены');
}

/** Strict boundary for browser saves and uploaded backups. Unknown properties are
 * discarded; malformed, oversized, nonfinite and inconsistent state is rejected.
 * Returns a new canonical GameState, or null without modifying anything.
 */
function validateState(raw) {
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const number = (value, low, high) => typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
  const integer = (value, low, high) => Number.isSafeInteger(value) && value >= low && value <= high;
  const timestamp = value => integer(value, 0, 8640000000000000);
  if (!object(raw) || !integer(raw.coins, 0, MAX_COINS) || !['water', 'fertilizer', 'superFertilizer'].every(key => integer(raw[key], 0, 999)) || !timestamp(raw.lastWellAt)) return null;
  if (!Array.isArray(raw.plants) || raw.plants.length > MAX_PLANTS || !Array.isArray(raw.discovered) || raw.discovered.length > CATALOG.length || new Set(raw.discovered).size !== raw.discovered.length || !raw.discovered.every(value => speciesById.has(value))) return null;
  if (!object(raw.researchBySpecies) || !Object.entries(raw.researchBySpecies).every(([key, value]) => speciesById.has(key) && integer(value, 0, MAX_COINS))) return null;
  if (raw.careProfile !== undefined && !['classic', 'natural', 'studio'].includes(raw.careProfile)) return null;
  for (const field of ['vacationUntil','vacationStartedAt','vacationUpdatedAt']) if (raw[field] !== undefined && !timestamp(raw[field])) return null;
  const vacationUntil = raw.vacationUntil || 0, vacationStartedAt = raw.vacationStartedAt || 0, vacationUpdatedAt = raw.vacationUpdatedAt || 0;
  if (vacationUntil && (vacationStartedAt > vacationUpdatedAt || vacationUpdatedAt > vacationUntil || vacationUntil - vacationStartedAt > 30 * 24 * HOUR_MS)) return null;
  if (raw.claimedTasks !== undefined && (!Array.isArray(raw.claimedTasks) || raw.claimedTasks.length > TASK_DEFINITIONS.length || new Set(raw.claimedTasks).size !== raw.claimedTasks.length || !raw.claimedTasks.every(key => TASK_DEFINITIONS.some(t => t.id === key)))) return null;
  if (raw.decorRewards !== undefined && (!Array.isArray(raw.decorRewards) || raw.decorRewards.length > TASK_DEFINITIONS.length || new Set(raw.decorRewards).size !== raw.decorRewards.length || !raw.decorRewards.every(key => raw.claimedTasks?.includes(key)))) return null;
  if (raw.importedPlantIds !== undefined && (!Array.isArray(raw.importedPlantIds) || raw.importedPlantIds.length > 10000 || new Set(raw.importedPlantIds).size !== raw.importedPlantIds.length || !raw.importedPlantIds.every(safeIdentity))) return null;
  const ids = new Set();
  const lineages = new Set();
  const plants = [];
  for (const p of raw.plants) {
    if (!object(p) || !safeIdentity(p.id) || ids.has(p.id) || !speciesById.has(p.speciesId) || !raw.discovered.includes(p.speciesId)) return null;
    if (!timestamp(p.plantedAt) || !timestamp(p.lastUpdated) || p.lastUpdated < p.plantedAt || !timestamp(p.boostUntil) || !number(p.growth, 0, 1) || !number(p.moisture, 0, 100) || !number(p.health, 0, 100) || ![1, 1.5, 2.5].includes(p.boost) || !integer(p.research, 0, MAX_COINS) || !number(p.earned, 0, Number.MAX_SAFE_INTEGER)) return null;
    if ((p.boost === 1 && p.boostUntil !== 0) || (p.boost > 1 && p.boostUntil <= p.lastUpdated)) return null;
    const lineageId = p.lineageId ?? p.id, parentLineageId = p.parentLineageId ?? null;
    if (!safeIdentity(lineageId) || lineages.has(lineageId) || (parentLineageId !== null && !safeIdentity(parentLineageId))) return null;
    if (p.potSize !== undefined && ![1,2].includes(p.potSize)) return null;
    if (p.propagatedAt !== undefined && !timestamp(p.propagatedAt)) return null;
    if (p.recoveryUntil !== undefined && !timestamp(p.recoveryUntil)) return null;
    if (p.matureHours !== undefined && !number(p.matureHours,0,Number.MAX_SAFE_INTEGER)) return null;
    if (p.site !== undefined && !Object.hasOwn(SITES,p.site)) return null;
    if (p.substrate !== undefined && !Object.hasOwn(SUBSTRATES,p.substrate)) return null;
    if (p.mulchUntil !== undefined && !timestamp(p.mulchUntil)) return null;
    ids.add(p.id); lineages.add(lineageId);
    plants.push({ id: p.id, lineageId, parentLineageId, potSize:p.potSize ?? 1, propagatedAt:p.propagatedAt ?? 0, recoveryUntil:p.recoveryUntil ?? 0, matureHours:p.matureHours ?? 0, speciesId: p.speciesId, plantedAt: p.plantedAt, lastUpdated: p.lastUpdated, growth: p.growth, moisture: p.moisture, health: p.health, boost: p.boost, boostUntil: p.boostUntil, research: p.research, earned: p.earned, ...(p.site ? {site:p.site} : {}), ...(p.substrate ? {substrate:p.substrate} : {}), ...(p.mulchUntil ? {mulchUntil:p.mulchUntil} : {}) });
  }
  if (raw.selectedPlantId !== null && !ids.has(raw.selectedPlantId)) return null;
  return { coins: raw.coins, water: raw.water, fertilizer: raw.fertilizer, superFertilizer: raw.superFertilizer, plants, discovered: [...raw.discovered], lastWellAt: raw.lastWellAt, selectedPlantId: raw.selectedPlantId, researchBySpecies: { ...raw.researchBySpecies }, careProfile:raw.careProfile || 'classic', vacationUntil,vacationStartedAt,vacationUpdatedAt, claimedTasks:[...(raw.claimedTasks || [])], importedPlantIds:[...(raw.importedPlantIds || [])], ...(raw.decorRewards?.length ? {decorRewards:[...raw.decorRewards]} : {}) };
}

/** The selected set is validated before spending water; duplicates never spend twice. */
function waterSelected(state, selectedIds, now = Date.now()) {
  const fresh = advance(state, now);
  if (!Array.isArray(selectedIds) || selectedIds.length > MAX_PLANTS || !selectedIds.every(value => typeof value === 'string')) return failure(fresh, 'Выберите растения для полива');
  const selected = new Set(selectedIds);
  if ([...selected].some(value => !fresh.plants.some(p => p.id === value))) return failure(fresh, 'Одно из выбранных растений больше не находится в саду');
  const targets = fresh.plants.filter(p => selected.has(p.id) && needsWater(p));
  if (!targets.length) return failure(fresh, 'Выбранным растениям пока не нужен полив');
  if (fresh.water < targets.length) return failure(fresh, `Для выбранных растений нужно ${targets.length} воды. В запасе ${fresh.water}`);
  const ids = new Set(targets.map(p => p.id));
  return success({ ...addResearch(fresh, targets), water:fresh.water-targets.length, plants:fresh.plants.map(p=>ids.has(p.id)?watered(p):p) }, `Выборочный полив: ${targets.length} растений, расход воды ${targets.length}`);
}

function setCareProfile(state, profile, now = Date.now()) {
  const fresh = advance(state,now);
  const message={classic:'Включены классические игровые правила полива',natural:'Включены разные игровые потребности видов в воде',studio:'Включён расширенный уход: у места и субстрата появилось влияние'};
  if (!Object.hasOwn(message,profile)) return failure(fresh,'Неизвестный режим ухода');
  return success({...fresh,careProfile:profile},message[profile]);
}

function forecast(state, plantId, now = Date.now()) {
  const original=state.plants.find(plant=>plant.id===plantId);
  if (!original) return null;
  const s=speciesById.get(original.speciesId);
  const income=incomePerHour(state,s);
  const vacationEnd=state.vacationUntil||0;
  const p=Number.isFinite(now)&&now>=0&&now>original.lastUpdated
    ? advanceSpecimen(state.careProfile,original,s,now,vacationEnd,state.vacationStartedAt||0,income)
    : original;
  const modifiers=environment(state.careProfile,p);
  const rate=specimenWaterRate(state.careProfile,p,s,modifiers);
  const wait=Math.max(0,vacationEnd-now), resumeAt=now+wait;
  const mulchAdjusted={...p,mulchUntil:p.mulchUntil ? p.mulchUntil + wait : 0};
  const nextWaterAt=needsWater(p)?now:resumeAt+dryingHours(mulchAdjusted,rate,p.moisture-70,resumeAt)*HOUR_MS;
  const willDryAt=p.moisture<=0?now:resumeAt+dryingHours(mulchAdjusted,rate,p.moisture,resumeAt)*HOUR_MS;
  const remainingHours=(1-p.growth)*s.growthHours/modifiers.growth;
  const boostHours=p.boost>1?Math.max(0,p.boostUntil-now)/HOUR_MS:0;
  const boostedGrowth=Math.min(remainingHours,boostHours*p.boost);
  const toMatureHours=boostedGrowth/(p.boost||1)+Math.max(0,remainingHours-boostedGrowth);
  const withCareMatureAt=p.growth>=1?now:resumeAt+toMatureHours*HOUR_MS;
  const canGrow=p.moisture>0&&(p.health>0||p.recoveryUntil>now);
  const canMatureWithoutWater=p.growth>=1||(canGrow&&toMatureHours<=(willDryAt-resumeAt)/HOUR_MS+BOUNDARY_EPSILON);
  return {nextWaterAt,willDryAt,matureAt:canMatureWithoutWater?withCareMatureAt:null,withCareMatureAt,canMatureWithoutWater,
    pausedUntil:(!Number.isFinite(now)||now<0||vacationEnd>now)?vacationEnd:0,boostEndsAt:p.boostUntil? p.boostUntil+wait:0,
    recoveryEndsAt:p.recoveryUntil?p.recoveryUntil+wait:0,
    incomePerHour:income,waterPerHour:rate*(p.mulchUntil>now?.7:1),
    nextPropagationAt:p.propagatedAt?p.propagatedAt+PROPAGATION_COOLDOWN_MS+wait:now};
}

function careQueue(state, now = Date.now()) {
  const priority = state.plants.map(plant=>({plant,hours:dryingHours(plant,waterRate(state,plant),plant.moisture,now)}));
  priority.sort((a,b)=>a.hours-b.hours || a.plant.health-b.plant.health);
  return priority.map(item=>item.plant);
}

function setEnvironment(state, plantId, site, substrate, now = Date.now()) {
  const fresh = advance(state, now);
  if(fresh.careProfile !== 'studio') return failure(fresh,'Включите расширенный уход в плане сада');
  if(!Object.hasOwn(SITES,site) || !Object.hasOwn(SUBSTRATES,substrate)) return failure(fresh,'Выберите место и субстрат');
  if(!fresh.plants.some(plant=>plant.id===plantId)) return failure(fresh,'Растение не найдено');
  return success({...fresh,plants:fresh.plants.map(plant=>plant.id===plantId?{...plant,site,substrate}:plant)},'Условия ухода обновлены');
}

function spreadMulch(state, plantId, now = Date.now()) {
  const fresh = advance(state,now);
  const plant = fresh.plants.find(item=>item.id===plantId);
  if(!plant) return failure(fresh,'Растение не найдено');
  if(plant.mulchUntil > now) return failure(fresh,'Мульча ещё удерживает влагу');
  if(!fresh.fertilizer) return failure(fresh,'Для приготовления мульчи нужна одна подкормка');
  return success({...fresh,fertilizer:fresh.fertilizer-1,plants:fresh.plants.map(item=>item.id===plantId?{...item,mulchUntil:now+MULCH_DURATION_MS}:item)},'В течение 8 часов почва будет высыхать на 30% медленнее');
}

function exchangeSupplies(state) {
  if(state.water < 5) return failure(state,'Для обмена нужно 5 порций воды');
  if(state.fertilizer >= 999) return failure(state,'Запасы подкормки полны');
  return success({...state,water:state.water-5,fertilizer:state.fertilizer+1},'Обменяно 5 порций воды на 1 подкормку');
}

function familyDepth(plants) {
  const byLineage = new Map(plants.map(plant=>[plant.lineageId || plant.id,plant]));
  return plants.reduce((deepest,plant)=>{
    const visited = new Set();
    for(let current=plant;current;current=byLineage.get(current.parentLineageId)) {
      const lineage=current.lineageId || current.id;
      if(visited.has(lineage)) return deepest;
      visited.add(lineage);
    }
    return Math.max(deepest,visited.size);
  },0);
}

function propagate(state, plantId, now = Date.now()) {
  const fresh=advance(state,now),p=fresh.plants.find(p=>p.id===plantId);
  if(!p)return failure(fresh,'Растение не найдено');
  if(fresh.plants.length>=MAX_PLANTS)return failure(fresh,'В саду уже 100 растений');
  if(p.growth<1)return failure(fresh,'Отросток можно взять только у взрослого растения');
  if(p.health<70||p.moisture<=0)return failure(fresh,'Сначала восстановите здоровье и полейте растение');
  if(p.propagatedAt>0&&(now<p.propagatedAt||now-p.propagatedAt<PROPAGATION_COOLDOWN_MS))return failure(fresh,'Растению нужен отдых: новый отросток доступен через 24 часа после предыдущего');
  if(fresh.water<1)return failure(fresh,'Для укоренения нужна одна порция воды');
  const child=createSpecimen(p.speciesId,now,p.lineageId||p.id);
  return success({...fresh,water:fresh.water-1,selectedPlantId:child.id,plants:[...fresh.plants.map(x=>x.id===plantId?{...x,propagatedAt:Math.max(1,now)}:x),child]},`Новый отросток: ${speciesById.get(p.speciesId).name}. Израсходована 1 вода; родитель отдыхает 24 часа`);
}

function repot(state, plantId, now = Date.now()) {
  const fresh=advance(state,now),p=fresh.plants.find(p=>p.id===plantId);
  if(!p)return failure(fresh,'Растение не найдено');
  if(p.potSize===2)return failure(fresh,'У растения уже просторный горшок');
  if(p.growth<.25)return failure(fresh,'Пересадка доступна после 25% роста');
  if(fresh.coins<REPOT_PRICE)return failure(fresh,`Для пересадки нужно ${REPOT_PRICE} монет`);
  return success({...fresh,coins:fresh.coins-REPOT_PRICE,plants:fresh.plants.map(x=>x.id===plantId?{...x,potSize:2}:x)},'Растение пересажено. Просторный горшок замедляет высыхание на 20%');
}

function recover(state, plantId, now = Date.now()) {
  const fresh=advance(state,now),p=fresh.plants.find(p=>p.id===plantId);
  if(!p)return failure(fresh,'Растение не найдено');
  if(p.health>=70)return failure(fresh,'Растению достаточно обычного ухода');
  if(p.recoveryUntil>now)return failure(fresh,'Восстановление уже идёт');
  if(fresh.water<1)return failure(fresh,'Для мягкого восстановления нужна 1 вода');
  return success({...fresh,water:fresh.water-1,plants:fresh.plants.map(x=>x.id===plantId?{...x,moisture:Math.max(60,x.moisture),recoveryUntil:now+RECOVERY_DURATION_MS}:x)},'Мягкое восстановление началось: +25 здоровья в час в течение 2 часов при влажной почве');
}

function setVacation(state, hours, now = Date.now()) {
  const fresh=advance(state,now);
  if(!Number.isInteger(hours)||hours<0||hours>30*24)return failure(fresh,'Выберите отпуск от 1 часа до 30 дней или 0 для возвращения');
  return success({...fresh,vacationUntil:hours?now+hours*HOUR_MS:0,vacationStartedAt:hours?now:0,vacationUpdatedAt:hours?now:0},hours?`Сад отдыхает ${hours} ч: рост, высыхание, доход и таймеры приостановлены`:'Вы вернулись: сад снова растёт');
}

function bloomInfo(specimen) {
  const species=speciesById.get(specimen.speciesId);
  if(!species||['leaves'].includes(species.category))return {cycle:0,phase:'leaves',progress:specimen.growth,label:'Рост листьев'};
  if(specimen.growth<1)return {cycle:0,phase:specimen.growth<.75?'growing':'bud',progress:specimen.growth,label:specimen.growth<.75?'Растёт':'Появляются бутоны'};
  const hours=specimen.matureHours||0,cycle=Math.floor(hours/48)+1,position=hours%48;
  const phase=position<16?'bloom':position<32?'rest':'bud';
  return {cycle,phase,progress:position/48,label:phase==='bloom'?'Цветение':phase==='rest'?'Отдых после цветения':'Новые бутоны',nextPhaseHours:16-position%16};
}

const TASK_DEFINITIONS = Object.freeze([
  {id:'first-care',title:'Первая забота',description:'Выполните один полезный полив.',reward:100,target:1},
  {id:'two-flowers',title:'Два настроения',description:'Откройте два разных цветущих вида.',reward:200,target:2},
  {id:'first-mature',title:'Дождаться чуда',description:'Вырастите одно растение до взрослого состояния.',reward:300,target:1},
  {id:'researcher',title:'Любопытный садовод',description:'Наберите суммарно пять уровней исследования видов.',reward:250,target:5},
  {id:'all-species',title:'Живая коллекция',description:'Откройте все виды каталога.',reward:600,target:CATALOG.length},
  {id:'three-generations',title:'Три поколения',description:'Укорените черенок от растения, которое само выросло из черенка.',reward:450,target:3},
].map(Object.freeze));

function tasks(state) {
  const progress={
    'first-care':CATALOG.reduce((sum,s)=>sum+(state.researchBySpecies[s.id]??state.plants.filter(p=>p.speciesId===s.id).reduce((total,p)=>total+p.research,0)),0),
    'two-flowers':state.discovered.filter(id=>speciesById.get(id)?.category==='flowers').length,
    'first-mature':state.plants.filter(p=>p.growth>=1).length,
    researcher:CATALOG.reduce((sum,s)=>sum+researchLevel(state,s.id),0),
    'all-species':state.discovered.length,
    'three-generations':familyDepth(state.plants),
  };
  return TASK_DEFINITIONS.map(t=>({...t,progress:Math.min(t.target,progress[t.id]),complete:progress[t.id]>=t.target,claimed:(state.claimedTasks||[]).includes(t.id)}));
}

function claimTask(state, taskId, now = Date.now(), reward='coins') {
  const fresh=advance(state,now),task=tasks(fresh).find(t=>t.id===taskId);
  if(!task)return failure(fresh,'Задание не найдено');
  if(task.claimed)return failure(fresh,'Награда уже получена');
  if(!task.complete)return failure(fresh,'Задание ещё продолжается. Спешить не нужно');
  const claimedTasks=[...(fresh.claimedTasks||[]),task.id];
  if(reward==='supplies') {
    if(fresh.water>997 || fresh.fertilizer>=999) return failure(fresh,'Запасы полны. Награда останется доступна');
    return success({...fresh,claimedTasks,water:fresh.water+2,fertilizer:fresh.fertilizer+1},`«${task.title}»: получены 2 порции воды и 1 подкормка`);
  }
  if(reward==='decor') return success({...fresh,claimedTasks,decorRewards:[...(fresh.decorRewards||[]),task.id]},`«${task.title}»: памятная табличка появилась в коллекции`);
  if(reward!=='coins')return failure(fresh,'Выберите тип награды');
  if(fresh.coins>MAX_COINS-task.reward)return failure(fresh,'Кошелёк полон. Награда останется доступной');
  return success({...fresh,coins:fresh.coins+task.reward,claimedTasks},`«${task.title}»: получено ${task.reward} игровых монет`);
}

/** Validate the authoring document before adding species to a future release.
 * It does not install arbitrary unreviewed data into the running catalog.
 */
function validateCatalogDocument(document) {
  if(!document||document.format!=='FloraKeepCatalog'||document.version!==1||!Array.isArray(document.species)||document.species.length<1||document.species.length>100)return null;
  const ids=new Set(),validated=[];
  for(const item of document.species){
    if(!item||typeof item!=='object'||Array.isArray(item)||!safeIdentity(item.id)||!/^[a-z][a-z0-9-]{1,40}$/.test(item.id)||ids.has(item.id))return null;
    if(!['name','latinName','fact'].every(key=>typeof item[key]==='string'&&item[key].trim().length>0&&item[key].length<1000))return null;
    if(!Number.isInteger(item.price)||item.price<0||item.price>100000||!Number.isInteger(item.growthHours)||item.growthHours<1||item.growthHours>720||!Number.isInteger(item.incomePerHour)||item.incomePerHour<0||item.incomePerHour>10000)return null;
    if(typeof item.color!=='string'||!/^#[a-f0-9]{6}$/i.test(item.color)||!['leaves','flowers','succulents'].includes(item.category)||typeof item.waterPerHour!=='number'||!Number.isFinite(item.waterPerHour)||item.waterPerHour<.1||item.waterPerHour>20)return null;
    if(item.sourceUrl!==undefined&&(typeof item.sourceUrl!=='string'||!/^https:\/\/[^\s<>]+$/.test(item.sourceUrl)))return null;
    ids.add(item.id);validated.push({id:item.id,name:item.name,latinName:item.latinName,fact:item.fact,price:item.price,growthHours:item.growthHours,incomePerHour:item.incomePerHour,color:item.color,category:item.category,waterPerHour:item.waterPerHour,...(item.sourceUrl?{sourceUrl:item.sourceUrl}:{})});
  }
  return {format:'FloraKeepCatalog',version:1,species:validated};
}

return Object.freeze({ CATALOG, MAX_PLANTS, WELL_COOLDOWN_MS, OFFLINE_CAP_MS, BOOST_DURATION_MS, WATER_PRICE, FERTILIZER_PRICE, SUPER_FERTILIZER_PRICE, PROPAGATION_COOLDOWN_MS, RECOVERY_DURATION_MS, REPOT_PRICE, CATALOG_DOCUMENT, initialState, researchLevel, price, needsWater, waterRate, advance, plant, water, waterAll, fertilize, buy, collect, drawWater, remove, validateState, waterSelected, setCareProfile, forecast, propagate, repot, recover, setVacation, bloomInfo, TASK_DEFINITIONS, tasks, claimTask, validateCatalogDocument, careQueue, setEnvironment, spreadMulch, exchangeSupplies });
})();
