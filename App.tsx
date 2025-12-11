

import React from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import Projecao from './components/Projecao';
import FluxoDeCaixa from './components/FluxoDeCaixa';
import StatusPage from './components/StatusPage';
import { ProjetadoExecutadoPage, VendidoPage } from './components/Placeholders';

function App() {
  const linkClasses = ({ isActive }: { isActive: boolean }) => 
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`;

  return (
    <DataProvider>
      <HashRouter>
        <div className="min-h-screen flex flex-col bg-gray-900">
          <header className="bg-gray-800 shadow-md p-4 z-10 relative">
            <nav className="container mx-auto flex items-center justify-between">
              <h1 className="text-xl font-bold text-white hidden md:block">Gestão Imobiliária</h1>
              <div className="flex items-center space-x-2 overflow-x-auto">
                <NavLink to="/projecao" className={linkClasses}>
                  Projeção
                </NavLink>
                <NavLink to="/fluxo-caixa" className={linkClasses}>
                  Fluxo de Caixa
                </NavLink>
                <NavLink to="/status" className={linkClasses}>
                  Status
                </NavLink>
                <NavLink to="/projetado-executado" className={linkClasses}>
                  Projetado Executado
                </NavLink>
                <NavLink to="/vendido" className={linkClasses}>
                  Vendido
                </NavLink>
              </div>
            </nav>
          </header>
          <main className="flex-grow container mx-auto relative overflow-hidden">
            <Routes>
              <Route path="/" element={<Navigate to="/projecao" />} />
              <Route path="/projecao" element={<Projecao />} />
              <Route path="/fluxo-caixa" element={<FluxoDeCaixa />} />
              <Route path="/status" element={<StatusPage />} />
              <Route path="/projetado-executado" element={<ProjetadoExecutadoPage />} />
              <Route path="/vendido" element={<VendidoPage />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </DataProvider>
  );
}

export default App;