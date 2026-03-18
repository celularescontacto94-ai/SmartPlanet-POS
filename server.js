const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

// 🔥 BASE DE DATOS
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("./smartplanet.db");

// 🧱 TABLA COMPLETA
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS notas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT,
      folio_num INTEGER,
      fecha_ingreso TEXT,
      nombre_cliente TEXT,
      correo TEXT,
      telefono TEXT,
      telefono_lada TEXT,
      telefono_num TEXT,
      domicilio TEXT,
      equipo TEXT,
      equipo_categoria TEXT,
      equipo_marca TEXT,
      equipo_modelo TEXT,
      imei TEXT,
      falla TEXT,
      notas TEXT,
      pin TEXT,
      precio TEXT,
      descuento_tipo TEXT,
      descuento_valor REAL,
      precio_final REAL,
      anticipo REAL,
      total_pagado INTEGER,
      estado TEXT
    )
  `);

  // Agrega columnas nuevas si la BD ya existía
  const tryAdd = (sql) =>
    db.run(sql, (err) => {
      if (err) {
        // Ignora "duplicate column name"
        if (!String(err.message || "").toLowerCase().includes("duplicate column name")) {
          console.log(err);
        }
      }
    });

  tryAdd(`ALTER TABLE notas ADD COLUMN telefono_lada TEXT`);
  tryAdd(`ALTER TABLE notas ADD COLUMN telefono_num TEXT`);
  tryAdd(`ALTER TABLE notas ADD COLUMN equipo_categoria TEXT`);
  tryAdd(`ALTER TABLE notas ADD COLUMN equipo_marca TEXT`);
  tryAdd(`ALTER TABLE notas ADD COLUMN equipo_modelo TEXT`);
  tryAdd(`ALTER TABLE notas ADD COLUMN folio_num INTEGER`);
  tryAdd(`ALTER TABLE notas ADD COLUMN correo TEXT`);
  tryAdd(`ALTER TABLE notas ADD COLUMN descuento_tipo TEXT`);
  tryAdd(`ALTER TABLE notas ADD COLUMN descuento_valor REAL`);
  tryAdd(`ALTER TABLE notas ADD COLUMN precio_final REAL`);

  // 🛒 VENTAS (POS)
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT,
      nombre TEXT NOT NULL,
      categoria TEXT,
      precio REAL NOT NULL,
      stock REAL NOT NULL DEFAULT 0,
      activo INTEGER NOT NULL DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folio TEXT,
      fecha TEXT,
      cliente TEXT,
      total REAL NOT NULL,
      pago REAL NOT NULL,
      cambio REAL NOT NULL,
      metodo_pago TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS venta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id INTEGER NOT NULL,
      producto_id INTEGER,
      sku TEXT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      cantidad REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (venta_id) REFERENCES ventas(id)
    )
  `);
});

