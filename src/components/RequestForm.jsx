import { saveRequest } from '../utils/db';
import { useState, useEffect } from 'react';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const TABS = ['Params', 'Headers', 'Body'];
const CONFIG_KEY = 'http-client-configs';
const CACHE_KEY = 'http-client-last';

export default function RequestForm({ onNewRequest, replica, setReplica }) {
  // Cargar del cache o valores por defecto
  const last = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  const [urlBase, setUrlBase] = useState(last.urlBase || '');
  const [method, setMethod] = useState(last.method || 'GET');
  const [params, setParams] = useState(last.params || [{ key: '', value: '' }]);
  const [headers, setHeaders] = useState(last.headers || [{ key: '', value: '' }]);
  const [body, setBody] = useState(last.body || '');
  const [activeTab, setActiveTab] = useState(last.activeTab || 'Params');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [configs, setConfigs] = useState(() => JSON.parse(localStorage.getItem(CONFIG_KEY) || '[]'));
  const [configName, setConfigName] = useState('');

  // Guardar en cache cada vez que cambia algo relevante
  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ urlBase, method, params, headers, body, activeTab }));
  }, [urlBase, method, params, headers, body, activeTab]);

  // Cargar datos de una petición replicada
  useEffect(() => {
    if (replica) {
      setUrlBase(replica.url?.split('?')[0] || '');
      setMethod(replica.method || 'GET');
      setParams(replica.params && replica.params.length ? replica.params : [{ key: '', value: '' }]);
      setHeaders(replica.headers && Object.keys(replica.headers).length ? Object.entries(replica.headers).map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }]);
      setBody(replica.body || '');
      setActiveTab('Params');
      setReplica && setReplica(null);
    }
  }, [replica, setReplica]);

  // Guardar configuración
  const handleSaveConfig = () => {
    if (!configName.trim()) return;
    const newConfig = { name: configName.trim(), urlBase, method, params, headers, body, activeTab, date: new Date() };
    const newConfigs = [newConfig, ...configs];
    setConfigs(newConfigs);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfigs));
    setConfigName('');
  };

  // Cargar configuración
  const handleLoadConfig = (cfg) => {
    setUrlBase(cfg.urlBase);
    setMethod(cfg.method);
    setParams(cfg.params);
    setHeaders(cfg.headers);
    setBody(cfg.body);
    setActiveTab(cfg.activeTab);
  };

  // Limpiar formulario
  const handleClear = () => {
    setUrlBase('');
    setMethod('GET');
    setParams([{ key: '', value: '' }]);
    setHeaders([{ key: '', value: '' }]);
    setBody('');
    setActiveTab('Params');
  };

  // Params
  const handleParamChange = (idx, field, value) => {
    setParams(ps => ps.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const handleAddParam = () => setParams(ps => [...ps, { key: '', value: '' }]);
  const handleRemoveParam = idx => setParams(ps => ps.length === 1 ? ps : ps.filter((_, i) => i !== idx));

  // Headers
  const handleHeaderChange = (idx, field, value) => {
    setHeaders(hs => hs.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };
  const handleAddHeader = () => setHeaders(hs => [...hs, { key: '', value: '' }]);
  const handleRemoveHeader = idx => setHeaders(hs => hs.length === 1 ? hs : hs.filter((_, i) => i !== idx));

  // Reemplazar url por urlBase en el input
  // Generar la URL final con los params en tiempo real
  const paramString = params.filter(p => p.key).map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
  const url = urlBase + (paramString ? (urlBase.includes('?') ? '&' : '?') + paramString : '');

  // Cuando el usuario edita la URL, solo se edita la base (sin query)
  const handleUrlChange = (e) => {
    const value = e.target.value;
    const [base] = value.split('?');
    setUrlBase(base);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    let responseData = null;
    // Construir URL con params
    let finalUrl = url; // url ya tiene los params
    const paramString = params.filter(p => p.key).map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
    if (paramString) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + paramString;
    }
    // Headers
    const headersObj = headers.filter(h => h.key).reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});
    let fetchOptions = { method, headers: headersObj };
    if (["POST", "PUT", "PATCH"].includes(method)) {
      fetchOptions.body = body;
    }
    try {
      const res = await fetch(finalUrl, fetchOptions);
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
      url: finalUrl,
      method,
      params: params.filter(p => p.key),
      headers: headersObj,
      body: ["POST", "PUT", "PATCH"].includes(method) ? body : undefined,
      date: new Date(),
      response: responseData,
    };
    await saveRequest(req);
    onNewRequest();
    setUrlBase('');
    setBody('');
    setParams([{ key: '', value: '' }]);
    setHeaders([{ key: '', value: '' }]);
    setActiveTab('Params');
    setSuccess(true);
    setLoading(false);
    setTimeout(() => setSuccess(false), 2000);
    // Guardar en cache el estado limpio
    localStorage.setItem(CACHE_KEY, JSON.stringify({ urlBase: '', method: 'GET', params: [{ key: '', value: '' }], headers: [{ key: '', value: '' }], body: '', activeTab: 'Params' }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 bg-gray-800 border border-gray-700 p-3 rounded-lg mb-6 transition-colors">
      <div className="flex flex-col sm:flex-row gap-2 items-stretch">
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
          onChange={handleUrlChange}
          placeholder="Enter URL"
          required
        />
        <button type="button" className="px-3 py-2 rounded-md bg-gray-700 text-gray-100 text-xs font-medium hover:bg-gray-600 ml-0 sm:ml-2" onClick={handleClear}>Limpiar</button>
      </div>
      {/* Guardar config y cargar configs */}
      <div className="flex flex-col sm:flex-row gap-2 items-center mb-2">
        <input
          type="text"
          className="bg-gray-900 border border-gray-700 text-gray-100 rounded-md px-3 py-1 text-xs flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Nombre de la configuración"
          value={configName}
          onChange={e => setConfigName(e.target.value)}
        />
        <button type="button" className="px-3 py-1 rounded-md bg-blue-700 text-white text-xs font-medium hover:bg-blue-800" onClick={handleSaveConfig} disabled={!configName.trim()}>Guardar configuración</button>
        {configs.length > 0 && (
          <select className="bg-gray-900 border border-gray-700 text-gray-100 rounded-md px-3 py-1 text-xs" onChange={e => {
            const idx = e.target.value;
            if (idx !== '') handleLoadConfig(configs[idx]);
          }} defaultValue="">
            <option value="">Cargar configuración guardada...</option>
            {configs.map((cfg, i) => (
              <option key={i} value={i}>{cfg.name} ({new Date(cfg.date).toLocaleString()})</option>
            ))}
          </select>
        )}
      </div>
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 mb-2">
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            className={`px-3 py-1 text-xs font-semibold rounded-t-md transition-colors focus:outline-none ${activeTab === tab ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400' : 'bg-gray-800 text-gray-400 hover:text-blue-300'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* Secciones dinámicas */}
      {activeTab === 'Params' && (
        <div>
          <div className="flex items-center mb-1">
            <span className="text-xs text-gray-400 font-semibold flex-1">Parámetros (query params)</span>
            <button type="button" className="ml-2 px-2 py-0.5 rounded bg-gray-700 text-gray-100 text-xs hover:bg-gray-600" onClick={handleAddParam}>+ Añadir</button>
          </div>
          <div className="flex flex-col gap-1">
            {params.map((p, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  className="border border-gray-700 px-2 py-1 rounded-md bg-gray-900 text-gray-100 text-xs flex-1"
                  placeholder="Clave"
                  value={p.key}
                  onChange={e => handleParamChange(idx, 'key', e.target.value)}
                />
                <input
                  className="border border-gray-700 px-2 py-1 rounded-md bg-gray-900 text-gray-100 text-xs flex-1"
                  placeholder="Valor"
                  value={p.value}
                  onChange={e => handleParamChange(idx, 'value', e.target.value)}
                />
                <button type="button" className="px-2 py-1 rounded bg-gray-700 text-gray-100 text-xs hover:bg-red-700" onClick={() => handleRemoveParam(idx)} disabled={params.length === 1}>🗑</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'Headers' && (
        <div>
          <div className="flex items-center mb-1">
            <span className="text-xs text-gray-400 font-semibold flex-1">Cabeceras (headers)</span>
            <button type="button" className="ml-2 px-2 py-0.5 rounded bg-gray-700 text-gray-100 text-xs hover:bg-gray-600" onClick={handleAddHeader}>+ Añadir</button>
          </div>
          <div className="flex flex-col gap-1">
            {headers.map((h, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  className="border border-gray-700 px-2 py-1 rounded-md bg-gray-900 text-gray-100 text-xs flex-1"
                  placeholder="Clave"
                  value={h.key}
                  onChange={e => handleHeaderChange(idx, 'key', e.target.value)}
                />
                <input
                  className="border border-gray-700 px-2 py-1 rounded-md bg-gray-900 text-gray-100 text-xs flex-1"
                  placeholder="Valor"
                  value={h.value}
                  onChange={e => handleHeaderChange(idx, 'value', e.target.value)}
                />
                <button type="button" className="px-2 py-1 rounded bg-gray-700 text-gray-100 text-xs hover:bg-red-700" onClick={() => handleRemoveHeader(idx)} disabled={headers.length === 1}>🗑</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'Body' && ["POST", "PUT", "PATCH"].includes(method) && (
        <div>
          <div className="text-xs text-gray-400 font-semibold mb-1">Body</div>
          <textarea
            className="border border-gray-700 px-2 py-2 rounded-md bg-gray-900 text-gray-100 w-full min-h-[80px] text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Cuerpo de la petición (JSON, texto, etc.)"
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        </div>
      )}
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
