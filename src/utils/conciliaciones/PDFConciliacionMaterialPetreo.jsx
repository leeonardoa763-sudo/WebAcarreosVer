/**
 * src/utils/conciliaciones/PDFConciliacionMaterialPetreo.jsx
 *
 * Componente React-PDF para conciliaciones de material pétreo
 */

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Registrar fuentes (opcional)
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

const styles = StyleSheet.create({
  page: {
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 30,
    fontSize: 9,
    fontFamily: "Roboto",
  },
  // ENCABEZADO
  title: {
    fontSize: 14,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 8,
  },
  divider: {
    borderBottom: "0.5pt solid #000",
    marginBottom: 7,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  infoLabel: {
    width: "15%",
    fontWeight: 700,
  },
  infoValue: {
    width: "85%",
  },
  // TABLA
  table: {
    marginTop: 10,
    paddingHorizontal: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#FF6B35",
    padding: "3.5pt 0",
    fontSize: 7,
    fontWeight: 700,
    color: "white",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5pt solid #E0E0E0",
    padding: "2.5pt 0",
    fontSize: 7,
    alignItems: "center",
  },
  // COLUMNAS
  // COLUMNAS (anchos fijos en puntos)
  colPlacas: {
    width: 55,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colFecha: {
    width: 60,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colFolio: {
    width: 60,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colFolioBanco: {
    width: 60,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colMaterial: {
    width: 85,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colBanco: {
    width: 50,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colDistancia: {
    width: 40,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colViajes: {
    width: 40,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colVol: {
    width: 40,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  colTon: {
    width: 40,
    fontSize: 7,
    textAlign: "center",
    paddingHorizontal: 2,
  },
  // SUBTOTALES
  subtotalRow: {
    flexDirection: "row",
    padding: "3pt 0",
    fontSize: 7,
    fontWeight: 700,
  },
  subtotalLabel: {
    width: "50%",
    paddingLeft: 2,
  },
  subtotalValues: {
    width: "50%",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  subtotalItem: {
    marginLeft: 10,
    textAlign: "right",
  },
  // TOTALES
  totalesSection: {
    marginTop: 10,
    borderTop: "0.5pt solid #000",
    paddingTop: 7,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 2,
    fontSize: 7,
  },
  totalLabel: {
    width: "25%",
    textAlign: "right",
    paddingRight: 10,
  },
  totalValue: {
    width: "15%",
    textAlign: "right",
    fontWeight: 700,
  },
  totalFinal: {
    fontSize: 10,
    fontWeight: 700,
    marginTop: 3,
  },
  // FIRMAS
  firmasSection: {
    marginTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  firmaBox: {
    width: "45%",
    alignItems: "center",
  },
  firmaLinea: {
    borderTop: "0.3pt solid #000",
    width: "100%",
    marginBottom: 5,
  },
  firmaTexto: {
    fontSize: 8,
    fontWeight: 700,
  },
  firmaNombre: {
    fontSize: 7,
    marginTop: 5,
  },
  // FOOTER
  footer: {
    position: "absolute",
    bottom: 15,
    left: 15,
    right: 15,
    textAlign: "center",
    fontSize: 7,
    color: "#808080",
  },
});

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

const PDFConciliacionMaterialPetreo = ({
  conciliacion,
  valesAgrupados,
  totales,
}) => {
  const totalViajes =
    (totales.totalViajesTipo1 || 0) + (totales.totalViajesTipo2 || 0);
  const totalM3 = (totales.totalM3Tipo1 || 0) + (totales.totalM3Tipo2 || 0);
  const totalToneladas =
    (totales.totalToneladasTipo1 || 0) + (totales.totalToneladasTipo2 || 0);
  const precioM3 = totalM3 > 0 ? totales.subtotal / totalM3 : 0;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* ENCABEZADO */}
        <Text style={styles.title}>CONCILIACIÓN DE MATERIAL</Text>
        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Folio:</Text>
          <Text style={styles.infoValue}>{conciliacion.folio}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Empresa:</Text>
          <Text style={styles.infoValue}>{conciliacion.empresas.empresa}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sindicato:</Text>
          <Text style={styles.infoValue}>
            {conciliacion.sindicatos.nombre_completo}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Obra:</Text>
          <Text style={styles.infoValue}>
            {conciliacion.obras.cc} - {conciliacion.obras.obra}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Semana / Periodo:</Text>
          <Text style={styles.infoValue}>
            {conciliacion.numero_semana} (
            {formatearFecha(conciliacion.fecha_inicio)} al{" "}
            {formatearFecha(conciliacion.fecha_fin)})
          </Text>
        </View>

        {/* TABLA */}
        <View style={styles.table}>
          {/* Encabezados */}
          <View style={styles.tableHeader}>
            <Text style={styles.colPlacas}>Placas</Text>
            <Text style={styles.colFecha}>Fecha</Text>
            <Text style={styles.colFolio}>Folio</Text>
            <Text style={styles.colFolioBanco}>F.Banco</Text>
            <Text style={styles.colMaterial}>Material</Text>
            <Text style={styles.colBanco}>Banco</Text>
            <Text style={styles.colDistancia}>Distancia</Text>
            <Text style={styles.colViajes}>Viajes</Text>
            <Text style={styles.colVol}>Volumen</Text>
            <Text style={styles.colTon}>Toneladas</Text>
          </View>

          {/* Datos por placas */}
          {Object.entries(valesAgrupados).map(([placas, grupo]) => {
            let viajesGrupo = 0;
            let m3Grupo = 0;
            let toneladasGrupo = 0;

            return (
              <View key={placas}>
                {grupo.vales.map((vale) =>
                  vale.vale_material_detalles.map((detalle, idx) => {
                    const idTipo =
                      detalle.material?.tipo_de_material?.id_tipo_de_material;
                    if (idTipo !== 1 && idTipo !== 2) return null;

                    viajesGrupo += 1;
                    m3Grupo += Number(detalle.volumen_real_m3 || 0);
                    toneladasGrupo += Number(detalle.peso_ton || 0);

                    return (
                      <View
                        style={styles.tableRow}
                        key={`${vale.id_vale}-${idx}`}
                      >
                        <Text style={styles.colPlacas}>{placas}</Text>
                        <Text style={styles.colFecha}>
                          {formatearFecha(vale.fecha_creacion.split("T")[0])}
                        </Text>
                        <Text style={styles.colFolio}>{vale.folio}</Text>
                        <Text style={styles.colFolioBanco}>
                          {detalle.folio_banco || "N/A"}
                        </Text>
                        <Text style={styles.colMaterial}>
                          {(detalle.material?.material || "N/A").substring(
                            0,
                            15
                          )}
                        </Text>
                        <Text style={styles.colBanco}>
                          {(detalle.bancos?.banco || "N/A").substring(0, 12)}
                        </Text>
                        <Text style={styles.colDistancia}>
                          {formatearNumero(detalle.distancia_km)}
                        </Text>
                        <Text style={styles.colViajes}>1</Text>
                        <Text style={styles.colVol}>
                          {formatearNumero(detalle.volumen_real_m3)}
                        </Text>
                        <Text style={styles.colTon}>
                          {formatearNumero(detalle.peso_ton)}
                        </Text>
                      </View>
                    );
                  })
                )}

                {/* Subtotal por placas */}
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Subtotal {placas}:</Text>
                  <View style={styles.subtotalValues}>
                    <Text
                      style={[
                        styles.subtotalViajes,
                        { paddingRight: 28 }, // ← Solo este
                      ]}
                    >
                      {viajesGrupo}
                    </Text>

                    <Text
                      style={[
                        styles.subtotalM3,
                        { paddingRight: 22 }, // ← Solo este, más espacio
                      ]}
                    >
                      {formatearNumero(m3Grupo)}
                    </Text>

                    <Text
                      style={[
                        styles.subtotalton,
                        { paddingRight: 10 }, // ← Solo este, más espacio
                      ]}
                    >
                      {formatearNumero(toneladasGrupo)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* TOTALES */}
        <View style={styles.totalesSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Viajes:</Text>
            <Text style={styles.totalValue}>{totalViajes}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total m³:</Text>
            <Text style={styles.totalValue}>{formatearNumero(totalM3)}</Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Toneladas:</Text>
            <Text style={styles.totalValue}>
              {formatearNumero(totalToneladas)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Precio/m³:</Text>
            <Text style={styles.totalValue}>${formatearNumero(precioM3)}</Text>
          </View>

          <View style={[styles.totalRow, { marginTop: 2 }]}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>
              ${formatearNumero(totales.subtotal)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA 16%:</Text>
            <Text style={styles.totalValue}>
              ${formatearNumero(totales.iva)}
            </Text>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Retención 4%:</Text>
            <Text style={styles.totalValue}>
              -${formatearNumero(totales.retencion)}
            </Text>
          </View>

          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalValue}>
              ${formatearNumero(totales.total)} MXN
            </Text>
          </View>
        </View>

        {/* FIRMAS */}
        <View style={styles.firmasSection}>
          <View style={styles.firmaBox}>
            <View style={styles.firmaLinea} />
            <Text style={styles.firmaTexto}>FIRMA DEL SINDICATO</Text>
            <Text style={styles.firmaNombre}>
              {conciliacion.sindicatos.nombre_firma_conciliacion ||
                conciliacion.sindicatos.nombre_completo}
            </Text>
          </View>

          <View style={styles.firmaBox}>
            <View style={styles.firmaLinea} />
            <Text style={styles.firmaTexto}>FIRMA DE AUTORIZACIÓN</Text>
            <Text style={styles.firmaNombre}>
              Ing. Bruno Leonardo Aguilar Saucedo
            </Text>
          </View>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          Generado: {new Date().toLocaleString("es-MX")}
        </Text>
      </Page>
    </Document>
  );
};

export default PDFConciliacionMaterialPetreo;
