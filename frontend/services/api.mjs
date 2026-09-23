async function request(path, body) {
  let response;
  try {
    response = await fetch(`/api${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Samga-Request': '1' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(35000) });
  } catch { throw new Error('Не удалось связаться с сервером. Проверьте соединение и попробуйте снова.'); }
  let data;
  try { data = await response.json(); } catch { throw new Error('Сервер вернул ответ в неизвестном формате.'); }
  if (!response.ok) throw new Error(data.error || 'Не удалось выполнить запрос. Попробуйте снова.');
  return data;
}
export const cityService = {
  async bootstrap() {
    const [session, catalog] = await Promise.all([request('/me'), fetch('/catalog.json').then(r => { if (!r.ok) throw new Error('Каталог недоступен.'); return r.json(); })]);
    if (!Number.isFinite(session.baseline?.score) || session.baseline?.districts?.length !== 5) throw new Error('Сервер не передал исходные показатели города.');
    if (!session.user && !session.demo) await request('/auth/guest', {});
    return { ...session, ...catalog };
  },
  evaluate: choices => request('/evaluate', { choices }),
  analyze: choices => request('/analyze', { choices })
};
