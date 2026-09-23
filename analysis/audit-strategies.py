import json,itertools,time
from pathlib import Path
import numpy as np
folder=Path(__file__).resolve().parent
data=json.loads((folder/'model-input.json').read_text(encoding='utf-8'))
base=np.array(data['base'],dtype=float); weights=np.array(data['weights']); pop=np.array(data['pop'])
ms=data['measures']; lookup={m['id']:i for i,m in enumerate(ms)}
variants=[]
for m in ms:
 arr=np.zeros((1 if m['city'] else 5,5,10))
 for target in range(len(arr)):
  for d in (range(5) if m['city'] else [target]):
   for k,v in m['effects'].items(): arr[target,d,int(k)]=v*(8-m['lag'])/8
 variants.append(arr)
best={}; valid_count=0; combos=0
def retain(key,objective,scores,ds,crit,cost,ids,targets,mask=None):
 eligible=np.arange(len(scores)) if mask is None else np.flatnonzero(mask)
 if not len(eligible): return
 if objective=='score': j=eligible[np.lexsort((ds[eligible].min(axis=1),scores[eligible]))[-1]]; rank=(float(scores[j]),-cost)
 elif objective=='cheap': j=eligible[np.argmax(scores[eligible])]; rank=(-cost,float(scores[j]))
 elif objective=='air': j=eligible[np.lexsort((scores[eligible],air[eligible]))[-1]]; rank=(float(air[j]),float(scores[j]),-cost)
 elif objective=='floor': j=eligible[np.lexsort((scores[eligible],ds[eligible].min(axis=1)))[-1]]; rank=(float(ds[j].min()),float(scores[j]),-cost)
 if key not in best or rank>tuple(best[key]['rank']):
  best[key]={'rank':rank,'cost':cost,'score':float(scores[j]),'districts':ds[j].tolist(),'critical':int(crit[j]),'air':float(air[j]),'selections':[{'id':ms[m]['id'],'d':None if ms[m]['city'] else int(targets[j,c])} for c,m in enumerate(ids)]}
started=time.time()
for ids in itertools.combinations(range(14),5):
 cats=[ms[i]['cat'] for i in ids]; cost=sum(ms[i]['cost'] for i in ids)
 if cost>100 or max(cats.count(c) for c in set(cats))>2 or (0 in ids and 2 in ids): continue
 combos+=1
 targets=np.array(list(itertools.product(*[range(len(variants[i])) for i in ids])),dtype=np.int8)
 valid=np.ones(len(targets),dtype=bool)
 for a,b in [(3,6),(4,12)]:
  if a in ids and b in ids: valid &= targets[:,ids.index(a)]!=targets[:,ids.index(b)]
 targets=targets[valid]
 if not len(targets):continue
 rows=np.broadcast_to(base,(len(targets),5,10)).copy()
 for c,m in enumerate(ids): rows+=variants[m][targets[:,c]]
 for a,b,k in [(0,1,0),(9,11,6),(4,5,3)]:
  if a in ids and b in ids: rows[np.arange(len(targets)),targets[:,ids.index(a)],k]+=2
 rows=np.clip(rows,0,100);ds=rows@weights
 crit=(rows<40).sum(axis=(1,2)); scores=.7*(ds@pop)+.3*ds.min(axis=1)-crit
 air=rows[:,:,3]@pop;valid_count+=len(targets)
 retain('quality','score',scores,ds,crit,cost,ids,targets)
 retain('affordable','cheap',scores,ds,crit,cost,ids,targets,crit==0)
 retain('air','air',scores,ds,crit,cost,ids,targets,crit==0)
 retain('weakest','floor',scores,ds,crit,cost,ids,targets,crit==0)
 if len(set(cats))==5: retain('all_five_directions','score',scores,ds,crit,cost,ids,targets)
 if 6 in ids:
  mask=(targets[:,ids.index(6)]==4)&(crit==0)
  retain('lock_school_nura','score',scores,ds,crit,cost,ids,targets,mask)
  retain('lock_school_affordable','cheap',scores,ds,crit,cost,ids,targets,mask)
 if 4 in ids:retain('lock_fuel_saryarka','score',scores,ds,crit,cost,ids,targets,targets[:,ids.index(4)]==2)
result={'candidate_count':valid_count,'measure_sets':combos,'seconds':time.time()-started,'rules':'DOCX: exactly five, <=2/category, budget<=100, no repeats, all conflicts','strategies':best}
(folder/'strategy-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
