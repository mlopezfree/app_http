import { saveRequest } from '../utils/db';
import { useState, useEffect } from 'react';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const TABS = ['Params', 'Headers', 'Body', 'Prescript', 'Variables'];
const CONFIG_KEY = 'http-client-configs';
const CACHE_KEY = 'http-client-last';

// Headers clásicos por defecto
const DEFAULT_HEADERS = [
  { key: 'Content-Type', value: 'application/json', enabled: true },
  { key: 'Accept', value: 'application/json', enabled: true },
];

// Fusionar headers por defecto con los guardados, sin duplicar
function mergeDefaultHeaders(headers) {
  const keys = headers.map(h => h.key.toLowerCase());
  const merged = [...headers];
  DEFAULT_HEADERS.forEach(def => {
    if (!keys.includes(def.key.toLowerCase())) {
      merged.push({ ...def });
    }
  });
  return merged;
}

export default function RequestForm({ onNewRequest, replica, setReplica }) {
  // Cargar del cache o valores por defecto
  const last = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  const [urlBase, setUrlBase] = useState(last.urlBase || '');
  const [method, setMethod] = useState(last.method || 'GET');
  const [params, setParams] = useState(
    last.params ? last.params.map(p => ({ ...p, enabled: p.enabled !== false })) : [{ key: '', value: '', enabled: true }]
  );
  const [headers, setHeaders] = useState(
    last.headers && last.headers.length
      ? mergeDefaultHeaders(last.headers.map(h => ({ ...h, enabled: h.enabled !== false })))
      : DEFAULT_HEADERS
  );
  const [body, setBody] = useState(last.body || '');
  const [activeTab, setActiveTab] = useState(last.activeTab || 'Params');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [configs, setConfigs] = useState(() => JSON.parse(localStorage.getItem(CONFIG_KEY) || '[]'));
  const [configName, setConfigName] = useState('');
  const [tags, setTags] = useState(last.tags || '');
  const [collection, setCollection] = useState(last.collection || '');
  const [prescript, setPrescript] = useState(last.prescript || '');
  // Sección de variables simples
  const [variables, setVariables] = useState(last.variables || [{ key: '', value: '' }]);

  // Guardar en cache cada vez que cambia algo relevante
  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ urlBase, method, params, headers, body, activeTab, tags, collection, prescript }));
  }, [urlBase, method, params, headers, body, activeTab, tags, collection, prescript]);

  // Cargar datos de una petición replicada
  useEffect(() => {
    if (replica) {
      setUrlBase(replica.url?.split('?')[0] || '');
      setMethod(replica.method || 'GET');
      setParams(replica.params && replica.params.length ? replica.params.map(p => ({ ...p, enabled: p.enabled !== false })) : [{ key: '', value: '', enabled: true }]);
      setHeaders(
        mergeDefaultHeaders(
          replica.headers && Object.keys(replica.headers).length
            ? Object.entries(replica.headers).map(([key, value]) => ({ key, value, enabled: true })).map(h => ({ ...h, enabled: h.enabled !== false }))
            : []
        )
      );
      setBody(replica.body || '');
      setActiveTab('Params');
      setTags(replica.tags || '');
      setCollection(replica.collection || '');
      setPrescript(replica.prescript || '');
      setVariables(replica.variables || [{ key: '', value: '' }]);
      setReplica && setReplica(null);
    }
  }, [replica, setReplica]);

  // Guardar configuración
  const handleSaveConfig = () => {
    if (!configName.trim()) return;
    const newConfig = { name: configName.trim(), urlBase, method, params, headers, body, activeTab, tags, collection, prescript, date: new Date() };
    const newConfigs = [newConfig, ...configs];
    setConfigs(newConfigs);
    localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfigs));
    setConfigName('');
  };

  // Cargar configuración
  const handleLoadConfig = (cfg) => {
    setUrlBase(cfg.urlBase);
    setMethod(cfg.method);
    setParams(cfg.params.map(p => ({ ...p, enabled: p.enabled !== false })));
    setHeaders(mergeDefaultHeaders(cfg.headers.map(h => ({ ...h, enabled: h.enabled !== false }))));
    setBody(cfg.body);
    setActiveTab(cfg.activeTab);
    setTags(cfg.tags || '');
    setCollection(cfg.collection || '');
    setPrescript(cfg.prescript || '');
    setVariables(cfg.variables || [{ key: '', value: '' }]);
  };

  // Limpiar formulario
  const handleClear = () => {
    setUrlBase('');
    setMethod('GET');
    setParams([{ key: '', value: '', enabled: true }]);
    setHeaders(DEFAULT_HEADERS);
    setBody('');
    setActiveTab('Params');
    setTags('');
    setCollection('');
    setPrescript('');
    setVariables([{ key: '', value: '' }]);
  };

  // Cambios en params y headers
  const handleParamChange = (idx, field, value) => {
    setParams(ps => ps.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const handleParamEnabled = (idx, enabled) => {
    setParams(ps => ps.map((p, i) => i === idx ? { ...p, enabled } : p));
  };
  const handleAddParam = () => setParams(ps => [...ps, { key: '', value: '', enabled: true }]);
  const handleRemoveParam = idx => setParams(ps => ps.length === 1 ? ps : ps.filter((_, i) => i !== idx));

  const handleHeaderChange = (idx, field, value) => {
    setHeaders(hs => hs.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };
  const handleHeaderEnabled = (idx, enabled) => {
    setHeaders(hs => hs.map((h, i) => i === idx ? { ...h, enabled } : h));
  };
  const handleAddHeader = () => setHeaders(hs => [...hs, { key: '', value: '', enabled: true }]);
  const handleRemoveHeader = idx => setHeaders(hs => hs.length === 1 ? hs : hs.filter((_, i) => i !== idx));

  // Cambios en variables simples
  const handleVariableChange = (idx, field, value) => {
    setVariables(vars => vars.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };
  const handleAddVariable = () => setVariables(vars => [...vars, { key: '', value: '' }]);
  const handleRemoveVariable = idx => setVariables(vars => vars.length === 1 ? vars : vars.filter((_, i) => i !== idx));

  // Reemplazar url por urlBase en el input
  // Generar la URL final con los params en tiempo real
  const paramString = params.filter(p => p.enabled && p.key).map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
  const url = urlBase + (paramString ? (urlBase.includes('?') ? '&' : '?') + paramString : '');

  // Cuando el usuario edita la URL, solo se edita la base (sin query)
  const handleUrlChange = (e) => {
    const value = e.target.value;
    const [base] = value.split('?');
    setUrlBase(base);
  };

  // Reemplazo de variables en string
  function replaceVars(str) {
    if (!str || typeof str !== 'string') return str;
    let out = str;
    variables.forEach(v => {
      if (v.key) out = out.replaceAll(`{{${v.key}}}`, v.value);
    });
    return out;
  }
  // Reemplazo de variables en objeto (headers, params)
  function replaceVarsObj(obj) {
    if (!obj) return obj;
    const out = {};
    Object.entries(obj).forEach(([k, v]) => {
      out[replaceVars(k)] = replaceVars(v);
    });
    return out;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    let responseData = null;
    let status = null;
    let responseTime = null;
    let finalUrl = url; // url ya tiene los params
    let paramsCopy = params.filter(p => p.enabled !== false);
    let headersObj = headers.filter(h => h.enabled !== false && h.key).reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});
    let bodyCopy = body;
    // Ejecutar prescript si existe
    if (prescript.trim()) {
      try {
        // eslint-disable-next-line no-new-func
        const fn = new Function('url', 'method', 'params', 'headers', 'body', prescript + '\nreturn { url, method, params, headers, body };');
        const result = fn(finalUrl, method, paramsCopy, headersObj, bodyCopy);
        finalUrl = result.url;
        paramsCopy = result.params;
        headersObj = result.headers;
        bodyCopy = result.body;
      } catch (err) {
        setError('Error en prescript: ' + err.message);
        setLoading(false);
        return;
      }
    }
    // Reconstruir URL si params cambiaron
    const paramString = paramsCopy.filter(p => p.enabled !== false && p.key).map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
    if (paramString) {
      finalUrl = finalUrl.split('?')[0] + (paramString ? (finalUrl.includes('?') ? '&' : '?') + paramString : '');
    }
    let fetchOptions = { method, headers: headersObj };
    if (["POST", "PUT", "PATCH"].includes(method)) {
      fetchOptions.body = bodyCopy;
    }
    try {
      const start = Date.now();
      const res = await fetch(finalUrl, fetchOptions);
      responseTime = Date.now() - start;
      status = res.status;
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
      params: paramsCopy.filter(p => p.key),
      headers: headersObj,
      body: ["POST", "PUT", "PATCH"].includes(method) ? bodyCopy : undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      collection,
      status,
      responseTime,
      prescript,
      date: new Date(),
      response: responseData,
    };
    await saveRequest(req);
    onNewRequest();
    setUrlBase('');
    setBody('');
    setParams([{ key: '', value: '', enabled: true }]);
    setHeaders(DEFAULT_HEADERS);
    setActiveTab('Params');
    setTags('');
    setCollection('');
    setPrescript('');
    setSuccess(true);
    setLoading(false);
    setTimeout(() => setSuccess(false), 2000);
    // Guardar en cache el estado limpio
    localStorage.setItem(CACHE_KEY, JSON.stringify({ urlBase: '', method: 'GET', params: [{ key: '', value: '', enabled: true }], headers: DEFAULT_HEADERS, body: '', activeTab: 'Params', tags: '', collection: '', prescript: '', variables: [{ key: '', value: '' }] }));
  };

  // Exportar configuraciones
  const handleExportConfigs = () => {
    const data = JSON.stringify(configs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'configs.json';
    a.click();
    window.URL.revokeObjectURL(url);
  };
  // Importar configuraciones
  const handleImportConfigs = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (Array.isArray(imported)) {
          setConfigs(imported.concat(configs));
          localStorage.setItem(CONFIG_KEY, JSON.stringify(imported.concat(configs)));
        }
      } catch {}
    };
    reader.readAsText(file);
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
      {/* Tags y colección */}
      <div className="flex flex-col sm:flex-row gap-2 items-center mb-2">
        <input
          type="text"
          className="bg-gray-900 border border-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Etiquetas (separadas por coma)"
          value={tags}
          onChange={e => setTags(e.target.value)}
        />
        <input
          type="text"
          className="bg-gray-900 border border-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Colección (opcional)"
          value={collection}
          onChange={e => setCollection(e.target.value)}
        />
      </div>
      {/* Guardar config y cargar configs */}
      <div className="flex flex-col gap-2 mb-2">
        <input
          type="text"
          className="bg-gray-900 border border-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Nombre de la configuración"
          value={configName}
          onChange={e => setConfigName(e.target.value)}
        />
        <button type="button" className="w-full px-3 py-2 rounded-md bg-blue-700 text-white text-sm font-medium hover:bg-blue-800" onClick={handleSaveConfig} disabled={!configName.trim()}>Guardar configuración</button>
        {configs.length > 0 && (
          <select className="bg-gray-900 border border-gray-700 text-gray-100 rounded-md px-3 py-2 text-sm w-full" onChange={e => {
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
                <input type="checkbox" checked={p.enabled !== false} onChange={e => handleParamEnabled(idx, e.target.checked)} className="accent-blue-500" />
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
                <input type="checkbox" checked={h.enabled !== false} onChange={e => handleHeaderEnabled(idx, e.target.checked)} className="accent-blue-500" />
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
     {activeTab === 'Prescript' && (
       <div>
         <div className="text-xs text-gray-400 font-semibold mb-1">Prescript (JS antes de enviar)</div>
         <textarea
           className="border border-gray-700 px-2 py-2 rounded-md bg-gray-900 text-gray-100 w-full min-h-[80px] text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
           placeholder={"// Puedes modificar url, method, params, headers, body\n// Ejemplo:\nheaders['Authorization'] = 'Bearer ' + localStorage.getItem('token');\nreturn { url, method, params, headers, body };"}
           value={prescript}
           rows={8}
           onChange={e => setPrescript(e.target.value)}
         />
       </div>
     )}
      {activeTab === 'Variables' && (
        <div className="flex flex-col gap-2 mb-2">
          <div className="flex items-center mb-1">
            <span className="text-xs text-gray-400 font-semibold flex-1">Variables ({"{{variable}}"})</span>
            <button type="button" className="ml-2 px-2 py-0.5 rounded bg-gray-700 text-gray-100 text-xs hover:bg-gray-600" onClick={handleAddVariable}>+ Añadir</button>
          </div>
          <div className="flex flex-col gap-1">
            {variables.map((v, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  className="border border-gray-700 px-2 py-1 rounded-md bg-gray-900 text-gray-100 text-xs flex-1"
                  placeholder="Clave"
                  value={v.key}
                  onChange={e => handleVariableChange(idx, 'key', e.target.value)}
                />
                <input
                  className="border border-gray-700 px-2 py-1 rounded-md bg-gray-900 text-gray-100 text-xs flex-1"
                  placeholder="Valor"
                  value={v.value}
                  onChange={e => handleVariableChange(idx, 'value', e.target.value)}
                />
                <button type="button" className="px-2 py-1 rounded bg-gray-700 text-gray-100 text-xs hover:bg-red-700" onClick={() => handleRemoveVariable(idx)} disabled={variables.length === 1}>🗑</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" className="px-2 py-1 rounded bg-gray-700 text-gray-100 text-xs hover:bg-gray-600" onClick={handleExportConfigs}>Exportar configs</button>
            <label className="px-2 py-1 rounded bg-gray-700 text-gray-100 text-xs hover:bg-gray-600 cursor-pointer">
              Importar configs
              <input type="file" accept="application/json" className="hidden" onChange={handleImportConfigs} />
            </label>
          </div>
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
