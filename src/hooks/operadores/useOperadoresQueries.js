/**
 * src/hooks/operadores/useOperadoresQueries.js
 *
 * Queries para obtener vales agrupados por empresa → placas → estado
 *
 * Funcionalidades:
 * - Obtener vales de material agrupados
 * - Obtener vales de renta agrupados
 * - Aplicar filtros (fechas, empresa, obra, sindicato, placas)
 * - Incluir todas las relaciones necesarias
 * - Calcular totales por grupo
 *
 * Nota: Los filtros de fecha y ordenamiento usan fecha_programada si existe,
 * con fallback a fecha_creacion.
 *
 * Dependencias: supabase
 * Usado en: useOperadores.js
 */

// 1. Config
import { supabase } from "../../config/supabase";

/**
 * Obtener la fecha efectiva de un vale.
 * Usa fecha_programada si existe, si no usa fecha_creacion.
 *
 * @param {Object} vale - Objeto vale
 * @returns {Date} - Fecha efectiva del vale
 */
const obtenerFechaEfectiva = (vale) => {
  if (vale.fecha_programada) {
    return new Date(vale.fecha_programada);
  }
  return new Date(vale.fecha_creacion);
};

/**
 * Construir query base con todas las relaciones
 */
const construirQueryBase = (tipoVale) => {
  return supabase
    .from("vales")
    .select(
      `
      id_vale,
      folio,
      tipo_vale,
      estado,
      fecha_creacion,
      fecha_programada,
      fecha_verificacion,
      fecha_completado,
      fecha_cancelacion,
      motivo_cancelacion,
      id_obra,
      id_empresa,
      id_operador,
      id_vehiculo,
      verificado_por_sindicato,
      archivado,

      obras!inner (
        id_obra,
        obra,
        cc,
        id_empresa,
        empresas!inner (
          id_empresa,
          empresa,
          sufijo,
          logo
        )
      ),

      operadores (
        id_operador,
        nombre_completo,
        nombre,
        primer_apellido,
        segundo_apellido,
        sindicatos (
          id_sindicato,
          sindicato
        )
      ),

      vehiculos!inner (
        id_vehiculo,
        placas,
        activo
      ),

      persona:id_persona_creador (
        nombre,
        primer_apellido,
        segundo_apellido
      ),

      ${
        tipoVale === "material"
          ? `vale_material_detalles (
            id_detalle_material,
            capacidad_m3,
            cantidad_pedida_m3,
            volumen_real_m3,
            peso_ton,
            precio_m3,
            costo_total,
            distancia_km,
            folio_banco,
            requisicion,
            notas_adicionales,
            material (
              id_material,
              material,
              tipo_de_material (
                id_tipo_de_material,
                tipo_de_material
              )
            ),
            bancos (
              id_banco,
              banco
            ),
            vale_material_viajes (
              id_viaje,
              numero_viaje,
              hora_registro,
              peso_ton,
              volumen_m3,
              costo_viaje,
              folio_vale_fisico
            )
          ),
          tickets_material (
            id_ticket,
            numero_ticket,
            folio_ticket,
            fecha_impresion
          )`
          : `vale_renta_detalle (
            id_vale_renta_detalle,
            capacidad_m3,
            hora_inicio,
            hora_fin,
            total_horas,
            total_dias,
            numero_viajes,
            es_renta_por_dia,
            costo_total,
            notas_adicionales,
            material (
              id_material,
              material
            ),
            sindicatos (
              id_sindicato,
              sindicato
            ),
            precios_renta:id_precios_renta (
              id_precios_renta,
              costo_hr,
              costo_dia
            ),
            vale_renta_viajes (
              id_viaje,
              numero_viaje,
              hora_registro
            )
          )`
      }
    `,
    )
    .eq("tipo_vale", tipoVale)
    .eq("archivado", false);
};

/**
 * Aplicar filtros a la query
 * Usa fecha_programada si existe, si no fecha_creacion
 */
