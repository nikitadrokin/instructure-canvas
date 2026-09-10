import type { FrameLoopHandle, Gpu } from "vgpu";
import { clock, effect, frame, frameLoop, init, surface } from "vgpu";
import canvasLogoShader from "./canvas-logo.wgsl?raw";

/**
 * Options for mounting the Canvas mark on a canvas element.
 */
export interface StartCanvasLogoOptions {
  /** When true, freeze spin and keep a still energy field. */
  reducedMotion: boolean;
  interactive?: boolean;
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
  const events = new AbortController();
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
            pointer: [0, 0],
            hover: 0,
            press: 0,
            texel: canvasSurface.texelSize,
            time: options.reducedMotion ? 1.7 : 0,
          },
        },
      });

      unsubscribeResize = canvasSurface.onResize(() => {
        logo.set({ params: { texel: canvasSurface.texelSize } });
      });

      const pointer = { x: 0, y: 0, hover: 0, press: 0 };
      const smooth = { ...pointer };
      if (options.interactive && !options.reducedMotion) {
        const updatePointer = (event: PointerEvent) => {
          const rect = canvas.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          pointer.x =
            (((((event.clientX - rect.left) / rect.width) * 2 - 1) *
              rect.width) /
              rect.height) *
            1.18;
          pointer.y =
            (1 - ((event.clientY - rect.top) / rect.height) * 2) * 1.18;
          if (!pointer.hover) {
            smooth.x = pointer.x;
            smooth.y = pointer.y;
          }
          pointer.hover = 1;
        };
        const leave = () => {
          pointer.hover = 0;
          pointer.press = 0;
        };
        const listenerOptions = { signal: events.signal, passive: true };
        canvas.addEventListener("pointerenter", updatePointer, listenerOptions);
        canvas.addEventListener("pointermove", updatePointer, listenerOptions);
        canvas.addEventListener(
          "pointerdown",
          (event) => {
            updatePointer(event);
            pointer.press = 1;
          },
          listenerOptions,
        );
        canvas.addEventListener("pointerleave", leave, listenerOptions);
        canvas.addEventListener("pointercancel", leave, listenerOptions);
        window.addEventListener(
          "pointerup",
          (event) => {
            pointer.press = 0;
            if (event.pointerType === "touch") leave();
          },
          listenerOptions,
        );
        window.addEventListener("blur", leave, listenerOptions);
      }

      const time = clock(gpu);
      const writeTime = () => {
        const dt = Math.min(time.deltaTime, 0.05);
        const follow = 1 - Math.exp(-14 * dt);
        const settle = 1 - Math.exp(-7 * dt);
        smooth.x += (pointer.x - smooth.x) * follow;
        smooth.y += (pointer.y - smooth.y) * follow;
        smooth.hover += (pointer.hover - smooth.hover) * settle;
        smooth.press += (pointer.press - smooth.press) * follow;
        logo.set({
          params: {
            time: options.reducedMotion ? 1.7 : time.time % 600,
            pointer: [smooth.x, smooth.y],
            hover: smooth.hover,
            press: smooth.press,
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
          { fps: options.interactive ? 60 : 30 },
        );
      }
    } catch (error) {
      events.abort();
      unsubscribeResize?.();
      loop?.stop();
      options.onError?.(error);
      gpu?.dispose();
    }
  })();

  return () => {
    disposed = true;
    events.abort();
    unsubscribeResize?.();
    loop?.stop();
    gpu?.dispose();
  };
}
