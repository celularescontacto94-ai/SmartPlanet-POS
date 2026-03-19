const MODELOS_CELULAR = {
  Apple: [
    "iPhone 6",
    "iPhone 6s",
    "iPhone 7",
    "iPhone 8",
    "iPhone X",
    "iPhone XR",
    "iPhone XS",
    "iPhone 11",
    "iPhone 11 Pro",
    "iPhone 12",
    "iPhone 12 Pro",
    "iPhone 13",
    "iPhone 13 Pro",
    "iPhone 14",
    "iPhone 14 Pro",
    "iPhone 15",
    "iPhone 15 Pro",
    "iPhone 16",
    "iPhone 16 Pro",
  ],
  Samsung: ["A10", "A11", "A12", "A13", "A14", "A15", "A20", "A21s", "A22", "A30", "A31", "A32", "A33", "A34", "A35", "A50", "A51", "A52", "A53", "A54", "S10", "S20", "S21", "S22", "S23", "S24", "S25"],
  Xiaomi: ["Redmi 9", "Redmi 10", "Redmi 11", "Redmi 12", "Redmi Note 10", "Redmi Note 11", "Redmi Note 12", "Redmi Note 13", "Poco X3", "Poco X4", "Poco X5", "Poco X6"],
  Motorola: ["Moto E6", "Moto E7", "Moto E13", "Moto G7", "Moto G8", "Moto G9", "Moto G10", "Moto G20", "Moto G30", "Moto G40", "Moto G50", "Moto G60", "Moto G71", "Moto G72", "Moto G84"],
  Huawei: ["P20", "P30", "P40", "Mate 20", "Mate 30", "Y9", "Y7"],
  Oppo: ["A15", "A16", "A17", "A54", "A57", "Reno 5", "Reno 6", "Reno 7"],
  Vivo: ["Y11", "Y12", "Y20", "Y21", "Y22", "V21", "V23"],
  Realme: ["C11", "C21", "C25", "C35", "8", "9", "10"],
  Otro: ["(Escribir en Equipo)"],
};

function onlyDigits(el) {
  el.value = String(el.value || "").replace(/\D+/g, "");
}

const telLada = document.getElementById("telefono_lada");
const telNum = document.getElementById("telefono_num");
telLada.addEventListener("input", () => onlyDigits(telLada));
telNum.addEventListener("input", () => onlyDigits(telNum));

const categoria = document.getElementById("equipo_categoria");
const wrapCel = document.getElementById("equipo_celular_wrap");
const wrapTxt = document.getElementById("equipo_texto_wrap");
const marca = document.getElementById("equipo_marca");
const modelo = document.getElementById("equipo_modelo");
const equipoTexto = document.getElementById("equipo_texto");

function initCustomSelect(selectId) {
  const select = document.getElementById(selectId);
  const wrapper = document.querySelector(`.custom-select[data-target="${selectId}"]`);
  if (!select || !wrapper) return;

  const trigger = wrapper.querySelector(".custom-select__trigger");
  const valueEl = wrapper.querySelector(".custom-select__value");
  const optionsEl = wrapper.querySelector(".custom-select__options");

  function buildOptions() {
    optionsEl.innerHTML = "";
    Array.from(select.options).forEach((opt) => {
      const optionEl = document.createElement("div");
      optionEl.className = "custom-select__option";
      optionEl.dataset.value = opt.value;
      optionEl.textContent = opt.textContent;
      if (opt.disabled) {
        optionEl.setAttribute("aria-disabled", "true");
        optionEl.style.opacity = "0.6";
        optionEl.style.cursor = "default";
      }
      if (opt.selected) {
        optionEl.setAttribute("aria-selected", "true");
      }
      optionsEl.appendChild(optionEl);
    });
  }

  function updateTrigger() {
    const selected = select.options[select.selectedIndex];
    if (selected && selected.value) {
      valueEl.textContent = selected.textContent;
      valueEl.classList.remove("placeholder");
    } else {
      valueEl.textContent = select.options[0]?.textContent || "Selecciona";
      valueEl.classList.add("placeholder");
    }
    Array.from(optionsEl.children).forEach((o) => {
      o.setAttribute(
        "aria-selected",
        o.dataset.value === select.value ? "true" : "false",
      );
    });
  }

  function close() {
    wrapper.classList.remove("open");
    trigger.setAttribute("aria-expanded", "false");
  }

  function open() {
    wrapper.classList.add("open");
    trigger.setAttribute("aria-expanded", "true");
  }

  function toggle() {
    if (wrapper.classList.contains("open")) close();
    else open();
  }

  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    toggle();
  });

  optionsEl.addEventListener("click", (event) => {
    const option = event.target.closest(".custom-select__option");
    if (!option || option.getAttribute("aria-disabled") === "true") return;
    select.value = option.dataset.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    updateTrigger();
    close();
  });

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) {
      close();
    }
  });

  select.addEventListener("change", updateTrigger);

  buildOptions();
  updateTrigger();
}

