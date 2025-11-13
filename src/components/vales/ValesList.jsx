/**
 * src/components/vales/ValesList.jsx
 *
 * Componente de lista de vales en formato grid
 *
 * Funcionalidades:
 * - Grid responsivo de tarjetas
 * - Muestra información resumida de cada vale
 * - Click handler para ver detalle
 * - Animaciones de hover
 *
 * Usado en: Vales.jsx
 */

// 1. React y hooks
import React from "react";

// 2. Componentes
import ValeCard from "./ValeCard";

const ValesList = ({ vales, onValeClick }) => {
  return (
    <div className="vales-list">
      {vales.map((vale) => (
        <ValeCard
          key={vale.id_vale}
          vale={vale}
          onClick={() => onValeClick(vale)}
        />
      ))}
    </div>
  );
};

export default ValesList;
