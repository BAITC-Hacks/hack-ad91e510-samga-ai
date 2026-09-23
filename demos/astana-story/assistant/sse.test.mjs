import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSseStream } from './sse.mjs';

test('SSE parses split UTF-8, CRLF frames, multiple data lines and trailing frame', async () => {
  const bytes = new TextEncoder().encode('event: delta\r\ndata: {"text":"Нура"}\r\n\r\ndata: one\ndata: two\n\ndata: tail');
  const pieces = [bytes.slice(0, 25), bytes.slice(25, 28), bytes.slice(28, 42), bytes.slice(42)];
  const stream = new ReadableStream({ start(controller) { for (const piece of pieces) controller.enqueue(piece); controller.close(); } });
  const frames = [];
  await parseSseStream(stream, frame => frames.push(frame));
  assert.deepEqual(frames, [
    { event: 'delta', data: '{"text":"Нура"}' },
    { event: 'message', data: 'one\ntwo' },
    { event: 'message', data: 'tail' },
  ]);
});
