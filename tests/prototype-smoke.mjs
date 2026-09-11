import { readFileSync } from 'node:fs';

const html = readFileSync('prototype/index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
if (!scriptMatch) throw new Error('Prototype script block not found.');

// Compile the application script without executing the final DOM render call.
const script = scriptMatch[1].replace(/\nrender\(\);\s*$/, '');
new Function(script);

const requiredContracts = [
  ['local persistence', 'localStorage'],
  ['pending count state', "current:null"],
  ['movement guard', 'if(after<0)'],
  ['first-count guard', 'Faça a primeira contagem antes de movimentar'],
  ['replenishment calculation', 'ideal-m.current'],
  ['movement history', 'state.movements.push'],
  ['count finalization', 'finishCount']
];

for (const [name, token] of requiredContracts) {
  if (!html.includes(token)) throw new Error(`Missing contract: ${name} (${token})`);
}

console.log('ALMOX LAB prototype smoke test: PASS');
