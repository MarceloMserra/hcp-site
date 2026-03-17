// ===================== utilidades =====================
async function getJSON(path) {
  try {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw 0;
    return await r.json();
  } catch (err) {
    console.error("Error fetching JSON:", err);
    return null;
  }
}
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}
function formatCurrency(v) {
  try { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  catch { return "R$ " + v; }
}

const asArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const pick = (obj, keys, def = undefined) => {
  if (!obj) return def;
  for (const k of keys) if (obj[k] !== undefined) return obj[k];
  return def;
};

// ===================== Cloudinary =====================
const CLOUDINARY_CLOUD = "dqfkwolc8";
function isCloudinary(url) { return /^https?:\/\/res\.cloudinary\.com\//.test(url || ""); }

function cloudPortrait(url, { w = 600 } = {}) {
  if (!url || !isCloudinary(url)) return url;
  const parts = url.split("/upload/");
  if (parts.length > 1) {
    const firstSeg = (parts[1] || "").split("/")[0];
    if (/\b(c_|w_|h_|ar_|g_|z_)/.test(firstSeg)) return url;
  }
  return url.replace("/upload/", `/upload/f_auto,q_auto,dpr_auto,c_fill,g_auto:subject,ar_3:4,w_${w},z_0.9/`);
}
function cloudAny(url, { w = 600 } = {}) {
  if (!url) return url;
  if (isCloudinary(url)) return cloudPortrait(url, { w });
  const abs = new URL(url, window.location.origin).href;
  const t   = `f_auto,q_auto,dpr_auto,c_fill,g_auto:subject,ar_3:4,w_${w},z_0.9`;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/${t}/${encodeURIComponent(abs)}`;
}
function cloudAnySrcset(url, widths = [400, 600, 900]) {
  return widths.map(w => `${cloudAny(url, { w })} ${w}w`).join(", ");
}

// ===================== Normalizadores =====================
function normalizePhotoItem(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return x.src || x.url || x.imagem || x.image || x.foto || x.path || null;
}
function normalizeVideoItem(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return x.src || x.url || x.video || null;
}
function normalizeAlbum(raw) {
  if (!raw) return null;
  const titulo    = pick(raw, ["titulo","title","nome"], "");
  const descricao = pick(raw, ["descricao","descrição","description"], "");
  const capa      = normalizePhotoItem(pick(raw, ["capa","cover","thumb","thumbnail","imagem"]));
  const fotosLists  = asArray(pick(raw, ["fotos","fotos_multi","fotos_multiplas","fotos_multipla","imagens","images","photos"], [])).flat();
  const videosLists = asArray(pick(raw, ["videos","vídeos","clips"], [])).flat();
  const itensMistos = asArray(pick(raw, ["itens","items"], [])).flat();
  const itens = [];
  for (const f of fotosLists) {
    const src = normalizePhotoItem(f);
    if (src) itens.push({ tipo:"foto", src, alt:(typeof f==="object" && (f.alt||f.legenda||f.caption))||"" });
  }
  for (const v of videosLists) {
    const src = normalizeVideoItem(v);
    if (src) itens.push({ tipo:"video", src });
  }
  for (const it of itensMistos) {
    if (!it) continue;
    const t = (it.tipo||it.type||"").toLowerCase();
    if (t==="video"||t==="vídeo") {
      const src = normalizeVideoItem(it);
      if (src) itens.push({ tipo:"video", src });
    } else {
      const src = normalizePhotoItem(it);
      if (src) itens.push({ tipo:"foto", src, alt:it.alt||it.legenda||it.caption||"" });
    }
  }
  return { titulo, descricao, capa, itens };
}
function isVideo(url) { return (url||"").match(/youtube\.com|youtu\.be|vimeo\.com|\.mp4($|\?)/i); }

// ===================== Count-up helper =====================
function countUp(el, target, duration = 1800) {
  const start = performance.now();
  const step  = (now) => {
    const t    = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(ease * target) + "%";
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ===================== APP PRINCIPAL =====================
(async () => {
  const site       = await getJSON("data/site.json")        || {};
  const header     = await getJSON("data/header.json")      || {};
  const footer     = await getJSON("data/footer.json")      || {};
  const coord      = await getJSON("data/coordenacao.json") || {};
  const membros    = await getJSON("data/membros.json")     || {};
  const galeriaD   = await getJSON("data/galeria.json")     || {};
  const doacoes    = await getJSON("data/doacoes.json")     || {};
  const objetivosD = await getJSON("data/objetivos.json")   || {};
  const agendaD    = await getJSON("data/agenda.json")      || {};
  const contato    = await getJSON("data/contato.json")     || {};

  // ─── HERO ─────────────────────────────────────────────────────
  const sloganEl = document.getElementById("slogan");
  const lemaEl   = document.getElementById("lema");
  if (sloganEl) sloganEl.textContent = site.slogan || "";
  if (lemaEl)   lemaEl.textContent   = site.lema   || "";

  const hero = document.getElementById("home");
  if (hero && site.hero) hero.style.backgroundImage = `url('${site.hero}')`;
  const heroOverlay = document.getElementById("hero-overlay");
  if (heroOverlay) heroOverlay.style.background = `rgba(0,0,0,${site.tema?.hero_overlay ?? 0.55})`;

  // ─── HEADER ───────────────────────────────────────────────────
  const logo = document.getElementById("logo-img");
  if (logo && header.logo) logo.src = header.logo;

  const logoLink = document.getElementById("logo-link");
  if (logoLink) logoLink.addEventListener("click", (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); });

  const nav         = document.getElementById("nav-links");
  const mobileLinks = document.getElementById("mobile-links");
  (header.menu || []).forEach((item) => {
    const a = el("a", "nav-link", item.text);
    a.href = item.url;
    if (nav) nav.appendChild(a);

    const am = el("a", "block py-2 px-1 text-gray-400 hover:text-yellow-400 font-medium transition text-sm border-b border-white/5 last:border-0", item.text);
    am.href = item.url;
    if (mobileLinks) mobileLinks.appendChild(am);
  });

  const btn            = document.getElementById("mobile-menu-button");
  const menu           = document.getElementById("mobile-menu");
  const mobileMenuIcon = document.getElementById("mobile-menu-icon");
  const closeMenu = () => {
    if (menu) { menu.classList.add("hidden"); if (mobileMenuIcon) mobileMenuIcon.className = "fas fa-bars text-xl"; }
  };
  if (btn && menu && mobileMenuIcon) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("hidden");
      mobileMenuIcon.className = menu.classList.contains("hidden") ? "fas fa-bars text-xl" : "fas fa-times text-xl";
    });
    window.addEventListener("scroll", closeMenu, { passive: true });
    document.addEventListener("click", (e) => {
      if (!menu.classList.contains("hidden") && !menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
    });
    if (mobileLinks) mobileLinks.addEventListener("click", (e) => { if (e.target.tagName === "A") closeMenu(); });
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id && id.startsWith("#")) {
        const elTarget = document.querySelector(id);
        if (elTarget) {
          e.preventDefault();
          const headerH = document.getElementById("main-header").offsetHeight;
          window.scrollTo({ top: elTarget.offsetTop - headerH, behavior: "smooth" });
          closeMenu();
        }
      }
    });
  });

  // ─── TIMELINE ─────────────────────────────────────────────────
  const tl = document.getElementById("timeline");
  (site.timeline || []).forEach((t, i) => {
    const box = el("div", "relative reveal");
    box.style.transitionDelay = `${i * 110}ms`;
    box.innerHTML = `
      <div class="absolute -left-[3.1rem] md:-left-[3.6rem] top-2 w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow-lg ring-2 ring-yellow-400/30 z-10"></div>
      <div class="bg-white rounded-2xl shadow-sm p-7 border border-gray-100 tilt hover:border-yellow-100/60"
           style="transition:transform .4s ease,box-shadow .4s ease,border-color .3s ease">
        <span class="inline-block text-[.65rem] font-extrabold tracking-[.25em] text-yellow-600 uppercase mb-2
                     bg-yellow-50 border border-yellow-100 px-3 py-1 rounded-full">${t.ano || ""}</span>
        <h3 class="text-2xl font-bold text-[#0b1120] mt-2 mb-2">${t.titulo || ""}</h3>
        <p class="text-gray-500 leading-relaxed text-sm">${t.texto || ""}</p>
      </div>`;
    if (tl) tl.appendChild(box);
  });

  // ─── COORDENAÇÃO ──────────────────────────────────────────────
  const coordGrid = document.getElementById("coordenacao-grid");
  const equipe = coord.equipe || coord.lista || [];
  equipe.forEach((p, i) => {
    const foto   = cloudAny(p.foto);
    const srcset = cloudAnySrcset(p.foto);
    const c = el("div", "rounded-2xl overflow-hidden tilt reveal group cursor-default");
    c.style.cssText = `transition:transform .4s ease,box-shadow .4s ease; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);`;
    c.style.transitionDelay = `${i * 75}ms`;
    c.innerHTML = `
      <div class="overflow-hidden" style="aspect-ratio:3/4">
        <img src="${foto||""}"
             ${srcset ? `srcset="${srcset}"` : ""}
             sizes="(min-width:1280px) 300px,(min-width:1024px) 25vw,(min-width:640px) 33vw,100vw"
             class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
             loading="lazy" alt="${p.nome||""}">
      </div>
      <div class="p-5" style="background:rgba(255,255,255,.04)">
        <h3 class="text-xl font-bold text-white">${p.nome||""}</h3>
        ${p.cargo    ? `<span class="inline-block mt-2 text-[.68rem] font-bold tracking-widest uppercase"
                              style="color:var(--gold)">${p.cargo}</span>` : ""}
        ${p.descricao ? `<p class="text-sm text-gray-400 mt-2 leading-relaxed">${p.descricao}</p>` : ""}
      </div>`;
    if (coordGrid) coordGrid.appendChild(c);
  });
  if (coordGrid && equipe.length === 0) {
    const sec = document.getElementById("coordenacao");
    if (sec) sec.classList.add("hidden");
  }

  // ─── MEMBROS ──────────────────────────────────────────────────
  const filters      = ["Todos", "1º Tenor", "2º Tenor", "Barítono", "Baixo"];
  const naipeFilters = document.getElementById("naipe-filters");
  let filtroAtual    = "Todos";

  filters.forEach((f) => {
    const b = el("button", "f-btn" + (f === filtroAtual ? " active" : ""), f);
    b.addEventListener("click", () => {
      filtroAtual = f;
      if (naipeFilters) [...naipeFilters.children].forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      renderMembros();
    });
    if (naipeFilters) naipeFilters.appendChild(b);
  });

  function renderMembros() {
    const grid = document.getElementById("members-grid");
    if (!grid) return;
    grid.innerHTML = "";
    (membros.membros || membros.lista || []).forEach((m, i) => {
      const match = filtroAtual === "Todos" || (m.naipes || [m.naipe]).includes(filtroAtual);
      if (!match) return;
      const foto   = cloudAny(m.foto);
      const srcset = cloudAnySrcset(m.foto);
      const badges = (m.naipes || [m.naipe])
        .filter(Boolean)
        .map(n => `<span style="font-size:.6rem;font-weight:800;letter-spacing:.05em;background:rgba(201,168,76,.2);color:var(--gold-light);padding:2px 8px;border-radius:999px">${n}</span>`)
        .join("");
      const card = el("div", "relative rounded-2xl overflow-hidden shadow-md portrait-card group cursor-pointer reveal");
      card.style.transitionDelay = `${(i % 5) * 55}ms`;
      card.innerHTML = `
        <div style="aspect-ratio:3/4">
          <img src="${foto||""}" ${srcset?`srcset="${srcset}"`:""}
               sizes="(min-width:1280px) 20vw,(min-width:1024px) 25vw,(min-width:640px) 33vw,50vw"
               class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
               loading="lazy" alt="${m.nome||""}">
        </div>
        <div class="portrait-overlay"></div>
        <div class="absolute bottom-0 inset-x-0 p-4 text-white translate-y-1 group-hover:translate-y-0 transition-transform duration-350">
          <div class="flex flex-wrap gap-1 mb-1.5" style="opacity:0;transition:opacity .35s ease" data-badges>
            ${badges}
          </div>
          <h3 class="text-base font-bold leading-tight drop-shadow">${m.nome||""}</h3>
          ${m.bio ? `<p class="text-xs text-gray-300 mt-0.5 line-clamp-2 leading-snug">${m.bio}</p>` : ""}
        </div>`;
      card.addEventListener("mouseenter", () => { const b = card.querySelector("[data-badges]"); if (b) b.style.opacity="1"; });
      card.addEventListener("mouseleave", () => { const b = card.querySelector("[data-badges]"); if (b) b.style.opacity="0"; });
      grid.appendChild(card);
    });
  }
  renderMembros();

  // ─── GALERIA ──────────────────────────────────────────────────
  const albumsGrid = document.getElementById("albums-grid");
  const rawAlbuns  =
    pick(galeriaD, ["albuns","álbuns","albums","lista"]) ||
    pick(galeriaD?.galeria, ["albuns","álbuns","albums","lista"]) || [];

  if (albumsGrid) {
    const albuns = asArray(rawAlbuns).map(normalizeAlbum).filter(Boolean);
    albumsGrid.innerHTML = "";
    albuns.forEach((a, i) => albumsGrid.appendChild(albumCard(a, i)));
  }

  function albumCard(album, idx) {
    const capa = normalizePhotoItem(album.capa) || "";
    const card = el("a", "relative block rounded-2xl overflow-hidden tilt reveal group cursor-pointer");
    card.style.cssText = `transition:transform .4s ease,box-shadow .4s ease;`;
    card.style.transitionDelay = `${(idx % 3) * 75}ms`;
    card.href = `/album.html?id=${idx}`;
    card.innerHTML = `
      <div class="aspect-video overflow-hidden">
        <img src="${capa}" alt="${album.titulo||""}"
             class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
             loading="lazy">
      </div>
      <div class="album-overlay"></div>
      <div class="absolute bottom-0 inset-x-0 p-6 text-white translate-y-1 group-hover:translate-y-0 transition-transform duration-350">
        <h3 class="text-xl font-bold mb-1 drop-shadow">${album.titulo||""}</h3>
        ${album.descricao ? `<p class="text-sm text-gray-300 mb-3 line-clamp-2">${album.descricao}</p>` : ""}
        <span style="font-size:.65rem;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--gold-light)">
          Ver álbum →
        </span>
      </div>`;
    return card;
  }

  // ─── DOAÇÕES ──────────────────────────────────────────────────
  const metaEl        = document.getElementById("meta-total");
  const arrEl         = document.getElementById("valor-arrecadado");
  const bar           = document.getElementById("progress");
  const doacoesTitulo = document.getElementById("doacoes-titulo");

  if (metaEl && arrEl && bar && doacoesTitulo) {
    const meta = Number(doacoes.meta_total || 0);
    const arr  = Number(doacoes.arrecadado || 0);
    const pct  = meta ? Math.min(100, Math.round((arr / meta) * 100)) : 0;

    doacoesTitulo.textContent = doacoes.nome_da_meta || "Doações";
    metaEl.textContent        = "";
    arrEl.textContent         = "0%";

    // Trigger count-up + bar when section enters viewport
    const doacaoObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          countUp(arrEl, pct);
          setTimeout(() => {
            bar.style.width = pct + "%";
            bar.classList.add("glowing");
          }, 200);
          doacaoObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    doacaoObs.observe(arrEl);
  }

  const pixChave = document.getElementById("pix-chave");
  const pixQr    = document.getElementById("pix-qr");
  if (pixChave) pixChave.textContent = doacoes.pix_chave || doacoes.pix?.chave || "";
  if (pixQr && doacoes.pix_qr) pixQr.src = doacoes.pix_qr;
  else if (pixQr) pixQr.style.display = "none";

  const doacaoLinks = document.getElementById("doacao-links");
  (doacoes.links || []).forEach((l) => {
    const li = el("li");
    li.innerHTML = `
      <a class="flex items-center gap-2 text-sm font-semibold transition"
         style="color:var(--gold);transition:color .2s"
         onmouseover="this.style.color='var(--gold-light)'" onmouseout="this.style.color='var(--gold)'"
         href="${l.url}" target="_blank" rel="noopener">
        <i class="fas fa-external-link-alt" style="font-size:.65rem;opacity:.7"></i>${l.nome}
      </a>`;
    if (doacaoLinks) doacaoLinks.appendChild(li);
  });

  // ─── OBJETIVOS ────────────────────────────────────────────────
  const objetivosGrid = document.getElementById("objetivos-grid");
  const metasGrid     = document.getElementById("metas-grid");

  if (objetivosGrid) {
    (objetivosD.objetivos || []).forEach((o, i) => {
      const card = el("div", "bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100 tilt reveal");
      card.style.cssText = `transition:transform .4s ease,box-shadow .4s ease,border-color .3s ease;`;
      card.style.transitionDelay = `${i * 75}ms`;
      card.innerHTML = `
        ${o.icone ? `
        <div class="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
             style="background:linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.04));border:1px solid rgba(201,168,76,.2)">
          <i class="${o.icone} text-2xl" style="color:var(--gold)"></i>
        </div>` : ""}
        <h3 class="text-2xl font-bold text-[#0b1120] mb-3">${o.titulo||""}</h3>
        <p class="text-gray-500 leading-relaxed text-sm">${o.descricao||""}</p>`;
      card.addEventListener("mouseenter", () => { card.style.borderColor = "rgba(201,168,76,.3)"; });
      card.addEventListener("mouseleave", () => { card.style.borderColor = ""; });
      objetivosGrid.appendChild(card);
    });
  }

  if (metasGrid) {
    (objetivosD.metas || []).forEach((m, i) => {
      const card  = el("div", "rounded-2xl p-7 border reveal");
      card.style.cssText = `background:#faf8f3; border-color:#f0ebe0;`;
      card.style.transitionDelay = `${i * 80}ms`;
      const atual = Number(m.valor_atual || 0);
      const total = Number(m.valor_total || 0);
      const pct   = total > 0 ? Math.min(100, Math.round((atual / total) * 100)) : 0;
      card.innerHTML = `
        <h3 class="text-xl font-bold text-[#0b1120] mb-2">${m.titulo||""}</h3>
        ${m.descricao ? `<p class="text-sm text-gray-500 mb-5 leading-relaxed">${m.descricao}</p>` : ""}
        <div class="flex justify-between text-xs text-gray-400 mb-2">
          <span class="font-semibold text-gray-600">Progresso</span>
          <span class="font-bold text-base" style="color:var(--gold)" data-pct="${pct}">0%</span>
        </div>
        <div class="h-2.5 rounded-full overflow-hidden" style="background:#e5e0d5">
          <div class="h-2.5 rounded-full" data-bar
               style="width:0%;background:linear-gradient(90deg,var(--gold),var(--gold-light));transition:width 1.6s cubic-bezier(.4,0,.2,1)">
          </div>
        </div>`;

      // Animate when visible
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const barEl = card.querySelector("[data-bar]");
            const pctEl = card.querySelector("[data-pct]");
            if (barEl) setTimeout(() => { barEl.style.width = pct + "%"; }, 200);
            if (pctEl) countUp(pctEl, pct);
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.4 });
      obs.observe(card);
      metasGrid.appendChild(card);
    });
  }

  // ─── AGENDA ───────────────────────────────────────────────────
  const agendaLista = document.getElementById("agenda-lista");
  if (agendaLista) {
    const eventos = agendaD.eventos || [];
    eventos.sort((a, b) => new Date(a.data) - new Date(b.data));

    const tipos       = ["Todos", ...new Set(eventos.map(e => e.tipo))];
    const agendaFiltros = document.getElementById("agenda-filtros");
    let filtroAgenda  = "Todos";

    const badgeMap  = { "Ensaio":"badge-ensaio","Culto":"badge-culto","Apresentação":"badge-apresentacao","Turnê":"badge-turne" };
    const accentMap = { "Ensaio":"#1d4ed8","Culto":"#d97706","Apresentação":"#16a34a","Turnê":"#7c3aed" };

    const renderEventos = () => {
      agendaLista.innerHTML = "";
      eventos.filter(e => filtroAgenda === "Todos" || e.tipo === filtroAgenda)
        .forEach((e, i) => {
          const data = new Date(e.data);
          const dia  = data.toLocaleDateString("pt-BR", { day:"2-digit" });
          const mes  = data.toLocaleDateString("pt-BR", { month:"short" }).replace(".","");
          const ano  = data.getFullYear();
          const hora = data.toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
          const bCls = badgeMap[e.tipo] || "badge-default";
          const acc  = accentMap[e.tipo] || "#64748b";

          const ev = el("div", "flex items-stretch bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 tilt reveal");
          ev.style.cssText = `transition:transform .4s ease,box-shadow .4s ease;`;
          ev.style.transitionDelay = `${i * 55}ms`;
          ev.innerHTML = `
            <div class="w-1.5 flex-shrink-0" style="background:${acc}"></div>
            <div class="flex flex-col items-center justify-center text-white px-5 py-5 min-w-[76px] text-center flex-shrink-0"
                 style="background:var(--navy-2)">
              <span class="text-3xl font-bold leading-none">${dia}</span>
              <span class="text-[.65rem] font-bold uppercase tracking-widest text-gray-400 mt-0.5">${mes}</span>
              <span class="text-[.6rem] text-gray-600 mt-0.5">${ano}</span>
            </div>
            <div class="flex-1 py-4 px-5">
              <span class="badge ${bCls} mb-2">${e.tipo}</span>
              <h3 class="text-xl font-bold text-[#0b1120] mb-1 leading-tight">${e.titulo||""}</h3>
              ${e.descricao ? `<p class="text-gray-500 text-sm mb-2 leading-snug">${e.descricao}</p>` : ""}
              <div class="flex flex-wrap gap-4 text-gray-400 text-xs mt-2">
                <span class="flex items-center gap-1.5"><i class="fas fa-clock text-[10px]"></i>${hora}</span>
                <span class="flex items-center gap-1.5"><i class="fas fa-map-marker-alt text-[10px]"></i>${e.local||""}</span>
              </div>
            </div>`;
          agendaLista.appendChild(ev);
        });
    };

    tipos.forEach(t => {
      const b = el("button", "f-btn" + (t === filtroAgenda ? " active" : ""), t);
      b.addEventListener("click", () => {
        filtroAgenda = t;
        [...agendaFiltros.children].forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        renderEventos();
      });
      agendaFiltros.appendChild(b);
    });
    renderEventos();
  }

  // ─── CONTATO ──────────────────────────────────────────────────
  const contatoEmail = document.getElementById("contato-email");
  const contatoTel   = document.getElementById("contato-telefone");
  const contatoEnd   = document.getElementById("contato-endereco");
  if (contatoEmail) contatoEmail.textContent = contato.email    || "";
  if (contatoTel)   contatoTel.textContent   = contato.telefone || "";
  if (contatoEnd)   contatoEnd.textContent   = contato.endereco || "";

  // ─── FOOTER ───────────────────────────────────────────────────
  const footerLogo = document.getElementById("footer-logo");
  if (footerLogo) footerLogo.src = footer.logo || header.logo || "";
  const fText = document.getElementById("footer-text");
  if (fText) fText.textContent = footer.texto || "";
  const fl = document.getElementById("footer-links");
  (footer.links || []).forEach((l) => {
    const a = el("a", "text-sm font-medium transition", l.nome);
    a.href = l.url;
    a.style.color = "#4b5563";
    a.addEventListener("mouseenter", () => { a.style.color = "var(--gold)"; });
    a.addEventListener("mouseleave", () => { a.style.color = "#4b5563"; });
    if (fl) fl.appendChild(a);
  });
})();
