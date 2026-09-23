import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSse, streamOpenAI, ProviderError } from '../providers.mjs';

test('SSE parser preserves UTF-8 split across chunks and event boundaries', async () => {
  const bytes = new TextEncoder().encode('event: response.output_text.delta\ndata: {"type":"response.output_text.delta","delta":"Нура"}\n\n');
  const chunks = [bytes.slice(0, 69), bytes.slice(69, 78), bytes.slice(78)];
  const stream = new ReadableStream({ start(controller) { chunks.forEach(x => controller.enqueue(x)); controller.close(); } });
  const events = [];
  for await (const event of parseSse(stream)) events.push(event);
  assert.equal(events.length, 1);
  assert.equal(JSON.parse(events[0].data).delta, 'Нура');
});

test('SSE parser handles CRLF frames split across chunks', async () => {
  const bytes = new TextEncoder().encode('event: response.output_text.delta\r\ndata: {"type":"response.output_text.delta","delta":"Да"}\r\n\r\n');
  const stream = new ReadableStream({ start(controller) { controller.enqueue(bytes.slice(0, 82)); controller.enqueue(bytes.slice(82)); controller.close(); } });
  const events = [];
  for await (const event of parseSse(stream)) events.push(event);
  assert.equal(events.length, 1);
  assert.equal(JSON.parse(events[0].data).delta, 'Да');
});

test('provider maps failed auth to a safe public error', async () => {
  const fetchImpl = async () => new Response('{"error":{"message":"secret upstream details"}}', { status: 401 });
  await assert.rejects(async () => { for await (const _ of streamOpenAI({ apiKey: 'secret', model: 'gpt-4.1-mini', input: 'x', fetchImpl })) {} }, error => error instanceof ProviderError && error.status === 503 && !error.message.includes('secret'));
});
