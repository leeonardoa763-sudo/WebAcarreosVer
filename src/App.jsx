// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import VerificarVale from "./pages/VerificarVale";
import NotFound from "./pages/NotFound"

import './App.css'

function App() {
  return (
    <BrowserRouter>
    <Routes>
      <Route path='/vale/:folio' element={<VerificarVale />}/>
      <Route path='*' element={<NotFound />}/>
    </Routes>
    </BrowserRouter>
  );
  
}

export default App;

