import { AnimationMixer, WebGLRenderer, AmbientLight, Scene, PerspectiveCamera, Clock, DirectionalLight, sRGBEncoding, GridHelper, AxesHelper } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import Stats from "three/examples/jsm/libs/stats.module";

let scene, camera, clock, renderer, mixer, controls, loader, stats, debug;

const setupScene = (_debug) => {
  debug = _debug ?? false;
  scene = new Scene();
  clock = new Clock();

  renderer = new WebGLRenderer({ alpha: true, antialias: true });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.physicallyCorrectLights = true;
  renderer.outputEncoding = sRGBEncoding;
  renderer.setClearColor(0xcccccc);

  document.body.appendChild(renderer.domElement);

  if (debug) {
    const s = Stats();
    document.body.appendChild(s.dom);
    stats = s.dom;

    window.Print.postMessage("Scene Created with stats... 10%");
  }
};

const createPerspectiveCamera = (fov, aspectRatio, near, far) => {
  camera = new PerspectiveCamera(fov, aspectRatio != null ? aspectRatio : window.innerWidth / window.innerHeight, near, far);
  window.camera = camera;
  animate();
};

const setOrbitControls = (polMin, polMax, azMin, azMax, minDistance, maxDistance, enablePan, autoRotateSpeed, autoRotate, enableZoom, c) => {
  controls = new OrbitControls(c ?? camera, renderer.domElement);
  controls.target.set(0, 0, 0);

  controls.minPolarAngle = polMin != null ? polMin : -Infinity;
  controls.maxPolarAngle = polMax != null ? polMax : Infinity;
  controls.minAzimuthAngle = azMin != null ? azMin : -Infinity;
  controls.maxAzimuthAngle = azMax != null ? azMax : -Infinity;

  controls.minDistance = minDistance != null ? minDistance : -Infinity;
  controls.maxDistance = maxDistance != null ? maxDistance : Infinity;
  controls.enablePan = enablePan != null ? enablePan : true;
  controls.autoRotateSpeed = autoRotateSpeed != null ? autoRotateSpeed : 0;
  controls.autoRotate = autoRotate != null ? autoRotate : false;
  controls.enableZoom = enableZoom != null ? enableZoom : true;

  controls.update();
  animate();
  window.controls = controls;
};

const setControlsTarget = (x, y, z) => {
  controls.target.set(x, y, z);
  controls.update();
};

const addGridHelper = () => {
  var helper = new GridHelper(100, 100);
  helper.rotation.x = Math.PI / 2;
  helper.material.opacity = 1;
  helper.material.transparent = false;
  scene.add(helper);

  var axis = new AxesHelper(1000);
  scene.add(axis);
};

const setCameraPosition = (x, y, z) => {
  camera.position.set(x, y, z);
  controls.update();
};

const setCameraRotation = (x, y, z) => {
  camera.rotation.set(x, y, z);
  controls.update();
};

const loadModel = (modelUrl, playAnimation) => {
  return new Promise((res, rej) => {
    // Instantiate a loader
    loader = new GLTFLoader();

    // Optional: Provide a DRACOLoader instance to decode compressed mesh data
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("decoder/");
    dracoLoader.setDecoderConfig({ type: "js" });
    loader.setDRACOLoader(dracoLoader);
    //TODO: add cross origin and header control

    // Load a glTF resource
    loader.load(
      // resource URL
      modelUrl,
      // called when the resource is loaded
      function (gltf) {
        if (playAnimation) {
          mixer = new AnimationMixer(gltf.scene);
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();
        }
        gltf.scene.traverse(function (node) {
          if (node.isMesh) {
            node.castShadow = true;
            node.material.depthWrite = !node.material.transparent;
          }
        });
        scene.add(gltf.scene);

        res(gltf);
        if (debug) {
          window.Print.postMessage("loaded the following: " + modelUrl);
        }
      },
      // called while loading is progressing
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
        window.onObjectLoading((xhr.loaded / xhr.total) * 100);
      },
      // called when loading has errors
      (error) => {
        console.log("An error happened", error);
        window.onLoadError("on loading error: " + error);
        rej(error);
      }
    );
  });
};

const loadCam = (modelUrl) => {
  return new Promise((res, rej) => {
    // Instantiate a loader
    loader = new GLTFLoader();

    // Optional: Provide a DRACOLoader instance to decode compressed mesh data
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("decoder/");
    dracoLoader.setDecoderConfig({ type: "js" });
    loader.setDRACOLoader(dracoLoader);

    // Load a glTF resource
    loader.load(
      // resource URL
      modelUrl,
      // called when the resource is loaded
      (gltf) => {
        setCamera(gltf.cameras[0]);

        animate();

        res(gltf);
      },
      // called while loading is progressing
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
        window.onObjectLoading((xhr.loaded / xhr.total) * 100);
      },
      // called when loading has errors
      (error) => {
        console.log("An error happened", error);
        window.onLoadError(error);
        rej(error);
      }
    );
  });
};

const addAmbientLight = (color, intensity) => {
  const ambient = new AmbientLight(color, intensity);
  scene.add(ambient);
};

// const addDirectionalLight = (color, intensity, pos) => {
//   const light2 = new DirectionalLight(color, intensity ?? 0.8 * Math.PI);
//   light2.position.set(pos?.x ?? 0.5, pos?.y ?? 0, pos?.z ?? 0.866);
//   scene.add(light2);
// };

// const setupLights = (type, position, colorRGB, distance, intensity, decay) => {
//   switch (type) {
//     case "ambientLight":
//       addAmbientLight(scene, position, colorRGB, distance, intensity, decay);
//     case "directionalLight":

//     case "hemisphereLight":

//     case "spotLight":

//     case "pointLight":
//   }
// };

const animate = () => {
  requestAnimationFrame(animate);
  var delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  if (controls) controls.update();
  renderer.render(scene, camera);
  //   if (debug) stats.update();
};

window.setupScene = setupScene;
window.setOrbitControls = setOrbitControls;
window.setControlsTarget = setControlsTarget;
window.loadModel = loadModel;
window.addAmbientLight = addAmbientLight;
window.loadCam = loadCam;
// window.setupLights = setupLights;
window.addGridHelper = addGridHelper;
window.setCameraPosition = setCameraPosition;
window.setCameraRotation = setCameraRotation;
window.createPerspectiveCamera = createPerspectiveCamera;