// 💾 GUARDAR NOTA
app.post("/guardar", (req, res) => {
  const {
    nombre_cliente,
    correo,
    telefono,
    telefono_lada,
    telefono_num,
    domicilio,
    equipo,
    equipo_categoria,
    equipo_marca,
    equipo_modelo,
    imei,
    falla,
    notas,
    pin,
    precio,
    descuento_tipo,
    descuento_valor,
    precio_final,
    anticipo,
  } = req.body;

  const fecha = new Date().toLocaleString();
  const anticipoNum = Number(anticipo) || 0;
  const lada = String(telefono_lada ?? "").replace(/\D+/g, "");
  const num = String(telefono_num ?? "").replace(/\D+/g, "");
  const telefonoFinal = String(telefono ?? `${lada}${num}` ?? "").replace(/\D+/g, "");

  if (!String(nombre_cliente || "").trim()) return res.status(400).json({ ok: false, error: "Nombre requerido" });
  const correoTrim = String(correo || "").trim();
  if (correoTrim && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correoTrim)) {
    return res.status(400).json({ ok: false, error: "Correo inválido" });
  }
  if (telefonoFinal.length < 10 || telefonoFinal.length > 13) return res.status(400).json({ ok: false, error: "Teléfono inválido" });
  if (!String(equipo || "").trim()) return res.status(400).json({ ok: false, error: "Equipo requerido" });
  if (!String(falla || "").trim()) return res.status(400).json({ ok: false, error: "Falla requerida" });
  if (!String(notas || "").trim()) return res.status(400).json({ ok: false, error: "Notas requeridas" });
  if (!String(precio || "").trim()) return res.status(400).json({ ok: false, error: "Precio requerido" });

  // Descuentos (opcionales)
  const descTipo = String(descuento_tipo || "").trim().toUpperCase();
  const descValorNum = descuento_valor === null || descuento_valor === undefined || descuento_valor === "" ? null : Number(descuento_valor);
  const precioFinalNum =
    precio_final === null || precio_final === undefined || precio_final === "" ? null : Number(precio_final);

  if (descTipo && !["PORCENTAJE", "MONTO"].includes(descTipo)) {
    return res.status(400).json({ ok: false, error: "Tipo de descuento inválido" });
  }
  if (descTipo && (!Number.isFinite(descValorNum) || descValorNum < 0)) {
    return res.status(400).json({ ok: false, error: "Valor de descuento inválido" });
  }
  if (precioFinalNum !== null && (!Number.isFinite(precioFinalNum) || precioFinalNum < 0)) {
    return res.status(400).json({ ok: false, error: "Precio final inválido" });
  }

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.get("SELECT COALESCE(MAX(folio_num), 0) AS maxNum FROM notas", [], (err, row) => {
      if (err) {
        console.log(err);
        db.run("ROLLBACK");
        return res.status(500).json({ ok: false, error: "Error al generar folio" });
      }

      const nextNum = (row?.maxNum || 0) + 1;
      const folio = "SP-" + String(nextNum).padStart(4, "0");

      db.run(
        `INSERT INTO notas 
        (folio, folio_num, fecha_ingreso, nombre_cliente, correo, telefono, telefono_lada, telefono_num, domicilio, equipo, equipo_categoria, equipo_marca, equipo_modelo, imei, falla, notas, pin, precio, descuento_tipo, descuento_valor, precio_final, anticipo, total_pagado, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          folio,
          nextNum,
          fecha,
          nombre_cliente,
          correoTrim || null,
          telefonoFinal,
          lada || null,
          num || null,
          domicilio,
          equipo,
          String(equipo_categoria || "").trim() || null,
          String(equipo_marca || "").trim() || null,
          String(equipo_modelo || "").trim() || null,
          imei,
          falla,
          notas,
          pin,
          precio,
          descTipo || null,
          descValorNum,
          precioFinalNum,
          anticipoNum,
          0,
          "RECIBIDO",
        ],
        function (err2) {
          if (err2) {
            console.log(err2);
            db.run("ROLLBACK");
            return res.status(500).json({ ok: false, error: "Error al guardar" });
          }

          const insertedId = this.lastID;

          db.get("SELECT * FROM notas WHERE id = ?", [insertedId], (err3, nota) => {
            if (err3 || !nota) {
              if (err3) console.log(err3);
              db.run("ROLLBACK");
              return res.status(500).json({ ok: false, error: "Error al confirmar guardado" });
            }

            db.run("COMMIT", (err4) => {
              if (err4) {
                console.log(err4);
                return res.status(500).json({ ok: false, error: "Error al finalizar guardado" });
              }

              res.json({
                ok: true,
                id: nota.id,
                folio: nota.folio,
                fecha: nota.fecha_ingreso,
                nombre_cliente: nota.nombre_cliente,
                correo: nota.correo,
                telefono: nota.telefono,
                telefono_lada: nota.telefono_lada,
                telefono_num: nota.telefono_num,
                domicilio: nota.domicilio,
                equipo: nota.equipo,
                equipo_categoria: nota.equipo_categoria,
                equipo_marca: nota.equipo_marca,
                equipo_modelo: nota.equipo_modelo,
                imei: nota.imei,
                falla: nota.falla,
                notas: nota.notas,
                pin: nota.pin,
                precio: nota.precio,
                anticipo: nota.anticipo,
              });
            });
          });
        },
      );
    });
  });
});

// ==========================
// 🛒 API PRODUCTOS / VENTAS
// ==========================

app.get("/productos", (req, res) => {
  db.all("SELECT * FROM productos WHERE activo = 1 ORDER BY categoria, nombre", [], (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ ok: false, error: "Error al consultar productos" });
    }
    res.json({ ok: true, productos: rows });
  });
});

app.post("/productos", (req, res) => {
  const { sku, nombre, categoria, precio, stock } = req.body || {};
  const nombreOk = String(nombre || "").trim();
  const precioNum = Number(precio);
  const stockNum = Number(stock ?? 0);

  if (!nombreOk) return res.status(400).json({ ok: false, error: "Nombre requerido" });
  if (!Number.isFinite(precioNum) || precioNum < 0) return res.status(400).json({ ok: false, error: "Precio inválido" });
  if (!Number.isFinite(stockNum) || stockNum < 0) return res.status(400).json({ ok: false, error: "Stock inválido" });

  db.run(
    `INSERT INTO productos (sku, nombre, categoria, precio, stock, activo) VALUES (?, ?, ?, ?, ?, 1)`,
    [String(sku || "").trim() || null, nombreOk, String(categoria || "").trim() || null, precioNum, stockNum],
    function (err) {
      if (err) {
        console.log(err);
        return res.status(500).json({ ok: false, error: "Error al guardar producto" });
      }
      res.json({ ok: true, id: this.lastID });
    },
  );
});

app.put("/productos/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "ID inválido" });

  const { sku, nombre, categoria, precio, stock, activo } = req.body || {};
  const nombreOk = String(nombre || "").trim();
  const precioNum = Number(precio);
  const stockNum = Number(stock ?? 0);
  const activoNum = activo === 0 || activo === false ? 0 : 1;

  if (!nombreOk) return res.status(400).json({ ok: false, error: "Nombre requerido" });
  if (!Number.isFinite(precioNum) || precioNum < 0) return res.status(400).json({ ok: false, error: "Precio inválido" });
  if (!Number.isFinite(stockNum) || stockNum < 0) return res.status(400).json({ ok: false, error: "Stock inválido" });

  db.run(
    `UPDATE productos SET sku = ?, nombre = ?, categoria = ?, precio = ?, stock = ?, activo = ? WHERE id = ?`,
    [String(sku || "").trim() || null, nombreOk, String(categoria || "").trim() || null, precioNum, stockNum, activoNum, id],
    function (err) {
      if (err) {
        console.log(err);
        return res.status(500).json({ ok: false, error: "Error al actualizar producto" });
      }
      if (this.changes === 0) return res.status(404).json({ ok: false, error: "Producto no encontrado" });
      res.json({ ok: true, message: "Producto actualizado" });
    },
  );
});

app.post("/venta", (req, res) => {
  const { cliente, metodo_pago, pago, items } = req.body || {};
  const itemsArr = Array.isArray(items) ? items : [];
  if (itemsArr.length === 0) return res.status(400).json({ ok: false, error: "Agrega productos a la venta" });

  const pagoNum = Number(pago);
  if (!Number.isFinite(pagoNum) || pagoNum < 0) return res.status(400).json({ ok: false, error: "Pago inválido" });

  const norm = itemsArr
    .map((it) => ({
      producto_id: it.producto_id ? Number(it.producto_id) : null,
      sku: String(it.sku || "").trim() || null,
      nombre: String(it.nombre || "").trim(),
      precio: Number(it.precio),
      cantidad: Number(it.cantidad),
    }))
    .filter((it) => it.nombre && Number.isFinite(it.precio) && Number.isFinite(it.cantidad) && it.cantidad > 0);

  if (norm.length === 0) return res.status(400).json({ ok: false, error: "Items inválidos" });

  const total = norm.reduce((acc, it) => acc + it.precio * it.cantidad, 0);
  if (pagoNum < total) return res.status(400).json({ ok: false, error: "Pago insuficiente" });
  const cambio = pagoNum - total;

  const folio = "V-" + Date.now();
  const fecha = new Date().toLocaleString();

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    db.run(
      `INSERT INTO ventas (folio, fecha, cliente, total, pago, cambio, metodo_pago) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [folio, fecha, String(cliente || "").trim() || null, total, pagoNum, cambio, String(metodo_pago || "").trim() || "EFECTIVO"],
      function (err) {
        if (err) {
          console.log(err);
          db.run("ROLLBACK");
          return res.status(500).json({ ok: false, error: "Error al guardar venta" });
        }

        const ventaId = this.lastID;
        let pending = norm.length;
        let failed = false;

        const fail = (msg) => {
          if (failed) return;
          failed = true;
          db.run("ROLLBACK");
          res.status(500).json({ ok: false, error: msg || "Error en la venta" });
        };

        const finishOne = () => {
          pending -= 1;
          if (pending === 0 && !failed) {
            db.run("COMMIT", (err3) => {
              if (err3) {
                console.log(err3);
                return res.status(500).json({ ok: false, error: "Error al finalizar venta" });
              }
              res.json({ ok: true, venta_id: ventaId, folio, fecha, total, pago: pagoNum, cambio });
            });
          }
        };

        norm.forEach((it) => {
          const subtotal = it.precio * it.cantidad;

          db.run(
            `INSERT INTO venta_items (venta_id, producto_id, sku, nombre, precio, cantidad, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [ventaId, it.producto_id, it.sku, it.nombre, it.precio, it.cantidad, subtotal],
            (err2) => {
              if (err2) {
                console.log(err2);
                return fail("Error al guardar items");
              }

              if (it.producto_id) {
                db.run(
                  `UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?`,
                  [it.cantidad, it.producto_id, it.cantidad],
                  function (err4) {
                    if (err4) {
                      console.log(err4);
                      return fail("Error al actualizar stock");
                    }
                    if (this.changes === 0) return fail(`Stock insuficiente para ${it.nombre}`);
                    finishOne();
                  },
                );
              } else {
                finishOne();
              }
            },
          );
        });
      },
    );
  });
});

app.get("/venta/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "ID inválido" });

  db.get("SELECT * FROM ventas WHERE id = ?", [id], (err, venta) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ ok: false, error: "Error al consultar venta" });
    }
    if (!venta) return res.status(404).json({ ok: false, error: "Venta no encontrada" });

    db.all("SELECT * FROM venta_items WHERE venta_id = ? ORDER BY id", [id], (err2, items) => {
      if (err2) {
        console.log(err2);
        return res.status(500).json({ ok: false, error: "Error al consultar items" });
      }
      res.json({ ok: true, venta, items });
    });
  });
});

app.post("/estado", (req, res) => {
  const { id, estado } = req.body;

  db.run(
    `UPDATE notas SET estado = ? WHERE id = ?`,
    [estado, id],
    function (err) {
      if (err) {
        console.log(err);
        return res.status(500).json({ ok: false, error: "Error al actualizar" });
      }
      res.json({ ok: true, message: "Estado actualizado" });
    },
  );
});

// 🔎 VER NOTA POR ID (para reimprimir / ver detalle)
app.get("/nota/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "ID inválido" });

  db.get("SELECT * FROM notas WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ ok: false, error: "Error al consultar" });
    }
    if (!row) return res.status(404).json({ ok: false, error: "No encontrada" });
    res.json({ ok: true, nota: row });
  });
});

// 🗑️ BORRAR NOTA POR ID
app.delete("/nota/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "ID inválido" });

  db.run("DELETE FROM notas WHERE id = ?", [id], function (err) {
    if (err) {
      console.log(err);
      return res.status(500).json({ ok: false, error: "Error al borrar" });
    }
    if (this.changes === 0) return res.status(404).json({ ok: false, error: "No encontrada" });
    res.json({ ok: true, message: "Nota borrada" });
  });
});

// 📄 VER NOTAS
app.get("/notas", (req, res) => {
  db.all("SELECT * FROM notas", [], (err, rows) => {
    if (err) return res.json([]);
    res.json(rows);
  });
});

// 🔍 BUSCAR CLIENTE POR NOMBRE / TELÉFONO
app.post("/cliente-buscar", (req, res) => {
  const { nombre, telefono } = req.body || {};
  const nombreTrim = String(nombre || "").trim().toLowerCase();
  const telDigits = String(telefono || "").replace(/\D+/g, "");

  if (!nombreTrim && !telDigits) {
    return res.status(400).json({ ok: false, error: "Proporciona nombre o teléfono" });
  }

  // Importante: usamos OR (no AND) para evitar falsos "no encontrado"
  // cuando el nombre o el teléfono no coinciden exactamente.
  const params = [];
  const whereOr = [];

  if (nombreTrim) {
    whereOr.push("LOWER(nombre_cliente) LIKE ?");
    params.push("%" + nombreTrim + "%");
  }

  if (telDigits) {
    // Si el usuario mete solo 10 dígitos (sin lada), buscamos por los últimos 10.
    const last10 = telDigits.length > 10 ? telDigits.slice(-10) : telDigits;
    whereOr.push("telefono LIKE ?");
    params.push("%" + telDigits + "%");

    if (last10 !== telDigits) {
      whereOr.push("telefono LIKE ?");
      params.push("%" + last10 + "%");
    } else if (telDigits.length === 10) {
      whereOr.push("telefono LIKE ?");
      params.push("%" + last10 + "%");
    }
  }

  const sql = `
    SELECT id, folio, fecha_ingreso, nombre_cliente, telefono, equipo, estado, precio
    FROM notas
    WHERE (${whereOr.join(" OR ")})
    ORDER BY id DESC
    LIMIT 10
  `;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ ok: false, error: "Error al buscar cliente" });
    }
    res.json({ ok: true, total: rows.length, notas: rows });
  });
});

// 🚀 SERVIDOR
app.listen(3000, "0.0.0.0", () => {
  console.log("SmartPlanet POS corriendo");
});
