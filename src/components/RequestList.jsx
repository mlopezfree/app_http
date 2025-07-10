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

export default function RequestList() {
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

  const handleShowResponse = (response) => {
    setSelectedResponse(response);
    setShowModal(true);
  };

  const handleCloseModal = (e) => {
    if (e) e.stopPropagation();
    setShowModal(false);
    setSelectedResponse(null);
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

  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row items-center mb-2 gap-2 sm:gap-4">
        <h2 className="text-xl font-semibold flex-1 tracking-tight">Peticiones guardadas</h2>
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
      <ul className="flex flex-col gap-3">
        {filteredRequests.map(req => (
          <li key={req.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 transition">
            <div className="flex items-center gap-2 w-full">
              <span className="px-2 py-0.5 rounded text-xs font-semibold border whitespace-nowrap bg-gray-900 text-green-400 border-gray-700">{req.method}</span>
              <span className="font-mono text-sm break-all flex-1">{req.url}</span>
            </div>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(req.date)}</span>
              <button
                className="flex-grow-0 flex items-center gap-1 bg-gray-700 text-gray-100 px-3 py-1 rounded-md text-xs font-medium hover:bg-gray-600 transition-colors"
                onClick={() => handleShowResponse(req.response)}
              >
                Respuesta
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
      {showModal && (
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
            <h3 className="text-lg font-semibold mb-2">Respuesta</h3>
            <input
              type="text"
              className="mb-2 w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Buscar en la respuesta..."
              value={responseSearch}
              onChange={e => setResponseSearch(e.target.value)}
            />
            <div className="overflow-x-auto">
              {prettyResponse(selectedResponse)}
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