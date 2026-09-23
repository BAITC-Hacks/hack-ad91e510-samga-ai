import {parentPort,workerData} from 'node:worker_threads';
import {optimizePlans} from './optimizer.mjs';
try{parentPort.postMessage({result:optimizePlans(workerData)});}
catch(error){parentPort.postMessage({error:error.message});}
