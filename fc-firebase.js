// ── Backend Firebase compartido por las apps de servicios (Fátima Caldea + Jonatan & Fátima) ──
// Proyecto: mis-servicios-bb182 · SEPARADO de la academia Fátima Pro.
//
// Se carga DESPUÉS de los SDK compat de Firebase (ver <helmet> de cada página).
// Expone window.FCF con helpers DEFENSIVOS: si Firebase no cargó (sin red, sin SDK),
// FCF.ready() devuelve false y todo es no-op → la app sigue funcionando con localStorage.
//
// La config se embebe en el cliente a propósito (igual que en la academia): la
// seguridad NO depende de ocultar estas claves, sino de firestore.rules.
window.FCF = (function () {
  var cfg = {
    apiKey: "AIzaSyCeCkO_6IQKwemBkSLMYJe0xwZl46E7ekc",
    authDomain: "mis-servicios-bb182.firebaseapp.com",
    projectId: "mis-servicios-bb182",
    storageBucket: "mis-servicios-bb182.firebasestorage.app",
    messagingSenderId: "1030967336127",
    appId: "1:1030967336127:web:dfbf5d744a0b9514f5fa0a",
    measurementId: "G-17QRJ3PZT5"
  };

  // Correo de la administradora (debe existir como usuario email/contraseña en
  // Firebase Auth y coincide con firestore.rules).
  var ADMIN_EMAIL = "fatimahairstudio082@gmail.com";

  var ok = false, db = null, auth = null;
  try {
    if (window.firebase && firebase.initializeApp) {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(cfg);
      db = firebase.firestore();
      try { auth = firebase.auth(); } catch (e) { auth = null; }
      ok = true;
    }
  } catch (e) { ok = false; }

  function ready() { return !!(ok && db); }
  function stamp() { return firebase.firestore.FieldValue.serverTimestamp(); }

  // ── Citas ──────────────────────────────────────────────────────────────
  // data: { origen, nombre?, telefono, servicio?, zona?, fecha, fechaTexto?,
  //         direccion?, coords?, nota? }
  function addCita(data) {
    if (!ready()) return Promise.reject(new Error("sin-conexion"));
    var rec = {};
    for (var k in data) if (data.hasOwnProperty(k)) rec[k] = data[k];
    rec.estado = "pendiente";
    rec.creada = stamp();
    return db.collection("citas").add(rec);
  }
  // Escucha en tiempo real las citas de una app. cb(arr) o cb(null, error).
  // Requiere estar autenticada como administradora (ver reglas).
  function watchCitas(origen, cb) {
    if (!ready()) { cb(null, new Error("sin-conexion")); return function () {}; }
    return db.collection("citas").where("origen", "==", origen)
      .onSnapshot(function (snap) {
        var arr = [];
        snap.forEach(function (d) {
          var o = d.data() || {}; o.id = d.id; arr.push(o);
        });
        cb(arr);
      }, function (err) { cb(null, err); });
  }
  function updateCita(id, data) {
    if (!ready()) return Promise.reject(new Error("sin-conexion"));
    return db.collection("citas").doc(id).update(data);
  }
  function deleteCita(id) {
    if (!ready()) return Promise.reject(new Error("sin-conexion"));
    return db.collection("citas").doc(id).delete();
  }

  // ── Visitas (ciudad aproximada por IP — nivel analítica, nunca precisa) ──
  // Se usa en la Fase 3 (feed "quién entra" en el admin). Registra una vez por sesión.
  function logVisita(origen) {
    if (!ready()) return;
    try { if (sessionStorage.getItem("fc_visit_logged")) return; } catch (e) {}
    function guardar(g) {
      db.collection("visitas").add({
        origen: origen,
        ciudad: (g && g.city) || "",
        region: (g && g.region) || "",
        pais: (g && (g.country_name || g.country)) || "",
        ts: stamp(),
        ua: (navigator.userAgent || "").slice(0, 180)
      }).catch(function () {});
      try { sessionStorage.setItem("fc_visit_logged", "1"); } catch (e) {}
    }
    fetch("https://ipapi.co/json/")
      .then(function (r) { return r.json(); })
      .then(function (g) { guardar(g); })
      .catch(function () { guardar(null); });
  }
  function watchVisitas(origen, cb) {
    if (!ready()) { cb(null, new Error("sin-conexion")); return function () {}; }
    return db.collection("visitas").where("origen", "==", origen)
      .onSnapshot(function (snap) {
        var arr = [];
        snap.forEach(function (d) { var o = d.data() || {}; o.id = d.id; arr.push(o); });
        cb(arr);
      }, function (err) { cb(null, err); });
  }

  // ── Bloques (tarjetas dinámicas: Amway, enlaces, HTML) ───────────────────
  // Lectura pública (las ven las clientas); escritura solo la administradora.
  function addBloque(data) {
    if (!ready()) return Promise.reject(new Error("sin-conexion"));
    var rec = {};
    for (var k in data) if (data.hasOwnProperty(k)) rec[k] = data[k];
    rec.origen = rec.origen || "caldea";
    rec.creada = stamp();
    return db.collection("bloques").add(rec);
  }
  function updateBloque(id, data) {
    if (!ready()) return Promise.reject(new Error("sin-conexion"));
    return db.collection("bloques").doc(id).update(data);
  }
  function deleteBloque(id) {
    if (!ready()) return Promise.reject(new Error("sin-conexion"));
    return db.collection("bloques").doc(id).delete();
  }
  function watchBloques(origen, cb) {
    if (!ready()) { cb(null, new Error("sin-conexion")); return function () {}; }
    return db.collection("bloques").where("origen", "==", origen)
      .onSnapshot(function (snap) {
        var arr = [];
        snap.forEach(function (d) { var o = d.data() || {}; o.id = d.id; arr.push(o); });
        cb(arr);
      }, function (err) { cb(null, err); });
  }

  // ── Fechas / recordatorios (privados de la administradora) ───────────────
  function addFecha(data) {
    if (!ready()) return Promise.reject(new Error("sin-conexion"));
    var rec = {};
    for (var k in data) if (data.hasOwnProperty(k)) rec[k] = data[k];
    rec.origen = rec.origen || "caldea";
    rec.creada = stamp();
    return db.collection("fechas").add(rec);
  }
  function deleteFecha(id) {
    if (!ready()) return Promise.reject(new Error("sin-conexion"));
    return db.collection("fechas").doc(id).delete();
  }
  function watchFechas(origen, cb) {
    if (!ready()) { cb(null, new Error("sin-conexion")); return function () {}; }
    return db.collection("fechas").where("origen", "==", origen)
      .onSnapshot(function (snap) {
        var arr = [];
        snap.forEach(function (d) { var o = d.data() || {}; o.id = d.id; arr.push(o); });
        cb(arr);
      }, function (err) { cb(null, err); });
  }

  // ── Auth administradora ─────────────────────────────────────────────────
  function signIn(email, pass) {
    if (!ready() || !auth) return Promise.reject(new Error("sin-conexion"));
    return auth.signInWithEmailAndPassword(email, pass);
  }
  function signOut() { if (ready() && auth) try { auth.signOut(); } catch (e) {} }
  function onAuth(cb) {
    if (!ready() || !auth) { cb(null); return function () {}; }
    return auth.onAuthStateChanged(cb);
  }
  function currentUser() { return (ready() && auth) ? auth.currentUser : null; }

  return {
    ready: ready,
    ADMIN_EMAIL: ADMIN_EMAIL,
    addCita: addCita, watchCitas: watchCitas, updateCita: updateCita, deleteCita: deleteCita,
    logVisita: logVisita, watchVisitas: watchVisitas,
    addBloque: addBloque, updateBloque: updateBloque, deleteBloque: deleteBloque, watchBloques: watchBloques,
    addFecha: addFecha, deleteFecha: deleteFecha, watchFechas: watchFechas,
    signIn: signIn, signOut: signOut, onAuth: onAuth, currentUser: currentUser
  };
})();
