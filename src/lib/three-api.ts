import {
  AmbientLight,
  Color,
  Fog,
  Group,
  LoadingManager,
  PerspectiveCamera,
  Scene,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  DirectionalLight,
  PointLight,
  MeshNormalMaterial,
} from 'three';

type Object3dHandles = {
  ambientLight: AmbientLight;
};
type ResourceHandles = {};

type PostprocessingPassHandles = {};

export type ThreeState = {
  initialised: boolean;
  object3dHandles: Object3dHandles;
  resourceHandles: ResourceHandles;
  passes: PostprocessingPassHandles;
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  scene: Scene;
  mouse: Vector2;
  resolution: Vector2;
  canvasProxyEl: HTMLDivElement;
};

const SOLID_COLOR_TEXTURE = (color) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 16;
  canvas.height = 16;
  context.fillStyle = color;
  context.fillRect(0, 0, 16, 16);
  const texture = new Texture(canvas);
  texture.needsUpdate = true;
  return texture;
};

export const createThreeApi = () => {
  let state: ThreeState;

  return {
    state: () => state,
    init: (canvasProxyEl: HTMLDivElement, canvasEl: HTMLCanvasElement) => {
      // scenes :
      const scene = new Scene();
      scene.fog = new Fog(0x000000, 1, 1000);

      //render targets, planes,
      const canvasWidth = canvasEl.clientWidth;
      const canvasHeight = canvasEl.clientHeight;
      const aspect = canvasWidth / canvasHeight;
      const resolution = new Vector2(canvasWidth, canvasHeight);
      const mouse = new Vector2();

      const fov = 50;
      const near = 0.1;
      const far = 50;
      const camera = new PerspectiveCamera(fov, aspect, near, far);

      const renderer = new WebGLRenderer({
        antialias: true,
        canvas: canvasEl,
      });

      const dpr = window?.devicePixelRatio || 1;
      renderer.setPixelRatio(dpr);

      const ambientLight = new AmbientLight(new Color('white'), 1);
      const directionalLight = new DirectionalLight(new Color('red'), 0.2);
      const pointLight = new PointLight(new Color('orange'));

      const defaultTexture = SOLID_COLOR_TEXTURE('#00446b');

      const geometry = new BoxGeometry(1, 1, 1);
      const material = new MeshNormalMaterial();
      const cube = new Mesh(geometry, material);

      camera.position.z = 4;
      camera.position.y = 2;
      camera.position.x = 2;
      camera.lookAt(cube.position);

      scene.add(ambientLight, directionalLight, cube);

      state = {
        initialised: true,
        object3dHandles: {
          ambientLight,
        },
        resourceHandles: {},
        passes: {},
        renderer: renderer,
        camera: camera,
        scene: scene,
        mouse: mouse,
        resolution: resolution,
        canvasProxyEl: canvasProxyEl,
      };
    },
    render: (state: ThreeState) => {
      const { renderer, canvasProxyEl, camera, scene } = state;

      const canvas = renderer.domElement;

      const needResize =
        Math.round(canvas.clientHeight) !== Math.round(canvas.height) ||
        Math.round(canvas.clientWidth) !== Math.round(canvas.width);

      if (needResize) {
        const aspect = canvas.clientWidth / canvas.clientHeight;
        camera.aspect = aspect;
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);
    },
  };
};

export type Api = ReturnType<typeof createThreeApi>;
