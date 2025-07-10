import { saveRequest } from '../utils/db';
import { useState } from 'react';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

export default function RequestForm({ onNewRequest }) {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('GET');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    let responseData = null;
    try {
      const res = await fetch(url, { method });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        responseData = await res.json();
      } else {
        responseData = await res.text();
      }
    } catch (err) {
      responseData = `ERROR: ${err.message}`;
      setError(err.message);
    }
    const req = {
      url,
      method,
      date: new Date(),
      response: responseData,
    };
    await saveRequest(req);
    onNewRequest();
    setUrl('');
    setSuccess(true);
    setLoading(false);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 items-stretch bg-gray-800 border border-gray-700 p-3 rounded-lg mb-6 transition-colors">
      <select
        className="border border-gray-700 px-2 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-gray-900 text-gray-100 flex-shrink-0 w-full sm:w-28"
        value={method}
        onChange={e => setMethod(e.target.value)}
      >
        {METHODS.map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <input
        className="border border-gray-700 px-2 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-gray-900 text-gray-100 flex-1 min-w-[120px]"
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Enter URL"
        required
      />
      <button
        type="submit"
        className={`w-full sm:w-auto px-4 py-2 rounded-md font-medium bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center ${loading ? 'cursor-wait' : ''}`}
        disabled={loading}
      >
        {loading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>}
        {loading ? 'Guardando...' : 'Guardar'}
      </button>
      {success && <span className="text-green-400 text-xs ml-2 animate-fade-in self-center">¡Guardado!</span>}
      {error && <span className="text-red-400 text-xs ml-2 animate-fade-in self-center">{error}</span>}
    </form>
  );
}
