import * as THREE from './vendor/build/three.module.js';
import { GLTFLoader } from './vendor/examples/jsm/loaders/GLTFLoader.js';

const MODEL_URL = new URL('./assets/avatarsdk.glb', import.meta.url);
const STYLE_URL = new URL('./head.css', import.meta.url);
const STATES = new Set(['idle', 'thinking', 'speaking', 'listening']);
const BUILD_DELAY = 1000;
const BUILD_DURATION = 7000;
const KEEP_MESHES = new Set(['AvatarHead', 'AvatarLeftEyeball', 'AvatarRightEyeball']);
const STATE_FILTER = {
  idle: 'none',
  thinking: 'hue-rotate(-160deg) saturate(1.3)',
  speaking: 'hue-rotate(20deg) saturate(1.2) brightness(1.1)',
  listening: 'hue-rotate(-100deg) saturate(1.3)',
};

function ensureStyle() {
  if (document.querySelector('link[data-assistant-head-style]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_URL.href;
  link.dataset.assistantHeadStyle = '';
  document.head.append(link);
}

function disposeMaterial(material, textures, materials) {
  if (!material || materials.has(material)) return;
  materials.add(material);
  for (const value of Object.values(material)) {
    if (value?.isTexture) textures.add(value);
  }
  material.dispose();
}

function releaseModel(root, extraGeometries = []) {
  if (!root) return;
  const geometries = new Set(extraGeometries);
  const materials = new Set();
  const textures = new Set();
  root.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => disposeMaterial(material, textures, materials));
    } else {
      disposeMaterial(object.material, textures, materials);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  textures.forEach((texture) => {
    const bitmap = texture.source?.data;
    texture.dispose();
    if (bitmap && typeof bitmap.close === 'function') bitmap.close();
  });
}

/**
 * Mount the locally bundled SARDAR head. Mount only while its host panel is open.
 * @param {HTMLElement} container
 * @returns {{setState:(state:'idle'|'thinking'|'speaking'|'listening')=>void,replay:()=>void,dispose:()=>void}}
 */
export function mountHead(container) {
  if (!(container instanceof HTMLElement)) {
    throw new TypeError('mountHead(container): требуется HTML-элемент');
  }
  ensureStyle();

  const root = document.createElement('div');
  root.className = 'assistant-head';
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', 'Трёхмерная голограмма ассистента');
  const canvas = document.createElement('canvas');
  canvas.className = 'assistant-head__canvas';
  const grid = document.createElement('div');
  grid.className = 'assistant-head__grid';
  const laser = document.createElement('div');
  laser.className = 'assistant-head__laser';
  const floor = document.createElement('div');
  floor.className = 'assistant-head__floor';
  const status = document.createElement('div');
  status.className = 'assistant-head__status';
  status.textContent = 'Загрузка 3D-модели…';
  root.append(canvas, grid, laser, floor, status);
  container.append(root);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (error) {
    status.textContent = 'WebGL недоступен';
    console.error('[assistant-avatar] WebGL:', error);
    return {
      setState() {}, replay() {}, dispose() { root.remove(); },
    };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
  camera.position.set(0, 0.05, 4.4);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0x92c1d2, 0.55));
  const lights = [
    [0x00d4ff, 1.8, [2.5, 1.5, 2]],
    [0x0066ff, 1.0, [-2.5, 0.5, 1.5]],
    [0x00ffaa, 0.55, [0, -1, -2.5]],
  ];
  lights.forEach(([color, intensity, position]) => {
    const light = new THREE.PointLight(color, intensity);
    light.position.set(...position);
    scene.add(light);
  });

  let disposed = false;
  let visible = true;
  let model = null;
  let pivot = null;
  let headBone = null;
  let face = null;
  let faceExtras = [];
  let animationFrame = 0;
  let buildStarted = 0;
  let state = 'idle';
  let lastFrame = 0;
  let sceneHeight = 2.1;
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let shaderUniforms = [];
  const startedAt = performance.now();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function resize() {
    if (disposed) return;
    const width = Math.max(1, root.clientWidth);
    const height = Math.max(1, root.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function replay() {
    if (disposed) return;
    buildStarted = performance.now();
    root.classList.remove('assistant-head--built');
    floor.style.animation = 'none';
    floor.offsetWidth;
    floor.style.animation = '';
    root.style.setProperty('--laser-active', '0');
    plane.constant = reducedMotion.matches ? sceneHeight / 2 + 0.2 : -(sceneHeight / 2 + 0.2);
  }

  function setState(next) {
    if (disposed) return;
    if (!STATES.has(next)) throw new TypeError(`mountHead.setState: неизвестное состояние ${next}`);
    state = next;
    canvas.style.filter = STATE_FILTER[next];
    root.dataset.state = next;
  }

  function tick(now) {
    animationFrame = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = Math.min((now - lastFrame) / 1000 || 0, 0.1);
    lastFrame = now;
    const time = (now - startedAt) / 1000;
    shaderUniforms.forEach((uniform) => { uniform.value = time; });

    if (model && pivot) {
      const elapsed = now - buildStarted;
      const top = sceneHeight / 2 + 0.2;
      const bottom = -top;
      if (reducedMotion.matches) {
        plane.constant = -bottom;
        root.style.setProperty('--laser-active', '0');
      } else if (elapsed < BUILD_DELAY) {
        plane.constant = -top;
        root.style.setProperty('--laser-active', '0');
      } else if (elapsed < BUILD_DELAY + BUILD_DURATION) {
        const progress = (elapsed - BUILD_DELAY) / BUILD_DURATION;
        const eased = 1 - (1 - progress) ** 3;
        const y = top + (bottom - top) * eased;
        plane.constant = -y;
        const projected = new THREE.Vector3(0, y, 0).project(camera);
        root.style.setProperty('--laser-top', `${(1 - (projected.y + 1) / 2) * 100}%`);
        root.style.setProperty('--laser-active', '1');
      } else {
        plane.constant = -bottom;
        root.style.setProperty('--laser-active', '0');
        root.classList.add('assistant-head--built');
      }

      const sway = Math.sin(time * 0.42) * 0.055;
      pivot.rotation.y += (sway - pivot.rotation.y) * Math.min(1, dt * 2.5);
      pivot.rotation.z = Math.sin(time * 0.35) * 0.012;
      if (headBone) headBone.rotation.x = Math.sin(time * 0.55) * 0.014;
      if (face?.morphTargetDictionary?.jawOpen !== undefined) {
        const jawIndex = face.morphTargetDictionary.jawOpen;
        const target = state === 'speaking' ? 0.28 + (Math.sin(time * 17) + 1) * 0.22 : 0;
        face.morphTargetInfluences[jawIndex] += (target - face.morphTargetInfluences[jawIndex]) * 0.2;
      }
    }
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(tick);
  }

  function resume() {
    if (disposed || !visible || document.hidden || animationFrame) return;
    resize();
    lastFrame = performance.now();
    animationFrame = requestAnimationFrame(tick);
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(root);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) resume();
    else if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  });
  intersectionObserver.observe(root);
  const onVisibility = () => {
    if (document.hidden && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    } else resume();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const loader = new GLTFLoader();
  loader.load(MODEL_URL.href, (gltf) => {
    if (disposed) {
      releaseModel(gltf.scene);
      return;
    }
    model = gltf.scene;
    const originals = new Set();
    model.traverse((object) => {
      if (!object.isMesh) return;
      if (Array.isArray(object.material)) object.material.forEach((material) => originals.add(material));
      else originals.add(object.material);
      object.visible = KEEP_MESHES.has(object.name);
      if (!object.visible) return;
      const material = new THREE.MeshStandardMaterial({
        color: 0x02141c,
        emissive: 0x003b50,
        emissiveIntensity: 0.38,
        metalness: 0.26,
        roughness: 0.34,
        transparent: true,
        opacity: 0.92,
        depthWrite: true,
        side: THREE.FrontSide,
        clippingPlanes: [plane],
      });
      material.onBeforeCompile = (shader) => {
        const holoTime = { value: 0 };
        shaderUniforms.push(holoTime);
        shader.uniforms.uHoloTime = holoTime;
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying float vHoloY;\nvarying vec3 vHoloNormal;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHoloY = position.y;\nvHoloNormal = normalize(normalMatrix * normal);');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uHoloTime;\nvarying float vHoloY;\nvarying vec3 vHoloNormal;')
          .replace('#include <dithering_fragment>', `#include <dithering_fragment>
            float scan = 0.97 + 0.03 * sin(vHoloY * 200.0);
            float rim = pow(1.0 - abs(dot(normalize(vHoloNormal), normalize(vViewPosition))), 1.8);
            vec3 cyan = vec3(0.0, 0.92, 1.0);
            vec3 indigo = vec3(0.35, 0.55, 1.0);
            vec3 holo = mix(cyan, indigo, sin(uHoloTime * 0.4 + vHoloY * 1.5) * 0.5 + 0.5);
            gl_FragColor.rgb = gl_FragColor.rgb * scan + holo * rim * 1.4;
            gl_FragColor.a = clamp(gl_FragColor.a + rim * 0.45, 0.05, 1.0);`);
      };
      material.customProgramCacheKey = () => 'akim-hologram-v1';
      object.material = material;
      if (object.name === 'AvatarHead') {
        face = object;
        const edgeGeometry = new THREE.EdgesGeometry(object.geometry, 90);
        const edges = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({ color: 0xa8f6ff, transparent: true, opacity: 0.22, clippingPlanes: [plane] }));
        object.add(edges);
        faceExtras.push(edgeGeometry);
      }
    });
    const oldMaterials = new Set();
    const oldTextures = new Set();
    originals.forEach((material) => disposeMaterial(material, oldTextures, oldMaterials));
    oldTextures.forEach((texture) => texture.dispose());

    if (!face) {
      status.textContent = 'В модели не найдена голова AvatarHead';
      return;
    }
    headBone = model.getObjectByName('Head');
    const box = new THREE.Box3().setFromObject(face);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = Math.min(50, Math.max(0.2, 2.1 / (size.y || 1)));
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    pivot = new THREE.Group();
    pivot.add(model);
    scene.add(pivot);
    sceneHeight = 2.1;
    replay();
    status.remove();
    resume();
  }, undefined, (error) => {
    if (disposed) return;
    status.textContent = 'Не удалось загрузить 3D-модель';
    console.error('[assistant-avatar] GLB:', error);
  });

  resume();
  return {
    setState,
    replay,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      releaseModel(model, faceExtras);
      renderer.dispose();
      renderer.forceContextLoss();
      root.remove();
      model = null;
      pivot = null;
      face = null;
      shaderUniforms = [];
      faceExtras = [];
    },
  };
}
