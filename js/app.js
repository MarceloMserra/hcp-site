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

// ===================== Cloudinary helpers =====================
function isCloudinary(url) {
  return /^https?:\/\/res\.cloudinary\.com\//.test(url || "");
}

/**
 * Gera URL Cloudinary com retrato 3:4, foco em rosto e otimizações.
 * Se a URL JÁ tiver transformações (porque você recortou manualmente),
 * não mexe — respeita o recorte existente.
 */
function cloudPortrait(url, { w = 600 } = {}) {
  if (!url || !isCloudinary(url)) return url;

  // Se já existem transformações no segmento imediatamente após /upload/, não altera
  const parts = url.split("/upload/");
  if (parts.length > 1) {
    const after = parts[1] || "";
    const firstSeg = after.split("/")[0]; // ex.: "c_fill,w_600/..." -> pega "c_fill,w_600"
    const hasTransforms = /\b(c_|w_|h_|ar_|g_)/.test(firstSeg);
    if (hasTransforms) return url;
  }

  const t = `f_auto,q_auto,dpr_auto,c_fill,g_auto:face,ar_3:4,w_${w}`;
  return url.replace("/upload/", `/upload/${t}/`);
}

/** Cria srcset responsivo; se não for Cloudinary, retorna string vazia */
function cloudPortraitSrcset(url, widths = [400, 600, 900]) {
  if (!isCloudinary(url)) return "";
  return widths.map(w => `${cloudPortrait(url, { w })} ${w}w`).join(", ");
}

