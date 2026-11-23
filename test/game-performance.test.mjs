import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
const game = vm.runInNewContext(source + '\ngame', {crypto:globalThis.crypto});
const start = 1_800_000_000_000;
const hour = 3_600_000;

test('a specimen forecast leaves unrelated growth untouched', () => {
  let state = game.plant(game.initialState(start), 'daisy', start).state;
  state = game.plant(state, 'lavender', start).state;
  const [daisy, lavender] = state.plants;
  const now = start + hour;
  const expected = game.forecast(game.advance(state, now), daisy.id, now);
  let growthReads = 0;
  const other = {...lavender, get growth() { growthReads++; return lavender.growth; }};

  const actual = game.forecast(Object.freeze({...state, plants:Object.freeze([daisy, other])}), daisy.id, now);

  assert.deepEqual(actual, expected);
  assert.equal(growthReads, 0);
  assert.equal(daisy.lastUpdated, start);
});

test('a dry specimen with no health still expires treatments through a pause', () => {
  const state = game.plant(game.initialState(start), 'daisy', start).state;
  const plant = {
    ...state.plants[0], moisture:0, health:0, boost:1.5, boostUntil:start+hour,
    mulchUntil:start+2*hour, recoveryUntil:start+3*hour,
  };
  const vacation = game.setVacation({...state, plants:[plant]}, 2, start).state;
  const paused = game.advance(vacation, start+2*hour).plants[0];
  assert.equal(paused.boostUntil, start+3*hour);
  assert.equal(paused.mulchUntil, start+4*hour);
  assert.equal(paused.recoveryUntil, start+5*hour);

  const after = game.advance(vacation, start+6*hour).plants[0];
  assert.deepEqual([after.growth, after.moisture, after.health, after.earned], [0, 0, 0, 0]);
  assert.deepEqual([after.boost, after.boostUntil, after.mulchUntil, after.recoveryUntil], [1, 0, 0, 0]);
});
