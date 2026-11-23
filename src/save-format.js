const saveFormat = (() => {
  const extrasVersion=3;
  const layout=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const migrations=new Map([
    [1,source=>({...source,layout:layout(source.layout),schema:2})],
    [2,source=>({...source,layout:layout(source.layout),workbench:source.workbench||{},gardenUpgrades:source.gardenUpgrades||{},schema:3})],
  ]);
  function migrateExtras(raw) {
    let extras=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    const original=Number.isInteger(extras.schema)?extras.schema:1;
    if(original>extrasVersion||original<1)throw new Error('Эта версия формата сада не поддерживается.');
    for(let version=original;version<extrasVersion;version++) {
      const migrate=migrations.get(version);
      const next=migrate(extras);
      if(!next||next.schema!==version+1||!next.layout||typeof next.layout!=='object'||Array.isArray(next.layout))throw new Error('Не удалось обновить формат сада.');
      extras=next;
    }
    return {extras,migrated:original!==extrasVersion};
  }
  return Object.freeze({extrasVersion,migrateExtras});
})();