initCustomSelect("equipo_categoria");

function fillModelos(marcaVal) {
  const items = MODELOS_CELULAR[marcaVal] || [];
  modelo.innerHTML = `<option value="" selected disabled>Modelo (celular)</option>`;
  items.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modelo.appendChild(opt);
  });
}

categoria.addEventListener("change", () => {
  const isCel = categoria.value === "Celular";
  wrapCel.style.display = isCel ? "block" : "none";
  wrapTxt.style.display = isCel ? "none" : "block";

  // Reglas de required según modo
  marca.required = isCel;
  modelo.required = isCel;
  equipoTexto.required = !isCel;
});

marca.addEventListener("change", () => fillModelos(marca.value));

const elPrecio = document.getElementById("precio");
const elDescWrap = document.getElementById("descuentoWrap");
const elDescTipo = document.getElementById("descuento_tipo");
const elDescValor = document.getElementById("descuento_valor");
const elPrecioFinalUi = document.getElementById("precioFinalUi");

function parseMoneyText(v) {
  const s = String(v || "")
    .replace(/[^0-9.,]/g, "")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function calcPrecioFinal() {
  if (!elPrecio || !elDescTipo || !elDescValor || !elPrecioFinalUi) return null;
  const base = parseMoneyText(elPrecio.value);
  if (base === null) {
    elPrecioFinalUi.textContent = "N/A";
    return null;
  }
  const tipo = String(elDescTipo.value || "");
  const val = parseMoneyText(elDescValor.value);
  if (!tipo || val === null) {
    elPrecioFinalUi.textContent = "$" + base.toFixed(2);
    return base;
  }
  let final = base;
  if (tipo === "PORCENTAJE") final = base - (base * val) / 100;
  else if (tipo === "MONTO") final = base - val;
  final = Math.max(0, final);
  elPrecioFinalUi.textContent = "$" + final.toFixed(2);
  return final;
}

function setDescPct(p) {
  if (!elDescTipo || !elDescValor) return;
  elDescTipo.value = "PORCENTAJE";
  elDescValor.value = String(p);
  calcPrecioFinal();
}
function clearDescuento() {
  if (!elDescTipo || !elDescValor) return;
  elDescTipo.value = "";
  elDescValor.value = "";
  calcPrecioFinal();
}
window.setDescPct = setDescPct;
window.clearDescuento = clearDescuento;

if (elDescTipo) elDescTipo.addEventListener("change", calcPrecioFinal);
if (elDescValor) elDescValor.addEventListener("input", calcPrecioFinal);
if (elPrecio) elPrecio.addEventListener("input", calcPrecioFinal);

async function buscarClienteFrecuente() {
  const box = document.getElementById("clienteFrecuenteInfo");
  const nombre = document.getElementById("nombre_cliente").value;
  const lada = telLada.value.trim();
  const num = telNum.value.trim();
  const telefono = `${lada}${num}`;

  if (box)
    box.innerHTML = `
      <div class="clientBox">
        <div class="clientTop">
          <div>
            <div class="clientTitle">Buscando cliente…</div>
            <div class="muted">Revisando historial por nombre/teléfono.</div>
          </div>
          <span class="pill neutral">⏳</span>
        </div>
      </div>
    `;

  if (!nombre.trim() && !telefono.trim()) {
    if (box) box.textContent = "";
    alert("Escribe al menos nombre o teléfono para buscar.");
    return;
  }

  try {
    const res = await fetch("/cliente-buscar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono }),
    });

    const data = await res.json().catch(() => null);

    if (!data || data.ok === false) {
      const msg = data?.error || `No se pudo buscar cliente (HTTP ${res.status})`;
      if (box)
        box.innerHTML = `
          <div class="clientBox">
            <div class="clientTop">
              <div>
                <div class="clientTitle">No se pudo buscar</div>
                <div class="muted">${msg}</div>
              </div>
              <span class="pill neutral">ℹ️</span>
            </div>
          </div>
        `;
      alert(msg);
      return;
    }

    if (!data.total) {
      if (elDescWrap) elDescWrap.style.display = "none";
      if (box)
        box.innerHTML = `
          <div class="clientBox">
            <div class="clientTop">
              <div>
                <div class="clientTitle">Cliente nuevo</div>
                <div class="muted">No se encontraron reparaciones anteriores con esos datos.</div>
              </div>
              <span class="pill neutral">🆕</span>
            </div>
          </div>
        `;
      return;
    }

    const veces = data.total;
    const ultima = data.notas[0] || {};
    const list = (data.notas || []).slice(0, 3);
    const listHtml = list
      .map(
        (n) => `
        <div class="clientItem">
          <div>
            <div style="font-weight:900">${n.folio || ""}</div>
            <div class="muted" style="margin-top:2px">${n.equipo || ""}</div>
            <div class="muted" style="margin-top:2px">${n.fecha_ingreso || ""} · ${n.estado || ""}</div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap">
            <button class="btn sm" type="button" onclick="reimprimir(${n.id})">🖨️ Ticket</button>
          </div>
        </div>
      `,
      )
      .join("");

    if (box)
      box.innerHTML = `
        <div class="clientBox">
          <div class="clientTop">
            <div>
              <div class="clientTitle">Cliente frecuente</div>
              <div class="muted">
                <b>${veces}</b> reparación(es) encontrada(s).
                Última: <b>${ultima.folio || ""}</b> · ${ultima.equipo || ""}
              </div>
            </div>
            <span class="pill good">⭐ ${veces}x</span>
          </div>
          <div class="clientList">
            ${listHtml}
            <div class="muted">Tip: si aplica descuento, ajusta <b>Precio</b> y/o <b>Anticipo</b> antes de guardar.</div>
          </div>
        </div>
      `;

    // Habilita descuentos en la captura cuando es cliente frecuente
    if (elDescWrap) elDescWrap.style.display = "block";
    const badge = document.getElementById("descuentoBadge");
    if (badge) badge.textContent = `⭐ ${veces}x`;
    calcPrecioFinal();
  } catch (e) {
    if (elDescWrap) elDescWrap.style.display = "none";
    const msg = "No se pudo conectar al servidor para buscar cliente.";
    if (box)
      box.innerHTML = `
        <div class="clientBox">
          <div class="clientTop">
            <div>
              <div class="clientTitle">Sin conexión</div>
              <div class="muted">${msg}</div>
            </div>
            <span class="pill neutral">⚠️</span>
          </div>
        </div>
      `;
    alert(msg);
  }
}

