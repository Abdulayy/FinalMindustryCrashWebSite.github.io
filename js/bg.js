// Background loader. Tries the 3D cube box first. Fallback: a pile of tumbled slate cubes.
(function(){
  const c=document.getElementById('bg'),g=c.getContext('2d');
  const base=['#5a5a68','#64646f','#6e6e7b','#787886','#52525e'];
  function sh(hex,d){const n=parseInt(hex.slice(1),16),f=v=>Math.max(0,Math.min(255,v+d));return 'rgb('+f(n>>16)+','+f((n>>8)&255)+','+f(n&255)+')';}
  function rng(s){return function(){s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function cube(x,y,s,a,col,pat){
    g.save();g.translate(x,y);g.rotate(a);
    const h=s/2,b=Math.max(3,s*.07),t=b*.8,k=s*.22;
    g.fillStyle='rgba(0,0,0,.4)';g.fillRect(-h+4,-h+5,s,s);
    g.fillStyle=col;g.fillRect(-h,-h,s,s);
    g.fillStyle=sh(col,26);g.fillRect(-h,-h,s,b);g.fillRect(-h,-h,b,s);
    g.fillStyle=sh(col,-30);g.fillRect(-h,h-b,s,b);g.fillRect(h-b,-h,b,s);
    const L=sh(col,34),D=sh(col,-32);
    if(pat===0){
      g.fillStyle=L;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([i,j])=>{
        const cx=i*(h-b*2.2),cy=j*(h-b*2.2);
        g.fillRect(cx,cy,-i*k,-j*t);g.fillRect(cx,cy,-i*t,-j*k);
      });
    }else if(pat===1){
      g.fillStyle=D;g.fillRect(-h+b*2,-k*.6,b*1.4,k*1.2);g.fillRect(h-b*3.4,-k*.6,b*1.4,k*1.2);
    }else{
      g.strokeStyle=L;g.lineWidth=b*.7;g.strokeRect(-h*.55,-h*.55,h*1.1,h*1.1);
    }
    g.fillStyle=L;g.beginPath();g.arc(0,0,s*.09,0,7);g.fill();
    g.restore();
  }
  function draw(){
    c.width=innerWidth;c.height=innerHeight;
    const r=rng((Math.random()*4294967296)>>>0),u=Math.max(38,Math.min(60,innerWidth/22)),step=u*.62,pts=[];
    g.fillStyle='#2c2c35';g.fillRect(0,0,c.width,c.height);
    for(let y=-u;y<c.height+u;y+=step)for(let x=-u;x<c.width+u;x+=step)pts.push([x+(r()-.5)*step,y+(r()-.5)*step]);
    for(let i=pts.length-1;i>0;i--){const j=r()*(i+1)|0;[pts[i],pts[j]]=[pts[j],pts[i]];}
    pts.forEach(p=>cube(p[0],p[1],u*(.8+r()*.5),r()*6.283,base[r()*base.length|0],r()*3|0));
    g.fillStyle='rgba(12,12,20,.42)';g.fillRect(0,0,c.width,c.height);
  }
  // 2D drawing above is only the fallback, used when the 3D background cannot start (no WebGL, file://).
  function fallback(){c.style.display='block';draw();let t;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(draw,150);});}
  c.style.display='none';
  import('./bg3d.js').then(m=>m.start()).catch(e=>{console.warn('3D background unavailable, using 2D:',e);fallback();});
})();
