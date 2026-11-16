const STORAGE_KEY = 'bear-ski-guest-v1';
const SCARF_COLORS = ['red', 'blue', 'yellow', 'green', 'purple'];
const SAVED_COURSES = ['cloud-ridge-1500', 'cloud-ridge-1000', 'alpine-2000'];
const SCARF_PRICE = 25;
const RUN_HISTORY_LIMIT = 1000;
const MAX_RUN_COINS = 180;
const MIN_RUN_TIME_MS = 30000;
const MAX_RUN_TIME_MS = 3600000;
const RUN_ID_PATTERN = /^[a-zA-Z0-9-]{20,64}$/;

function emptyRecord() {
  return { version: 1, coins: 0, owned: [], equipped: 'none', bests: {}, runs: [] };
}

function isValidTime(timeMs) {
  return Number.isInteger(timeMs) && timeMs >= MIN_RUN_TIME_MS && timeMs <= MAX_RUN_TIME_MS;
}

function isStoredRecordValid(record) {
  if (!record || record.version !== 1 || !Number.isSafeInteger(record.coins) || record.coins < 0) {
    return false;
  }

  const { owned, equipped, bests, runs } = record;
  return Array.isArray(owned)
    && owned.every((color) => SCARF_COLORS.includes(color))
    && (equipped === 'none' || owned.includes(equipped))
    && Array.isArray(runs)
    && runs.length <= RUN_HISTORY_LIMIT
    && bests !== null && typeof bests === 'object'
    && Object.entries(bests).every(([courseId, timeMs]) => (
      SAVED_COURSES.includes(courseId) && isValidTime(timeMs)
    ));
}

function recordRun(record, run, courseId) {
  const { runId, coins, timeMs } = run;
  if (run.courseId !== courseId || typeof runId !== 'string' || !RUN_ID_PATTERN.test(runId)
    || !Number.isInteger(coins) || coins < 0 || coins > MAX_RUN_COINS || !isValidTime(timeMs)) {
    throw new Error('記録の形式を確認できませんでした。');
  }

  const previous = record.runs.find((entry) => entry.runId === runId);
  if (previous) {
    if (previous.coins !== coins || previous.timeMs !== timeMs || previous.courseId !== courseId) {
      throw new Error('保存済みの滑走と内容が異なります。');
    }
    return record;
  }

  return {
    ...record,
    coins: record.coins + coins,
    bests: { ...record.bests, [courseId]: Math.min(record.bests[courseId] ?? timeMs, timeMs) },
    runs: [...record.runs, { ...run }].slice(-RUN_HISTORY_LIMIT),
  };
}

function equipScarf(record, color, purchase) {
  if (color !== 'none' && !SCARF_COLORS.includes(color)) {
    throw new Error('この色は購入できません。');
  }
  if (purchase && !record.owned.includes(color)) {
    if (color === 'none' || record.coins < SCARF_PRICE) {
      throw new Error(`コインが足りません。${SCARF_PRICE}コインで購入できます。`);
    }
    return {
      ...record,
      coins: record.coins - SCARF_PRICE,
      owned: [...record.owned, color],
      equipped: color,
    };
  }
  if (color !== 'none' && !record.owned.includes(color)) {
    throw new Error('先にマフラーを購入してください。');
  }
  return { ...record, equipped: color };
}

/** ゲストの滑走・着せ替えを管理する。Storageが使えなくなった後はタブ内で記録を保持する。 */
export function createGuestAccount(storage) {
  let memory = emptyRecord();
  let durable = Boolean(storage);

  function readRecord() {
    if (durable) {
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return emptyRecord();
        const record = JSON.parse(raw);
        if (!isStoredRecordValid(record)) throw new Error('Invalid guest record');
        memory = record;
      } catch {
        // 読み出せない保存データを上書きせず、最後に読めた記録から続ける。
        durable = false;
      }
    }
    return structuredClone(memory);
  }

  function writeRecord(record) {
    memory = record;
    if (durable) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(record));
      } catch {
        durable = false;
      }
    }
  }

  function operation(path, body, courseId) {
    const current = readRecord();
    let record = current;
    switch (path) {
      case 'run':
        record = recordRun(current, body, courseId);
        break;
      case 'purchase':
      case 'equip':
        record = equipScarf(current, body.color, path === 'purchase');
        break;
      case 'profile':
        break;
      default:
        throw new Error('操作が不正です。');
    }

    if (record !== current) writeRecord(record);
    return {
      coins: record.coins,
      owned: record.owned,
      equipped: record.equipped,
      bestMs: record.bests[courseId] ?? null,
      courseId,
      guest: true,
      durable,
    };
  }

  return {
    operation,
    get durable() {
      return durable;
    },
  };
}
