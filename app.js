(async function(){
  // Load external config
  const scene = document.getElementById('scene');
  const res = await fetch('config/exhibition.json');
  const cfg = await res.json();

  // Apply theme basics if present
  if (cfg.app?.bgColor) {
    scene.setAttribute('background', `color: ${cfg.app.bgColor}`);
    document.body.style.background = cfg.app.bgColor;
  }

  // Camera rig setup
  const rig = document.getElementById('rig');
  const cam = document.getElementById('cam');
  const start = cfg.app?.startPosition || {x: -24, y: 1.6, z: -10};
  const move = cfg.app?.movement || {speed: 0.12, accel: 40};
  rig.setAttribute('position', `${start.x} ${start.y} ${start.z}`);
  rig.setAttribute('movement-controls', `speed:${move.speed}; fly:false`);
  cam.setAttribute('wasd-controls', `acceleration:${move.accel}`);

  // a-assets (images + audio)
  const assets = document.createElement('a-assets');
  assets.setAttribute('timeout','30000');
  assets.setAttribute('crossorigin','anonymous');
  const imgMap = {};
  if (cfg.assets?.images) {
    Object.entries(cfg.assets.images).forEach(([key, url])=>{
      const img = document.createElement('img');
      const id = `img-${key}`;
      img.id = id; img.src = url; img.crossOrigin = 'anonymous';
      imgMap[key] = `#${id}`;
      assets.appendChild(img);
    });
  }
  // Audio (bgm + artwork)
  if (cfg.audio?.bgm) {
    const a = document.createElement('audio');
    a.id='bgm'; a.src=cfg.audio.bgm; a.preload='auto';
    assets.appendChild(a);
  }
  const audMap = {};
  if (cfg.assets?.audio) {
    Object.entries(cfg.assets.audio).forEach(([key, url])=>{
      const au = document.createElement('audio'); au.id = `aud-${key}`; au.src=url; au.preload='auto';
      audMap[key] = `#${au.id}`;
      assets.appendChild(au);
    });
  }
  scene.appendChild(assets);

  // Utilities
  const ROOM_DEFAULT = { w:18, d:12, h:6, t:0.2 };
  const roomMap = new Map();
  function mkEl(tag, attrs={}){ const e=document.createElement(tag); Object.entries(attrs).forEach(([k,v])=> e.setAttribute(k,v)); return e; }
  function addId(el){ if(!el.id){ el.id = 'n'+Math.random().toString(36).slice(2,8); } return el.id; }

  // Build floors and map rooms
  (cfg.rooms||[]).forEach(r=>{
    const size = {
      w: r.size?.w ?? ROOM_DEFAULT.w,
      d: r.size?.d ?? ROOM_DEFAULT.d,
      h: r.size?.h ?? ROOM_DEFAULT.h,
      t: ROOM_DEFAULT.t
    };
    roomMap.set(r.id, { ...size, x: r.center.x, z: r.center.z });
    const floor = mkEl('a-plane',{ position:`${r.center.x} 0 ${r.center.z}`, rotation:'-90 0 0', width:size.w, height:size.d, color:'#262626'});
    scene.appendChild(floor);
  });

  // Walls + doors
  const links = cfg.links || [];
  function hasLink(roomId, dir){ return links.find(l=>l.from===roomId && l.dir===dir); }
  function mkBox(pos, whd, rot){
    const b=mkEl('a-box',{position:pos, width:whd.w, height:whd.h, depth:whd.d, color:'#f7f7f7'});
    if (rot) b.setAttribute('rotation', rot);
    scene.appendChild(b);
  }
  (cfg.rooms||[]).forEach(r=>{
    const R = roomMap.get(r.id), y=R.h/2, t=R.t;
    const N = {x:R.x, y, z:R.z - R.d/2 + t/2}, S={x:R.x, y, z:R.z + R.d/2 - t/2}, W={x:R.x - R.w/2 + t/2, y, z:R.z}, E={x:R.x + R.w/2 - t/2, y, z:R.z};
    const doorW=(dir)=> (links.find(l=>l.from===r.id && l.dir===dir)?.doorWidth || 3);

    // N/S
    ['N','S'].forEach(dir=>{
      const has = hasLink(r.id, dir);
      const z = (dir==='N'?N.z:S.z);
      if (!has) mkBox(`${R.x} ${y} ${z}`, {w:R.w, h:R.h, d:t});
      else {
        const seg=(R.w - doorW(dir))/2;
        mkBox(`${R.x - (doorW(dir)/2 + seg/2)} ${y} ${z}`, {w:seg,h:R.h,d:t});
        mkBox(`${R.x + (doorW(dir)/2 + seg/2)} ${y} ${z}`, {w:seg,h:R.h,d:t});
        const link = links.find(l=>l.from===r.id && l.dir===dir);
        const to = roomMap.get(link.to);
        const tp = mkEl('a-circle',{class:'teleport', color:'#44aa88', radius:0.6, position:`${R.x} 0.01 ${dir==='N'?R.z - R.d/2 + 1 : R.z + R.d/2 - 1}`, rotation:'-90 0 0', 'data-teleport':`${to.x} 1.6 ${to.z}`});
        scene.appendChild(tp);
        const label = mkEl('a-text',{value:'[다음 방으로]', position:`${R.x} 0.05 ${dir==='N'?R.z - R.d/2 + 1 : R.z + R.d/2 - 1}`, rotation:'-90 0 0', align:'center', width:'3', color:'#cfe'});
        scene.appendChild(label);
      }
    });
    // W/E
    ['W','E'].forEach(dir=>{
      const has = hasLink(r.id, dir);
      const x = (dir==='W'?W.x:E.x);
      if (!has) mkBox(`${x} ${y} ${R.z}`, {w:t, h:R.h, d:R.d}, '0 90 0');
      else {
        const seg=(R.d - doorW(dir))/2;
        mkBox(`${x} ${y} ${R.z - (doorW(dir)/2 + seg/2)}`, {w:t,h:R.h,d:seg}, '0 90 0');
        mkBox(`${x} ${y} ${R.z + (doorW(dir)/2 + seg/2)}`, {w:t,h:R.h,d:seg}, '0 90 0');
        const link = links.find(l=>l.from===r.id && l.dir===dir);
        const to = roomMap.get(link.to);
        const tp = mkEl('a-circle',{class:'teleport', color:'#44aa88', radius:0.6, position:`${dir==='W'? R.x - R.w/2 + 1 : R.x + R.w/2 - 1} 0.01 ${R.z}`, rotation:'-90 0 0', 'data-teleport':`${to.x} 1.6 ${to.z}`});
        scene.appendChild(tp);
      }
    });
  });

  // Teleport component
  AFRAME.registerComponent('teleport-handler', {
    init: function(){
      const rig = document.getElementById('rig');
      this.el.addEventListener('click', ()=>{
        const dest = this.el.getAttribute('data-teleport');
        if (dest && rig) rig.setAttribute('position', dest);
      });
    }
  });
  setTimeout(()=>{ document.querySelectorAll('.teleport').forEach(el=> el.setAttribute('teleport-handler','')); }, 0);

  // Proximity label / Zoom / Audio components
  AFRAME.registerComponent('proximity-label', {
    schema: { label:{type:'selector'}, dist:{default:5} },
    tick: function(){
      if(!this.data.label) return;
      const cam = document.getElementById('cam');
      const p = this.el.object3D.getWorldPosition(new THREE.Vector3());
      const c = cam.object3D.getWorldPosition(new THREE.Vector3());
      const d = p.distanceTo(c);
      this.data.label.setAttribute('visible', d <= this.data.dist);
    }
  });

  const zoomPanel = document.getElementById('zoomPanel');
  const zoomImg = document.getElementById('zoomImg');
  const zoomClose = document.getElementById('zoomClose');
  function openZoom(src){ zoomImg.src = (src.startsWith('#') ? document.querySelector(src).getAttribute('src') : src); zoomPanel.style.display='flex'; }
  function closeZoom(){ zoomPanel.style.display='none'; zoomImg.src=''; }
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeZoom(); });
  zoomPanel.addEventListener('click', closeZoom);
  zoomClose.addEventListener('click', closeZoom);

  AFRAME.registerComponent('click-zoom', {
    init: function(){
      const src = this.el.getAttribute('data-img') || this.el.getAttribute('src');
      this.el.addEventListener('click', ()=> openZoom(src));
    }
  });

  AFRAME.registerComponent('audio-on-click', {
    schema: { id:{default:''} },
    init: function(){
      const id = this.data.id;
      if (!id) return;
      const au = document.querySelector(`#aud-${id}`);
      const url = au && au.getAttribute('src');
      if (!url) return;
      const a = new Audio(url);
      this.el.addEventListener('click', ()=>{ a.currentTime=0; a.play().catch(()=>{}); });
    }
  });

  // Place artworks
  const labelW = 8;
  const showDist = cfg.ui?.labelShowDist ?? 5.0;
  (cfg.artworks||[]).forEach(a=>{
    const R = roomMap.get(a.room);
    if (!R) return;
    let px=R.x, pz=R.z, ry=0, span = (a.wall==='N'||a.wall==='S') ? R.w : R.d;
    if(a.wall==='N') { pz = R.z - R.d/2 + 0.1; ry=0; }
    if(a.wall==='S') { pz = R.z + R.d/2 - 0.1; ry=180; }
    if(a.wall==='W') { px = R.x - R.w/2 + 0.1; ry=90; }
    if(a.wall==='E') { px = R.x + R.w/2 - 0.1; ry=-90; }
    const W=6.5,H=4.9,gap=1, max=Math.max(1, Math.floor((span-2)/(W+gap)));
    const idx=a.idx||0;
    const start = -((max-1)/2)*(W+gap);
    const offset = start + idx*(W+gap);
    let x=px, z=pz; if (a.wall==='N'||a.wall==='S') x = R.x + offset; else z = R.z + offset;

    const srcSel = imgMap[a.img] || a.img; // allow direct URL as fallback
    const aimg = mkEl('a-image',{ src: srcSel, position:`${x} 3 ${z}`, rotation:`0 ${ry} 0`, width:W, height:H });
    aimg.classList.add('artwork');
    aimg.setAttribute('data-img', srcSel);
    scene.appendChild(aimg);

    const label = mkEl('a-entity',{ position:`${x} 1.3 ${z}`, rotation:`0 ${ry} 0`, visible:'false' });
    const bg = mkEl('a-plane',{ width:labelW, height:0.6, color:'#ffffff', opacity:0.9 });
    const text = mkEl('a-text',{ value:a.title||'', align:'center', width:labelW, color:'#222' });
    label.appendChild(bg); label.appendChild(text); scene.appendChild(label);
    aimg.setAttribute('proximity-label', `label:#${addId(label)}; dist:${showDist}`);
    aimg.setAttribute('click-zoom','');

    if (a.audio && audMap[a.audio]) {
      const comp = mkEl('a-entity'); comp.setAttribute('audio-on-click', `id:${a.audio}`); aimg.appendChild(comp);
    }
  });

  // Minimap
  const mapSvg = document.getElementById('mapSvg');
  const scale = cfg.ui?.minimap?.scale ?? 3.0;
  const mapX = (x)=> 150 + x*scale, mapY = (z)=> 110 + z*scale;
  (function drawMapOnce(){
    // Rooms
    (cfg.rooms||[]).forEach(r=>{
      const R = roomMap.get(r.id);
      const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
      rect.setAttribute('x', mapX(R.x) - R.w*scale/2);
      rect.setAttribute('y', mapY(R.z) - R.d*scale/2);
      rect.setAttribute('width', R.w*scale);
      rect.setAttribute('height', R.d*scale);
      rect.setAttribute('fill','#1a1a1a'); rect.setAttribute('stroke','#555'); rect.setAttribute('rx','6');
      mapSvg.appendChild(rect);
      const t = document.createElementNS('http://www.w3.org/2000/svg','text');
      t.setAttribute('x', mapX(R.x)); t.setAttribute('y', mapY(R.z));
      t.setAttribute('fill','#9ad'); t.setAttribute('text-anchor','middle'); t.setAttribute('dominant-baseline','central'); t.setAttribute('font-size','12');
      t.textContent = 'Room ' + r.id; mapSvg.appendChild(t);
    });
    // Links
    (cfg.links||[]).forEach(l=>{
      const A = roomMap.get(l.from), B = roomMap.get(l.to);
      if (!A || !B) return;
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1', mapX(A.x)); line.setAttribute('y1', mapY(A.z));
      line.setAttribute('x2', mapX(B.x)); line.setAttribute('y2', mapY(B.z));
      line.setAttribute('stroke', '#347'); line.setAttribute('stroke-dasharray','4 4');
      mapSvg.appendChild(line);
    });
    const dot = document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('id','youDot'); dot.setAttribute('r','4'); dot.setAttribute('fill','#e6ff6b'); dot.setAttribute('stroke','#333');
    mapSvg.appendChild(dot);
  })();
  function updateYouDot(){
    const p = rig.object3D.position;
    const dot = document.getElementById('youDot');
    if (dot) { dot.setAttribute('cx', mapX(p.x)); dot.setAttribute('cy', mapY(p.z)); }
  }
  AFRAME.registerComponent('tick-updater', { tick(){ updateYouDot(); } });
  rig.setAttribute('tick-updater','');

  // Background music (play after first user gesture)
  if (cfg.audio?.bgm) {
    const bgmEl = new Audio(cfg.audio.bgm);
    const play = ()=>{ bgmEl.loop = true; bgmEl.play().catch(()=>{}); window.removeEventListener('click', play); };
    window.addEventListener('click', play);
  }
})();