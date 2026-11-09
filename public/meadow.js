/* Uses the supplied reference footage. No renderer or external CDN is required. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let detach = () => {};
  let userPaused = false;
  const playIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m9 5 10 7-10 7z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
  function mount() {
    detach();
    const film = document.querySelector('#meadow-film');
    const button = document.querySelector('#meadow-motion');
    if (!film || !button) return;
    let inView = true;
    let manualPlay = false;
    let alive = true;
    const updateButton = () => {
      const playing = !film.paused;
      button.innerHTML = playing ? pauseIcon : playIcon;
      button.setAttribute('aria-label', playing ? 'Tạm dừng cảnh nền' : 'Phát cảnh nền');
      button.setAttribute('aria-pressed', String(playing));
    };
    const updatePlayback = () => {
      const autoplayAllowed = manualPlay || (!preference.matches && !navigator.connection?.saveData);
      if (!alive || !film.isConnected || userPaused || document.hidden || !inView || !autoplayAllowed) {
        film.pause();
        updateButton();
        return;
      }
      film.muted = true;
      film.play().then(updateButton).catch(updateButton);
    };
    const toggle = () => {
      userPaused = !film.paused;
      manualPlay = !userPaused;
      updatePlayback();
    };
    const motionChanged = () => { manualPlay = false; updatePlayback(); };
    button.addEventListener('click', toggle);
    film.addEventListener('play', updateButton);
    film.addEventListener('pause', updateButton);
    document.addEventListener('visibilitychange', updatePlayback);
    preference.addEventListener('change', motionChanged);
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; updatePlayback(); }, { threshold: 0.05 });
    observer.observe(film);
    updatePlayback();
    detach = () => {
      alive = false;
      film.pause();
      observer.disconnect();
      button.removeEventListener('click', toggle);
      film.removeEventListener('play', updateButton);
      film.removeEventListener('pause', updateButton);
      document.removeEventListener('visibilitychange', updatePlayback);
      preference.removeEventListener('change', motionChanged);
    };
  }
  window.EventlyMeadow = { mount, stop: () => detach() };
})();
