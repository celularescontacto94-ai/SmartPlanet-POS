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
      fecha_ingreso TEXT,
      nombre_cliente TEXT,
      telefono TEXT,
      domicilio TEXT,
      equipo TEXT,
      imei TEXT,
      falla TEXT,
      notas TEXT,
      pin TEXT,
      precio TEXT,
      anticipo REAL,
      total_pagado INTEGER,
      estado TEXT
    )
  `);
});

// 💾 GUARDAR NOTA
app.post("/guardar", (req, res) => {
  const {
    nombre_cliente,
    telefono,
    domicilio,
    equipo,
    imei,
    falla,
    notas,
    pin,
    precio,
    anticipo,
  } = req.body;

  const folio = "SP-" + Date.now();
  const fecha = new Date().toLocaleString();

  db.run(
    `INSERT INTO notas 
    (folio, fecha_ingreso, nombre_cliente, telefono, domicilio, equipo, imei, falla, notas, pin, precio, anticipo, total_pagado, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      folio,
      fecha,
      nombre_cliente,
      telefono,
      domicilio,
      equipo,
      imei,
      falla,
      notas,
      pin,
      precio,
      anticipo || 0,
      0,
      "RECIBIDO",
    ],
    function (err) {
      if (err) {
        return res.send("Error al guardar");
      }
      res.send("Nota guardada con folio " + folio);
    },
  );
});

// 📄 VER NOTAS
app.get("/notas", (req, res) => {
  db.all("SELECT * FROM notas", [], (err, rows) => {
    if (err) return res.json([]);
    res.json(rows);
  });
});

// 🚀 SERVIDOR
app.listen(3000, "0.0.0.0", () => {
  console.log("SmartPlanet POS corriendo");
});