const aplicarFiltros = (query, filtros) => {
  if (filtros.fecha_inicio && filtros.fecha_fin) {
    // Buscar vales cuya fecha efectiva esté en el rango
    query = query.or(
      `and(fecha_programada.gte.${filtros.fecha_inicio},fecha_programada.lte.${filtros.fecha_fin}),` +
        `and(fecha_programada.is.null,fecha_creacion.gte.${filtros.fecha_inicio},fecha_creacion.lte.${filtros.fecha_fin})`,
    );
  }

  if (filtros.id_empresa) {
    query = query.eq("id_empresa", filtros.id_empresa);
  }

  if (filtros.id_obra) {
    query = query.eq("id_obra", filtros.id_obra);
  }

  // Sindicato se filtra en el cliente después de obtener los datos

  return query;
};

/**
 * Obtener vales de material agrupados
 */
export const obtenerValesMaterialAgrupados = async (filtros, userProfile) => {
  try {
    let query = construirQueryBase("material");
    query = aplicarFiltros(query, filtros);

    const { data: vales, error } = await query;

    if (error) throw error;

    if (!vales || vales.length === 0) {
      return {
        datos: [],
        resumen: {
          totalEmpresas: 0,
          totalVehiculos: 0,
          totalViajes: 0,
          totalM3: 0,
        },
      };
    }

    const agrupado = agruparValesPorEmpresaPlacasEstado(
      vales,
      "material",
      filtros,
    );

    return agrupado;
  } catch (error) {
    console.error("Error en obtenerValesMaterialAgrupados:", error);
    throw error;
  }
};

/**
 * Obtener vales de renta agrupados
 */
export const obtenerValesRentaAgrupados = async (filtros, userProfile) => {
  try {
    let query = construirQueryBase("renta");
    query = aplicarFiltros(query, filtros);

    const { data: vales, error } = await query;

    if (error) throw error;

    if (!vales || vales.length === 0) {
      return {
        datos: [],
        resumen: {
          totalEmpresas: 0,
          totalVehiculos: 0,
          totalViajes: 0,
          totalDias: 0,
          totalHoras: 0,
        },
      };
    }

    const agrupado = agruparValesPorEmpresaPlacasEstado(
      vales,
      "renta",
      filtros,
    );

    return agrupado;
  } catch (error) {
    console.error("Error en obtenerValesRentaAgrupados:", error);
    throw error;
  }
};

/**
 * Agrupar vales por Empresa → Placas → Estado
 */
