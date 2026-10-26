// Handle only explicit legacy language links, before Firebase loads.
// Public /en/ and /fr/ paths never depend on browser language or saved preferences.
const url = new URL(window.location.href);
const staging = url.pathname === '/staging' || url.pathname.startsWith('/staging/') || ['1', 'true'].includes(url.searchParams.get('staging'));
if (staging) {
  const robots = document.createElement('meta');
  robots.name = 'robots';
  robots.content = 'noindex, nofollow';
  document.head.append(robots);
} else if (['/', '/index.html'].includes(url.pathname)) {
  const legacy = (url.searchParams.get('lang') || url.hash.slice(1)).toLowerCase();
  if (['en', 'fr'].includes(legacy)) {
    url.pathname = `/${legacy}/`;
    url.searchParams.delete('lang');
    if (['en', 'fr'].includes(url.hash.slice(1).toLowerCase())) url.hash = '';
    window.location.replace(url.href);
  }
}
