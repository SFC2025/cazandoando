/* script.js
- Cambiar WHATSAPP_NUMBER en: const WHATSAPP_NUMBER y data attributes [data-whatsapp]
- Cambiar CONTACT_EMAIL: en index.html (action del formulario FormSubmit)
- Editar categorías y productos: data/products.json
- Secciones a editar: render del Hero/Productos/Contacto si se agregan nuevos elementos
*/

(() => {
  const WHATSAPP_NUMBER = "5493424485574"; // Cambiar si hace falta
  const PRODUCTS_JSON = "data/products.json";
  const API_FALLBACK = "/api/products"; // Hook futuro: si existe API, usarla
  // en admin.html y en script.js (arriba, junto a los const)
  const SUPABASE_URL = "https://vtdwtjxadqtmwwhjjhey.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0ZHd0anhhZHF0bXd3aGpqaGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MTE2MjcsImV4cCI6MjA3NTA4NzYyN30.Hqz6S3MvccPgOwavAnA19cf-1mrtzLE_fd5RAqAs7hk";
  window.supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const $year = document.getElementById("year");
  if ($year) $year.textContent = new Date().getFullYear();
  // Header: translúcido en top, sólido al scrollear
  const header = document.querySelector(".site-header");
  const onScrollHeader = () => {
    if (header) header.classList.toggle("is-solid", (window.scrollY || 0) > 6);
  };
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader(); // estado correcto al cargar

  // Normaliza todos los enlaces/botones con data-whatsapp
  document.querySelectorAll("[data-whatsapp]").forEach((el) => {
    el.setAttribute("href", `https://wa.me/${WHATSAPP_NUMBER}`);
  });
  const $waFloat = document.getElementById("whatsapp-float");
  if ($waFloat) $waFloat.href = `https://wa.me/${WHATSAPP_NUMBER}`;

  // Modal accesible
  const modal = document.getElementById("contact-modal");
  const openers = document.querySelectorAll("[data-open-modal]");
  const closers = modal ? modal.querySelectorAll("[data-close-modal]") : [];
  let lastFocused = null;

  function openModal() {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.setAttribute("aria-hidden", "false");
    modal.style.display = "grid";
    const firstInput = modal.querySelector("input, textarea, button");
    firstInput?.focus();
    trapFocus(modal);
  }
  function closeModal() {
    if (!modal) return;
    modal.setAttribute("aria-hidden", "true");
    modal.style.display = "none";
    releaseFocusTrap();
    lastFocused?.focus();
  }
  openers.forEach((op) =>
    op.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
    })
  );
  closers.forEach((cl) => cl.addEventListener("click", closeModal));
  modal?.addEventListener("click", (e) => {
    if (e.target.matches(".modal-backdrop")) closeModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal?.getAttribute("aria-hidden") === "false")
      closeModal();
  });

  // Focus trap básico
  let trapHandler = null;
  function trapFocus(container) {
    trapHandler = (e) => {
      const focusables = container.querySelectorAll(
        'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusables).filter(
        (el) => el.offsetParent !== null
      );
      const first = list[0],
        last = list[list.length - 1];
      if (!list.length) return;
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    container.addEventListener("keydown", trapHandler);
  }
  function releaseFocusTrap() {
    if (trapHandler && modal) modal.removeEventListener("keydown", trapHandler);
    trapHandler = null;
  }

  // Validación simple del formulario
  const contactForm = document.getElementById("contact-form");
  contactForm?.addEventListener("submit", (e) => {
    let valid = true;
    const name = contactForm.name.value.trim();
    const email = contactForm.email.value.trim();
    const message = contactForm.message.value.trim();
    const setErr = (id, msg) => {
      const n = document.getElementById(id);
      if (n) {
        n.textContent = msg || "";
      }
    };
    setErr("err-name", "");
    setErr("err-email", "");
    setErr("err-message", "");

    if (name.length < 2) {
      setErr("err-name", "Ingresá tu nombre.");
      valid = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("err-email", "Email inválido.");
      valid = false;
    }
    if (message.length < 6) {
      setErr("err-message", "Contanos en pocas palabras tu consulta.");
      valid = false;
    }
    if (!valid) e.preventDefault();
  });

  // Render de productos
  const grid = document.getElementById("products-grid");
  let products = [];
  // Sin estado local de stock — la UI refleja exactamente lo de Supabase
  let stockState = {};

  function renderFilters(list) {
    // Mapeo fijo: categoría -> sección (tres secciones)
    const SECTION_BY_CATEGORY = {
      "Buzo polar": "Indumentarias",
      "Pantalones / Bermudas cargo": "Indumentarias",
      Remeras: "Indumentarias",
      Gorras: "Indumentarias",

      Ópticas: "Artículos de caza",
      Linternas: "Artículos de caza",
      Municiones: "Artículos de caza",

      Yerberas: "Mate",
      Termos: "Mate",
      "Vasos térmicos": "Mate",
    };

    // Subcategorías visibles por sección
    const SUBCATS = {
      Indumentarias: [
        "*",
        "Buzo polar",
        "Pantalones / Bermudas cargo",
        "Remeras",
        "Gorras",
      ],
      "Artículos de caza": ["*", "Ópticas", "Linternas", "Municiones"],
      Mate: ["*", "Yerberas", "Termos", "Vasos térmicos"],
    };

    const $sections = document.getElementById("filters");
    const $sub = document.getElementById("subfilters");
    if (!$sections) return;

    let SELECTED_SECTION = "*";
    let SELECTED_SUBCAT = "*";

    // Botones de SECCIÓN (orden fijo)
    const order = ["*", "Indumentarias", "Artículos de caza", "Mate"];

    $sections.innerHTML = order
      .map((s) => {
        const label = s === "*" ? "Todos" : s;
        const isActive = s === "*";
        return `<button class="filter-btn ${
          isActive ? "is-active" : ""
        }" data-section="${s}" role="tab" aria-selected="${isActive}">${label}</button>`;
      })
      .join("");

    function setSubfilters(section) {
      const list = SUBCATS[section] || [];
      if (!list.length || section === "*") {
        $sub.style.display = "none";
        $sub.innerHTML = "";
        SELECTED_SUBCAT = "*";
        return;
      }
      $sub.style.display = "flex";
      $sub.innerHTML = list
        .map(
          (sc, i) =>
            `<button class="filter-btn ${
              i === 0 ? "is-active" : ""
            }" data-sub="${sc}" role="tab" aria-selected="${i === 0}">${
              sc === "*" ? "Todas" : sc
            }</button>`
        )
        .join("");
    }

    function applyFilters() {
      const cards = document.querySelectorAll(".product-card[data-section]");
      let visible = 0;
      cards.forEach((card) => {
        const sec = card.dataset.section || "";
        const sub = card.dataset.sub || "";
        const okSec = SELECTED_SECTION === "*" || sec === SELECTED_SECTION;
        const okSub = SELECTED_SUBCAT === "*" || sub === SELECTED_SUBCAT;
        const show = okSec && okSub;
        card.style.display = show ? "" : "none";
        if (show) visible++;
      });
      // Mensaje vacío
      const grid = document.getElementById("products-grid");
      grid?.querySelectorAll(".empty-state")?.forEach((n) => n.remove());
      if (grid && !visible) {
        const p = document.createElement("p");
        p.className = "empty-state";
        p.textContent = "No hay productos en esta categoría por el momento.";
        p.style.margin = "8px 0 0";
        p.style.opacity = ".85";
        grid.appendChild(p);
      }
    }

    // Listeners sección
    $sections.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-section]");
      if (!b) return;
      SELECTED_SECTION = b.dataset.section;
      SELECTED_SUBCAT = "*";

      // activar visualmente
      $sections.querySelectorAll(".filter-btn").forEach((x) => {
        x.classList.remove("is-active");
        x.setAttribute("aria-selected", "false");
      });
      b.classList.add("is-active");
      b.setAttribute("aria-selected", "true");

      setSubfilters(SELECTED_SECTION);
      applyFilters();

      document
        .getElementById("indumentaria")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Listeners subcategoría
    $sub?.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-sub]");
      if (!b) return;
      SELECTED_SUBCAT = b.dataset.sub;

      $sub.querySelectorAll(".filter-btn").forEach((x) => {
        x.classList.remove("is-active");
        x.setAttribute("aria-selected", "false");
      });
      b.classList.add("is-active");
      b.setAttribute("aria-selected", "true");

      applyFilters();
    });

    // 1ª carga: sin subfiltros
    setSubfilters("*");
    applyFilters();

    // === Al renderizar productos, vamos a setear data-section/sub según su categoría ===
    // Guardamos el mapeo para reuso en renderProducts:
    window.__CA_SECTION_BY_CATEGORY__ = SECTION_BY_CATEGORY;
  }

  async function fetchProducts() {
    // Solo Supabase (sin respaldo local para evitar stocks “de prueba”)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=id,category,name,price,stock,image_url&order=id.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) throw new Error("No pude leer productos desde Supabase");
    const rows = await res.json();
    return rows.map((r) => ({
      id: r.id,
      category: r.category,
      name: r.name,
      price: r.price,
      stock: r.stock,
      image: r.image_url || "assets/placeholder.webp",
    }));
  }
  function loadStockFromStorage() {
    return {};
  } // no-op
  function saveStockToStorage() {
    /* no-op */
  }
  function getCurrentStock(p) {
    return Number(p.stock) || 0; // se usa solo el stock real
  }

  function renderProducts(list) {
    if (!grid) return;
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = "";
    list.forEach((p) => {
      const currentStock = getCurrentStock(p);
      const available = currentStock > 0;
      const card = document.createElement("article");
      card.className = "product-card";
      card.setAttribute("role", "listitem");

      // ⬇️ Necesario para abrir la galería
      card.dataset.productId = String(p.id);
      card.dataset.productName = p.name;

      card.innerHTML = `
       <div class="product-media" data-open-gallery>
  <img src="${p.image}" alt="${p.name}" loading="lazy" decoding="async"
       width="640" height="480"
       srcset="${p.image} 640w, ${p.image} 960w, ${p.image} 1280w"
       sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw">
</div>


        <div class="product-body">
          <div class="product-head">
            <h3 class="product-title">${p.name}</h3>
            <div class="product-price">$${p.price.toLocaleString("es-AR")}</div>
          </div>
          <div class="product-meta">
            <span class="badge ${available ? "ok" : "out"}">${
        available ? "Disponible" : "Agotado"
      }</span>
            <span class="stock-count" aria-label="Stock restante">Stock: ${Math.max(
              0,
              currentStock
            )}</span>
          </div>
        </div>
        <div class="product-actions">
          <input class="qty" type="number" min="1" value="1" aria-label="Cantidad a comprar" ${
            !available ? "disabled" : ""
          } />
          <button class="buy-btn" ${
            !available ? "disabled" : ""
          }>Comprar</button>
        </div>
      `;
      const buyBtn = card.querySelector(".buy-btn");
      const qtyInput = card.querySelector(".qty");
      // Comprar: DESCUENTA stock vía Supabase RPC y luego abre WhatsApp
      buyBtn?.addEventListener("click", async (ev) => {
        ev.stopPropagation();

        const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
        const stockNow = getCurrentStock(p);
        if (qty > stockNow) {
          alert(`Solo quedan ${stockNow} unidades de "${p.name}".`);
          return;
        }

        buyBtn.disabled = true;
        qtyInput.disabled = true;

        try {
          const { data, error } = await window.supa.rpc("dec_stock", {
            p_id: p.id,
            p_qty: qty,
          });
          console.log("dec_stock →", { data, error }); // ← AQUÍ, después del await

          if (error) {
            alert(error.message || "No se pudo reservar stock.");
            return;
          }

          const newStock = (data && data[0] && data[0].stock) ?? stockNow - qty;
          p.stock = newStock;

          const $stock = card.querySelector(".stock-count");
          if ($stock) $stock.textContent = `Stock: ${Math.max(0, newStock)}`;

          const $badge = card.querySelector(".badge");
          if (newStock <= 0 && $badge) {
            $badge.classList.remove("ok");
            $badge.classList.add("out");
            $badge.textContent = "Agotado";
            qtyInput.value = 1;
            qtyInput.disabled = true;
            buyBtn.disabled = true;
          }

          const msg =
            `Hola! Vengo de la web CazandoAndo.\n` +
            `Quiero comprar ${qty} × ${p.name} (ID ${p.id}).\n` +
            `Precio $${p.price.toLocaleString("es-AR")} c/u.\n` +
            `¿Seguimos?`;
          const waURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
            msg
          )}`;

          if (window.gtag) {
            gtag("event", "whatsapp_click", {
              event_category: "engagement",
              event_label: p.name,
              value: qty,
            });
          }
          window.open(waURL, "_blank", "noopener");
        } finally {
          if ((p.stock ?? stockNow) > 0) {
            buyBtn.disabled = false;
            qtyInput.disabled = false;
          }
        }
      });

      card.dataset.category = p.category;

      // Derivar sección y subcategoría desde la categoría
      const map = window.__CA_SECTION_BY_CATEGORY__ || {};
      card.dataset.section = map[p.category] || "";
      card.dataset.sub = p.category || "";

      grid.appendChild(card);
    });
    grid.removeAttribute("aria-busy");
  }

  // ==== STOCK real / Últimos ingresos ====
  async function loadStock() {
    const $stockGrid = document.getElementById("stock-grid");
    if (!$stockGrid) return;

    $stockGrid.setAttribute("aria-busy", "true");
    $stockGrid.innerHTML =
      '<div class="stock-item skeleton" style="height:280px;border-radius:14px"></div>'.repeat(
        8
      );
    const { data, error } = await window.supa
      .from("stock_images")
      .select("*")
      .eq("visible", true)
      .order("sort", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      $stockGrid.innerHTML = "<p style='opacity:.7'>Error cargando fotos.</p>";
    } else {
      $stockGrid.innerHTML = (data || [])
        .map(
          (i) => `
        <a role="listitem" class="stock-item" href="${
          i.image_url
        }" data-lightbox>
          <img src="${i.image_url}" alt="${
            i.title || "Foto de stock"
          }" loading="lazy" decoding="async"
               width="640" height="800"
               srcset="${i.image_url} 640w, ${i.image_url} 960w, ${
            i.image_url
          } 1280w"
               sizes="(max-width: 600px) 50vw, (max-width: 1200px) 33vw, 25vw" />
        </a>`
        )
        .join("");
    }

    $stockGrid.removeAttribute("aria-busy");
  }

  // Init
  (async function init() {
    try {
      if (grid) {
        grid.innerHTML =
          '<div class="product-card skeleton" style="height:260px"></div>'.repeat(
            6
          );
      }

      products = await fetchProducts();
      renderFilters(products); // 1) crea UI + mapa sección/sub
      renderProducts(products); // 2) pinta cards con data-section/sub
      loadStock(); // 3) galería de stock
    } catch (err) {
      console.error("Error cargando productos:", err);
      grid.innerHTML = `<p>Ocurrió un problema al cargar los productos. Reintentá más tarde.</p>`;
    }
  })();
})();

/* Marca el link activo del menú según la sección visible */
(() => {
  const sections = ["hero", "indumentaria", "clientes", "stock", "contacto"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const links = new Map(
    [...document.querySelectorAll(".primary-nav a")].map((a) => [
      a.getAttribute("href")?.replace("#", ""),
      a,
    ])
  );

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        const id = en.target.id;
        const link = links.get(id);
        if (!link) return;
        if (en.isIntersecting) {
          document.querySelectorAll(".primary-nav a.is-active").forEach((l) => {
            l.classList.remove("is-active");
            l.removeAttribute("aria-current");
          });
          link.classList.add("is-active");
          link.setAttribute("aria-current", "true");
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0.01 }
  );

  sections.forEach((s) => io.observe(s));
})();

// Cerrar menú móvil al elegir un link o con Escape
(() => {
  const nav = document.querySelector(".primary-nav");
  const toggle = document.querySelector(".menu-toggle");

  // Cierra si se hace click en un link
  document.addEventListener("click", (e) => {
    const a = e.target.closest(".primary-nav a");
    if (!a || !nav?.classList.contains("is-open")) return;
    nav.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  });

  // Cierra con ESC
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !nav?.classList.contains("is-open")) return;
    nav.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
  });
})();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(console.error);
}

// === Galería por producto ===
// Requiere: supa (Supabase client ya inicializado)

const $pgOverlay = document.getElementById("product-gallery");
const $pgGrid = document.getElementById("pg-grid");
const $pgClose = $pgOverlay?.querySelector(".pg-close");

function openGallery(productId, productName) {
  if (!$pgOverlay || !$pgGrid) return;
  $pgOverlay.hidden = false;
  $pgGrid.innerHTML = "";
  $pgGrid.setAttribute("aria-busy", "true");
  document.body.style.overflow = "hidden";
  const $title = document.getElementById("pg-title");
  if ($title) $title.textContent = productName || "Galería";

  // Fetch on open
  window.supa
    .from("product_media")
    .select("*")
    .eq("product_id", productId)
    .eq("visible", true)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: false })
    .then(({ data, error }) => {
      if (error) {
        console.error(error);
        $pgGrid.innerHTML =
          "<p style='opacity:.7'>No se pudo cargar la galería.</p>";
        return;
      }
      const list = data || [];
      if (!list.length) {
        $pgGrid.innerHTML =
          "<p style='opacity:.7'>Este producto no tiene galería todavía.</p>";
        return;
      }
      $pgGrid.innerHTML = list
        .map((m) => {
          if (m.kind === "video") {
            const poster = m.poster_url ? ` poster="${m.poster_url}"` : "";
            return `
            <div class="pg-item">
              <video controls preload="metadata"${poster} src="${
              m.url
            }"></video>
              ${m.caption ? `<div class="pg-cap">${m.caption}</div>` : ""}
            </div>`;
          }
          // imagen
          return `
          <div class="pg-item">
            <img loading="lazy" src="${m.url}" alt="${m.caption || "Imagen"}">
            ${m.caption ? `<div class="pg-cap">${m.caption}</div>` : ""}
          </div>`;
        })
        .join("");
    })
    .finally(() => $pgGrid.removeAttribute("aria-busy"));
}

function closeGallery() {
  if (!$pgOverlay) return;
  $pgOverlay.hidden = true;
  document.body.style.overflow = "";
  $pgGrid && ($pgGrid.innerHTML = "");
}
$pgClose && $pgClose.addEventListener("click", closeGallery);
$pgOverlay &&
  $pgOverlay.addEventListener("click", (e) => {
    if (e.target === $pgOverlay) closeGallery();
  });
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeGallery();
});

// === Hook de tarjetas ===
// 1) Delegado: contenedor donde renderizás las cards de productos.
document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-open-gallery]");
  if (!trigger) return;
  const card = trigger.closest("[data-product-id]");
  if (!card) return;
  const id = Number(card.getAttribute("data-product-id"));
  const name = card.getAttribute("data-product-name") || "Producto";
  if (id) openGallery(id, name);
});

// Fallback: cerrar al tocar la X aunque algo interfiera
document.addEventListener("click", (e) => {
  if (e.target.closest(".pg-close")) {
    e.preventDefault();
    closeGallery();
  }
});

/* === Preview local: Galería por producto === */
(() => {
  const $imgs = document.getElementById("pm-imgs");
  const $video = document.getElementById("pm-video");
  const $poster = document.getElementById("pm-poster");
  const $wrap = document.getElementById("pm-previews");
  const $list = document.getElementById("pm-preview-list");
  if (!$imgs || !$wrap || !$list) return;

  const clear = () => {
    $list.innerHTML = "";
  };
  const show = () => {
    $wrap.hidden = $list.children.length === 0;
  };

  function addThumb(file) {
    const url = URL.createObjectURL(file);
    const item = document.createElement("div");
    item.className = "pm-thumb-item";
    item.innerHTML = `<img src="${url}" alt=""><span>${file.name}</span>`;
    $list.appendChild(item);
  }
  function addChip(prefix, text) {
    const chip = document.createElement("div");
    chip.className = "pm-chip";
    chip.textContent = `${prefix} ${text}`;
    $list.appendChild(chip);
  }

  $imgs.addEventListener("change", (e) => {
    clear();
    const files = Array.from(e.target.files || []);
    files.forEach(addThumb);
    show();
  });

  $video?.addEventListener("change", (e) => {
    clear();
    const f = (e.target.files || [])[0];
    if (f) addChip("🎬", f.name);
    show();
  });

  $poster?.addEventListener("change", (e) => {
    const f = (e.target.files || [])[0];
    if (f) addThumb(f);
    show();
  });
})();

/* === Dialog + Toast === */
function dlgShow({
  title = "Aviso",
  msg = "",
  okText = "Aceptar",
  cancelText = "Cancelar",
  danger = false,
}) {
  return new Promise((resolve) => {
    const $ov = document.getElementById("dlg");
    const $t = document.getElementById("dlg-title");
    const $m = document.getElementById("dlg-msg");
    const $ok = document.getElementById("dlg-ok");
    const $cc = document.getElementById("dlg-cancel");
    $t.textContent = title;
    $m.textContent = msg;
    $ok.textContent = okText;
    $cc.textContent = cancelText;
    $ok.classList.toggle("btn-danger", !!danger);
    $ov.hidden = false;

    const close = (val) => {
      $ov.hidden = true;
      $ok.onclick = $cc.onclick = null;
      resolve(val);
    };
    $ok.onclick = () => close(true);
    $cc.onclick = () => close(false);
    $ov.onclick = (e) => {
      if (e.target === $ov) close(false);
    };
  });
}
function toast(msg = "Listo") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 2000);
}

/* === Preview local: imágenes/video/poster === */
(() => {
  const $imgs = document.getElementById("pm-imgs");
  const $video = document.getElementById("pm-video");
  const $poster = document.getElementById("pm-poster");
  const $wrap = document.getElementById("pm-previews");
  const $list = document.getElementById("pm-preview-list");
  if (!$imgs || !$wrap || !$list) return;

  const clear = () => {
    $list.innerHTML = "";
  };
  const show = () => {
    $wrap.hidden = $list.children.length === 0;
  };

  const addThumb = (file) => {
    const url = URL.createObjectURL(file);
    const item = document.createElement("div");
    item.className = "pm-thumb-item";
    item.innerHTML = `<img src="${url}" alt=""><span>${file.name}</span>`;
    $list.appendChild(item);
  };
  const addChip = (text) => {
    const chip = document.createElement("div");
    chip.className = "pm-chip";
    chip.textContent = text;
    $list.appendChild(chip);
  };

  $imgs.addEventListener("change", (e) => {
    clear();
    Array.from(e.target.files || []).forEach(addThumb);
    show();
  });
  $video?.addEventListener("change", (e) => {
    clear();
    const f = (e.target.files || [])[0];
    if (f) addChip(`🎬 ${f.name}`);
    show();
  });
  $poster?.addEventListener("change", (e) => {
    const f = (e.target.files || [])[0];
    if (f) addThumb(f);
    show();
  });
})();
