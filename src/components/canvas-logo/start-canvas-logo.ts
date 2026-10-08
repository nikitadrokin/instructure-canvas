import type { Effect, FrameLoopHandle, Gpu, Surface } from "vgpu";
import { effect, frame, frameLoop, init, surface } from "vgpu";
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

/** How long an unused GPU device stays alive before it is destroyed. */
const IDLE_DISPOSE_MS = 30_000;

/**
 * Process-wide WebGPU state shared by every logo on the page. Creating the
 * device and compiling the pipeline is the expensive part of showing the mark,
 * so it happens once and is reused by later mounts instead of per mount.
 */
interface SharedRuntime {
  gpu: Gpu;
  /** Effects released by unmounted logos, reused instead of re-created. */
  idleEffects: Effect[];
  /** Number of mounted logos using this runtime. */
  leases: number;
  disposeTimer: ReturnType<typeof setTimeout> | undefined;
}

/** A hold on the shared runtime. Release it exactly once when done. */
interface RuntimeLease {
  runtime: SharedRuntime;
  release: () => void;
}

let runtimePromise: Promise<SharedRuntime> | undefined;

function scheduleIdleDispose(runtime: SharedRuntime): void {
  clearTimeout(runtime.disposeTimer);
  runtime.disposeTimer = setTimeout(() => {
    if (runtime.leases > 0) return;
    destroyRuntime(runtime);
  }, IDLE_DISPOSE_MS);
}

function destroyRuntime(runtime: SharedRuntime): void {
  clearTimeout(runtime.disposeTimer);
  runtime.idleEffects.length = 0;
  runtimePromise = undefined;
  if (!runtime.gpu.disposed) runtime.gpu.dispose();
}

function getRuntime(): Promise<SharedRuntime> {
  if (runtimePromise) return runtimePromise;

  const pending: Promise<SharedRuntime> = init({
    powerPreference: "low-power",
  }).then((gpu) => {
    const runtime: SharedRuntime = {
      gpu,
      idleEffects: [],
      leases: 0,
      disposeTimer: undefined,
    };
    // A lost device cannot be reused; drop it so the next mount starts fresh.
    void gpu.gpu.lost.then(() => {
      if (runtimePromise === pending) destroyRuntime(runtime);
    });
    scheduleIdleDispose(runtime);
    return runtime;
  });
  pending.catch(() => {
    if (runtimePromise === pending) runtimePromise = undefined;
  });
  runtimePromise = pending;
  return pending;
}

async function leaseRuntime(): Promise<RuntimeLease> {
  const runtime = await getRuntime();
  runtime.leases += 1;
  clearTimeout(runtime.disposeTimer);

  let released = false;
  return {
    runtime,
    release: () => {
      if (released) return;
      released = true;
      runtime.leases -= 1;
      if (runtime.leases === 0) scheduleIdleDispose(runtime);
    },
  };
}

function acquireEffect(runtime: SharedRuntime): Effect {
  return (
    runtime.idleEffects.pop() ??
    effect(runtime.gpu, canvasLogoShader, {
      blend: "premultiplied",
      label: "canvas-logo",
    })
  );
}

/**
 * Warms the shared WebGPU device so the first visible logo skips initialisation.
 * Safe to call repeatedly and on browsers without WebGPU.
 */
export async function preloadCanvasLogoRuntime(): Promise<void> {
  const runtime = await getRuntime();
  if (runtime.leases === 0) scheduleIdleDispose(runtime);
}

/**
 * Starts the Canvas logo render loop on `canvas`.
 * Call the returned function to stop the loop and release the shared GPU context.
 */
export function startCanvasLogo(
  canvas: HTMLCanvasElement,
  options: StartCanvasLogoOptions,
): () => void {
  let disposed = false;
  let loop: FrameLoopHandle | undefined;
  let lease: RuntimeLease | undefined;
  let canvasSurface: Surface | undefined;
  let logo: Effect | undefined;
  const events = new AbortController();
  let unsubscribeResize: (() => void) | undefined;

  const teardown = () => {
    events.abort();
    unsubscribeResize?.();
    unsubscribeResize = undefined;
    loop?.stop();
    loop = undefined;
    if (canvasSurface && !canvasSurface.disposed) canvasSurface.dispose();
    canvasSurface = undefined;
    if (logo && lease && !lease.runtime.gpu.disposed) {
      lease.runtime.idleEffects.push(logo);
    }
    logo = undefined;
    lease?.release();
    lease = undefined;
  };

  void (async () => {
    try {
      const acquired = await leaseRuntime();
      if (disposed) {
        acquired.release();
        return;
      }
      lease = acquired;
      const gpu = acquired.runtime.gpu;

      const activeSurface = surface(gpu, canvas, {
        alphaMode: "premultiplied",
        clearColor: [0, 0, 0, 0],
        dpr: [1, 2],
        label: "canvas-logo-surface",
      });
      canvasSurface = activeSurface;

      const activeLogo = acquireEffect(acquired.runtime);
      logo = activeLogo;
      activeLogo.set({
        params: {
          motion: options.reducedMotion ? 0 : 1,
          pointer: [0, 0],
          hover: 0,
          press: 0,
          texel: activeSurface.texelSize,
          time: options.reducedMotion ? 1.7 : 0,
        },
      });

      unsubscribeResize = activeSurface.onResize(() => {
        activeLogo.set({ params: { texel: activeSurface.texelSize } });
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

      // The gpu clock is shared and ticks once per frame of every logo, so
      // each logo keeps its own wall-clock time to stay smooth when several run.
      const startedAt = performance.now();
      let lastTickAt = startedAt;
      const writeTime = () => {
        const now = performance.now();
        const dt = Math.min((now - lastTickAt) / 1000, 0.05);
        lastTickAt = now;
        const elapsed = (now - startedAt) / 1000;
        const follow = 1 - Math.exp(-14 * dt);
        const settle = 1 - Math.exp(-7 * dt);
        smooth.x += (pointer.x - smooth.x) * follow;
        smooth.y += (pointer.y - smooth.y) * follow;
        smooth.hover += (pointer.hover - smooth.hover) * settle;
        smooth.press += (pointer.press - smooth.press) * follow;
        activeLogo.set({
          params: {
            time: options.reducedMotion ? 1.7 : elapsed % 600,
            pointer: [smooth.x, smooth.y],
            hover: smooth.hover,
            press: smooth.press,
          },
        });
      };

      writeTime();
      frame(gpu, (currentFrame) => {
        currentFrame.pass(activeSurface, activeLogo);
      });
      options.onReady?.();

      if (!options.reducedMotion) {
        loop = frameLoop(
          gpu,
          (currentFrame) => {
            writeTime();
            currentFrame.pass(activeSurface, activeLogo);
          },
          { fps: options.interactive ? 60 : 30 },
        );
      }
    } catch (error) {
      teardown();
      options.onError?.(error);
    }
  })();

  return () => {
    disposed = true;
    teardown();
  };
}