// Asegura que el onclick del botón lo encuentre
window.buscarClienteFrecuente = buscarClienteFrecuente;

document.getElementById("notaForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const lada = telLada.value.trim();
  const num = telNum.value.trim();
  if (lada.length < 2 || lada.length > 3) return alert("Lada inválida (2-3 dígitos)");
  if (num.length !== 10) return alert("El número debe tener 10 dígitos");

  const equipo_categoria = categoria.value;
  let equipo_marca = "";
  let equipo_modelo = "";
  let equipo = "";
  if (equipo_categoria === "Celular") {
    equipo_marca = (marca.value || "").trim();
    equipo_modelo = (modelo.value || "").trim();
    if (!equipo_marca) return alert("Selecciona la marca del celular");
    if (!equipo_modelo) return alert("Selecciona el modelo del celular");
    equipo = `${equipo_categoria} - ${equipo_marca} ${equipo_modelo}`;
  } else {
    equipo = (equipoTexto.value || "").trim();
    if (!equipo) return alert("Escribe el equipo");
  }

  const data = {
    nombre_cliente: document.getElementById("nombre_cliente").value,
    correo: document.getElementById("correo").value,
    telefono_lada: lada,
    telefono_num: num,
    telefono: `${lada}${num}`,
    domicilio: document.getElementById("domicilio").value,
    equipo_categoria,
    equipo_marca,
    equipo_modelo,
    equipo,
    imei: document.getElementById("imei").value,
    pin: document.getElementById("pin").value,
    falla: document.getElementById("falla").value,
    notas: document.getElementById("notas").value,
    precio: document.getElementById("precio").value,
    descuento_tipo: elDescTipo?.value || "",
    descuento_valor: elDescValor?.value || "",
    precio_final: calcPrecioFinal(),
    anticipo: document.getElementById("anticipo").value,
  };

  // Validaciones extra por si
  if (
    !data.nombre_cliente.trim() ||
    !data.equipo.trim() ||
    !data.falla.trim() ||
    !data.notas.trim() ||
    !data.precio.trim() ||
    !data.anticipo.trim()
  ) {
    return alert("Por favor completa todos los campos obligatorios");
  }

  fetch("/guardar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data || data.ok === false) {
        return alert(data?.error || "No se pudo guardar la nota");
      }
      const url = `/ticket.html?id=${encodeURIComponent(data.id)}`;
      window.open(url, "_blank");
      verNotas();
      document.getElementById("notaForm").reset();
    });
});
function cambiarEstado(id, estado) {
  fetch("/estado", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, estado }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data || data.ok === false) return alert(data?.error || "No se pudo actualizar");
      alert(data.message || "Estado actualizado");
      verNotas(); // refresca lista
    });
}

