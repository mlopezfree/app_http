import { getAllRequests, deleteRequest, clearRequests } from '../utils/db';
import { useEffect, useState } from 'react';

const methodColors = {
  GET: 'bg-green-100 text-green-700',
  POST: 'bg-blue-100 text-blue-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
};

function timeAgo(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'hace unos segundos';
  if (diff < 3600) return `hace ${Math.floor(diff/60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)} h`;
  return d.toLocaleString();
}

export default function RequestList({ onReplicate }) {
  const [requests, setRequests] = useState([]);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('Todos');
  const [responseSearch, setResponseSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [tab, setTab] = useState('Historial');
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('http-client-favs') || '[]'));
  // Estado para tab de respuesta
  const [responseTab, setResponseTab] = useState('Preview');

  const loadRequests = async () => {
    const all = await getAllRequests();
    setRequests(all);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // Filtrado de peticiones
  const filteredRequests = requests.filter(req => {
    const matchesSearch =
      req.url.toLowerCase().includes(search.toLowerCase()) ||
      req.method.toLowerCase().includes(search.toLowerCase()) ||
      new Date(req.date).toLocaleString().toLowerCase().includes(search.toLowerCase());
    const matchesMethod = methodFilter === 'Todos' || req.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  // Ordenar por fecha descendente
  const sortedRequests = [...filteredRequests].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Marcar/desmarcar favorito
  const toggleFavorite = (req) => {
    let favs = JSON.parse(localStorage.getItem('http-client-favs') || '[]');
    const exists = favs.find(f => f.id === req.id);
    if (exists) {
      favs = favs.filter(f => f.id !== req.id);
    } else {
      favs = [{ ...req }, ...favs];
    }
    setFavorites(favs);
    localStorage.setItem('http-client-favs', JSON.stringify(favs));
  };

  // Mostrar favoritos o historial
  const showRequests = tab === 'Favoritos' ? favorites : sortedRequests;

  const handleShowResponse = (request) => {
    setSelectedRequest(request);
    setSelectedResponse(request.response);
    setShowModal(true);
  };

  const handleCloseModal = (e) => {
    if (e) e.stopPropagation();
    setShowModal(false);
    setSelectedResponse(null);
    setSelectedRequest(null);
  };

  // Cerrar modal con Escape
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e) => { if (e.key === 'Escape') handleCloseModal(e); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showModal]);

  const handleDelete = async (id) => {
    setDeleting(id);
    await deleteRequest(id);
    setFeedback('Petición borrada');
    setTimeout(() => setFeedback(''), 1500);
    setDeleting(null);
    loadRequests();
  };

  const handleClearAll = async () => {
    setClearing(true);
    await clearRequests();
    setFeedback('Todas las peticiones borradas');
    setTimeout(() => setFeedback(''), 1500);
    setClearing(false);
    setShowConfirm(false);
    loadRequests();
  };

  // Copiar al portapapeles
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setFeedback('¡Copiado!');
    setTimeout(() => setFeedback(''), 1200);
  };

  // Resaltado simple para JSON y búsqueda en respuesta
  function prettyResponse(resp) {
    let display = resp;
    if (responseSearch) {
      // Si es objeto o JSON, convertir a string
      if (typeof resp === 'object') {
        display = JSON.stringify(resp, null, 2);
      } else {
        try {
          display = JSON.stringify(JSON.parse(resp), null, 2);
        } catch {
          display = String(resp);
        }
      }
      // Filtrar por coincidencia
      if (!display.toLowerCase().includes(responseSearch.toLowerCase())) {
        return <pre className="bg-gray-800 p-2 rounded overflow-x-auto max-h-96 text-xs text-left text-gray-400 italic">No hay coincidencias.</pre>;
      }
      // Resaltar coincidencias
      const parts = display.split(new RegExp(`(${responseSearch})`, 'gi'));
      return (
        <pre className="bg-gray-800 p-2 rounded overflow-x-auto max-h-96 text-xs text-left">
          {parts.map((part, i) =>
            part.toLowerCase() === responseSearch.toLowerCase() ? <mark key={i} className="bg-yellow-600 text-gray-100 rounded px-0.5">{part}</mark> : part
          )}
        </pre>
      );
    }
    // Sin búsqueda
    if (typeof resp === 'object') {
      return <pre className="bg-gray-800 p-2 rounded overflow-x-auto max-h-96 text-xs text-left">{JSON.stringify(resp, null, 2)}</pre>;
    }
    try {
      const obj = JSON.parse(resp);
      return <pre className="bg-gray-800 p-2 rounded overflow-x-auto max-h-96 text-xs text-left">{JSON.stringify(obj, null, 2)}</pre>;
    } catch {
      return <pre className="bg-gray-800 p-2 rounded overflow-x-auto max-h-96 text-xs text-left">{String(resp)}</pre>;
    }
  }

  // Exportar historial
  const handleExportHistory = () => {
    const data = JSON.stringify(requests, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historial.json';
    a.click();
    window.URL.revokeObjectURL(url);
  };
  // Importar historial
  const handleImportHistory = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported)) {
          // Guardar en IndexedDB (solo nuevos)
          imported.forEach(async req => {
            if (!requests.find(r => r.id === req.id)) {
              await window.indexedDB && window.indexedDB.databases ? null : null; // placeholder
              // Aquí deberías usar saveRequest si está disponible globalmente
            }
          });
          setRequests(imported.concat(requests));
        }
      } catch {}
    };
    reader.readAsText(file);
  };
  // Generador de código cURL
  function toCurl(req) {
    let curl = `curl -X ${req.method} '` + req.url + `'`;
    if (req.headers && Object.keys(req.headers).length) {
      Object.entries(req.headers).forEach(([k, v]) => {
        curl += ` -H "${k}: ${v}"`;
      });
    }
    if (req.body) {
      curl += ` -d '${typeof req.body === 'object' ? JSON.stringify(req.body) : req.body}'`;
    }
    return curl;
  }
  // Generador de código fetch
  function toFetch(req) {
    let code = `fetch('${req.url}', {\n  method: '${req.method}',`;
    if (req.headers && Object.keys(req.headers).length) {
      code += `\n  headers: ${JSON.stringify(req.headers, null, 2)},`;
    }
    if (req.body) {
      code += `\n  body: ${JSON.stringify(req.body)},`;
    }
    code += '\n})\n  .then(r => r.json())\n  .then(console.log)';
    return code;
  }

  return (
    <div className="mt-4 sm:mt-0">
      <div className="flex gap-2 mb-2">
        <button className={`px-3 py-1 rounded-t-md text-xs font-semibold ${tab === 'Historial' ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' : 'bg-gray-800 text-gray-400 hover:text-blue-300'}`} onClick={() => setTab('Historial')}>Historial</button>
        <button className={`px-3 py-1 rounded-t-md text-xs font-semibold ${tab === 'Favoritos' ? 'bg-gray-900 text-yellow-400 border-b-2 border-yellow-400' : 'bg-gray-800 text-gray-400 hover:text-yellow-300'}`} onClick={() => setTab('Favoritos')}>Favoritos</button>
      </div>
      <div className="flex flex-col sm:flex-row items-center mb-2 gap-2 sm:gap-4">
        <h2 className="text-xl font-semibold flex-1 tracking-tight">{tab === 'Favoritos' ? 'Favoritos' : 'Peticiones guardadas'}</h2>
        {requests.length > 0 && (
          <button
            className="bg-gray-700 text-gray-100 px-3 py-1 rounded-md text-xs hover:bg-gray-600 border border-gray-700 transition w-full sm:w-auto"
            onClick={() => setShowConfirm(true)}
            disabled={clearing}
          >
            {clearing ? 'Limpiando...' : 'Limpiar todo'}
          </button>
        )}
      </div>
      {/* Buscador y filtro por método */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          className="bg-gray-900 border border-gray-700 text-gray-100 rounded-md px-3 py-1 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Buscar petición por URL, método o fecha..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="bg-gray-900 border border-gray-700 text-gray-100 rounded-md px-3 py-1 text-sm w-full sm:w-36 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={methodFilter}
          onChange={e => setMethodFilter(e.target.value)}
        >
          <option value="Todos">Todos</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>
      {/* Lista filtrada */}
      {feedback && <div className="text-green-600 dark:text-green-400 text-xs mb-2 animate-fade-in">{feedback}</div>}
      <div className="flex gap-2 mb-2">
        <button className="px-2 py-1 rounded bg-gray-700 text-gray-100 text-xs hover:bg-gray-600" onClick={handleExportHistory}>Exportar historial</button>
        <label className="px-2 py-1 rounded bg-gray-700 text-gray-100 text-xs hover:bg-gray-600 cursor-pointer">
          Importar historial
          <input type="file" accept="application/json" className="hidden" onChange={handleImportHistory} />
        </label>
      </div>
      <ul className="flex flex-col gap-3">
        {showRequests.map(req => (
          <li key={req.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 transition">
            <div className="flex items-center gap-2 w-full">
              <button className={`text-lg ${favorites.find(f => f.id === req.id) ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'} transition`} title="Favorito" onClick={() => toggleFavorite(req)}>
                ★
              </button>
              <span className="px-2 py-0.5 rounded text-xs font-semibold border whitespace-nowrap bg-gray-900 text-green-400 border-gray-700">{req.method}</span>
              <span className="font-mono text-sm break-all flex-1">{req.url}</span>
              {req.name && <span className="ml-2 text-xs text-blue-300 font-semibold">{req.name}</span>}
              {req.collection && <span className="ml-2 text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded">{req.collection}</span>}
              {req.tags && req.tags.length > 0 && req.tags.map((tag, i) => <span key={i} className="ml-1 text-xs bg-gray-700 text-gray-200 px-2 py-0.5 rounded">{tag}</span>)}
            </div>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(req.date)}</span>
              {req.status && <span className="text-xs text-green-400">{req.status}</span>}
              {req.responseTime != null && <span className="text-xs text-gray-400">{req.responseTime}ms</span>}
              <button
                className="flex-grow-0 flex items-center gap-1 bg-gray-700 text-gray-100 px-3 py-1 rounded-md text-xs font-medium hover:bg-gray-600 transition-colors"
                onClick={() => handleShowResponse(req)}
              >
                Respuesta
              </button>
              <button
                className="flex-grow-0 bg-gray-700 text-gray-100 px-2 py-1 rounded-md text-xs hover:bg-blue-700 border border-gray-700 transition"
                onClick={() => onReplicate && onReplicate(req)}
              >
                Replicar
              </button>
              <button
                className="flex-grow-0 bg-gray-900 text-gray-100 px-2 py-1 rounded-md text-xs hover:bg-red-700 border border-gray-700 transition"
                onClick={() => handleDelete(req.id)}
                disabled={deleting === req.id}
              >
                {deleting === req.id ? 'Borrando...' : 'Borrar'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fade-in" onClick={handleCloseModal}>
          <div className="bg-gray-900 p-5 rounded-lg border border-gray-700 shadow max-w-2xl w-full relative animate-modal-in" onClick={e => e.stopPropagation()}>
            <button
              className="absolute top-2 right-2 text-xl text-gray-400 hover:text-white focus:outline-none"
              onClick={handleCloseModal}
              aria-label="Cerrar"
              autoFocus
            >
              ×
            </button>
            <h3 className="text-lg font-semibold mb-2">Detalles de la petición</h3>
            <div className="mb-2 text-xs text-gray-400 flex flex-wrap items-center gap-2">
              <span>{selectedRequest.method} {selectedRequest.url}</span>
              <button className="ml-2 text-xs text-blue-300 hover:underline" onClick={() => copyToClipboard(selectedRequest.url)}>Copiar URL</button>
              {selectedRequest.status && <span className="ml-2 text-xs text-green-400">Status: {selectedRequest.status}</span>}
            </div>
            {/* Params */}
            {selectedRequest.params && selectedRequest.params.length > 0 && (
              <details className="mb-2" open>
                <summary className="cursor-pointer text-sm font-semibold text-blue-300">Parámetros <button className="ml-2 text-xs text-blue-300 hover:underline" onClick={e => {e.stopPropagation();copyToClipboard(JSON.stringify(selectedRequest.params, null, 2));}}>Copiar</button></summary>
                <pre className="bg-gray-800 p-2 rounded text-xs mt-1 overflow-x-auto">{JSON.stringify(selectedRequest.params, null, 2)}</pre>
              </details>
            )}
            {/* Headers */}
            {selectedRequest.headers && Object.keys(selectedRequest.headers).length > 0 && (
              <details className="mb-2" open>
                <summary className="cursor-pointer text-sm font-semibold text-blue-300">Headers <button className="ml-2 text-xs text-blue-300 hover:underline" onClick={e => {e.stopPropagation();copyToClipboard(JSON.stringify(selectedRequest.headers, null, 2));}}>Copiar</button></summary>
                <pre className="bg-gray-800 p-2 rounded text-xs mt-1 overflow-x-auto">{JSON.stringify(selectedRequest.headers, null, 2)}</pre>
              </details>
            )}
            {/* Body */}
            {selectedRequest.body && (
              <details className="mb-2" open>
                <summary className="cursor-pointer text-sm font-semibold text-blue-300">Body <button className="ml-2 text-xs text-blue-300 hover:underline" onClick={e => {e.stopPropagation();copyToClipboard(typeof selectedRequest.body === 'object' ? JSON.stringify(selectedRequest.body, null, 2) : String(selectedRequest.body));}}>Copiar</button></summary>
                <pre className="bg-gray-800 p-2 rounded text-xs mt-1 overflow-x-auto">{typeof selectedRequest.body === 'object' ? JSON.stringify(selectedRequest.body, null, 2) : String(selectedRequest.body)}</pre>
              </details>
            )}
            {/* Respuesta */}
            <h4 className="text-sm font-semibold text-blue-300 mt-4 mb-1">Respuesta</h4>
            <input
              type="text"
              className="mb-2 w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Buscar en la respuesta..."
              value={responseSearch}
              onChange={e => setResponseSearch(e.target.value)}
            />
            <div className="flex gap-2 mb-2">
              <button className={`px-2 py-1 rounded text-xs font-semibold ${responseTab === 'Preview' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-300'}`} onClick={() => setResponseTab('Preview')}>Preview</button>
              <button className={`px-2 py-1 rounded text-xs font-semibold ${responseTab === 'Raw' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-300'}`} onClick={() => setResponseTab('Raw')}>Raw</button>
              <button className={`px-2 py-1 rounded text-xs font-semibold ${responseTab === 'Descargar' ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-300'}`} onClick={() => {
                // Descargar respuesta como archivo
                const blob = new Blob([typeof selectedResponse === 'object' ? JSON.stringify(selectedResponse, null, 2) : String(selectedResponse)], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'respuesta.txt';
                a.click();
                window.URL.revokeObjectURL(url);
              }}>Descargar</button>
            </div>
            <div className="overflow-x-auto">
              {responseTab === 'Preview' && (
                <>
                  {/* Si es JSON, mostrar formateado. Si es HTML, renderizar. Si es imagen, mostrar imagen. */}
                  {(() => {
                    let resp = selectedResponse;
                    if (typeof resp === 'object') {
                      return <pre className="bg-gray-800 p-2 rounded overflow-x-auto max-h-96 text-xs text-left">{JSON.stringify(resp, null, 2)}</pre>;
                    }
                    // ¿Es JSON?
                    try {
                      const obj = JSON.parse(resp);
                      return <pre className="bg-gray-800 p-2 rounded overflow-x-auto max-h-96 text-xs text-left">{JSON.stringify(obj, null, 2)}</pre>;
                    } catch {}
                    // ¿Es imagen base64?
                    if (/^data:image\//.test(resp)) {
                      return <img src={resp} alt="Imagen respuesta" className="max-h-96 rounded mx-auto" />;
                    }
                    // ¿Es HTML?
                    if (/<[a-z][\s\S]*>/i.test(resp)) {
                      return <iframe title="preview-html" srcDoc={resp} className="w-full min-h-[200px] max-h-96 bg-white rounded" />;
                    }
                    // Texto plano
                    return <pre className="bg-gray-800 p-2 rounded overflow-x-auto max-h-96 text-xs text-left">{String(resp)}</pre>;
                  })()}
                </>
              )}
              {responseTab === 'Raw' && (
                <pre className="bg-gray-800 p-2 rounded overflow-x-auto max-h-96 text-xs text-left">{typeof selectedResponse === 'object' ? JSON.stringify(selectedResponse, null, 2) : String(selectedResponse)}</pre>
              )}
            </div>
            <div className="flex gap-2 mb-2">
              <button className="px-2 py-1 rounded bg-gray-700 text-gray-100 text-xs hover:bg-gray-600" onClick={() => copyToClipboard(toCurl(selectedRequest))}>Copiar cURL</button>
              <button className="px-2 py-1 rounded bg-gray-700 text-gray-100 text-xs hover:bg-gray-600" onClick={() => copyToClipboard(toFetch(selectedRequest))}>Copiar fetch</button>
            </div>
          </div>
        </div>
      )}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={() => setShowConfirm(false)}>
          <div className="bg-gray-900 p-5 rounded-lg border border-gray-700 shadow max-w-sm w-full relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">¿Seguro que quieres borrar todas las peticiones?</h3>
            <div className="flex gap-2 justify-end">
              <button
                className="bg-gray-700 text-gray-100 px-3 py-1 rounded-md text-xs hover:bg-gray-600 border border-gray-700"
                onClick={() => setShowConfirm(false)}
              >
                Cancelar
              </button>
              <button
                className="bg-red-700 text-white px-3 py-1 rounded-md text-xs hover:bg-red-800"
                onClick={handleClearAll}
                disabled={clearing}
              >
                Sí, borrar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}