// ===================== app principal =====================
(async () => {
  const site     = await getJSON("data/site.json")        || {};
  const header   = await getJSON("data/header.json")      || {};
  const footer   = await getJSON("data/footer.json")      || {};
  const coord    = await getJSON("data/coordenacao.json") || {};
  const membros  = await getJSON("data/membros.json")     || {};
  const galeriaD = await getJSON("data/galeria.json")     || {};
  const doacoes  = await getJSON("data/doacoes.json")     || {};
  const contato  = await getJSON("data/contato.json")     || {};

  // ---------- HERO ----------
  const slogan = document.getElementById("slogan");
  const lema   = document.getElementById("lema");
  if (slogan) slogan.textContent = site.slogan || "";
  if (lema)   lema.textContent   = site.lema   || "";

  const hero = document.getElementById("home");
  if (hero && site.hero) hero.style.backgroundImage = `url('${site.hero}')`;
  const heroOverlay = document.getElementById("hero-overlay");
  if (heroOverlay) heroOverlay.style.background = `rgba(0,0,0,${site.tema?.hero_overlay ?? 0.45})`;

  // ---------- HEADER (logo + menu + mobile) ----------
  const logo = document.getElementById("logo-img");
  if (header.logo) logo.src = header.logo;

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
    nav && nav.appendChild(a);

    const am = a.cloneNode(true);
    am.className = "block py-2 text-gray-700 hover:text-blue-700 font-medium";
    mobileLinks && mobileLinks.appendChild(am);
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
    mobileLinks &&
      mobileLinks.addEventListener("click", (e) => {
        if (e.target.tagName === "A") closeMenu();
      });
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
    tl && tl.appendChild(box);
  });

  // ---------- COORDENAÇÃO (retratos 3:4 auto) ----------
  const coordGrid = document.getElementById("coordenacao-grid");
  const equipe = coord.equipe || coord.lista || [];
  equipe.forEach((p) => {
    const foto = cloudPortrait(p.foto); // aplica auto-crop se for Cloudinary
    const srcset = cloudPortraitSrcset(p.foto);
    const c = el("div", "bg-white rounded-lg shadow overflow-hidden");
    c.innerHTML = `
      <div class="h-72 overflow-hidden">
        <img
          src="${foto || ""}"
          ${srcset ? `srcset="${srcset}"` : ""}
          sizes="(min-width:1280px) 300px, (min-width:1024px) 25vw, (min-width:640px) 33vw, 100vw"
          class="w-full h-full object-cover"
          alt="${p.nome || ""}">
      </div>
      <div class="p-4">
        <h3 class="text-lg font-bold">${p.nome || ""}</h3>
        ${p.cargo ? `<span class="inline-block mt-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">${p.cargo}</span>` : ""}
        ${p.descricao ? `<p class="text-sm text-gray-600 mt-2">${p.descricao}</p>` : ""}
      </div>`;
    coordGrid && coordGrid.appendChild(c);
  });
  if (coordGrid && equipe.length === 0) {
    const sec = document.getElementById("coordenacao");
    sec && sec.classList.add("hidden");
  }

  // ---------- MEMBROS (filtros + retratos 3:4 auto) ----------
  const filters = ["Todos", "1º Tenor", "2º Tenor", "Barítono", "Baixo"];
  const naipeFilters = document.getElementById("naipe-filters");
  let filtroAtual = "Todos";
  filters.forEach((f) => {
    const b = el("button", "px-4 py-2 rounded border", f);
    if (f === filtroAtual) b.classList.add("bg-blue-900", "text-white");
    b.addEventListener("click", () => {
      filtroAtual = f;
      [...naipeFilters.children].forEach(
        (x) =>
          (x.className =
            "px-4 py-2 rounded border bg-white text-gray-700 hover:bg-gray-50")
      );
      b.className = "px-4 py-2 rounded border bg-blue-900 text-white";
      renderMembros();
    });
    naipeFilters && naipeFilters.appendChild(b);
  });

  function renderMembros() {
    const grid = document.getElementById("members-grid");
    if (!grid) return;
    grid.innerHTML = "";
    (membros.membros || membros.lista || []).forEach((m) => {
      const match =
        filtroAtual === "Todos" || (m.naipes || [m.naipe]).includes(filtroAtual);
      if (!match) return;

      const foto = cloudPortrait(m.foto);
      const srcset = cloudPortraitSrcset(m.foto);
      const card = el("div", "bg-white rounded-lg shadow overflow-hidden");
      card.innerHTML = `
        <div class="h-72 overflow-hidden">
          <img
            src="${foto || ""}"
            ${srcset ? `srcset="${srcset}"` : ""}
            sizes="(min-width:1280px) 300px, (min-width:1024px) 25vw, (min-width:640px) 33vw, 100vw"
            class="w-full h-full object-cover"
            alt="${m.nome || ""}">
        </div>
        <div class="p-4">
          <h3 class="text-lg font-bold">${m.nome || ""}</h3>
          <div class="flex flex-wrap gap-1 mb-2">
            ${(m.naipes || [m.naipe])
              .filter(Boolean)
              .map(
                (n) =>
                  `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">${n}</span>`
              )
              .join("")}
          </div>
          ${m.bio ? `<p class="text-gray-700 text-sm">${m.bio}</p>` : ""}
        </div>`;
      grid.appendChild(card);
    });
  }
  renderMembros();

  // ---------- GALERIA (com modal/lightbox) ----------
  const albumsGrid = document.getElementById("albums-grid");
  const albumModal = document.getElementById("album-modal");

  function albumCard(album, idx) {
    const capa = album.capa || "";
    const card = el(
      "div",
      "bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
    );
    card.innerHTML = `
      <div class="h-48 overflow-hidden">
        <img src="${capa}" alt="${album.titulo || ""}" class="w-full h-48 object-cover">
      </div>
      <div class="p-4">
        <h3 class="text-lg font-bold mb-1">${album.titulo || ""}</h3>
        ${album.descricao ? `<p class="text-gray-600 text-sm">${album.descricao}</p>` : ""}
        <button data-album-id="${idx}" class="mt-3 text-sky-600 font-medium hover:underline">Abrir álbum →</button>
      </div>`;
    card.querySelector("button").addEventListener("click", () => {
      openAlbumModal(album);
    });
    return card;
  }

  if (albumsGrid) {
    const albuns = (galeriaD.albuns || []).map((a) => {
      const itens = Array.isArray(a.itens) ? [...a.itens] : [];
      if (Array.isArray(a.fotos_multi) && a.fotos_multi.length) {
        a.fotos_multi.forEach((src) => itens.push({ tipo: "foto", src }));
      }
      return { ...a, itens };
    });
    albumsGrid.innerHTML = "";
    albuns.forEach((a, i) => albumsGrid.appendChild(albumCard(a, i)));
  }

  function isVideo(url) {
    return (url || "").match(/youtube\.com|youtu\.be|vimeo\.com|\.mp4($|\?)/i);
  }

  function openAlbumModal(album) {
    if (!albumModal) return;

    document.getElementById("album-modal-title").textContent = album.titulo || "Álbum";
    const modalContent = document.getElementById("album-modal-content");
    modalContent.innerHTML = `
      <div id="album-items" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"></div>
    `;
    const albumItems = document.getElementById("album-items");

    (album.itens || []).forEach(item => {
      const wrap = el("div", "rounded overflow-hidden bg-gray-50 relative aspect-square group");

      if (item.tipo === "video" && isVideo(item.src)) {
        let embed = "";
        const url = item.src || "";
        if (/youtube\.com|youtu\.be/.test(url)) {
          const idMatch = url.match(/(?:v=|be\/)([A-Za-z0-9_-]{6,})/);
          const vid = idMatch ? idMatch[1] : "";
          embed = `<iframe class="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/${vid}" frameborder="0" allowfullscreen></iframe>`;
        } else if (/vimeo\.com/.test(url)) {
          const idMatch = url.match(/vimeo\.com\/(\d+)/);
          const vid = idMatch ? idMatch[1] : "";
          embed = `<iframe class="absolute inset-0 w-full h-full" src="https://player.vimeo.com/video/${vid}" frameborder="0" allowfullscreen></iframe>`;
        } else if (/\.mp4($|\?)/i.test(url)) {
          embed = `<video class="absolute inset-0 w-full h-full object-cover" controls src="${url}"></video>`;
        }
        wrap.innerHTML = embed;
      } else {
        const imgEl = el("img", "absolute inset-0 w-full h-full object-cover cursor-pointer");
        imgEl.src = item.src || '';
        imgEl.alt = item.alt || '';
        imgEl.addEventListener("click", () => openLightbox(item.src));
        wrap.appendChild(imgEl);
      }
      if (item.alt) {
        const cap = el("div", "absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity", item.alt);
        wrap.appendChild(cap);
      }
      albumItems.appendChild(wrap);
    });

    albumModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeAlbumModal() {
    if (albumModal) {
      albumModal.classList.add("hidden");
      document.body.style.overflow = "auto";
    }
  }

  if (albumModal) {
    albumModal.addEventListener("click", (e) => {
      if (e.target.dataset.close === "modal" || e.target === albumModal) closeAlbumModal();
    });
    const closeBtn = document.getElementById("album-modal-close");
    if (closeBtn) closeBtn.addEventListener("click", closeAlbumModal);
  }

  const lightboxModal = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");

  if (lightboxModal) {
    lightboxModal.addEventListener("click", (e) => {
      if (e.target.dataset.close === "lightbox" || e.target === lightboxModal || e.target === lightboxImg) closeLightbox();
    });
  }

  function openLightbox(src) {
    if (!lightboxModal) return;
    lightboxImg.src = src;
    lightboxModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.add("hidden");
    document.body.style.overflow = "auto";
    lightboxImg.src = "";
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
  if (pixChave) pixChave.textContent = doacoes.pix_chave || "";
  if (pixQr && doacoes.pix_qr) pixQr.src = doacoes.pix_qr;

  const doacaoLinks = document.getElementById("doacao-links");
  (doacoes.links || []).forEach((l) => {
    const li = el("li");
    li.innerHTML = `<a class="text-sky-600 hover:underline" href="${l.url}" target="_blank" rel="noopener">${l.nome}</a>`;
    doacaoLinks && doacaoLinks.appendChild(li);
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
    fl && fl.appendChild(a);
  });
})();
