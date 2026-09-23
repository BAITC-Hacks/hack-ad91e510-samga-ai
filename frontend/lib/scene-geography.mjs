import { geography } from './astana-geography.mjs';

// World units are 100 metres. Undo the old oblique SVG projection before rendering in 3D.
export const worldPoint = ({lon,lat}) => [(lon-71.43)*700,(51.15-lat)*1113.2];
export function svgToWorld([x,y]) {
  const delta=(y-430)/1500;
  return worldPoint({lon:71.5+(x-550-400*delta)/1318.8,lat:51.16-delta});
}
export function pathRings(path) {
  const tokens=path.match(/[MLZ]|-?\d+(?:\.\d+)?/g)??[];
  const rings=[];let ring=[];
  const flush=()=>{if(ring.length>1){if(ring.length>2&&Math.hypot(ring[0][0]-ring.at(-1)[0],ring[0][1]-ring.at(-1)[1])<.001)ring.pop();rings.push(ring);}ring=[];};
  for(let i=0;i<tokens.length;){
    const token=tokens[i++];
    if(token==='M'){flush();ring.push([Number(tokens[i++]),Number(tokens[i++])]);}
    else if(token==='L')ring.push([Number(tokens[i++]),Number(tokens[i++])]);
    else if(token==='Z')flush();
  }
  flush();return rings;
}
export function insideRing([x,y],ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];
    if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
export const sceneDistricts=geography.districts.map(d=>({...d,rings:pathRings(d.path).map(r=>r.map(svgToWorld)),point:worldPoint(d.coordinates)}));
export const districtAt = point => sceneDistricts.findIndex(d=>d.rings.some(r=>insideRing(point,r)));
export function polygonArea(points) {
  return Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0))/2;
}
export function buildingHeight(tags) {
  const number = value => /^\d+(\.\d+)?(?:\s*m)?$/.test(String(value??'')) ? Number.parseFloat(value) : null;
  const height=number(tags.height),levels=number(tags['building:levels']);
  if(height>0&&height<=500)return {height,source:'height',levels:levels>0&&levels<=150?levels:null};
  if(levels>0&&levels<=150)return {height:levels*3,source:'levels',levels};
  return {height:9,source:'illustrative',levels:null};
}
