/* Decorative reference footage follows motion and data-saving preferences. */
(() => {
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let detach=()=>{};
  function mount(){
    detach();
    const film=document.querySelector('#meadow-film');
    if(!film)return;
    let inView=true,alive=true;
    const update=()=>{
      if(!alive||!film.isConnected||preference.matches||navigator.connection?.saveData||document.hidden||!inView){film.pause();return;}
      film.muted=true;film.play().catch(()=>{});
    };
    const observer=new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;update();},{threshold:.05});
    observer.observe(film);document.addEventListener('visibilitychange',update);preference.addEventListener('change',update);update();
    detach=()=>{alive=false;film.pause();observer.disconnect();document.removeEventListener('visibilitychange',update);preference.removeEventListener('change',update);};
  }
  window.EventlyMeadow={mount,stop:()=>detach()};
})();
