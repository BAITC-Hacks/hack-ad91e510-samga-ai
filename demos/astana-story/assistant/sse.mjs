/** Read UTF-8 SSE frames without assuming chunk or line boundaries. */
export async function parseSseStream(stream, onFrame) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let event = 'message';
  let data = [];
  const emit = () => {
    if (data.length) onFrame({ event, data: data.join('\n') });
    event = 'message';
    data = [];
  };
  const line = value => {
    if (value === '') { emit(); return; }
    if (value.startsWith(':')) return;
    const colon = value.indexOf(':');
    const key = colon < 0 ? value : value.slice(0, colon);
    let field = colon < 0 ? '' : value.slice(colon + 1);
    if (field.startsWith(' ')) field = field.slice(1);
    if (key === 'event') event = field;
    if (key === 'data') data.push(field);
  };
  const consume = final => {
    let at;
    while ((at = buffer.indexOf('\n')) >= 0) {
      let current = buffer.slice(0, at);
      buffer = buffer.slice(at + 1);
      if (current.endsWith('\r')) current = current.slice(0, -1);
      line(current);
    }
    if (final) {
      if (buffer) line(buffer.replace(/\r$/, ''));
      emit();
    }
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      consume(false);
    }
    buffer += decoder.decode();
    consume(true);
  } finally {
    reader.releaseLock();
  }
}