function reimprimir(id) {
  window.open(`/ticket.html?id=${encodeURIComponent(id)}`, "_blank");
}

function borrarNota(id, folio) {
  const ok = confirm(`¿Seguro que quieres borrar la nota ${folio}? (No se puede deshacer)`);
  if (!ok) return;

  fetch(`/nota/${encodeURIComponent(id)}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((data) => {
      if (!data || data.ok === false) return alert(data?.error || "No se pudo borrar");
      alert(data.message || "Nota borrada");
      verNotas();
    })
    .catch(() => alert("No se pudo borrar"));
}

function badgeClass(estado) {
  const e = String(estado || "").toUpperCase();
  if (e === "RECIBIDO") return "recibido";
  if (e === "EN PROCESO") return "proceso";
  if (e === "TERMINADO") return "terminado";
  if (e === "NO REPARADO") return "noreparado";
  return "";
}

function verNotas() {
  const filtro = document.getElementById("busqueda").value.toLowerCase();

  fetch("/notas")
    .then((res) => res.json())
    .then((data) => {
      const lista = document.getElementById("lista");
      lista.innerHTML = "";

      data
        .filter(
          (nota) =>
            nota.nombre_cliente.toLowerCase().includes(filtro) ||
            nota.telefono.toLowerCase().includes(filtro) ||
            nota.folio.toLowerCase().includes(filtro),
        )
        .forEach((nota) => {
          const li = document.createElement("li");
          li.className = "note";

          const estadoTxt = nota.estado || "N/A";
          const pinTipo = nota.pin && nota.pin.includes("-") ? "Patrón" : nota.pin ? "PIN" : "Sin clave";
          const safeFolio = String(nota.folio).replace(/'/g, "\\'");

          li.innerHTML = `
            <div class="noteTop">
              <div>
                <div style="font-weight: 900; letter-spacing: .2px">${nota.folio}</div>
                <div style="margin-top: 2px"><b>${nota.nombre_cliente}</b></div>
                <div class="muted" style="margin-top: 2px">${nota.equipo}</div>
              </div>
              <div class="badge ${badgeClass(estadoTxt)}">${estadoTxt}</div>
            </div>
            <div class="muted" style="margin-top: 10px">🔐 ${pinTipo}: ${nota.pin || "N/A"}</div>

            <div class="noteActions">
              <button class="btn sm" type="button" onclick="cambiarEstado(${nota.id}, 'RECIBIDO')">🟡 Recibido</button>
              <button class="btn sm primary" type="button" onclick="cambiarEstado(${nota.id}, 'EN PROCESO')">🔵 Proceso</button>
              <button class="btn sm success" type="button" onclick="cambiarEstado(${nota.id}, 'TERMINADO')">🟢 Terminado</button>
              <button class="btn sm danger" type="button" onclick="cambiarEstado(${nota.id}, 'NO REPARADO')">🔴 No reparado</button>
              <button class="btn sm" type="button" onclick="reimprimir(${nota.id})">🖨️ Reimprimir</button>
              <button class="btn sm danger" type="button" onclick="borrarNota(${nota.id}, '${safeFolio}')">🗑️ Borrar</button>
            </div>
          `;

          lista.appendChild(li);
        });
    });
}