const agruparValesPorEmpresaPlacasEstado = (vales, tipoVale, filtros) => {
  // Filtrar por placas si hay búsqueda
  let valesFiltrados = vales;
  if (filtros.searchTerm) {
    const termino = filtros.searchTerm.toLowerCase();
    valesFiltrados = vales.filter((vale) =>
      vale.vehiculos?.placas?.toLowerCase().includes(termino),
    );
  }

  // Agrupar por empresa
  const porEmpresa = {};

  valesFiltrados.forEach((vale) => {
    const idEmpresa = vale.obras?.empresas?.id_empresa;
    const nombreEmpresa = vale.obras?.empresas?.empresa || "Sin empresa";
    const placas = vale.vehiculos?.placas || "Sin placas";
    const estado = vale.estado || "sin_estado";

    if (!porEmpresa[idEmpresa]) {
      porEmpresa[idEmpresa] = {
        id_empresa: idEmpresa,
        nombre_empresa: nombreEmpresa,
        sufijo: vale.obras?.empresas?.sufijo,
        logo: vale.obras?.empresas?.logo,
        vehiculos: {},
      };
    }

    if (!porEmpresa[idEmpresa].vehiculos[placas]) {
      porEmpresa[idEmpresa].vehiculos[placas] = {
        placas: placas,
        id_vehiculo: vale.vehiculos?.id_vehiculo,
        porEstado: {},
      };
    }

    if (!porEmpresa[idEmpresa].vehiculos[placas].porEstado[estado]) {
      porEmpresa[idEmpresa].vehiculos[placas].porEstado[estado] = {
        estado: estado,
        vales: [],
      };
    }

    porEmpresa[idEmpresa].vehiculos[placas].porEstado[estado].vales.push(vale);
  });

  // Convertir a array y calcular totales
  const empresasArray = Object.values(porEmpresa).map((empresa) => {
    const vehiculosArray = Object.values(empresa.vehiculos).map((vehiculo) => {
      const estadosArray = Object.values(vehiculo.porEstado).map(
        (estadoGrupo) => {
          // Ordenar vales por fecha efectiva (más reciente primero)
          const valesOrdenados = estadoGrupo.vales.sort(
            (a, b) => obtenerFechaEfectiva(b) - obtenerFechaEfectiva(a),
          );

          const totalesEstado = calcularTotalesEstado(valesOrdenados, tipoVale);

          return {
            ...estadoGrupo,
            vales: valesOrdenados,
            ...totalesEstado,
          };
        },
      );

      const estadosOrdenados = ordenarEstados(estadosArray);
      const totalesVehiculo = calcularTotalesVehiculo(
        estadosOrdenados,
        tipoVale,
      );

      return {
        ...vehiculo,
        porEstado: estadosOrdenados,
        ...totalesVehiculo,
      };
    });

    const vehiculosOrdenados = vehiculosArray.sort((a, b) =>
      a.placas.localeCompare(b.placas),
    );

    const totalesEmpresa = calcularTotalesEmpresa(vehiculosOrdenados, tipoVale);

    return {
      ...empresa,
      vehiculos: vehiculosOrdenados,
      ...totalesEmpresa,
    };
  });

  const empresasOrdenadas = empresasArray.sort((a, b) =>
    a.nombre_empresa.localeCompare(b.nombre_empresa),
  );

  const resumen = calcularResumenGeneral(empresasOrdenadas, tipoVale);

  return {
    datos: empresasOrdenadas,
    resumen: resumen,
  };
};

/**
 * Calcular totales de un estado
 */
const calcularTotalesEstado = (vales, tipoVale) => {
  if (tipoVale === "material") {
    const totalViajes = vales.length;

    const totalM3 = vales.reduce((sum, vale) => {
      const detalles = vale.vale_material_detalles || [];
      const m3Vale = detalles.reduce((sumDetalle, detalle) => {
        const esTipo3 =
          detalle.material?.tipo_de_material?.id_tipo_de_material === 3;
        const volumen = esTipo3
          ? Number(detalle.cantidad_pedida_m3 || detalle.volumen_real_m3 || 0)
          : Number(detalle.volumen_real_m3 || detalle.cantidad_pedida_m3 || 0);
        return sumDetalle + volumen;
      }, 0);
      return sum + m3Vale;
    }, 0);

    return {
      totalViajes,
      totalM3: Number(totalM3.toFixed(2)),
    };
  } else {
    const totalViajes = vales.reduce((sum, vale) => {
      const detalles = vale.vale_renta_detalle || [];
      const viajesVale = detalles.reduce(
        (sumDetalle, detalle) =>
          sumDetalle + (Number(detalle.numero_viajes) || 0),
        0,
      );
      return sum + viajesVale;
    }, 0);

    const totalDias = vales.reduce((sum, vale) => {
      const detalles = vale.vale_renta_detalle || [];
      const diasVale = detalles.reduce(
        (sumDetalle, detalle) => sumDetalle + (Number(detalle.total_dias) || 0),
        0,
      );
      return sum + diasVale;
    }, 0);

    const totalHoras = vales.reduce((sum, vale) => {
      const detalles = vale.vale_renta_detalle || [];
      const horasVale = detalles.reduce(
        (sumDetalle, detalle) =>
          sumDetalle + (Number(detalle.total_horas) || 0),
        0,
      );
      return sum + horasVale;
    }, 0);

    return {
      totalViajes,
      totalDias: Number(totalDias.toFixed(2)),
      totalHoras: Number(totalHoras.toFixed(2)),
    };
  }
};

