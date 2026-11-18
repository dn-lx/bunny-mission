// Version 2 is paused. Keep existing invitation links on the animated Flow version.
(() => {
  document.documentElement.dataset.mediaVersion = '1';
  const url = new URL(location.href);
  if (url.searchParams.get('version') === '2') {
    url.searchParams.set('version', '1');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
})();
