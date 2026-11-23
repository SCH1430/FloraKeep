import { webcrypto } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import vm from 'node:vm';

const exhibitDate = Date.UTC(2025, 8, 1, 12);
const hour = 60 * 60 * 1000;

export async function buildExhibit(project, destination) {
  const modules = ['game', 'art', 'media', 'backup', 'story-studio'];
  const sources = await Promise.all(modules.map(name => readFile(join(project, 'src', `${name}.js`), 'utf8')));
  let nextId = 0;
  class ExhibitDate extends Date {
    static now() { return exhibitDate; }
  }
  const globals = {
    Date: ExhibitDate,
    TextEncoder,
    crypto: {
      subtle: webcrypto.subtle,
      randomUUID: () => `exhibit-plant-${++nextId}`,
    },
  };
  const { game, art, media, backup, storyStudio } = vm.runInNewContext(
    `${sources.join('\n')}\n({ game, art, media, backup, storyStudio })`, globals,
  );

  const species = ['daisy', 'lavender', 'tulip'];
  let state = { ...game.initialState(exhibitDate), coins: 2500 };
  for (const speciesId of species) {
    const planted = game.plant(state, speciesId, exhibitDate - 8 * hour);
    if (!planted.success) throw new Error(`Выставочный сад: ${planted.message}`);
    state = planted.state;
  }
  state = game.advance(state, exhibitDate);

  const title = 'Утро на выставке';
  const stage = storyStudio.defaultStoryStudioState();
  stage.draft.name = title;
  stage.saved = [stage.draft];
  const record = {
    format: 'FloraKeepWeb', version: 1, savedAt: exhibitDate, game: state,
    prefs: { calm: true, sounds: false, music: false, pot: 'clay' },
    journal: [{ at: exhibitDate, text: 'Три вида для первого наблюдения.', kind: 'leaf' }],
    extras: { gardenName: title, description: 'Ромашка, лаванда и тюльпан в учебной коллекции.', storyStudio: stage },
  };
  const presentation = { art, catalog: game.CATALOG };
  const documents = {
    'garden.json': `${JSON.stringify(await backup.encodeBackup(record), null, 2)}\n`,
    'scene.html': storyStudio.buildStoryHTML(stage.draft, presentation),
    'postcard.svg': media.postcardSVG({ title, artwork: art.plantArt('daisy'), width: 600, height: 900 }),
  };
  await mkdir(destination, { recursive: true });
  await Promise.all([
    ...Object.entries(documents).map(([name, contents]) => writeFile(join(destination, name), contents)),
    copyFile(join(project, 'docs', 'EXHIBIT.md'), join(destination, 'GUIDE.md')),
  ]);
  return [...Object.keys(documents), 'GUIDE.md'];
}
