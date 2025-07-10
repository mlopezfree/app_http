import React, { useState } from 'react';
import RequestForm from './components/RequestForm';
import RequestList from './components/RequestList';

function App() {
  const [reload, setReload] = useState(false);
  const [replica, setReplica] = useState(null);

  const handleNewRequest = () => {
    setReload(!reload);
  };

  // Replicar petición: pasarla como prop al formulario
  const handleReplicate = (req) => {
    setReplica(req);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 transition-colors">
      <div className="max-w-7xl mx-auto px-2 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight pt-6 sm:pt-10 text-center w-full">Mini HTTP Client</h1>
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="md:w-1/2">
            <RequestForm onNewRequest={handleNewRequest} replica={replica} setReplica={setReplica} />
          </div>
          <div className="md:w-1/2">
            <RequestList key={reload} onReplicate={handleReplicate} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
