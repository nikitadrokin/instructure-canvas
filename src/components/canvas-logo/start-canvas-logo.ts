import type { FrameLoopHandle, Gpu } from "vgpu";
import { clock, effect, frame, frameLoop, init, surface } from "vgpu";
import canvasLogoShader from "./canvas-logo.wgsl?raw";

/**
 * Options for mounting the Canvas mark on a canvas element.
 */
export interface StartCanvasLogoOptions {
  /** When true, freeze spin and keep a still energy field. */
  reducedMotion: boolean;
  /** Called after the first presented frame. */
  onReady?: () => void;
  /** Called when WebGPU init or the first draw fails. */
  onError?: (error: unknown) => void;
}

/**
 * Starts the Canvas logo render loop on `canvas`.
 * Call the returned function to stop the loop and dispose the GPU context.
 */
export function startCanvasLogo(
  canvas: HTMLCanvasElement,
  options: StartCanvasLogoOptions,
): () => void {
  let disposed = false;
  let loop: FrameLoopHandle | undefined;
  let gpu: Gpu | undefined;
  let unsubscribeResize: (() => void) | undefined;

  void (async () => {
    try {
      gpu = await init({ powerPreference: "low-power" });
      if (disposed) {
        gpu.dispose();
        return;
      }

      const canvasSurface = surface(gpu, canvas, {
        alphaMode: "premultiplied",
        clearColor: [0, 0, 0, 0],
        dpr: [1, 2],
        label: "canvas-logo-surface",
      });

      const logo = effect(gpu, canvasLogoShader, {
        blend: "premultiplied",
        label: "canvas-logo",
        set: {
          params: {
            motion: options.reducedMotion ? 0 : 1,
            texel: canvasSurface.texelSize,
            time: options.reducedMotion ? 1.7 : 0,
          },
        },
      });

      unsubscribeResize = canvasSurface.onResize(() => {
        logo.set({ params: { texel: canvasSurface.texelSize } });
      });

      const time = clock(gpu);
      const writeTime = () => {
        logo.set({
          params: {
            time: options.reducedMotion ? 1.7 : time.time % 600,
          },
        });
      };

      writeTime();
      frame(gpu, (currentFrame) => {
        currentFrame.pass(canvasSurface, logo);
      });
      if (disposed) {
        gpu.dispose();
        return;
      }
      options.onReady?.();

      if (!options.reducedMotion) {
        loop = frameLoop(
          gpu,
          (currentFrame) => {
            writeTime();
            currentFrame.pass(canvasSurface, logo);
          },
          { fps: 30 },
        );
      }
    } catch (error) {
      options.onError?.(error);
      gpu?.dispose();
    }
  })();

  return () => {
    disposed = true;
    unsubscribeResize?.();
    loop?.stop();
    gpu?.dispose();
  };
}
