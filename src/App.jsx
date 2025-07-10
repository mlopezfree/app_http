import React, { useState } from 'react';
import RequestForm from './components/RequestForm';
import RequestList from './components/RequestList';

function App() {
  const [reload, setReload] = useState(false);

  const handleNewRequest = () => {
    setReload(!reload);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 transition-colors">
      <div className="max-w-xl mx-auto py-10 px-2 sm:px-0">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Mini HTTP Client</h1>
        </div>
        <RequestForm onNewRequest={handleNewRequest} />
        <RequestList key={reload} />
      </div>
    </div>
  );
}

export default App;
