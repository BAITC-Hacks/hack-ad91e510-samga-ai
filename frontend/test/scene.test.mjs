import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { worldPoint,svgToWorld,pathRings,insideRing,buildingHeight,districtAt } from '../lib/scene-geography.mjs';
import { buildingForFace } from '../lib/scene-meshes.mjs';
const data=JSON.parse(readFileSync(new URL('../data/astana-buildings.json',import.meta.url)));
test('3D coordinates undo the SVG skew and preserve closed and open paths',()=>{
  const actual=svgToWorld([550,430]),expected=worldPoint({lon:71.5,lat:51.16});
  actual.forEach((v,i)=>assert.ok(Math.abs(v-expected[i])<1e-8));
  assert.deepEqual(pathRings('M0,0L10,0L10,10L0,0ZM20,20L25,25'),[[[0,0],[10,0],[10,10]],[[20,20],[25,25]]]);
  assert.equal(insideRing([2,2],[[0,0],[5,0],[5,5],[0,5]]),true);
});
test('unknown building heights are explicitly illustrative, not measured facts',()=>{
  assert.deepEqual(buildingHeight({height:'18 m','building:levels':'5'}),{height:18,levels:5,source:'height'});
  assert.deepEqual(buildingHeight({'building:levels':'4'}),{height:12,levels:4,source:'levels'});
  assert.deepEqual(buildingHeight({height:'unknown'}),{height:9,levels:null,source:'illustrative'});
});
test('bundled building footprints have district ownership and explain their heights',()=>{
  assert.equal(data.coverage.length,5);assert.ok(data.coverage.every(d=>d.count>0));
  assert.equal(data.coverage.reduce((n,d)=>n+d.count,0),data.buildings.length);
  assert.equal(data.license,'ODbL-1.0');
  for(const building of data.buildings){
    assert.ok(building.p.length>=3&&building.p.flat().every(Number.isFinite));
    assert.ok(['height','levels','illustrative'].includes(building.hs));
    const center=building.p.reduce((sum,p)=>sum.map((v,i)=>v+p[i]/building.p.length),[0,0]);
    assert.equal(districtAt(center),building.d);
  }
});
test('picking a merged mesh maps the exact triangle back to its building',()=>{
  const a={id:1},b={id:2},ranges=[{firstFace:0,lastFace:12,building:a},{firstFace:12,lastFace:30,building:b}];
  assert.equal(buildingForFace(ranges,11),a);assert.equal(buildingForFace(ranges,12),b);assert.equal(buildingForFace(ranges,30),null);
});
