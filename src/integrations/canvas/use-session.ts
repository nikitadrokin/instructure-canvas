import { useEffect, useRef } from "react";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useTRPCClient } from "@/integrations/trpc/react";

/**
 * Rehydrates the persisted session and replays it against the server once per
 * mount. Restore progress is written to the store so any route under
 * `/courses` can read it without re-running the effect.
 */
export function useCanvasSessionRestore() {
	const client = useTRPCClient();
	const restoreAttempted = useRef(false);
	const hasHydrated = useCanvasStore((state) => state.hasHydrated);
	const storedUrl = useCanvasStore((state) => state.canvasUrl);
	const storedToken = useCanvasStore((state) => state.token);
	const setSessionReady = useCanvasStore((state) => state.setSessionReady);
	const setIsRestoring = useCanvasStore((state) => state.setIsRestoring);

	useEffect(() => {
		if (!hasHydrated) void useCanvasStore.persist.rehydrate();
	}, [hasHydrated]);

	useEffect(() => {
		if (!hasHydrated || restoreAttempted.current) return;
		restoreAttempted.current = true;
		if (!storedUrl || !storedToken) {
			setSessionReady(true);
			return;
		}

		setIsRestoring(true);
		void client.canvas.restoreSession
			.mutate({ canvasUrl: storedUrl, token: storedToken })
			.catch(() => undefined)
			.finally(() => {
				setSessionReady(true);
				setIsRestoring(false);
			});
	}, [
		client,
		hasHydrated,
		storedToken,
		storedUrl,
		setSessionReady,
		setIsRestoring,
	]);
}
