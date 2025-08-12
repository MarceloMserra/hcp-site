// Helpers
const $ = (s, p=document) => p.querySelector(s);
const $$ = (s, p=document) => [...p.querySelectorAll(s)];
const fmtBRL = v => v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

// Menu mobile
const btnMenu = $('#btn-menu'), mobile = $('#mobile');
btnMenu?.addEventListener('click', ()=>{
  const open = mobile.classList.toggle('hidden') === false;
  btnMenu.setAttribute('aria-expanded', String(open));
});

// Smooth scroll & close mobile
$$('a[href^="#"]').forEach(a=>{
  a.addEventListener('click', e=>{
    const id = a.getAttribute('href');
    const el = $(id);
    if(el){
      e.preventDefault();
      window.scrollTo({top: el.offsetTop-80, behavior:'smooth'});
      if(!mobile.classList.contains('hidden')) mobile.classList.add('hidden');
    }
  });
});

// Lightbox
const lb = $('#lightbox'), lbImg = $('#lightbox-img');
const openLB = (src, alt) => { lbImg.src = src; lbImg.alt = alt||''; lb.classList.add('open'); document.body.style.overflow='hidden'; };
const closeLB = ()=>{ lb.classList.remove('open'); document.body.style.overflow='auto'; };
$('#close-lightbox')?.addEventListener('click', closeLB);
lb?.addEventListener('click', e=>{ if(e.target===lb) closeLB(); });

