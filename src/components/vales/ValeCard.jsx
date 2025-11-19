/**
 * src/components/vales/ValeCard.jsx
 *
 * Componente "Router" que decide qué tipo de tarjeta renderizar
 *
 * Funcionalidades:
 * - Evalúa el tipo_vale (material o renta)
 * - Renderiza ValeCardMaterial o ValeCardRenta según corresponda
 * - Mantiene la misma API externa para no romper ValesList
 *
 * Usado en: ValesList.jsx
 */

// Componentes específicos por tipo
import ValeCardMaterial from "./ValeCardMaterial";
import ValeCardRenta from "./ValeCardRenta";

const ValeCard = ({ vale, empresaColor }) => {
  // Decidir qué componente renderizar según tipo_vale
  if (vale.tipo_vale === "material") {
    return <ValeCardMaterial vale={vale} empresaColor={empresaColor} />;
  }

  if (vale.tipo_vale === "renta") {
    return <ValeCardRenta vale={vale} empresaColor={empresaColor} />;
  }

  // Fallback: tipo desconocido (no debería pasar)
  return (
    <div className="vale-card-compact">
      <p className="vale-card__no-data">
        Tipo de vale desconocido: {vale.tipo_vale}
      </p>
    </div>
  );
};

export default ValeCard;
