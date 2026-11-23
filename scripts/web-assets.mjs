export const isContentAsset = name => /^flora-[a-z][a-z0-9-]*-[a-f0-9]{12}\.(?:js|css|wav|mp3|ogg|webp)$/.test(name);
