<script lang="ts">
  import { spring } from "svelte/motion";
  import { pannable } from "./lib/pannable";
  import { onMount } from "svelte";

  import { createThreeApi} from './lib/three-api'
    import type { Api} from './lib/three-api'

    
  let canvasProxyEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;
  const api = createThreeApi()

 onMount(() => {

    //canvas observables
    api.init(canvasProxyEl, canvasEl);

     //animation loop
    const loop = () => {
      if (api) api.render(api.state());
      requestAnimationFrame(loop);
    };
    const frameId = requestAnimationFrame(loop);

    //cleanup
    return () => {
      cancelAnimationFrame(frameId);
    };


 });
  

 let coords = spring(
    { x: 50, y: 50 },
    {
      stiffness: 0.1,
      damping: 0.25,
    }
  );
  let trajectory = spring( { x: 0, y: 0 },
    {
      stiffness: 0.1,
      damping: 0.25,
    })

  function handlePanStart(event: CustomEvent<{ x: number; y: number }>) {
    // coords.stiffness = coords.damping = 1;
  }

  function handlePanMove(
    event: CustomEvent<{ x: number; y: number; dx: number; dy: number }>
  ) {
    coords.update(($coords) => ({
      x: $coords.x + event.detail.dx,
      y: $coords.y + event.detail.dy,
    }));
  }

  function handlePanEnd(event: CustomEvent<{ x: number; y: number }>) {
    coords.set({ x: 0, y: 0 });
  }
    
</script>

<!-- <div bind:this={canvasProxyEl} class:canvas-proxy={true}> -->
<canvas class:webgl-canvas={false} class:box={true}
 bind:this={canvasEl}
	use:pannable
	on:panstart={handlePanStart}
	on:panmove={handlePanMove}
	on:panend={handlePanEnd}
  on:multipointerpanmove={(x) => console.log(x)}
	style="transform:translate({$coords.x}px,{$coords.y}px)"
/>
<!-- </div> -->

<div class:controls={true}>
	<label>
		<h3>stiffness ({coords.stiffness})</h3>
		<input bind:value={coords.stiffness} type="range" min="0" max="1" step="0.01">
	</label>

	<label>
		<h3>damping ({coords.damping})</h3>
		<input bind:value={coords.damping} type="range" min="0" max="1" step="0.01">
	</label>
</div>

<style lang='scss'>
.controls {
  position: absolute; right: 1em;
  z-index:4
}
 .canvas-proxy {
    z-index: 0;
    position: relative;
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    background-color: transparent;
    overflow: hidden;
    overscroll-behavior: contain;
    user-select: none;
    background-color: red;
  }

	.box {
    z-index: 2;
      background-color: green;
		--width: 400px;
		--height: 400px;
		position: absolute;
		width: var(--width);
		height: var(--height);
		left: calc(50% - var(--width) / 2);
		top: calc(50% - var(--height) / 2);
		border-radius: 4px;
		background-color: #ff3e00;
		cursor: move;
	}

   .webgl-canvas {
     z-index:2;
    background-color: red;
    position: absolute;
    height: 100%;
    width: 100%;
    top: 0;
    // left: 0;
    // right: 0;
    // bottom: 0;
    box-sizing: border-box;
    touch-action: none;

    cursor: grab;
    &:active {
      cursor: grabbing;
    }
  }

</style>