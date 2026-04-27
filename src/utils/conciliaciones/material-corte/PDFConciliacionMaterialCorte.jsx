/**
 * src/utils/conciliaciones/material-corte/PDFConciliacionMaterialCorte.jsx
 *
 * Componente React-PDF para conciliaciones de Material de Corte (Tipo 3)
 *
 * CARACTERÍSTICAS:
 * - Material: Producto de Corte
 * - Columnas: Material, Banco, Distancia, Viajes, Capacidad, M³ Pedidos
 * - SIN: Folio Banco, Toneladas
 * - CON: Retención 4%
 *
 * Usado en: generarPDFConciliacionMaterialCorte.jsx
 */

import { Document, Page, View, Text, Font, Image } from "@react-pdf/renderer";

// Estilos
import { sharedStyles } from "../shared/styles/sharedStyles";
import { materialCorteStyles } from "../shared/styles/materialCorteStyles";

// Registrar fuentes
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
      fontWeight: 300,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: 700,
    },
  ],
});

// ========================================
// FUNCIONES AUXILIARES
// ========================================

const formatearFecha = (fecha) => {
  const date = new Date(fecha + "T00:00:00");
  const dia = String(date.getDate()).padStart(2, "0");
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const año = date.getFullYear();
  return `${dia}/${mes}/${año}`;
};

