module.exports = function (api) {
  api.cache(true);
  // babel-preset-expo ajoute automatiquement le plugin Reanimated / Worklets.
  return { presets: ['babel-preset-expo'] };
};