// Load data
(async ()=>{
  const site = await fetch('/data/site.json').then(r=>r.json());
  const membros = await fetch('/data/membros.json').then(r=>r.json());
  const galeria = await fetch('/data/galeria.json').then(r=>r.json());
  let agenda = [];
  try { agenda = await fetch('/data/agenda.json').then(r=>r.json()); } catch {}

  // Hero + Footer
  $('#slogan').textContent = site.slogan;
  $('#lema').textContent = site.lema;
  $('#footer-slogan').textContent = `"${site.slogan}"`;
  $('#footer-lema').textContent = `"${site.lema} (Sl 150:6)"`;
  document.documentElement.style.setProperty('--hero', `url('${site.hero || "/img/hero.jpg"}')`);
  $('#ano').textContent = new Date().getFullYear();

  // Socials
  const redes = $('#redes');
  site.redes?.forEach(r=>{
    const a = document.createElement('a');
    a.href = r.url; a.target='_blank'; a.rel='noopener';
    a.className='hover:text-white'; a.innerHTML = `<i class="${r.icon}"></i>`;
    redes.appendChild(a);
  });

  // Agenda
  const ul = $('#lista-agenda');
  agenda.slice(0,4).forEach(ev=>{
    const li = document.createElement('li');
    li.innerHTML = `<span class="text-sky-500 mr-2">•</span>${ev.data} — ${ev.titulo} (${ev.local})`;
    ul.appendChild(li);
  });

  // Timeline
  const tl = $('#timeline');
  site.timeline?.forEach(t=>{
    const card = document.createElement('div');
    card.className = 'relative timeline-item';
    card.innerHTML = `
      <div class="bg-gray-50 p-6 rounded-lg shadow-sm">
        <h3 class="text-xl font-bold text-[color:var(--azul)] mb-1">${t.titulo}</h3>
        <p class="text-slate-600 mb-2">${t.ano}</p>
        <p class="text-slate-700">${t.texto}</p>
        ${t.fotos?.length?`<div class="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
          ${t.fotos.map(f=>`<img src="${f.src}" alt="${f.alt||t.titulo}" class="rounded cursor-pointer hover:opacity-80" loading="lazy">`).join('')}
        </div>`:''}
      </div>`;
    tl.appendChild(card);
    $$('img', card).forEach(img=>img.addEventListener('click',()=>openLB(img.src, img.alt)));
  });

  // Naipe filters
  const naipes = Array.from(new Set(membros.map(m=>m.naipes).flat()));
  const filtros = $('#filtros');
  const mkBtn = (label,val,klass='')=>{
    const b=document.createElement('button');
    b.className=`px-4 py-2 text-sm rounded border bg-white text-slate-700 hover:bg-gray-50 ${klass}`;
    b.dataset.naipe=val; b.textContent=label; return b;
  };
  filtros.appendChild(mkBtn('Todos','all','active-filter'));
  naipes.forEach(n=>filtros.appendChild(mkBtn(n,n)));
  filtros.addEventListener('click',e=>{
    if(e.target.tagName!=='BUTTON')return;
    $$('.active-filter',filtros).forEach(b=>b.classList.remove('active-filter'));
    e.target.classList.add('active-filter');
    renderMembros(e.target.dataset.naipe);
  });

  // Members grid
  const gridM = $('#grid-membros');
  function renderMembros(filtro='all'){
    gridM.innerHTML='';
    membros
      .filter(m=>filtro==='all'||m.naipes.includes(filtro))
      .forEach(m=>{
        const card=document.createElement('article');
        card.className='bg-white rounded-lg shadow overflow-hidden';
        card.innerHTML=`
          <img src="${m.foto}" alt="Foto de ${m.nome}" class="w-full h-64 object-cover" loading="lazy">
          <div class="p-6">
            <h3 class="text-xl font-bold mb-1">${m.nome}</h3>
            <div class="flex flex-wrap gap-1 mb-3">
              ${m.naipes.map(n=>`<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${n}</span>`).join('')}
            </div>
            ${m.bio?`<p class="text-slate-700">${m.bio}</p>`:''}
          </div>`;
        gridM.appendChild(card);
      });
  }
  renderMembros();

  // Gallery
  const sel = $('#album-filter');
  const gridG = $('#grid-galeria');
  const albuns = Array.from(new Set(galeria.map(g=>g.album)));
  albuns.forEach(a=>{
    const opt=document.createElement('option');
    opt.value=a; opt.textContent=a; sel.appendChild(opt);
  });
  function renderGaleria(f='all'){
    gridG.innerHTML='';
    galeria.filter(g=>f==='all'||g.album===f).forEach(foto=>{
      const wrap=document.createElement('div');
      wrap.className='relative group';
      wrap.innerHTML=`
        <img src="${foto.src}" alt="${foto.alt||foto.album}" class="w-full h-48 object-cover rounded cursor-pointer" loading="lazy">
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition grid place-items-center">
          <p class="text-white text-sm font-medium">${foto.titulo||foto.album}</p>
        </div>`;
      gridG.appendChild(wrap);
      $('img',wrap).addEventListener('click',()=>openLB(foto.src,foto.alt||foto.titulo));
    });
  }
  sel.addEventListener('change',()=>renderGaleria(sel.value));
  renderGaleria();

  // Donations
  $('#meta-label').textContent = `Meta: ${fmtBRL(site.doacoes.meta_total)}`;
  $('#arrecadado-label').textContent = `Arrecadado: ${fmtBRL(site.doacoes.arrecadado)}`;
  $('#progress').style.width = `${Math.min(100,(site.doacoes.arrecadado/site.doacoes.meta_total)*100).toFixed(2)}%`;
  $('#pix-chave').textContent = site.doacoes.pix.chave;
  $('#pix-qr').src = site.doacoes.pix.qr || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(site.doacoes.pix.chave)}`;
  $('#copiar-pix').addEventListener('click',()=>navigator.clipboard.writeText(site.doacoes.pix.chave).then(()=>alert('Chave PIX copiada!')));

  const links = $('#links-doacao');
  site.doacoes.links?.forEach(l=>{
    const a=document.createElement('a');
    a.href=l.url; a.target='_blank'; a.rel='noopener';
    a.className='block bg-white hover:bg-gray-100 text-slate-800 font-medium py-2 px-4 rounded border transition';
    a.innerHTML = `<i class="${l.icon} mr-2"></i>${l.nome}`;
    links.appendChild(a);
  });

  const rel = $('#relatorios');
  site.doacoes.relatorios?.forEach(r=>{
    const a=document.createElement('a');
    a.href=r.url; a.target='_blank'; a.rel='noopener';
    a.className='bg-white hover:bg-gray-50 p-4 rounded shadow-sm block';
    a.innerHTML = `<div class="text-[color:var(--azul)] text-xl mb-1"><i class="fas fa-file-pdf"></i></div>
                   <p class="font-medium">${r.titulo}</p><p class="text-sm text-slate-600">Download PDF</p>`;
    rel.appendChild(a);
  });

  // Objectives & Goals
  const gridObj = $('#grid-objetivos');
  site.objetivos?.forEach(o=>{
    const card=document.createElement('article');
    card.className='bg-white p-6 rounded-lg shadow';
    card.innerHTML=`<div class="text-[color:var(--azul)] text-3xl mb-3"><i class="${o.icon}"></i></div>
      <h3 class="text-xl font-bold mb-1">${o.titulo}</h3><p class="text-slate-700">${o.descricao}</p>`;
    gridObj.appendChild(card);
  });

  const gridMetas = $('#grid-metas');
  site.metas?.forEach(m=>{
    const box=document.createElement('div');
    box.className='bg-white p-6 rounded-lg shadow border-l-4 border-[color:var(--azul)]';
    const pct = Math.min(100, (m.atual/m.total)*100);
    box.innerHTML=`<h4 class="text-lg font-bold mb-1">${m.titulo}</h4>
      <p class="text-slate-700 mb-2">${m.descricao}</p>
      <div class="w-full bg-gray-200 rounded-full h-2.5 mb-1"><div class="bg-[color:var(--azul)] h-2.5 rounded-full" style="width:${pct}%"></div></div>
      <p class="text-sm text-slate-600">${m.atual_label || ''}</p>`;
    gridMetas.appendChild(box);
  });

  // Contacts
  const bloco = $('#bloco-contatos');
  bloco.innerHTML = `
    <h3 class="text-xl font-bold text-[color:var(--azul)] mb-4">Informações de Contato</h3>
    <div class="space-y-4">
      <div class="flex gap-3"><i class="fas fa-envelope text-[color:var(--azul)] text-xl mt-1"></i>
        <div><h4 class="font-bold">E-mail</h4><p class="text-slate-700">${site.contato.email}</p></div></div>
      <div class="flex gap-3"><i class="fas fa-phone text-[color:var(--azul)] text-xl mt-1"></i>
        <div><h4 class="font-bold">Telefone</h4><p class="text-slate-700">${site.contato.telefone}</p></div></div>
      ${site.contato.endereco?`<div class="flex gap-3"><i class="fas fa-map-marker-alt text-[color:var(--azul)] text-xl mt-1"></i>
        <div><h4 class="font-bold">Endereço</h4><p class="text-slate-700">${site.contato.endereco}</p></div></div>`:''}
    </div>`;

  // Forms (demo)
  $('#invite-form')?.addEventListener('submit', e=>{ e.preventDefault(); alert('Convite enviado!'); e.target.reset(); });
  $('#contact-form')?.addEventListener('submit', e=>{ e.preventDefault(); alert('Mensagem enviada!'); e.target.reset(); });
})();
