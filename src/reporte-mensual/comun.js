/* comun.js — cálculos, filtros, gráficas SVG y animaciones del reporte mensual.
 * Sin dependencias: el HTML exportado debe abrir sin internet.
 * Lee window.REPORTE (lo arma hooks/useReporteMensual.js). El CSS vive en
 * plantilla.html. Ambos se incrustan en un solo HTML (ver construirHtml). */
(function () {
  const R = window.REPORTE;
  const col = (arr) => Object.fromEntries(arr.map((k, i) => [k, i]));
  const M = col(R.campos.mat), T = col(R.campos.renta), V = col(R.campos.venta);

  // ── Paleta validada (validate_palette.js, ver README) ──
  const TIPOS = ["Materiales Petreos", "Materiales Asfalticos", "Producto de Corte", "Otros"];
  const TIPO_LABEL = { "Materiales Petreos": "Pétreos", "Materiales Asfalticos": "Asfálticos", "Producto de Corte": "Producto de corte", Otros: "Otros" };
  const PALETA = {
    light: { tipos: ["#2A6FB0", "#E8692F", "#17A57A", "#D99A00"], etapas: ["#8DB3DB", "#4A83BF", "#174F86"] },
    dark: { tipos: ["#3F86D4", "#E0652C", "#1FA87D", "#BD8A00"], etapas: ["#2B5B8C", "#4F8BC7", "#9CC2E8"] },
  };
  const ETAPAS = ["Sin conciliar", "Conciliado", "Con OC y factura"];
  const tipoDe = (iMat) => { const t = R.materiales[iMat].tipo; return TIPOS.includes(t) ? t : "Otros"; };

  // Espectro de eficiencia de renta (mismo que useIndicadoresEficiencia.js, meta 7 viajes/día)
  const META_VIAJES_DIA = 7;
  const RANGOS_RENTA = [
    { key: "poca", label: "Poca eficiencia", rango: "1–3 viajes/día", max: 3, color: "#C2410C" },
    { key: "media", label: "Eficiencia media", rango: "4–6 viajes/día", max: 6, color: "#D99A00" },
    { key: "buena", label: "Buena eficiencia", rango: "7–9 viajes/día", max: 9, color: "#4A83BF" },
    { key: "muyBuena", label: "Muy buena", rango: "10+ viajes/día", max: Infinity, color: "#174F86" },
  ];
  const rangoDe = (ritmo) => RANGOS_RENTA.findIndex((r) => ritmo <= r.max);
  const CARGAS = [{ label: "Llenos (100%)", pct: 100, color: "#174F86" }, { label: "3/4 (75%)", pct: 75, color: "#4A83BF" }, { label: "Medios (50%)", pct: 50, color: "#8DB3DB" }];

  // ── Formato ──
  const nf0 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt = {
    n0: (x) => nf0.format(x || 0),
    n1: (x) => nf1.format(x || 0),
    n2: (x) => nf2.format(x || 0),
    m3: (x) => `${nf0.format(x || 0)} m³`,
    mxn: (x) => `$${nf2.format(x || 0)}`,
    mxn0: (x) => `$${nf0.format(x || 0)}`,
    corto: (x) => {
      const a = Math.abs(x || 0);
      if (a >= 1e6) return `$${nf2.format(x / 1e6)} M`;
      if (a >= 1e3) return `$${nf1.format(x / 1e3)} mil`;
      return `$${nf0.format(x || 0)}`;
    },
    pct: (x) => (x == null || !isFinite(x) ? "—" : `${nf0.format(x)}%`),
    delta: (a, b) => (b > 0 ? ((a - b) / b) * 100 : null),
    obra: (o) => (o.cc != null ? `CC ${o.cc} · ${o.obra}` : o.obra),
    fecha: (d) => new Date(`${R.mes}-${String(d).padStart(2, "0")}T12:00:00`),
    dia: (d) => { const s = fmt.fecha(d).toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" }).replace(/\./g, "").replace(/ de /g, " "); return s.charAt(0).toUpperCase() + s.slice(1); },
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ── Íconos (trazos estilo Lucide, 24×24) ──
  const ICONOS = {
    cubo: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    billete: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    factura: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M9 15l2 2 4-4"/>',
    camion: '<path d="M3 17V6h11v11M14 10h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
    mapa: '<path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="10" r="2.5"/>',
    pulso: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    tabla: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    edificio: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M8 7h4M8 11h4M8 15h4M2 21h20"/>',
    capas: '<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
    montana: '<path d="m8 3 4 8 5-5 5 15H2Z"/>',
    venta: '<path d="M3 9 5 3h14l2 6"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0Z"/><path d="M5 13v8h14v-8"/>',
    hoja: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6"/>',
    nota: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
    gota: '<path d="M12 22a7 7 0 0 0 7-7c0-4-7-13-7-13S5 11 5 15a7 7 0 0 0 7 7Z"/>',
    flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };
  const icono = (n, size = 18, cls = "ico") => `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[n] || ""}</svg>`;

  // ── Rellenos ──
  // Colores planos (sin degradado): Bruno prefiere un acabado sobrio.
  const grad = (c) => c;

  // ── Estado de filtros ──
  const estado = { obras: new Set(), empresas: new Set(), materiales: new Set(), bancos: new Set() };
  const oyentes = [];
  const alCambiar = (fn) => oyentes.push(fn);
  const notificar = () => oyentes.forEach((fn) => fn());

  const pasaObra = (iObra) => (estado.obras.size === 0 || estado.obras.has(iObra)) && (estado.empresas.size === 0 || estado.empresas.has(R.obras[iObra].iEmpresa));
  const pasaMatBanco = (iMat, iBanco) => (estado.materiales.size === 0 || estado.materiales.has(iMat)) && (estado.bancos.size === 0 || estado.bancos.has(iBanco));
  const pasaMat = (r) => pasaObra(r[M.obra]) && pasaMatBanco(r[M.material], r[M.banco]);
  // Material y banco no existen en renta: la renta solo responde a obra y empresa.
  const pasaRenta = (r) => pasaObra(r[T.obra]);
  // La venta no pertenece a ninguna obra: con filtro de obra/empresa no aplica.
  const pasaVenta = (r) => estado.obras.size === 0 && estado.empresas.size === 0 && pasaMatBanco(r[V.material], r[V.banco]);

  // ── Cálculos ──
  const sumar = (rows, i) => rows.reduce((a, r) => a + r[i], 0);
  const folios = (rows, i) => new Set(rows.map((r) => r[i])).size;

  const calcular = (periodo) => {
    const mat = R[periodo].mat.filter(pasaMat);
    const renta = R[periodo].renta.filter(pasaRenta);
    const venta = R[periodo].venta.filter(pasaVenta);
    const ctm = mat.filter((r) => !r[M.geem]);
    const geem = mat.filter((r) => r[M.geem]);
    const rentaEquipo = renta.filter((r) => !r[T.pipa]);
    const importeMaterial = sumar(ctm, M.importe);
    const importeRenta = sumar(renta, T.importe);
    return {
      mat, renta, venta, ctm, geem, rentaEquipo,
      m3: sumar(mat, M.m3), m3Ctm: sumar(ctm, M.m3), m3Geem: sumar(geem, M.m3),
      viajes: sumar(mat, M.viajes),
      vales: folios(mat, M.folio) + folios(renta, T.folio),
      importeMaterial, importeRenta, importeTotal: importeMaterial + importeRenta,
      fleteEvitado: sumar(geem, M.fleteEvitado),
      m3Venta: sumar(venta, V.m3),
      obrasActivas: new Set([...mat.map((r) => r[M.obra]), ...renta.map((r) => r[T.obra])]).size,
    };
  };

  // Desglose por obra — misma estructura que "Desglose por Obra" de
  // Estadísticas Globales: obra → tipo → material (m³, vales, viajes, importe + IVA).
  const desglose = (c) => {
    const porObra = new Map();
    c.mat.forEach((r) => {
      const o = r[M.obra];
      if (!porObra.has(o)) porObra.set(o, new Map());
      const mats = porObra.get(o);
      const k = r[M.material];
      if (!mats.has(k)) mats.set(k, { iMat: k, material: R.materiales[k].material, tipo: tipoDe(k), m3: 0, folios: new Set(), viajes: 0, importeIVA: 0, soloGeem: true });
      const m = mats.get(k);
      m.m3 += r[M.m3]; m.folios.add(r[M.folio]); m.viajes += r[M.viajes]; m.importeIVA += r[M.importe] * 1.16;
      if (!r[M.geem]) m.soloGeem = false;
    });
    const filas = [...porObra.entries()].map(([iObra, mats]) => {
      const materiales = [...mats.values()].map((m) => ({ ...m, vales: m.folios.size }));
      const grupos = TIPOS.map((t) => ({ tipo: t, items: materiales.filter((m) => m.tipo === t).sort((a, b) => b.m3 - a.m3) })).filter((g) => g.items.length);
      const sub = materiales.reduce((a, m) => ({ m3: a.m3 + m.m3, vales: a.vales + m.vales, viajes: a.viajes + m.viajes, importeIVA: a.importeIVA + m.importeIVA }), { m3: 0, vales: 0, viajes: 0, importeIVA: 0 });
      return { iObra, obra: R.obras[iObra], grupos, nMateriales: materiales.length, subtotal: sub };
    }).sort((a, b) => b.subtotal.m3 - a.subtotal.m3);
    const total = filas.reduce((a, f) => ({ m3: a.m3 + f.subtotal.m3, vales: a.vales + f.subtotal.vales, viajes: a.viajes + f.subtotal.viajes, importeIVA: a.importeIVA + f.subtotal.importeIVA }), { m3: 0, vales: 0, viajes: 0, importeIVA: 0 });
    return { filas, total };
  };

  const agrupar = (rows, keyFn, init, add) => {
    const map = new Map();
    rows.forEach((r) => { const k = keyFn(r); if (!map.has(k)) map.set(k, init(k)); add(map.get(k), r); });
    return [...map.values()];
  };

  const porObra = (c) => {
    const base = (k) => ({ iObra: k, obra: R.obras[k], m3: 0, m3Geem: 0, importe: 0, renta: 0, evitado: 0, porTipo: Object.fromEntries(TIPOS.map((t) => [t, 0])), etapas: [0, 0, 0], porDia: Array(R.diasMes + 1).fill(0) });
    const map = new Map();
    const get = (k) => { if (!map.has(k)) map.set(k, base(k)); return map.get(k); };
    c.mat.forEach((r) => {
      const o = get(r[M.obra]);
      o.m3 += r[M.m3]; o.porTipo[tipoDe(r[M.material])] += r[M.m3]; o.porDia[r[M.dia]] += r[M.m3];
      if (r[M.geem]) { o.m3Geem += r[M.m3]; o.evitado += r[M.fleteEvitado]; }
      else { o.importe += r[M.importe]; o.etapas[r[M.estadoConc]] += r[M.importe]; }
    });
    c.renta.forEach((r) => { const o = get(r[T.obra]); o.renta += r[T.importe]; o.etapas[r[T.estadoConc]] += r[T.importe]; });
    return [...map.values()].sort((a, b) => b.m3 - a.m3);
  };

  // Obras agrupadas por empresa (sección 1)
  const porEmpresa = (obras) => agrupar(obras, (o) => o.obra.iEmpresa, (k) => ({ iEmpresa: k, empresa: R.empresas[k], obras: [], m3: 0 }), (g, o) => { g.obras.push(o); g.m3 += o.m3; }).sort((a, b) => b.m3 - a.m3);

  const porBanco = (c) => agrupar(c.mat, (r) => r[M.banco], (k) => ({ banco: R.bancos[k], m3: 0, importe: 0, geem: 0 }), (a, r) => { a.m3 += r[M.m3]; a.importe += r[M.importe]; if (r[M.geem]) a.geem += r[M.m3]; }).sort((a, b) => b.m3 - a.m3);

  const porMaterial = (c) => agrupar(c.mat, (r) => r[M.material], (k) => ({ iMat: k, material: R.materiales[k].material, tipo: tipoDe(k), m3: 0, importe: 0 }), (a, r) => { a.m3 += r[M.m3]; a.importe += r[M.importe]; }).sort((a, b) => b.m3 - a.m3);

  const porDia = (c) => {
    const d = Array.from({ length: R.diasMes }, (_, i) => ({ dia: i + 1, ctm: 0, geem: 0, venta: 0, porTipo: Object.fromEntries(TIPOS.map((t) => [t, 0])) }));
    c.mat.forEach((r) => { const x = d[r[M.dia] - 1]; if (r[M.geem]) x.geem += r[M.m3]; else x.ctm += r[M.m3]; x.porTipo[tipoDe(r[M.material])] += r[M.m3]; });
    c.venta.forEach((r) => (d[r[V.dia] - 1].venta += r[V.m3]));
    return d;
  };

  // Etapas del dinero: importe CTM de material + renta, por estado de conciliación.
  const etapas = (c) => {
    const e = [0, 0, 0];
    c.ctm.forEach((r) => (e[r[M.estadoConc]] += r[M.importe]));
    c.renta.forEach((r) => (e[r[T.estadoConc]] += r[T.importe]));
    const total = e[0] + e[1] + e[2];
    return { montos: e, total, pctConciliado: total ? ((e[1] + e[2]) / total) * 100 : null, pctFacturado: total ? (e[2] / total) * 100 : null };
  };

  const ritmo = (r) => (r[T.dias] > 0 ? r[T.viajes] / r[T.dias] : null);

  // Renta no aprovechada: vales de equipo (sin pipas) con 1-3 viajes/día.
  const rentaDesperdiciada = (c) => {
    const vales = c.rentaEquipo
      .filter((r) => ritmo(r) != null && ritmo(r) <= 3)
      .map((r) => ({ obra: R.obras[r[T.obra]], iObra: r[T.obra], dia: r[T.dia], equipo: R.equipos[r[T.equipo]], folio: r[T.folio], ritmo: ritmo(r), viajes: r[T.viajes], dias: r[T.dias], importe: r[T.importe], nota: r[T.nota], nocturno: r[T.nocturno] }))
      .sort((a, b) => a.dia - b.dia);
    const total = vales.reduce((a, v) => a + v.importe, 0);
    const totalRenta = c.rentaEquipo.reduce((a, r) => a + r[T.importe], 0);
    const obras = agrupar(vales, (v) => v.iObra, (k) => ({ iObra: k, obra: R.obras[k], vales: [], importe: 0 }), (a, v) => { a.vales.push(v); a.importe += v.importe; }).sort((a, b) => b.importe - a.importe);
    return { vales, total, totalRenta, pct: totalRenta ? (total / totalRenta) * 100 : null, obras, conNota: vales.filter((v) => v.nota).length };
  };

  // Renta de equipo por obra: días, horas, eficiencia y carga.
  const rentaPorObra = (c) => {
    const filas = agrupar(c.rentaEquipo, (r) => r[T.obra], (k) => ({ iObra: k, obra: R.obras[k], vales: 0, dias: 0, horas: 0, viajes: 0, importe: 0, rangos: [0, 0, 0, 0], abiertos: 0, carga: [0, 0, 0], diasConRitmo: 0, viajesConRitmo: 0 }), (a, r) => {
      a.vales += 1; a.dias += r[T.dias]; a.horas += r[T.horas]; a.viajes += r[T.viajes]; a.importe += r[T.importe];
      const ri = ritmo(r);
      if (ri == null) a.abiertos += 1; else { a.rangos[rangoDe(ri)] += 1; a.diasConRitmo += r[T.dias]; a.viajesConRitmo += r[T.viajes]; }
      r[T.carga].forEach((n, i) => (a.carga[i] += n));
    }).map((a) => {
      const nCarga = a.carga[0] + a.carga[1] + a.carga[2];
      return { ...a, ritmoProm: a.diasConRitmo ? a.viajesConRitmo / a.diasConRitmo : null, cargaProm: nCarga ? (a.carga[0] * 100 + a.carga[1] * 75 + a.carga[2] * 50) / nCarga : null, nCarga };
    }).sort((a, b) => b.importe - a.importe);
    const tot = filas.reduce((t, f) => {
      t.vales += f.vales; t.dias += f.dias; t.horas += f.horas; t.viajes += f.viajes; t.importe += f.importe; t.abiertos += f.abiertos;
      f.rangos.forEach((n, i) => (t.rangos[i] += n)); f.carga.forEach((n, i) => (t.carga[i] += n));
      t.diasConRitmo += f.diasConRitmo; t.viajesConRitmo += f.viajesConRitmo; return t;
    }, { vales: 0, dias: 0, horas: 0, viajes: 0, importe: 0, abiertos: 0, rangos: [0, 0, 0, 0], carga: [0, 0, 0], diasConRitmo: 0, viajesConRitmo: 0 });
    const nCarga = tot.carga[0] + tot.carga[1] + tot.carga[2];
    tot.ritmoProm = tot.diasConRitmo ? tot.viajesConRitmo / tot.diasConRitmo : null;
    tot.cargaProm = nCarga ? (tot.carga[0] * 100 + tot.carga[1] * 75 + tot.carga[2] * 50) / nCarga : null;
    tot.nCarga = nCarga;
    const nRitmo = tot.rangos.reduce((a, b) => a + b, 0);
    tot.pctEficiente = nRitmo ? ((tot.rangos[2] + tot.rangos[3]) / nRitmo) * 100 : null;
    const porEquipo = agrupar(c.rentaEquipo, (r) => r[T.equipo], (k) => ({ equipo: R.equipos[k], vales: 0, importe: 0, dias: 0 }), (a, r) => { a.vales += 1; a.importe += r[T.importe]; a.dias += r[T.dias]; }).sort((a, b) => b.importe - a.importe);
    const pipas = c.renta.filter((r) => r[T.pipa]);
    return { filas, total: tot, porEquipo, pipas: { vales: pipas.length, importe: sumar(pipas, T.importe) } };
  };

  const flotaPropia = (c) => porObra(c).filter((o) => o.m3Geem > 0).map((o) => ({ obra: o.obra, iObra: o.iObra, m3Geem: o.m3Geem, pct: o.m3 ? (o.m3Geem / o.m3) * 100 : 0, evitado: o.evitado })).sort((a, b) => b.evitado - a.evitado);

  const ventaMaterial = (c) => {
    const porMat = agrupar(c.venta, (r) => r[V.material], (k) => ({ material: R.materiales[k].material, m3: 0, vales: new Set() }), (a, r) => { a.m3 += r[V.m3]; a.vales.add(r[V.folio]); }).map((m) => ({ ...m, vales: m.vales.size })).sort((a, b) => b.m3 - a.m3);
    const dias = new Set(c.venta.map((r) => r[V.dia])).size;
    return { m3: sumar(c.venta, V.m3), vales: folios(c.venta, V.folio), camiones: folios(c.venta, V.placa), dias, porMat, aplica: estado.obras.size === 0 && estado.empresas.size === 0 };
  };

  // ── Tooltip global (data-tip en cualquier elemento) ──
  let tip;
  const iniciarTooltip = (clase = "tip") => {
    tip = document.createElement("div");
    tip.className = clase; tip.setAttribute("role", "tooltip"); tip.hidden = true;
    document.body.appendChild(tip);
    const mostrar = (el, x, y) => { tip.innerHTML = el.getAttribute("data-tip"); tip.hidden = false; const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.left = Math.min(window.innerWidth - w - 12, x + 14) + "px"; tip.style.top = Math.max(8, y - h - 12) + "px"; };
    document.addEventListener("pointermove", (e) => { const el = e.target.closest?.("[data-tip]"); if (!el) { tip.hidden = true; return; } mostrar(el, e.clientX, e.clientY); });
    document.addEventListener("focusin", (e) => { const el = e.target.closest?.("[data-tip]"); if (!el) return; const b = el.getBoundingClientRect(); mostrar(el, b.right, b.top); });
    document.addEventListener("focusout", () => (tip.hidden = true));
    window.addEventListener("scroll", () => (tip.hidden = true), { passive: true });
  };
  const tipHtml = (titulo, filas) => `<strong>${esc(titulo)}</strong>${filas.map(([k, v, c]) => `<div class="tip__row">${c ? `<i style="background:${c}"></i>` : ""}<span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("")}`;

  const niceMax = (v) => { const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };

  // ── Gráficas ──
  // Columnas diarias apiladas; cada columna "crece" con retraso escalonado.
  const columnasDiarias = (datos, series, { alto = 180, ancho = 720, formato = fmt.m3, marcaMax = true } = {}) => {
    const pad = { t: 18, r: 8, b: 26, l: 48 };
    const w = ancho - pad.l - pad.r, h = alto - pad.t - pad.b;
    const totales = datos.map((d) => series.reduce((a, s) => a + (d[s.key] || 0), 0));
    const nice = niceMax(Math.max(1, ...totales));
    const bw = w / datos.length, gap = Math.max(2, bw * 0.3);
    let out = `<svg viewBox="0 0 ${ancho} ${alto}" class="viz" role="img" aria-label="Volumen diario">`;
    [0, 0.5, 1].forEach((f) => { const y = pad.t + h - h * f; out += `<line class="viz__grid" x1="${pad.l}" x2="${ancho - pad.r}" y1="${y}" y2="${y}"/><text class="viz__tick" x="${pad.l - 8}" y="${y + 4}" text-anchor="end">${nf0.format(nice * f)}</text>`; });
    const iMax = totales.indexOf(Math.max(...totales));
    datos.forEach((d, i) => {
      const x = pad.l + i * bw + gap / 2; let y = pad.t + h;
      const segs = series.map((s) => ({ s, v: d[s.key] || 0 })).filter((x) => x.v > 0);
      out += `<g class="col-anim" style="--i:${i};transform-origin:${x}px ${pad.t + h}px">`;
      segs.forEach(({ s, v }, j) => {
        const sh = (v / nice) * h; const top = j === segs.length - 1;
        out += `<rect x="${x}" y="${y - sh + (j ? 1 : 0)}" width="${bw - gap}" height="${Math.max(0, sh - (j ? 1 : 0))}" rx="${top ? 3 : 0}" fill="${s.color}"/>`;
        y -= sh;
      });
      out += `</g>`;
      const tipo = tipHtml(fmt.dia(d.dia), [...series.map((s) => [s.label, formato(d[s.key] || 0), s.color]), ["Total", formato(totales[i])]]);
      out += `<rect class="viz__hit" x="${pad.l + i * bw}" y="${pad.t}" width="${bw}" height="${h}" data-tip="${esc(tipo)}"/>`;
      if (d.dia === 1 || d.dia % 5 === 0) out += `<text class="viz__tick" x="${x + (bw - gap) / 2}" y="${alto - 8}" text-anchor="middle">${d.dia}</text>`;
    });
    if (marcaMax && totales[iMax] > 0) { const x = pad.l + iMax * bw + bw / 2, y = pad.t + h - (totales[iMax] / nice) * h; out += `<text class="viz__label fade-in" x="${x}" y="${y - 7}" text-anchor="middle">${formato(totales[iMax])}</text>`; }
    out += `<line class="viz__axis" x1="${pad.l}" x2="${ancho - pad.r}" y1="${pad.t + h}" y2="${pad.t + h}"/></svg>`;
    return out;
  };

  // Barras horizontales ranqueadas (HTML). Cada barra crece desde 0.
  const barrasH = (items, { valor = (x) => x.value, etiqueta = (x) => x.label, formato = fmt.m3, color = () => "var(--serie-1)", tip: tipFn, max: maxFijo, segmentos, clic, activo, offset = 0 } = {}) => {
    const max = maxFijo || Math.max(1, ...items.map(valor));
    return `<div class="bars">${items.map((it, n) => {
      const v = valor(it);
      const segs = segmentos ? segmentos(it).filter((s) => s.v > 0) : [{ v, color: color(it) }];
      const relleno = segs.map((s) => `<span style="width:${(s.v / max) * 100}%;background:${grad(s.color)}"></span>`).join("");
      return `<div class="bars__row${clic ? " bars__row--clic" : ""}${activo && activo(it) ? " bars__row--on" : ""}" style="--i:${n + offset}" ${clic ? `data-clic="${clic(it)}" role="button"` : ""} ${tipFn ? `data-tip="${esc(tipFn(it))}"` : ""} tabindex="0"><div class="bars__label" title="${esc(etiqueta(it))}">${esc(etiqueta(it))}</div><div class="bars__track">${relleno}</div><div class="bars__value">${formato(v)}</div></div>`;
    }).join("")}</div>`;
  };

  // Barra segmentada alta de etapas del dinero.
  const barraEtapas = (e, colores) => {
    const segs = e.montos.map((v, i) => ({ v, i })).filter((s) => s.v > 0);
    return `<div class="etapas__bar">${segs.map(({ v, i }) => `<span style="flex:${v};background:${grad(colores[i], "180deg")}" data-tip="${esc(tipHtml(ETAPAS[i], [["Importe", fmt.mxn(v)], ["Del total", fmt.pct((v / e.total) * 100)]]))}" tabindex="0"><em>${fmt.pct((v / e.total) * 100)}</em></span>`).join("")}</div>
      <div class="etapas__legend">${e.montos.map((v, i) => `<div><i style="background:${grad(colores[i], "180deg")}"></i><span>${ETAPAS[i]}</span><b data-count="${v}" data-fmt="corto">${fmt.corto(v)}</b><em>${fmt.pct(e.total ? (v / e.total) * 100 : 0)} del importe</em></div>`).join("")}</div>`;
  };

  // Barra 100% compacta (eficiencia, carga, avance)
  const barra100 = (valores, colores, etiquetas, { alto = 8 } = {}) => {
    const t = valores.reduce((a, b) => a + b, 0);
    if (!t) return `<div class="b100 b100--vacia" style="height:${alto}px"></div>`;
    return `<div class="b100" style="height:${alto}px">${valores.map((v, i) => v > 0 ? `<span style="flex:${v};background:${grad(colores[i])}" data-tip="${esc(tipHtml(etiquetas[i], [["Cantidad", fmt.n0(v)], ["Del total", fmt.pct((v / t) * 100)]]))}"></span>` : "").join("")}</div>`;
  };

  // Calendario mensual pequeño (lunes a domingo). marcados: Map(dia → {nivel, tip})
  const miniCalendario = (marcados, { titulo = "" } = {}) => {
    const primero = fmt.fecha(1).getDay(); // 0 = domingo
    const offset = (primero + 6) % 7;
    let celdas = "";
    for (let i = 0; i < offset; i++) celdas += `<span class="mc__d mc__d--vacio"></span>`;
    for (let d = 1; d <= R.diasMes; d++) {
      const m = marcados.get(d);
      const finde = (offset + d - 1) % 7 >= 5;
      celdas += m ? `<span class="mc__d mc__d--on" style="--n:${d}" tabindex="0" data-tip="${esc(m.tip)}">${d}${m.n > 1 ? `<sup>${m.n}</sup>` : ""}</span>` : `<span class="mc__d${finde ? " mc__d--finde" : ""}">${d}</span>`;
    }
    return `<div class="mc">${titulo ? `<div class="mc__t">${titulo}</div>` : ""}<div class="mc__sem">${["L", "M", "M", "J", "V", "S", "D"].map((x) => `<span>${x}</span>`).join("")}</div><div class="mc__grid">${celdas}</div></div>`;
  };

  // ── Tabla de desglose (marcado común) ──
  const tablaDesglose = (d) => {
    if (!d.filas.length) return `<p class="vacio">Sin material para los filtros seleccionados.</p>`;
    const fila = (cells, cls = "") => `<tr class="${cls}">${cells.map((c, i) => `<td${i ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`;
    let body = "";
    d.filas.forEach((f) => {
      body += `<tr class="dg__obra"><td colspan="5">${f.obra.empresa ? `<span class="dg__chip">${esc(f.obra.empresa)}</span>` : ""}${f.obra.cc != null ? `<span class="dg__chip dg__chip--cc">CC ${f.obra.cc}</span>` : ""}<span class="dg__obra-nombre">${esc(f.obra.obra)}</span></td></tr>`;
      f.grupos.forEach((g) => {
        body += `<tr class="dg__tipo"><td colspan="5"><i style="background:var(--tipo-${TIPOS.indexOf(g.tipo) + 1})"></i>${TIPO_LABEL[g.tipo]}</td></tr>`;
        g.items.forEach((m) => { body += fila([esc(m.material), `${fmt.n2(m.m3)} m³`, fmt.n0(m.vales), fmt.n0(m.viajes), m.soloGeem ? `<span class="dg__geem">Flota propia</span>` : fmt.mxn(m.importeIVA)], "dg__mat"); });
      });
      if (f.nMateriales > 1) body += fila(["Subtotal", `${fmt.n2(f.subtotal.m3)} m³`, fmt.n0(f.subtotal.vales), fmt.n0(f.subtotal.viajes), fmt.mxn(f.subtotal.importeIVA)], "dg__sub");
    });
    return `<table class="dg"><thead><tr><th>Material</th><th class="num">M³ total</th><th class="num">Vales</th><th class="num">Viajes</th><th class="num">Importe + IVA</th></tr></thead><tbody>${body}</tbody><tfoot>${fila(["Total", `${fmt.n2(d.total.m3)} m³`, fmt.n0(d.total.vales), fmt.n0(d.total.viajes), fmt.mxn(d.total.importeIVA)])}</tfoot></table>`;
  };

  // ── Animaciones ──
  // Números que cuentan desde su valor anterior (o desde 0 la primera vez).
  const FORMATOS = { m3: fmt.m3, corto: fmt.corto, pct: fmt.pct, n0: fmt.n0, mxn: fmt.mxn, n1: fmt.n1 };
  const ultimos = new Map();
  const reduceMov = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const animarNumeros = (raiz = document) => {
    raiz.querySelectorAll("[data-count]").forEach((el) => {
      const fin = Number(el.dataset.count), f = FORMATOS[el.dataset.fmt] || fmt.n0;
      const clave = el.dataset.key || null;
      const ini = clave && ultimos.has(clave) ? ultimos.get(clave) : 0;
      if (clave) ultimos.set(clave, fin);
      if (reduceMov || ini === fin) { el.textContent = f(fin); return; }
      // t0 sale del primer cuadro: el timestamp de rAF puede ser anterior a
      // performance.now() y daría un progreso negativo.
      let t0 = null, listo = false; const dur = 1035;
      const paso = (t) => { if (listo) return; if (t0 == null) t0 = t; const p = Math.min(1, Math.max(0, (t - t0) / dur)); const e = 1 - Math.pow(1 - p, 3); el.textContent = f(ini + (fin - ini) * e); if (p < 1) requestAnimationFrame(paso); else listo = true; };
      requestAnimationFrame(paso);
      // Respaldo: si el navegador pausa rAF (pestaña en segundo plano), el valor final llega igual.
      setTimeout(() => { listo = true; el.textContent = f(fin); }, dur + 150);
    });
  };
  // Revela secciones al hacer scroll; las animaciones CSS quedan en pausa hasta entonces.
  const revelarAlScroll = (selector) => {
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("visible"); animarNumeros(en.target); io.unobserve(en.target); } }), { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(selector).forEach((s) => io.observe(s));
    // Al imprimir o guardar como PDF todo debe verse, aunque no se haya hecho scroll.
    window.addEventListener("beforeprint", () => document.querySelectorAll(selector).forEach((s) => { s.classList.add("visible"); animarNumeros(s); }));
  };
  // Reinicia las animaciones de entrada de un contenedor ya visible (tras filtrar).
  const reanimar = (el) => { el.classList.remove("re"); void el.offsetWidth; el.classList.add("re"); };

  // ── Selector múltiple (Obra / Empresa / Material / Banco) ──
  const opciones = {
    obras: () => R.obras.map((o, i) => ({ id: i, nombre: fmt.obra(o), grupo: o.empresa })).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    empresas: () => R.empresas.map((e, i) => ({ id: i, nombre: e })).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    materiales: () => R.materiales.map((m, i) => ({ id: i, nombre: m.material, grupo: TIPO_LABEL[tipoDe(i)] })).sort((a, b) => a.grupo.localeCompare(b.grupo) || a.nombre.localeCompare(b.nombre)),
    bancos: () => R.bancos.map((b, i) => ({ id: i, nombre: b })).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  };
  const NOMBRES = { obras: ["Obra", "mapa"], empresas: ["Empresa", "edificio"], materiales: ["Material", "capas"], bancos: ["Banco", "montana"] };

  const montarFiltros = (contenedor) => {
    const hayFiltros = () => estado.obras.size || estado.empresas.size || estado.materiales.size || estado.bancos.size;
    const resumen = (k) => { const sel = estado[k], ops = opciones[k](); return sel.size === 0 ? "Todos" : sel.size === 1 ? ops.find((o) => sel.has(o.id))?.nombre || "1" : `${sel.size} seleccionados`; };
    contenedor.innerHTML = `${Object.keys(NOMBRES).map((k) => `<div class="ms" data-k="${k}"><button class="ms__btn" type="button" aria-haspopup="listbox" aria-expanded="false">${icono(NOMBRES[k][1], 14)}<span class="ms__k">${NOMBRES[k][0]}</span><span class="ms__v">Todos</span><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></button>
      <div class="ms__pop" hidden><input class="ms__buscar" placeholder="Buscar ${NOMBRES[k][0].toLowerCase()}…" aria-label="Buscar"/><div class="ms__lista" role="listbox" aria-multiselectable="true">${opciones[k]().map((o) => `<label class="ms__op" data-txt="${esc(o.nombre.toLowerCase())}"><input type="checkbox" value="${o.id}"/><span>${esc(o.nombre)}</span>${o.grupo ? `<em>${esc(o.grupo)}</em>` : ""}</label>`).join("")}</div><div class="ms__pie"><button type="button" class="ms__limpiar">Limpiar</button></div></div></div>`).join("")}<button class="filtros__reset" type="button" hidden>Quitar filtros</button>`;
    const sync = () => {
      contenedor.querySelectorAll(".ms").forEach((ms) => {
        const k = ms.dataset.k, sel = estado[k];
        const btn = ms.querySelector(".ms__btn");
        btn.classList.toggle("ms__btn--on", sel.size > 0);
        btn.querySelector(".ms__v").textContent = resumen(k);
        ms.querySelectorAll("input[type=checkbox]").forEach((cb) => (cb.checked = sel.has(Number(cb.value))));
      });
      contenedor.querySelector(".filtros__reset").hidden = !hayFiltros();
    };
    const cerrarTodos = () => contenedor.querySelectorAll(".ms__pop").forEach((p) => { p.hidden = true; p.previousElementSibling.setAttribute("aria-expanded", "false"); });
    contenedor.addEventListener("click", (e) => {
      const btn = e.target.closest(".ms__btn");
      if (btn) { const pop = btn.nextElementSibling; const abrir = pop.hidden; cerrarTodos(); pop.hidden = !abrir; btn.setAttribute("aria-expanded", String(abrir)); if (abrir) pop.querySelector(".ms__buscar").focus(); return; }
      if (e.target.closest(".ms__limpiar")) { estado[e.target.closest(".ms").dataset.k].clear(); notificar(); return; }
      if (e.target.closest(".filtros__reset")) { Object.keys(NOMBRES).forEach((k) => estado[k].clear()); notificar(); }
    });
    contenedor.addEventListener("change", (e) => {
      const ms = e.target.closest(".ms"); if (!ms) return;
      const k = ms.dataset.k, id = Number(e.target.value);
      e.target.checked ? estado[k].add(id) : estado[k].delete(id);
      notificar();
    });
    contenedor.addEventListener("input", (e) => {
      if (!e.target.classList.contains("ms__buscar")) return;
      const q = e.target.value.toLowerCase();
      e.target.nextElementSibling.querySelectorAll(".ms__op").forEach((op) => (op.hidden = !op.dataset.txt.includes(q)));
    });
    document.addEventListener("click", (e) => { if (!contenedor.contains(e.target)) cerrarTodos(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarTodos(); });
    alCambiar(sync);
    sync();
  };

  // Clic en una obra: filtra; clic de nuevo en la misma: quita el filtro.
  const filtrarObra = (iObra) => {
    if (estado.obras.size === 1 && estado.obras.has(iObra)) estado.obras.clear();
    else estado.obras = new Set([iObra]);
    notificar();
  };
  // Delegación para cualquier elemento con data-clic (filas de barras).
  const activarClics = (contenedor, fn) => {
    contenedor.addEventListener("click", (e) => { const el = e.target.closest("[data-clic]"); if (el) fn(Number(el.dataset.clic)); });
    contenedor.addEventListener("keydown", (e) => { if (e.key !== "Enter" && e.key !== " ") return; const el = e.target.closest("[data-clic]"); if (el) { e.preventDefault(); fn(Number(el.dataset.clic)); } });
  };

  window.RM = { R, M, T, V, TIPOS, TIPO_LABEL, PALETA, ETAPAS, RANGOS_RENTA, CARGAS, META_VIAJES_DIA, fmt, esc, icono, grad, estado, alCambiar, notificar, calcular, desglose, porObra, porEmpresa, porBanco, porMaterial, porDia, etapas, rentaDesperdiciada, rentaPorObra, flotaPropia, ventaMaterial, iniciarTooltip, tipHtml, columnasDiarias, barrasH, barraEtapas, barra100, miniCalendario, tablaDesglose, montarFiltros, filtrarObra, activarClics, animarNumeros, revelarAlScroll, reanimar, tipoDe };
})();
