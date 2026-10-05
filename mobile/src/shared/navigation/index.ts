/**
 * Les liens produits par le backend (sources de l'IA, recherche) pointent vers les pages web
 * (« /questions/<id> »). On les traduit vers les écrans de l'appli.
 */
const WEB_TO_APP: [RegExp, string][] = [
  [/^\/questions\/([\w-]+)/, '/question/$1'],
  [/^\/snippets\/([\w-]+)/, '/snippet/$1'],
  [/^\/projects\/([\w-]+)/, '/project/$1'],
  [/^\/feed\/([\w-]+)/, '/post/$1'],
  [/^\/u\/([\w.-]+)/, '/u/$1'],
];

export function routeForWebPath(url: string): string | null {
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  for (const [pattern, target] of WEB_TO_APP) {
    if (pattern.test(path)) return path.replace(pattern, target).replace(/[?#].*$/, '');
  }
  return null;
}
