function defaultContext() {
    try {
        if (globalThis.SillyTavern?.getContext) return globalThis.SillyTavern.getContext();
        if (globalThis.SillyTavern?.context) return globalThis.SillyTavern.context;
        if (globalThis.getContext) return globalThis.getContext();
    } catch {}
    return null;
}

export async function sillyTavernRequestHeaders({ getContext = defaultContext, contentType = 'application/json' } = {}) {
    const withContentType = headers => ({ ...(headers || {}), ...(contentType ? { 'Content-Type': contentType } : {}) });

    try {
        const context = typeof getContext === 'function' ? getContext() : null;
        const direct = context?.getRequestHeaders ?? globalThis.getRequestHeaders;
        if (typeof direct === 'function') return withContentType(direct());
    } catch {}

    try {
        const module = await import('/script.js');
        if (typeof module.getRequestHeaders === 'function') return withContentType(module.getRequestHeaders());
    } catch {}

    const token = globalThis.document?.querySelector?.('meta[name="csrf-token"], meta[name="x-csrf-token"]')?.content;
    return withContentType(token ? { 'x-csrf-token': token } : {});
}

function readableResponseText(text) {
    const value = String(text || '').trim();
    if (!value || /^\s*<!doctype|^\s*<html/i.test(value)) return '';
    return value.slice(0, 1200);
}

function responseError(response, body, rawText, label) {
    const status = Number(response?.status || 0);
    const accountDenied = body?.error === 'only-vvv';
    const fallback = accountDenied
        ? '当前酒馆账号没有启用 VVV 服务端功能'
        : status === 403
            ? '酒馆拒绝请求（HTTP 403）：当前页面缺少有效 CSRF 请求头，请关闭旧酒馆页签后重新打开'
            : `${label || '服务端请求'}失败（HTTP ${status || '未知'}）`;
    const message = accountDenied
        ? fallback
        : body?.error || body?.message || body?.raw || readableResponseText(rawText) || fallback;
    const error = new Error(String(message));
    error.name = String(body?.errorName || 'ServerRequestError');
    error.code = String(body?.errorCode || (status === 403 ? 'http-403' : `http-${status || 0}`));
    error.status = status;
    error.httpStatus = status;
    error.body = body;
    error.policyRefusal = body?.policyRefusal === true;
    return error;
}

export async function serverJsonRequest(baseUrl, path, options = {}, {
    getContext = defaultContext,
    label = '服务端请求',
} = {}) {
    const headers = await sillyTavernRequestHeaders({ getContext });
    const response = await fetch(`${baseUrl}${path}`, {
        cache: 'no-store',
        ...options,
        credentials: options.credentials || 'same-origin',
        headers: { ...headers, ...(options.headers || {}) },
    });
    const text = await response.text();
    let body;
    try { body = text ? JSON.parse(text) : {}; }
    catch { body = { raw: readableResponseText(text) }; }
    if (!response.ok || body?.ok === false) throw responseError(response, body, text, label);
    return body;
}

export function createServerJsonClient(baseUrl, options = {}) {
    return (path, requestOptions = {}) => serverJsonRequest(baseUrl, path, requestOptions, options);
}
