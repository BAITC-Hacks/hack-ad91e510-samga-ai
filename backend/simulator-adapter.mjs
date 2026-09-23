import {calculateScenario} from '../analytics/scenarios.mjs';
export function runSimulation(choices){
 try{return calculateScenario(choices);}catch(error){return {errors:[error.message]};}
}
