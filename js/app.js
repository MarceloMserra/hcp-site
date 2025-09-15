// ===================== utilidades =====================
async function getJSON(path) {
  try {
    const r = await fetch(path, { cache: "no-store" });
    if (!r.ok) throw 0;
    return await r.json();
  } catch {
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
  try {
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return "R$ " + v;
  }
}

// helpers genéricos
const asArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const pick = (obj, keys, def = undefined) => {
  if (!obj) return def;
  for (const k of keys) if (obj[k] !== undefined) return obj[k];
  return def;
};

// ===================== Cloudinary helpers =====================
const CLOUDINARY_CLOUD = "dqfkwolc8";

function isCloudinary(url) {
  return /^https?:\/\/res\.cloudinary\.com\//.test(url || "");
}

// Força QUALQUER URL (incluindo /img/uploads/...) a passar pelo Cloudinary via fetch
function cloudAny(url, { w = 600, h = null, crop = null, gravity = null } = {}) {
  if (!url) return url;

  // Se já for cloudinary, preserva e aplica transformações
  if (isCloudinary(url)) {
    const parts = url.split("/upload/");
    if (parts.length > 1) {
      // Checa se a URL já tem transformações, se sim, não adiciona mais
      const firstSeg = (parts[1] || "").split("/")[0];
      const hasTransforms = /\b(c_|w_|h_|ar_|g_|z_)/.test(firstSeg);
      if (hasTransforms) return url;
    }
  }

  const t = [
    "f_auto",
    "q_auto",
    "dpr_auto",
    crop ? `c_${crop}` : null,
    gravity ? `g_${gravity}` : null,
    w ? `w_${w}` : null,
    h ? `h_${h}` : null,
  ].filter(Boolean).join(",");
  
  if (isCloudinary(url)) {
    const parts = url.split("/upload/");
    return `${parts[0]}/upload/${t}/${parts[1]}`;
  } else {
    const base = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/`;
    const abs = new URL(url, window.location.origin).href;
    return `${base}${t}/${encodeURIComponent(abs)}`;
  }
}

function cloudSrcset(url, widths = [400, 600, 900], options = {}) {
  return widths.map(w => `${cloudAny(url, { ...options, w })} ${w}w`).join(", ");
}


// ===================== normalizadores (CMS <-> Front) =====================

// aceita string OU objeto e tenta achar a URL da imagem
function normalizePhotoItem(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return (
    x.src ||
    x.url ||
    x.imagem ||
    x.image ||
    x.foto ||
    x.path ||
    null
  );
}

// idem para vídeos (string ou objeto)
function normalizeVideoItem(x) {
  if (!x) return null;
  if (typeof x === "string") return x;
  return x.src || x.url || x.video || null;
}

// transforma qualquer “raw album” em um formato uniforme:
// { titulo, descricao, capa, itens: [{tipo:'foto'|'video', src, alt?}] }
function normalizeAlbum(raw) {
  if (!raw) return null;

  const titulo = pick(raw, ["titulo", "title", "nome"], "");
  const descricao = pick(raw, ["descricao", "descrição", "description"], "");
  const capa = normalizePhotoItem(
    pick(raw, ["capa", "cover", "thumb", "thumbnail", "imagem"])
  );

  // possíveis nomes para lista de fotos
  const fotosLists = asArray(pick(raw, ["fotos", "fotos_multi", "fotos_multiplas", "fotos_multipla", "imagens", "images", "photos"], []))
    .flat();

  // possíveis nomes para lista de vídeos
  const videosLists = asArray(pick(raw, ["videos", "vídeos", "clips"], []))
    .flat();

  // algumas coleções salvam um campo "itens"/"items" já misto
  const itensMistos = asArray(pick(raw, ["itens", "items"], [])).flat();

  const itens = [];

  // fotos explícitas
  for (const f of fotosLists) {
    const src = normalizePhotoItem(f);
    if (src) {
      itens.push({
        tipo: "foto",
        src,
        alt: (typeof f === "object" && (f.alt || f.legenda || f.caption)) || "",
      });
    }
  }

  // vídeos explícitos
  for (const v of videosLists) {
    const src = normalizeVideoItem(v);
    if (src) {
      itens.push({ tipo: "video", src });
    }
  }

  // itens já mistos (foto/video)
  for (const it of itensMistos) {
    if (!it) continue;
    const t = (it.tipo || it.type || "").toLowerCase();
    if (t === "video" || t === "vídeo") {
      const src = normalizeVideoItem(it);
      if (src) itens.push({ tipo: "video", src });
    } else {
      const src = normalizePhotoItem(it);
      if (src) itens.push({ tipo: "foto", src, alt: it.alt || it.legenda || it.caption || "" });
    }
  }

  return { titulo, descricao, capa, itens };
}

// detecta vídeo por padrão
function isVideo(url) {
  return (url || "").match(/youtube\.com|youtu\.be|vimeo\.com|\.mp4($|\?)/i);
}

// ===================== app principal =====================
(async () => {
  const site = await getJSON("data/site.json") || {};
  const header = await getJSON("data/header.json") || {};
  const footer = await getJSON("data/footer.json") || {};
  const coord = await getJSON("data/coordenacao.json") || {};
  const membros = await getJSON("data/membros.json") || {};
  const galeriaD = await getJSON("data/galeria.json") || {};
  const doacoes = await getJSON("data/doacoes.json") || {};
  const contato = await getJSON("data/contato.json") || {};

  // ---------- HERO ----------
  const slogan = document.getElementById("slogan");
  const lema = document.getElementById("lema");
  if (slogan) slogan.textContent = site.slogan || "";
  if (lema) lema.textContent = site.lema || "";

  const hero = document.getElementById("home");
  if (hero && site.hero) hero.style.backgroundImage = `url('${site.hero}')`;
  const heroOverlay = document.getElementById("hero-overlay");
  if (heroOverlay) heroOverlay.style.background = `rgba(0,0,0,${site.tema?.hero_overlay ?? 0.45})`;

  // ---------- HEADER ----------
  const logo = document.getElementById("logo-img");
  if (logo && header.logo) logo.src = header.logo;

  const logoLink = document.getElementById("logo-link");
  if (logoLink) {
    logoLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const nav = document.getElementById("nav-links");
  const mobileLinks = document.getElementById("mobile-links");
  (header.menu || []).forEach((item) => {
    const a = el("a", "text-gray-700 hover:text-blue-700 font-medium", item.text);
    a.href = item.url;
    if (nav) nav.appendChild(a);

    const am = a.cloneNode(true);
    am.className = "block py-2 text-gray-700 hover:text-blue-700 font-medium";
    if (mobileLinks) mobileLinks.appendChild(am);
  });

  const btn = document.getElementById("mobile-menu-button");
  const menu = document.getElementById("mobile-menu");
  const mobileMenuIcon = document.getElementById("mobile-menu-icon");

  const closeMenu = () => {
    if (menu) {
      menu.classList.add("hidden");
      if (mobileMenuIcon) mobileMenuIcon.className = "fas fa-bars text-2xl";
    }
  };

  if (btn && menu && mobileMenuIcon) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      menu.classList.toggle("hidden");
      mobileMenuIcon.className = menu.classList.contains("hidden")
        ? "fas fa-bars text-2xl"
        : "fas fa-times text-2xl";
    });

    window.addEventListener("scroll", closeMenu, { passive: true });
    document.addEventListener("click", (e) => {
      if (!menu.classList.contains("hidden")) {
        const clickInside = menu.contains(e.target) || btn.contains(e.target);
        if (!clickInside) closeMenu();
      }
    });
    if (mobileLinks) {
      mobileLinks.addEventListener("click", (e) => {
        if (e.target.tagName === "A") closeMenu();
      });
    }
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id && id.startsWith("#")) {
        const elTarget = document.querySelector(id);
        if (elTarget) {
          e.preventDefault();
          window.scrollTo({ top: elTarget.offsetTop - 80, behavior: "smooth" });
        }
      }
    });
  });

  // ---------- TIMELINE ----------
  const tl = document.getElementById("timeline");
  (site.timeline || []).forEach((t) => {
    const box = el("div", "bg-gray-50 p-4 rounded shadow");
    box.innerHTML = `
      <h3 class="text-xl font-bold text-blue-900 mb-1">${t.titulo || ""}</h3>
      <p class="text-gray-600 mb-2">${t.ano || ""}</p>
      <p class="text-gray-700">${t.texto || ""}</p>`;
    if (tl) tl.appendChild(box);
  });

  // ---------- COORDENAÇÃO ----------
  const coordGrid = document.getElementById("coordenacao-grid");
  const equipe = coord.equipe || coord.lista || [];
  equipe.forEach((p) => {
    const foto = cloudAny(p.foto, { w: 600, crop: 'fill', gravity: 'face', ar: '3:4' });
    const srcset = cloudSrcset(p.foto, [300, 600], { crop: 'fill', gravity: 'face', ar: '3:4' });
    const c = el("div", "bg-white rounded-lg shadow overflow-hidden cursor-pointer group");
    c.innerHTML = `
      <div class="h-56 overflow-hidden">
        <img
          src="${foto || ""}"
          ${srcset ? `srcset="${srcset}"` : ""}
          sizes="(min-width:1280px) 300px, (min-width:1024px) 25vw, (min-width:640px) 33vw, 100vw"
          class="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
          alt="${p.nome || ""}">
      </div>
      <div class="p-4">
        <h3 class="text-lg font-bold">${p.nome || ""}</h3>
        ${p.cargo ? `<span class="inline-block mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${p.cargo}</span>` : ""}
        ${p.descricao ? `<p class="text-sm text-gray-600 mt-2">${p.descricao}</p>` : ""}
      </div>`;
    if (coordGrid) coordGrid.appendChild(c);
  });
  if (coordGrid && equipe.length === 0) {
    const sec = document.getElementById("coordenacao");
    if (sec) sec.classList.add("hidden");
  }

  // ---------- MEMBROS ----------
  const filters = ["Todos", "1º Tenor", "2º Tenor", "Barítono", "Baixo"];
  const naipeFilters = document.getElementById("naipe-filters");
  let filtroAtual = "Todos";
  filters.forEach((f) => {
    const b = el("button", "px-4 py-2 rounded border", f);
    if (f === filtroAtual) b.classList.add("bg-blue-900", "text-white");
    b.addEventListener("click", () => {
      filtroAtual = f;
      if (naipeFilters) {
        [...naipeFilters.children].forEach(
          (x) =>
            (x.className =
              "px-4 py-2 rounded border bg-white text-gray-700 hover:bg-gray-50")
        );
      }
      b.className = "px-4 py-2 rounded border bg-blue-900 text-white";
      renderMembros();
    });
    if (naipeFilters) naipeFilters.appendChild(b);
  });

  function renderMembros() {
    const grid = document.getElementById("members-grid");
    if (!grid) return;
    grid.innerHTML = "";
    (membros.membros || membros.lista || []).forEach((m) => {
      const match =
        filtroAtual === "Todos" || (m.naipes || [m.naipe]).includes(filtroAtual);
      if (!match) return;

      const foto = cloudAny(m.foto);
      const srcset = cloudAnySrcset(m.foto);
      const card = el("div", "bg-white rounded-lg shadow overflow-hidden");
      card.innerHTML = `
        <div class="h-72 overflow-hidden">
          <img
            src="${foto || ""}"
            ${srcset ? `srcset="${srcset}"` : ""}
            sizes="(min-width:1280px) 300px, (min-width:1024px) 25vw, (min-width:640px) 33vw, 100vw"
            class="w-full h-full object-cover object-top"
            alt="${m.nome || ""}">
        </div>
        <div class="p-4">
          <h3 class="text-lg font-bold">${m.nome || ""}</h3>
          <div class="flex flex-wrap gap-1 mb-2">
            ${(m.naipes || [m.naipe])
              .filter(Boolean)
              .map(n => `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${n}</span>`)
              .join("")}
          </div>
          ${m.bio ? `<p class="text-gray-700 text-sm">${m.bio}</p>` : ""}
        </div>`;
      grid.appendChild(card);
    });
  }
  renderMembros();

  // ---------- GALERIA (cards → modal) ----------
  const albumsGrid = document.getElementById("albums-grid");
  const albumModal = document.getElementById("album-modal");
  const albumTitle = document.getElementById("album-modal-title");
  const albumContentWrapper = document.getElementById("album-modal-content");
  const albumClose = document.getElementById("album-modal-close");

  // tenta encontrar a lista de álbuns dentro do JSON (flexível)
  const rawAlbuns =
    pick(galeriaD, ["albuns", "álbuns", "albums", "lista"]) ||
    pick(galeriaD?.galeria, ["albuns", "álbuns", "albums", "lista"]) ||
    [];

  if (albumsGrid) {
    const albuns = asArray(rawAlbuns).map(normalizeAlbum).filter(Boolean);
    albumsGrid.innerHTML = "";
    albuns.forEach((a) => albumsGrid.appendChild(albumCard(a)));
  }

  function albumCard(album) {
    const capa = normalizePhotoItem(album.capa) || "";
    const card = el("div", "bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition cursor-pointer group");
    card.innerHTML = `
      <div class="h-48 overflow-hidden">
        <img src="${capa}" alt="${album.titulo || ""}" class="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-[1.02]">
      </div>
      <div class="p-4">
        <h3 class="text-lg font-bold mb-1">${album.titulo || ""}</h3>
        ${album.descricao ? `<p class="text-gray-600 text-sm">${album.descricao}</p>` : ""}
        <span class="mt-3 inline-block text-sky-600 font-medium">Abrir álbum →</span>
      </div>`;
    card.addEventListener("click", () => openAlbumModal(album));
    return card;
  }

  // estado da lightbox p/ navegar
  let LB_ITEMS = [];
  let LB_INDEX = 0;

  function openAlbumModal(album) {
    if (!albumModal) return;
    albumTitle.textContent = album.titulo || "Álbum";
    const albumItems = document.getElementById("album-items");

    albumContentWrapper.classList.remove('p-4');
    albumContentWrapper.innerHTML = '';
    
    const container = el("div", "p-4");
    const grid = el("div", "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3");
    
    container.appendChild(grid);
    albumContentWrapper.appendChild(container);


    // prepara itens normalizados p/ lightbox
    LB_ITEMS = asArray(album.itens).map((item) => {
      const src = item?.src || normalizePhotoItem(item) || normalizeVideoItem(item) || "";
      const tipo = item?.tipo || (isVideo(src) ? "video" : "foto");
      const alt  = item?.alt || item?.legenda || item?.caption || album.titulo || "";
      return { tipo, src, alt };
    });

    // miniaturas (sem corte → object-contain e altura auto)
    LB_ITEMS.forEach((item, i) => {
      const wrap = el("div", "rounded overflow-hidden bg-white/60 p-1 relative");
      if (item.tipo === "video") {
        // thumb de vídeo (iframe só dentro da lightbox)
        const thumb = el("div", "aspect-video bg-black/10 rounded grid place-items-center cursor-pointer");
        thumb.innerHTML = `<span class="text-xs text-gray-700">▶ Vídeo</span>`;
        thumb.addEventListener("click", () => openLightboxIndex(i));
        wrap.appendChild(thumb);
      } else {
        const imgEl = el("img", "w-full h-auto block cursor-pointer");
        imgEl.src = cloudAny(item.src, { w: 900 });
        imgEl.alt = item.alt;
        imgEl.addEventListener("click", () => openLightboxIndex(i));
        wrap.appendChild(imgEl);
      }
      grid.appendChild(wrap);
    });

    albumModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    history.pushState({ albumOpen: true }, "", "#album");
  }

  function closeAlbumModal() {
    if (!albumModal) return;
    albumModal.classList.add("hidden");
    document.body.style.overflow = "auto";
    albumTitle.textContent = "";
    albumContentWrapper.innerHTML = "";
    if (location.hash === "#album") history.replaceState(null, "", " ");
  }

  // fechar com overlay / botão / Esc / back
  if (albumModal) {
    albumModal.addEventListener("click", (e) => {
      if (e.target.dataset.close === "modal" || e.target === albumModal) closeAlbumModal();
    });
  }
  if (albumClose) albumClose.addEventListener("click", closeAlbumModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lightboxIsOpen()) closeAlbumModal();
  });
  window.addEventListener("popstate", () => {
    if (!albumModal.classList.contains("hidden")) closeAlbumModal();
  });

  // ---------- LIGHTBOX ----------
  const lightboxModal = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");

  function ensureLightboxControls() {
    if (!lightboxModal) return;
    let ctrls = document.getElementById("lb-ctrls");
    if (!ctrls) {
      ctrls = el("div", "fixed inset-0 z-50 pointer-events-none");
      ctrls.id = "lb-ctrls";
      lightboxModal.appendChild(ctrls);
    } else {
      ctrls.innerHTML = "";
    }
    const mkBtn = (id, text, posClass) => {
      const b = el("button", `pointer-events-auto bg-black/60 text-white rounded-full w-10 h-10 grid place-items-center hover:bg-black/80 focus:outline-none transition ${posClass}`, text);
      b.id = id;
      return b;
    };
    const prev = mkBtn("lb-prev", "‹", "left-4 top-1/2 -translate-y-1/2");
    const next = mkBtn("lb-next", "›", "right-4 top-1/2 -translate-y-1/2");
    const close = mkBtn("lb-close", "✕", "right-4 top-4");
    
    prev.addEventListener("click", prevLightbox);
    next.addEventListener("click", nextLightbox);
    close.addEventListener("click", closeLightbox);

    ctrls.appendChild(prev);
    ctrls.appendChild(next);
    ctrls.appendChild(close);

    if (LB_ITEMS.length <= 1) {
      prev.classList.add('hidden');
      next.classList.add('hidden');
    }
  }

  function lightboxIsOpen() {
    return lightboxModal && !lightboxModal.classList.contains("hidden");
  }

  function openLightboxIndex(i) {
    if (!lightboxModal) return;
    
    // Garantir que o índice não saia dos limites, mesmo com navegação circular
    LB_INDEX = (i % LB_ITEMS.length + LB_ITEMS.length) % LB_ITEMS.length;

    const item = LB_ITEMS[LB_INDEX];
    
    if (item.tipo === "video") {
      const url = item.src || "";
      const holder = document.getElementById("lightbox-img");
      const videoHtml = `
          <div class="w-full h-full rounded shadow-xl flex items-center justify-center">
            ${
              /youtube\.com|youtu\.be/.test(url)
                ? `<iframe class="w-full h-full" src="https://www.youtube.com/embed/${
                    url.match(/(?:v=|be\/|shorts\/)([A-Za-z0-9_-]{6,})/)
                      ? url.match(/(?:v=|be\/|shorts\/)([A-Za-z0-9_-]{6,})/)[1]
                      : ""
                  }" frameborder="0" allowfullscreen></iframe>`
                : /vimeo\.com/.test(url)
                ? `<iframe class="w-full h-full" src="https://player.vimeo.com/video/${
                    url.match(/vimeo\.com\/(\d+)/)
                      ? url.match(/vimeo\.com\/(\d+)/)[1]
                      : ""
                  }" frameborder="0" allowfullscreen></iframe>`
                : `<video class="w-full h-full object-contain" controls src="${url}"></video>`
            }
          </div>
      `;
      holder.innerHTML = videoHtml;
    } else {
      const img = document.getElementById("lightbox-img");
      img.src = cloudAny(item.src, { w: 2000 });
      img.alt = item.alt || "";
    }

    // Garante que o elemento img ou div esteja visível
    lightboxModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    ensureLightboxControls();
  }

  function nextLightbox() {
    if (!LB_ITEMS.length) return;
    openLightboxIndex(LB_INDEX + 1);
  }
  function prevLightbox() {
    if (!LB_ITEMS.length) return;
    openLightboxIndex(LB_INDEX - 1);
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.add("hidden");
    document.body.style.overflow = "auto";
    const lightboxImgElement = document.getElementById("lightbox-img");
    if (lightboxImgElement) {
        lightboxImgElement.innerHTML = '';
        lightboxImgElement.src = '';
    }
  }

  if (lightboxModal) {
    lightboxModal.addEventListener("click", (e) => {
      const isOverlay = e.target.dataset.close === "lightbox" || e.target === lightboxModal;
      if (isOverlay) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (!lightboxIsOpen()) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") nextLightbox();
      if (e.key === "ArrowLeft") prevLightbox();
    });
  }

  // ---------- DOAÇÕES ----------
  const metaEl = document.getElementById("meta-total");
  const arrEl  = document.getElementById("valor-arrecadado");
  const bar    = document.getElementById("progress");
  if (metaEl && arrEl && bar) {
    const meta = Number(doacoes.meta_total || 0);
    const arr  = Number(doacoes.arrecadado || 0);
    metaEl.textContent = meta ? formatCurrency(meta) : "-";
    arrEl.textContent  = formatCurrency(arr);
    const pct = meta ? Math.min(100, Math.round((arr / meta) * 100)) : 0;
    bar.style.width = pct + "%";
  }
  const pixChave = document.getElementById("pix-chave");
  const pixQr    = document.getElementById("pix-qr");
  if (pixChave) pixChave.textContent = doacoes.pix_chave || doacoes.pix?.chave || "";
  if (pixQr && doacoes.pix_qr) pixQr.src = doacoes.pix_qr;

  const doacaoLinks = document.getElementById("doacao-links");
  (doacoes.links || []).forEach((l) => {
    const li = el("li");
    li.innerHTML = `<a class="text-sky-600 hover:underline" href="${l.url}" target="_blank" rel="noopener">${l.nome}</a>`;
    if (doacaoLinks) doacaoLinks.appendChild(li);
  });

  // ---------- CONTATO ----------
  const contatoEmail = document.getElementById("contato-email");
  const contatoTel   = document.getElementById("contato-telefone");
  const contatoEnd   = document.getElementById("contato-endereco");
  if (contatoEmail) contatoEmail.textContent = contato.email || "";
  if (contatoTel)   contatoTel.textContent   = contato.telefone || "";
  if (contatoEnd)   contatoEnd.textContent   = contato.endereco || "";

  // ---------- FOOTER ----------
  const footerLogo = document.getElementById("footer-logo");
  if (footerLogo) footerLogo.src = footer.logo || header.logo || "";
  const fText = document.getElementById("footer-text");
  if (fText) fText.textContent = footer.texto || "";
  const fl = document.getElementById("footer-links");
  (footer.links || []).forEach((l) => {
    const a = el("a", "text-blue-200 hover:text-white transition", l.nome);
    a.href = l.url;
    if (fl) fl.appendChild(a);
  });
})();