const formatearNumero = (numero) => {
  return Number(numero).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ========================================
// COMPONENTE PRINCIPAL
// ========================================

const PDFConciliacionMaterialCorte = ({
  conciliacion,
  valesAgrupados,
  totales,
  qrDataUrl,
}) => {
  const totalViajes = totales.totalViajesTipo3 || 0;
  const totalM3 = totales.totalM3Tipo3 || 0;
  const precioM3 = totalM3 > 0 ? totales.subtotal / totalM3 : 0;

  // Extraer tarifas del primer detalle disponible (todo el archivo usa las mismas)
  let tarifaPrimerKm = null;
  let tarifaSubsecuente = null;
  for (const grupo of Object.values(valesAgrupados)) {
    for (const vale of grupo.vales) {
      for (const detalle of vale.vale_material_detalles) {
        if (detalle.tarifa_primer_km != null) {
          tarifaPrimerKm = Number(detalle.tarifa_primer_km);
          tarifaSubsecuente = Number(detalle.tarifa_subsecuente);
          break;
        }
      }
      if (tarifaPrimerKm != null) break;
    }
    if (tarifaPrimerKm != null) break;
  }

  return (
    <Document>
      <Page size="LETTER" style={sharedStyles.page}>
        {/* ========================================
            ENCABEZADO
            ======================================== */}
        <Text style={sharedStyles.title}>
          CONCILIACIÓN DE MATERIAL - PRODUCTO DE CORTE
        </Text>
        <View style={sharedStyles.divider} />

        <View style={sharedStyles.infoRow}>
          <Text style={sharedStyles.infoLabel}>Folio:</Text>
          <Text style={sharedStyles.infoValue}>{conciliacion.folio}</Text>
        </View>

        <View style={sharedStyles.infoRow}>
          <Text style={sharedStyles.infoLabel}>Empresa:</Text>
          <Text style={sharedStyles.infoValue}>
            {conciliacion.empresas.empresa}
          </Text>
        </View>

        <View style={sharedStyles.infoRow}>
          <Text style={sharedStyles.infoLabel}>Sindicato:</Text>
          <Text style={sharedStyles.infoValue}>
            {conciliacion.sindicatos.nombre_completo}
          </Text>
        </View>

        <View style={sharedStyles.infoRow}>
          <Text style={sharedStyles.infoLabel}>Obra:</Text>
          <Text style={sharedStyles.infoValue}>
            {conciliacion.obras.cc} - {conciliacion.obras.obra}
          </Text>
        </View>

        <View style={sharedStyles.infoRow}>
          <Text style={sharedStyles.infoLabel}>Semana / Periodo:</Text>
          <Text style={sharedStyles.infoValue}>
            {conciliacion.numero_semana} (
            {formatearFecha(conciliacion.fecha_inicio)} al{" "}
            {formatearFecha(conciliacion.fecha_fin)})
          </Text>
        </View>

        {/* ========================================
            TABLA
            ======================================== */}
        <View style={sharedStyles.table}>
          {/* Encabezados */}
          <View style={sharedStyles.tableHeader}>
            <Text style={materialCorteStyles.colPlacas}>Placas</Text>
            <Text style={materialCorteStyles.colFecha}>Fecha</Text>
            <Text style={materialCorteStyles.colFolio}>Folio</Text>
            <Text style={materialCorteStyles.colMaterial}>Material</Text>
            <Text style={materialCorteStyles.colBanco}>Banco</Text>
            <Text style={materialCorteStyles.colDistancia}>Dist (km)</Text>
            <Text style={materialCorteStyles.colViajes}>Viaj</Text>
            <Text style={materialCorteStyles.colCapacidad}>Cap (m³)</Text>
            <Text style={materialCorteStyles.colM3Pedidos}>M³ Real</Text>
            <Text style={materialCorteStyles.colPU}>PU/m³</Text>
            <Text style={materialCorteStyles.colImporte}>Importe</Text>
          </View>

          {/* Datos por placas */}
          {Object.entries(valesAgrupados).map(([placas, grupo]) => {
            // Pre-computar filas agrupadas por banco para este grupo de placas
            const filas = [];

            grupo.vales.forEach((vale) =>
              vale.vale_material_detalles.forEach((detalle, idx) => {
                const idTipo =
                  detalle.material?.tipo_de_material?.id_tipo_de_material;
                if (idTipo !== 3) return;

                const viajes = detalle.vale_material_viajes || [];
                const capacidad =
                  detalle.capacidad_m3 ?? vale.vehiculos?.capacidad_m3;

                if (viajes.length === 0) {
                  filas.push({
                    key: `${vale.id_vale}-${idx}`,
                    fecha: vale.fecha_creacion.split("T")[0],
                    folio: vale.folio,
                    material: detalle.material?.material || "N/A",
                    banco: detalle.bancos?.banco || "N/A",
                    distancia: Number(detalle.distancia_km || 0),
                    numViajes: 1,
                    capacidad,
                    volumen: Number(detalle.volumen_real_m3 || 0),
                    precioM3: Number(detalle.precio_m3 || 0),
                    costo: Number(detalle.costo_total || 0),
                  });
                  return;
                }

                // Agrupar viajes por banco efectivo + precio efectivo
                const gruposBanco = {};
                viajes.forEach((viaje) => {
                  const bancoNombre =
                    viaje.id_banco_override != null
                      ? viaje.banco_override?.banco || "N/A"
                      : detalle.bancos?.banco || "N/A";
                  const distanciaEfectiva =
                    viaje.distancia_km_override != null
                      ? Number(viaje.distancia_km_override)
                      : Number(detalle.distancia_km || 0);
                  const precioEfectivo =
                    viaje.precio_m3_override != null
                      ? Number(viaje.precio_m3_override)
                      : Number(detalle.precio_m3 || 0);
                  const costoViaje =
                    viaje.costo_viaje_override != null
                      ? Number(viaje.costo_viaje_override)
                      : Number(viaje.volumen_m3 || 0) * precioEfectivo;

                  const grupoKey = `${bancoNombre}__${precioEfectivo}`;
                  if (!gruposBanco[grupoKey]) {
                    gruposBanco[grupoKey] = {
                      bancoNombre,
                      distanciaEfectiva,
                      precioM3: precioEfectivo,
                      cantidadViajes: 0,
                      totalVolumen: 0,
                      totalCosto: 0,
                    };
                  }
                  gruposBanco[grupoKey].cantidadViajes++;
                  gruposBanco[grupoKey].totalVolumen += Number(
                    viaje.volumen_m3 || 0,
                  );
                  gruposBanco[grupoKey].totalCosto += costoViaje;
                });

                Object.entries(gruposBanco).forEach(([grupoKey, g]) => {
                  filas.push({
                    key: `${vale.id_vale}-${idx}-${grupoKey}`,
                    fecha: vale.fecha_creacion.split("T")[0],
                    folio: vale.folio,
                    material: detalle.material?.material || "N/A",
                    banco: g.bancoNombre,
                    distancia: g.distanciaEfectiva,
                    numViajes: g.cantidadViajes,
                    capacidad,
                    volumen: g.totalVolumen,
                    precioM3: g.precioM3,
                    costo: g.totalCosto,
                  });
                });
              }),
            );

            const totalViajesGrupo = filas.reduce(
              (s, f) => s + f.numViajes,
              0,
            );
            const totalM3Grupo = filas.reduce((s, f) => s + f.volumen, 0);

            return (
              <View key={placas}>
                {filas.map((fila) => (
                  <View style={sharedStyles.tableRow} key={fila.key}>
                    <Text style={materialCorteStyles.colPlacas}>{placas}</Text>
                    <Text style={materialCorteStyles.colFecha}>
                      {formatearFecha(fila.fecha)}
                    </Text>
                    <Text style={materialCorteStyles.colFolio}>
                      {fila.folio}
                    </Text>
                    <Text style={materialCorteStyles.colMaterial}>
                      {fila.material.substring(0, 15)}
                    </Text>
                    <Text style={materialCorteStyles.colBanco}>
                      {fila.banco.substring(0, 15)}
                    </Text>
                    <Text style={materialCorteStyles.colDistancia}>
                      {formatearNumero(fila.distancia)}
                    </Text>
                    <Text style={materialCorteStyles.colViajes}>
                      {fila.numViajes}
                    </Text>
                    <Text style={materialCorteStyles.colCapacidad}>
                      {fila.capacidad != null
                        ? formatearNumero(fila.capacidad)
                        : "—"}
                    </Text>
                    <Text style={materialCorteStyles.colM3Pedidos}>
                      {formatearNumero(fila.volumen)}
                    </Text>
                    <Text style={materialCorteStyles.colPU}>
                      ${formatearNumero(fila.precioM3)}
                    </Text>
                    <Text style={materialCorteStyles.colImporte}>
                      ${formatearNumero(fila.costo)}
                    </Text>
                  </View>
                ))}

                {/* Subtotal por placas */}
                <View style={materialCorteStyles.subtotalRow}>
                  <Text style={materialCorteStyles.subtotalLabel}>
                    Subtotal {placas}:
                  </Text>
                  <View style={materialCorteStyles.subtotalValues}>
                    <Text
                      style={[
                        materialCorteStyles.subtotalItem,
                        { paddingRight: 64 },
                      ]}
                    >
                      {totalViajesGrupo}
                    </Text>
                    <Text
                      style={[
                        materialCorteStyles.subtotalItem,
                        { paddingRight: 20 },
                      ]}
                    >
                      {formatearNumero(totalM3Grupo)}
                    </Text>
                    <Text
                      style={[
                        materialCorteStyles.subtotalItem,
                        { paddingRight: 4 },
                      ]}
                    >
                      ${formatearNumero(grupo.subtotal)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* ========================================
            TOTALES
            ======================================== */}
        <View style={sharedStyles.totalesSection}>
          <View style={sharedStyles.totalRow}>
            <Text style={sharedStyles.totalLabel}>Total Viajes:</Text>
            <Text style={sharedStyles.totalValue}>{totalViajes}</Text>
          </View>

          <View style={sharedStyles.totalRow}>
            <Text style={sharedStyles.totalLabel}>Total m³ Reales:</Text>
            <Text style={sharedStyles.totalValue}>
              {formatearNumero(totalM3)}
            </Text>
          </View>

          <View style={sharedStyles.totalRow}>
            <Text style={sharedStyles.totalLabel}>Precio/m³:</Text>
            <Text style={sharedStyles.totalValue}>
              ${formatearNumero(precioM3)}
            </Text>
          </View>

          <View style={[sharedStyles.totalRow, { marginTop: 2 }]}>
            <Text style={sharedStyles.totalLabel}>Subtotal:</Text>
            <Text style={sharedStyles.totalValue}>
              ${formatearNumero(totales.subtotal)}
            </Text>
          </View>

          <View style={sharedStyles.totalRow}>
            <Text style={sharedStyles.totalLabel}>IVA 16%:</Text>
            <Text style={sharedStyles.totalValue}>
              ${formatearNumero(totales.iva)}
            </Text>
          </View>

          <View style={sharedStyles.totalRow}>
            <Text style={sharedStyles.totalLabel}>Retención 4%:</Text>
            <Text style={sharedStyles.totalValue}>
              -${formatearNumero(totales.retencion)}
            </Text>
          </View>

          <View style={[sharedStyles.totalRow, sharedStyles.totalFinal]}>
            <Text style={sharedStyles.totalLabel}>TOTAL:</Text>
            <Text style={sharedStyles.totalValue}>
              ${formatearNumero(totales.total)} MXN
            </Text>
          </View>
        </View>

        {/* Tarifas aplicadas */}
        {(tarifaPrimerKm != null || tarifaSubsecuente != null) && (
          <View
            style={{
              marginTop: 8,
              borderTop: "0.5pt solid #E0E0E0",
              paddingTop: 5,
            }}
          >
            <Text
              style={{
                fontSize: 7,
                fontWeight: 700,
                textAlign: "right",
                marginBottom: 3,
              }}
            >
              Tarifas aplicadas:
            </Text>
            {tarifaPrimerKm != null && (
              <View style={sharedStyles.totalRow}>
                <Text style={sharedStyles.totalLabel}>1er km:</Text>
                <Text style={sharedStyles.totalValue}>
                  ${formatearNumero(tarifaPrimerKm)}/m³
                </Text>
              </View>
            )}
            {tarifaSubsecuente != null && (
              <View style={sharedStyles.totalRow}>
                <Text style={sharedStyles.totalLabel}>km subsecuente:</Text>
                <Text style={sharedStyles.totalValue}>
                  ${formatearNumero(tarifaSubsecuente)}/m³
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ========================================
            FIRMAS
            ======================================== */}
        <View style={sharedStyles.firmasSection}>
          <View style={sharedStyles.firmaBox}>
            <View style={sharedStyles.firmaLinea} />
            <Text style={sharedStyles.firmaTexto}>FIRMA DEL SINDICATO</Text>
            <Text style={sharedStyles.firmaNombre}>
              {conciliacion.sindicatos.nombre_firma_conciliacion ||
                conciliacion.sindicatos.nombre_completo}
            </Text>
          </View>

          <View style={sharedStyles.firmaBox}>
            <View style={sharedStyles.firmaLinea} />
            <Text style={sharedStyles.firmaTexto}>FIRMA DE AUTORIZACIÓN</Text>
            <Text style={sharedStyles.firmaNombre}>
              Ing. Bruno Leonardo Aguilar Saucedo
            </Text>
          </View>
        </View>

        {/* ========================================
            QR DE SOPORTE
            ======================================== */}
        {qrDataUrl && (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              marginBottom: 30,
            }}
          >
            <Text
              style={{
                fontSize: 6,
                color: "#555555",
                textAlign: "right",
                lineHeight: 1.4,
              }}
            >
              Escanea para ver{"\n"}soporte de vales
            </Text>
            <Image src={qrDataUrl} style={{ width: 48, height: 48 }} />
          </View>
        )}

        {/* ========================================
            FOOTER
            ======================================== */}
        <Text style={sharedStyles.footer}>
          Generado: {new Date().toLocaleString("es-MX")}
        </Text>
      </Page>
    </Document>
  );
};

export default PDFConciliacionMaterialCorte;
