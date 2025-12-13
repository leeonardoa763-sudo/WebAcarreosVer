/**
 * src/utils/conciliaciones/renta/PDFConciliacionRenta.jsx
 *
 * Componente React-PDF para conciliaciones de Renta de Maquinaria
 *
 * CARACTERÍSTICAS:
 * - Renta de equipo y maquinaria
 * - Columnas: Placas, Folio, Fecha, Material Movido, Viajes, Días, Horas, Importe
 * - SIN: Retención (solo Subtotal + IVA)
 *
 * Usado en: generarPDFConciliacionRenta.jsx
 */

import { Document, Page, View, Text, Font } from "@react-pdf/renderer";

// Estilos
import { sharedStyles } from "../shared/styles/sharedStyles";
import { rentaStyles } from "../shared/styles/rentaStyles";

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

const PDFConciliacionRenta = ({ conciliacion, valesAgrupados, totales }) => {
  return (
    <Document>
      <Page size="LETTER" style={sharedStyles.page}>
        {/* ========================================
            ENCABEZADO
            ======================================== */}
        <Text style={sharedStyles.title}>CONCILIACIÓN DE RENTA</Text>
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
          <View style={rentaStyles.tableHeaderRenta}>
            <Text style={rentaStyles.colPlacas}>Placas</Text>
            <Text style={rentaStyles.colFolio}>Folio</Text>
            <Text style={rentaStyles.colFecha}>Fecha</Text>
            <Text style={rentaStyles.colMaterial}>Material Movido</Text>
            <Text style={rentaStyles.colViajes}>Viajes</Text>
            <Text style={rentaStyles.colDias}>Días</Text>
            <Text style={rentaStyles.colHoras}>Horas</Text>
            <Text style={rentaStyles.colImporte}>Importe</Text>
          </View>

          {/* Datos por placas */}
          {Object.entries(valesAgrupados).map(([placas, grupo]) => {
            let viajesGrupo = 0;
            let diasGrupo = 0;
            let horasGrupo = 0;

            return (
              <View key={placas}>
                {grupo.vales.map((vale) =>
                  vale.vale_renta_detalle.map((detalle, idx) => {
                    viajesGrupo += Number(detalle.numero_viajes || 0);
                    diasGrupo += Number(detalle.total_dias || 0);
                    horasGrupo += Number(detalle.total_horas || 0);

                    return (
                      <View
                        style={sharedStyles.tableRow}
                        key={`${vale.id_vale}-${idx}`}
                      >
                        <Text style={rentaStyles.colPlacas}>{placas}</Text>
                        <Text style={rentaStyles.colFolio}>{vale.folio}</Text>
                        <Text style={rentaStyles.colFecha}>
                          {formatearFecha(vale.fecha_creacion.split("T")[0])}
                        </Text>
                        <Text style={rentaStyles.colMaterial}>
                          {(detalle.material?.material || "N/A").substring(
                            0,
                            20
                          )}
                        </Text>
                        <Text style={rentaStyles.colViajes}>
                          {detalle.numero_viajes || 0}
                        </Text>
                        <Text style={rentaStyles.colDias}>
                          {detalle.total_dias || 0}
                        </Text>
                        <Text style={rentaStyles.colHoras}>
                          {detalle.total_horas
                            ? formatearNumero(detalle.total_horas)
                            : "0"}
                        </Text>
                        <Text style={rentaStyles.colImporte}>
                          ${formatearNumero(detalle.costo_total || 0)}
                        </Text>
                      </View>
                    );
                  })
                )}

                {/* Subtotal por placas */}
                <View style={rentaStyles.subtotalRow}>
                  <Text style={rentaStyles.subtotalLabel}>
                    Subtotal {placas}:
                  </Text>
                  <View style={rentaStyles.subtotalValues}>
                    <Text
                      style={[rentaStyles.subtotalItem, { paddingRight: 26 }]}
                    >
                      {viajesGrupo}
                    </Text>
                    <Text
                      style={[rentaStyles.subtotalItem, { paddingRight: 26 }]}
                    >
                      {diasGrupo}
                    </Text>
                    <Text
                      style={[rentaStyles.subtotalItem, { paddingRight: 34 }]}
                    >
                      {formatearNumero(horasGrupo)}
                    </Text>
                    <Text
                      style={[rentaStyles.subtotalItem, { paddingRight: 44 }]}
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
          {(() => {
            // 👇 OBTENER TARIFAS DESDE LOS DATOS (no calcular)
            let tarifaPorDia = 0;
            let tarifaPorHora = 0;

            // Extraer del primer detalle que tenga precios
            Object.values(valesAgrupados).some((grupo) =>
              grupo.vales.some((vale) =>
                vale.vale_renta_detalle.some((detalle) => {
                  if (detalle.precios_renta) {
                    tarifaPorDia = detalle.precios_renta.costo_dia || 0;
                    tarifaPorHora = detalle.precios_renta.costo_hr || 0;
                    return true; // Detener búsqueda
                  }
                  return false;
                })
              )
            );

            return (
              <>
                {totales.totalDias > 0 && (
                  <View style={sharedStyles.totalRow}>
                    <Text style={sharedStyles.totalLabel}>Total Días:</Text>
                    <Text style={sharedStyles.totalValue}>
                      {totales.totalDias}
                    </Text>
                  </View>
                )}

                {totales.totalHoras > 0 && (
                  <View style={sharedStyles.totalRow}>
                    <Text style={sharedStyles.totalLabel}>Total Horas:</Text>
                    <Text style={sharedStyles.totalValue}>
                      {formatearNumero(totales.totalHoras)}
                    </Text>
                  </View>
                )}

                {/* 👇 TARIFAS DESDE BD */}
                {tarifaPorDia > 0 && (
                  <View style={sharedStyles.totalRow}>
                    <Text style={sharedStyles.totalLabel}>Tarifa/Día:</Text>
                    <Text style={sharedStyles.totalValue}>
                      ${formatearNumero(tarifaPorDia)}
                    </Text>
                  </View>
                )}

                {tarifaPorHora > 0 && (
                  <View style={sharedStyles.totalRow}>
                    <Text style={sharedStyles.totalLabel}>Tarifa/Hora:</Text>
                    <Text style={sharedStyles.totalValue}>
                      ${formatearNumero(tarifaPorHora)}
                    </Text>
                  </View>
                )}

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

                <View style={[sharedStyles.totalRow, sharedStyles.totalFinal]}>
                  <Text style={sharedStyles.totalLabel}>TOTAL:</Text>
                  <Text style={sharedStyles.totalValue}>
                    ${formatearNumero(totales.total)} MXN
                  </Text>
                </View>
              </>
            );
          })()}
        </View>

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
            FOOTER
            ======================================== */}
        <Text style={sharedStyles.footer}>
          Generado: {new Date().toLocaleString("es-MX")}
        </Text>
      </Page>
    </Document>
  );
};

export default PDFConciliacionRenta;