/**
 * Calcular totales de un vehículo (suma de todos sus estados)
 */
const calcularTotalesVehiculo = (estados, tipoVale) => {
  const totalViajes = estados.reduce(
    (sum, estado) => sum + estado.totalViajes,
    0,
  );

  if (tipoVale === "material") {
    const totalM3 = estados.reduce((sum, estado) => sum + estado.totalM3, 0);
    return {
      totalViajes,
      totalM3: Number(totalM3.toFixed(2)),
    };
  } else {
    const totalDias = estados.reduce(
      (sum, estado) => sum + estado.totalDias,
      0,
    );
    const totalHoras = estados.reduce(
      (sum, estado) => sum + estado.totalHoras,
      0,
    );
    return {
      totalViajes,
      totalDias: Number(totalDias.toFixed(2)),
      totalHoras: Number(totalHoras.toFixed(2)),
    };
  }
};

/**
 * Calcular totales de una empresa (suma de todos sus vehículos)
 */
const calcularTotalesEmpresa = (vehiculos, tipoVale) => {
  const totalVehiculos = vehiculos.length;
  const totalViajes = vehiculos.reduce(
    (sum, vehiculo) => sum + vehiculo.totalViajes,
    0,
  );

  if (tipoVale === "material") {
    const totalM3 = vehiculos.reduce(
      (sum, vehiculo) => sum + vehiculo.totalM3,
      0,
    );
    return {
      totalVehiculos,
      totalViajes,
      totalM3: Number(totalM3.toFixed(2)),
    };
  } else {
    const totalDias = vehiculos.reduce(
      (sum, vehiculo) => sum + vehiculo.totalDias,
      0,
    );
    const totalHoras = vehiculos.reduce(
      (sum, vehiculo) => sum + vehiculo.totalHoras,
      0,
    );
    return {
      totalVehiculos,
      totalViajes,
      totalDias: Number(totalDias.toFixed(2)),
      totalHoras: Number(totalHoras.toFixed(2)),
    };
  }
};

/**
 * Calcular resumen general (suma de todas las empresas)
 */
const calcularResumenGeneral = (empresas, tipoVale) => {
  const totalEmpresas = empresas.length;
  const totalVehiculos = empresas.reduce(
    (sum, empresa) => sum + empresa.totalVehiculos,
    0,
  );
  const totalViajes = empresas.reduce(
    (sum, empresa) => sum + empresa.totalViajes,
    0,
  );

  if (tipoVale === "material") {
    const totalM3 = empresas.reduce((sum, empresa) => sum + empresa.totalM3, 0);
    return {
      totalEmpresas,
      totalVehiculos,
      totalViajes,
      totalM3: Number(totalM3.toFixed(2)),
    };
  } else {
    const totalDias = empresas.reduce(
      (sum, empresa) => sum + empresa.totalDias,
      0,
    );
    const totalHoras = empresas.reduce(
      (sum, empresa) => sum + empresa.totalHoras,
      0,
    );
    return {
      totalEmpresas,
      totalVehiculos,
      totalViajes,
      totalDias: Number(totalDias.toFixed(2)),
      totalHoras: Number(totalHoras.toFixed(2)),
    };
  }
};

/**
 * Ordenar estados por prioridad
 */
const ordenarEstados = (estados) => {
  const ordenPrioridad = {
    verificado: 1,
    en_proceso: 2,
    emitido: 3,
    borrador: 4,
    pagado: 5,
    conciliado: 6,
    archivado: 7,
    sin_estado: 8,
  };

  return estados.sort((a, b) => {
    const prioridadA = ordenPrioridad[a.estado] || 99;
    const prioridadB = ordenPrioridad[b.estado] || 99;
    return prioridadA - prioridadB;
  });
};
