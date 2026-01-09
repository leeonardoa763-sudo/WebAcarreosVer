/**
 * src/components/operadores/OperadoresList.jsx
 *
 * Lista principal de vales agrupados por Empresa → Placas → Estado
 *
 * Estructura:
 * - Agrupar por empresa (primer nivel)
 * - Dentro de cada empresa, mostrar PlacasGroup
 * - Colores según empresa (CAPAM, TRIACO, COEDESSA)
 * - Totales por empresa
 * - Grupos expandibles/colapsables
 *
 * Dependencias: PlacasGroup
 * Usado en: pages/Operadores.jsx
 */

// 1. React y hooks
import { useMemo } from "react";

// 2. Icons
import { ChevronDown, ChevronRight, Building2 } from "lucide-react";

// 3. Componentes
import PlacasGroup from "./PlacasGroup";

const OperadoresList = ({
  datos,
  tipoVale,
  toggleGrupo,
  estaColapsado,
  helpers,
}) => {
  /**
   * Verificar si hay datos
   */
  const hayDatos = useMemo(() => {
    return datos && datos.length > 0;
  }, [datos]);

  if (!hayDatos) {
    return (
      <div className="operadores-list-empty">
        <p>No hay datos para mostrar</p>
      </div>
    );
  }

  return (
    <div className="operadores-list">
      {datos.map((empresa) => {
        const empresaId = `empresa-${empresa.id_empresa}`;
        const empresaColapsada = estaColapsado(empresaId);
        const colorEmpresa = helpers.obtenerColorEmpresa(
          empresa.nombre_empresa
        );

        return (
          <div key={empresa.id_empresa} className="empresa-group">
            {/* Header de empresa */}
            <button
              type="button"
              className="empresa-group__header"
              onClick={() => toggleGrupo(empresaId)}
              style={{
                borderLeftColor: colorEmpresa,
                borderLeftWidth: "4px",
              }}
              aria-expanded={!empresaColapsada}
              aria-controls={`empresa-content-${empresa.id_empresa}`}
            >
              <div className="empresa-group__header-left">
                {empresaColapsada ? (
                  <ChevronRight size={24} aria-hidden="true" />
                ) : (
                  <ChevronDown size={24} aria-hidden="true" />
                )}
                <Building2
                  size={24}
                  aria-hidden="true"
                  style={{ color: colorEmpresa }}
                />
                <span className="empresa-group__nombre">
                  {empresa.nombre_empresa}
                </span>
              </div>

              <div className="empresa-group__header-right">
                <span className="empresa-group__stat">
                  {empresa.totalVehiculos}{" "}
                  {empresa.totalVehiculos === 1 ? "vehículo" : "vehículos"}
                </span>
                <span className="empresa-group__stat">
                  {empresa.totalViajes}{" "}
                  {empresa.totalViajes === 1 ? "viaje" : "viajes"}
                </span>
                {tipoVale === "material" ? (
                  <span className="empresa-group__stat empresa-group__stat--primary">
                    {helpers.formatearNumero(empresa.totalM3)} m³
                  </span>
                ) : (
                  <>
                    <span className="empresa-group__stat">
                      {helpers.formatearNumero(empresa.totalDias)} días
                    </span>
                    <span className="empresa-group__stat empresa-group__stat--primary">
                      {helpers.formatearNumero(empresa.totalHoras)} hrs
                    </span>
                  </>
                )}
              </div>
            </button>

            {/* Contenido: Lista de placas */}
            {!empresaColapsada && (
              <div
                className="empresa-group__content"
                id={`empresa-content-${empresa.id_empresa}`}
                role="region"
                aria-label={`Vehículos de ${empresa.nombre_empresa}`}
              >
                {empresa.vehiculos.map((vehiculo) => {
                  const placasId = `placas-${vehiculo.placas}`;
                  const placasColapsado = estaColapsado(placasId);

                  return (
                    <PlacasGroup
                      key={vehiculo.placas}
                      placas={vehiculo.placas}
                      vehiculoData={vehiculo}
                      colorEmpresa={colorEmpresa}
                      tipoVale={tipoVale}
                      estaColapsado={placasColapsado}
                      onToggle={() => toggleGrupo(placasId)}
                      helpers={helpers}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OperadoresList;
