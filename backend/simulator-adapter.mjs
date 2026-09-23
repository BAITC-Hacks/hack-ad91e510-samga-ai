import {randomUUID} from 'node:crypto';
import {evaluate,simulate} from '../docs/brief-analysis/dist/model.mjs';
// Copy Karim's engine output. Do not reimplement its formula.
function snapshot(result) {
  const {cost,score,average,minimum,critical,synergies}=result;
  return {cost,score,average,minimum,critical,synergies,
    districts:result.districts.map(({name,pop,values,score,critical})=>({name,pop,values,score,critical}))};
}
export function runSimulation(choices) {
  const result=evaluate(choices);
  if (result.errors.length) return {errors:result.errors};
  return {contractVersion:'1',scenarioId:randomUUID(),choices,
    baseline:snapshot(simulate([])),result:snapshot(result)};
}
