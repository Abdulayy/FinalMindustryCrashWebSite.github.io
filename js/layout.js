// Navigation, footer and page transitions. Pages swap in place, so the menu and background never reload.
(function(){
  const pages=[
    {id:'home',href:'index.html',label:'Home',icon:'M3 11 12 3l9 8v10h-6v-6H9v6H3z'},
    {id:'database',href:'database.html',label:'Database',icon:'M3 4h4v4H3zM9 4h12v4H9zM3 10h4v4H3zM9 10h12v4H9zM3 16h4v4H3zM9 16h12v4H9z'},
    {id:'sectors',href:'sectors.html',label:'Sectors',icon:'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z'},
    {id:'play',href:'play.html',label:'More',icon:'M10 3h4v4h-4zM10 10h4v4h-4zM10 17h4v4h-4z'},
    {id:'about',href:'about.html',label:'About',icon:'M10 3h4v4h-4zM10 9h4v12h-4z'}
  ];
  const side=document.getElementById('side');
  side.innerHTML=
    '<a class="brand" href="index.html">Mindustry atlas<small>Fan-made guide and mini sector</small></a>'+
    '<button id="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>'+
    '<ul id="nav">'+pages.map(p=>
      '<li><a href="'+p.href+'" data-id="'+p.id+'">'+
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+p.icon+'"/></svg>'+p.label+'</a></li>').join('')+'</ul>'+
    '<div class="side-foot">Unofficial fan project</div>';
  const btn=document.getElementById('menu-btn'),nav=document.getElementById('nav'),main=document.querySelector('main'),grow=main.querySelector('.grow');
  function closeMenu(){nav.classList.remove('open');btn.setAttribute('aria-expanded','false');}
  btn.addEventListener('click',()=>{const o=nav.classList.toggle('open');btn.setAttribute('aria-expanded',o);});
  function markNav(){nav.querySelectorAll('a').forEach(a=>{
    if(a.dataset.id===document.body.dataset.page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});}
  markNav();
  const f=document.createElement('footer');
  f.innerHTML='Mindustry is made by Anuken and contributors under the GPL v3. This site is a student project and is not affiliated with the game.';
  main.appendChild(f);

  // ---- transitions ----
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cache=new Map();
  const key=u=>new URL(u,location.href).pathname.replace(/\/$/,'/index.html');
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  function fetchPage(url){
    const k=key(url);
    if(!cache.has(k))cache.set(k,fetch(url).then(r=>{if(!r.ok)throw 0;return r.text();})
      .then(t=>new DOMParser().parseFromString(t,'text/html')).catch(e=>{cache.delete(k);throw e;}));
    return cache.get(k);
  }
  function enter(){
    grow.classList.remove('leaving');void grow.offsetWidth;grow.classList.add('entering');
    grow.addEventListener('animationend',()=>grow.classList.remove('entering'),{once:true});
  }
  function swap(doc){
    grow.innerHTML=doc.querySelector('main .grow').innerHTML;
    document.title=doc.title;
    document.body.dataset.page=doc.body.dataset.page;
    markNav();
    // innerHTML does not run scripts, so rebuild them. Inline code is wrapped so repeat visits do not clash.
    grow.querySelectorAll('script').forEach(old=>{
      const s=document.createElement('script');
      if(old.src)s.src=old.src;else s.textContent='(function(){'+old.textContent+'\n})();';
      old.replaceWith(s);
    });
  }
  let token=0;
  async function go(url,push){
    const t=++token;
    grow.classList.remove('entering');grow.classList.add('leaving');
    try{
      const [doc]=await Promise.all([fetchPage(url),wait(reduced?0:140)]);
      if(t!==token)return;
      if(push)history.pushState(null,'',url);
      swap(doc);scrollTo(0,0);enter();
      main.focus({preventScroll:true});
    }catch(e){location.href=url;}
  }
  function pageLink(e){
    const a=e.target.closest&&e.target.closest('a');
    if(!a||a.target||a.hasAttribute('download'))return null;
    const u=new URL(a.href,location.href);
    if(u.origin!==location.origin||!/(\.html|\/)$/.test(u.pathname))return null;
    return u;
  }
  document.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const u=pageLink(e);if(!u)return;
    const same=key(u)===key(location.href);
    if(same&&u.hash)return;               // in-page anchor, let the browser handle it
    e.preventDefault();closeMenu();
    if(same){scrollTo({top:0,behavior:reduced?'auto':'smooth'});return;}   // already here: no reload
    go(u.href,true);
  });
  document.addEventListener('pointerover',e=>{const u=pageLink(e);if(u&&key(u)!==key(location.href))fetchPage(u.href).catch(()=>{});});
  addEventListener('popstate',()=>go(location.href,false));
  main.setAttribute('tabindex','-1');
  enter();
})();
