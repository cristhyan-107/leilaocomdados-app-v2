import React, { useState } from 'react';
import Dashboard from './Dashboard';
import DataEntry from './DataEntry';

const Projecao: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'lancamentos'>('dashboard');

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Sub-navigation Tabs */}
      <div className="flex space-x-1 bg-gray-900 border-b border-gray-700 px-4 pt-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-6 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 border-t border-l border-r ${
            activeTab === 'dashboard'
              ? 'bg-gray-800 text-cyan-400 border-gray-700'
              : 'bg-gray-900 text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          Dashboard (Visão Geral)
        </button>
        <button
          onClick={() => setActiveTab('lancamentos')}
          className={`px-6 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 border-t border-l border-r ${
            activeTab === 'lancamentos'
              ? 'bg-gray-800 text-cyan-400 border-gray-700'
              : 'bg-gray-900 text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          Lançamentos (Entrada de Dados)
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-gray-900">
        {activeTab === 'dashboard' ? (
           <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
             <Dashboard />
           </div>
        ) : (
            <DataEntry />
        )}
      </div>
    </div>
  );
};

export default Projecao;