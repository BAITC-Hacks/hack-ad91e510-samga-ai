import * as THREE from '../vendor/three/three.module.min.js';
import { geography } from './astana-geography.mjs';
import { sceneDistricts,pathRings,svgToWorld,districtAt } from './scene-geography.mjs';
import { scenePalette as palette } from './scene-palette.mjs';

export const BUILDING_HEIGHT_SCALE=.025;
function shapeFor(ring) {
  const shape=new THREE.Shape();
  ring.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));
  shape.closePath();return shape;
}
function linesFromPaths(paths,color,height,opacity=.7) {
  const points=[];
  for(const path of paths)for(const ring of pathRings(path)){
    const world=ring.map(svgToWorld);
    for(let i=1;i<world.length;i++){
      const a=world[i-1],b=world[i];
      if(districtAt([(a[0]+b[0])/2,(a[1]+b[1])/2])<0)continue;
      points.push(a[0],height,a[1],b[0],height,b[1]);
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  return new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity,depthWrite:false}));
}
function flatAreas(paths,color,height) {
  const vertices=[];
  for(const path of paths)for(const ring of pathRings(path)){
    if(ring.length<3)continue;
    const world=ring.map(svgToWorld);
    if(districtAt(world[0])<0)continue;
    for(const tri of THREE.ShapeUtils.triangulateShape(world.map(([x,z])=>new THREE.Vector2(x,-z)),[]))for(const i of tri)vertices.push(world[i][0],height,world[i][1]);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();
  return new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));
}
export function createCityTerrain(scene) {
  const regions=sceneDistricts.map((d,index)=>{
    const geometry=new THREE.ExtrudeGeometry(d.rings.filter(r=>r.length>2).map(shapeFor),{depth:5,bevelEnabled:false,curveSegments:1,steps:1});
    geometry.rotateX(-Math.PI/2);geometry.translate(0,-5,0);
    const top=new THREE.MeshStandardMaterial({color:palette.terrain,roughness:.8,metalness:.18});
    const wall=new THREE.MeshStandardMaterial({color:palette.wall,roughness:.7,metalness:.2});
    const mesh=new THREE.Mesh(geometry,[top,wall]);mesh.userData={kind:'district',district:d.name,index};scene.add(mesh);
    const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,25),new THREE.LineBasicMaterial({color:palette.edge,transparent:true,opacity:.65}));scene.add(edge);
    const pin=new THREE.Mesh(new THREE.CylinderGeometry(.7,.7,5,12),new THREE.MeshBasicMaterial({color:palette.halo}));
    pin.position.set(d.point[0],2.8,d.point[1]);pin.userData={kind:'district',district:d.name,index};scene.add(pin);
    const halo=new THREE.Mesh(new THREE.RingGeometry(2.6,3.1,40),new THREE.MeshBasicMaterial({color:palette.halo,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));
    halo.rotation.x=-Math.PI/2;halo.position.set(d.point[0],.28,d.point[1]);scene.add(halo);
    return {...d,mesh,edge,pin,halo,top,wall};
  });
  const roads=linesFromPaths(geography.roads.map(r=>r.path),palette.roads,.18,.48);scene.add(roads);
  scene.add(linesFromPaths(geography.water.filter(w=>w.kind!=='area').map(w=>w.path),palette.river,.24,.9));
  scene.add(flatAreas(geography.water.filter(w=>w.kind==='area').map(w=>w.path),palette.water,.19));
  scene.add(flatAreas(geography.parks,palette.parks,.09));
  const grid=new THREE.GridHelper(1600,80,palette.gridMajor,palette.gridMinor);grid.position.y=-5.5;grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
  for(const radius of [280,292]){
    const ring=new THREE.Mesh(new THREE.RingGeometry(radius,radius+.18,160),new THREE.MeshBasicMaterial({color:palette.orbit,transparent:true,opacity:.3,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-5.4;scene.add(ring);
  }
  return regions;
}
export function createBuildingMeshes(scene,data) {
  return sceneDistricts.map((district,districtIndex)=>{
    const positions=[],colors=[],ranges=[];
    const roof=new THREE.Color(palette.roof),wall=new THREE.Color(palette.buildingWall);
    const vertex=(x,y,z,color)=>{positions.push(x,y,z);colors.push(color.r,color.g,color.b);};
    for(const building of data.buildings.filter(b=>b.d===districtIndex)){
      const p=building.p,base=.22,top=base+Math.min(12.5,building.h*BUILDING_HEIGHT_SCALE);
      const firstFace=positions.length/9;
      const triangles=THREE.ShapeUtils.triangulateShape(p.map(([x,z])=>new THREE.Vector2(x,-z)),[]);
      for(const tri of triangles)for(const i of tri)vertex(p[i][0],top,p[i][1],roof);
      for(let i=0;i<p.length;i++){
        const a=p[i],b=p[(i+1)%p.length];
        for(const point of [[a[0],base,a[1]],[b[0],base,b[1]],[b[0],top,b[1]],[a[0],base,a[1]],[b[0],top,b[1]],[a[0],top,a[1]]])vertex(...point,wall);
      }
      ranges.push({firstFace,lastFace:positions.length/9,building});
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.75,metalness:.12,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geometry,material);mesh.userData={kind:'buildings',district:district.name,index:districtIndex,ranges};scene.add(mesh);return mesh;
  });
}
export function buildingForFace(ranges,index) {
  let low=0,high=ranges.length-1;
  while(low<=high){const mid=(low+high)>>1,range=ranges[mid];if(index<range.firstFace)high=mid-1;else if(index>=range.lastFace)low=mid+1;else return range.building;}
  return null;
}
export function buildingOutline(building) {
  const geometry=new THREE.ExtrudeGeometry(shapeFor(building.p),{depth:building.h*BUILDING_HEIGHT_SCALE,bevelEnabled:false,steps:1});geometry.rotateX(-Math.PI/2);geometry.translate(0,.24,0);
  const edges=new THREE.EdgesGeometry(geometry);geometry.dispose();
  return new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:palette.pickedBuilding,depthTest:false}));
}
