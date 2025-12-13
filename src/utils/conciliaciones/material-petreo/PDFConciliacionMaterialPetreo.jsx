/**
 * src/utils/conciliaciones/material-petreo/PDFConciliacionMaterialPetreo.jsx
 *
 * Componente React-PDF para conciliaciones de Material Pétreo (Tipo 1 y 2)
 *
 * CARACTERÍSTICAS:
 * - Material: Pétreos (Arena, Grava, Base, etc)
 * - Columnas: Folio Banco, Banco, Toneladas
 * - CON: Retención 4%
 *
 * Usado en: generarPDFConciliacionMaterialPetreo.jsx
 */

import { Document, Page, View, Text, Font } from "@react-pdf/renderer";

// Estilos
import { sharedStyles } from "../shared/styles/sharedStyles";
import { materialPetreoStyles } from "../shared/styles/materialPetreoStyles";

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
      <Page size="LETTER" style={sharedStyles.page}>
        {/* ENCABEZADO */}
        <Text style={sharedStyles.title}>
          CONCILIACIÓN DE MATERIAL - MATERIAL PETREO
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

        {/* TABLA */}
        <View style={sharedStyles.table}>
          {/* Encabezados */}
          <View style={sharedStyles.tableHeader}>
            <Text style={materialPetreoStyles.colPlacas}>Placas</Text>
            <Text style={materialPetreoStyles.colFecha}>Fecha</Text>
            <Text style={materialPetreoStyles.colFolio}>Folio</Text>
            <Text style={materialPetreoStyles.colFolioBanco}>F.Banco</Text>
            <Text style={materialPetreoStyles.colMaterial}>Material</Text>
            <Text style={materialPetreoStyles.colBanco}>Banco</Text>
            <Text style={materialPetreoStyles.colDistancia}>Dist (Km)</Text>
            <Text style={materialPetreoStyles.colViajes}>Viajes</Text>
            <Text style={materialPetreoStyles.colVol}>Vol (m³)</Text>
            <Text style={materialPetreoStyles.colTon}>Toneladas</Text>
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
                        style={sharedStyles.tableRow}
                        key={`${vale.id_vale}-${idx}`}
                      >
                        <Text style={materialPetreoStyles.colPlacas}>
                          {placas}
                        </Text>
                        <Text style={materialPetreoStyles.colFecha}>
                          {formatearFecha(vale.fecha_creacion.split("T")[0])}
                        </Text>
                        <Text style={materialPetreoStyles.colFolio}>
                          {vale.folio}
                        </Text>
                        <Text style={materialPetreoStyles.colFolioBanco}>
                          {detalle.folio_banco || "N/A"}
                        </Text>
                        <Text style={materialPetreoStyles.colMaterial}>
                          {(detalle.material?.material || "N/A").substring(
                            0,
                            15
                          )}
                        </Text>
                        <Text style={materialPetreoStyles.colBanco}>
                          {(detalle.bancos?.banco || "N/A").substring(0, 12)}
                        </Text>
                        <Text style={materialPetreoStyles.colDistancia}>
                          {formatearNumero(detalle.distancia_km)}
                        </Text>
                        <Text style={materialPetreoStyles.colViajes}>1</Text>
                        <Text style={materialPetreoStyles.colVol}>
                          {formatearNumero(detalle.volumen_real_m3)}
                        </Text>
                        <Text style={materialPetreoStyles.colTon}>
                          {formatearNumero(detalle.peso_ton)}
                        </Text>
                      </View>
                    );
                  })
                )}

                {/* Subtotal por placas */}
                <View style={materialPetreoStyles.subtotalRow}>
                  <Text style={materialPetreoStyles.subtotalLabel}>
                    Subtotal {placas}:
                  </Text>
                  <View style={materialPetreoStyles.subtotalValues}>
                    <Text
                      style={[
                        materialPetreoStyles.subtotalItem,
                        { paddingRight: 18 },
                      ]}
                    >
                      {viajesGrupo}
                    </Text>

                    <Text
                      style={[
                        materialPetreoStyles.subtotalItem,
                        { paddingRight: 12 },
                      ]}
                    >
                      {formatearNumero(m3Grupo)}
                    </Text>

                    <Text
                      style={[
                        materialPetreoStyles.subtotalItem,
                        { paddingRight: 10 },
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
        <View style={sharedStyles.totalesSection}>
          <View style={sharedStyles.totalRow}>
            <Text style={sharedStyles.totalLabel}>Total Viajes:</Text>
            <Text style={sharedStyles.totalValue}>{totalViajes}</Text>
          </View>

          <View style={sharedStyles.totalRow}>
            <Text style={sharedStyles.totalLabel}>Total m³:</Text>
            <Text style={sharedStyles.totalValue}>
              {formatearNumero(totalM3)}
            </Text>
          </View>

          <View style={sharedStyles.totalRow}>
            <Text style={sharedStyles.totalLabel}>Total Toneladas:</Text>
            <Text style={sharedStyles.totalValue}>
              {formatearNumero(totalToneladas)}
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

        {/* FIRMAS */}
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

        {/* FOOTER */}
        <Text style={sharedStyles.footer}>
          Generado: {new Date().toLocaleString("es-MX")}
        </Text>
      </Page>
    </Document>
  );
};

export default PDFConciliacionMaterialPetreo;
