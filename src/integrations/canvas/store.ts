import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { CanvasDashboard } from "./client";

const STORAGE_KEY = "canvas-local-session";

/**
 * Fields written to `localStorage` so a local session survives reloads.
 */
type PersistedCanvasSession = {
	/** Institution hostname or origin last used to connect. */
	canvasUrl: string;
	/** Personal access token kept only in this browser until disconnect. */
	token: string;
	/** Last successful dashboard snapshot for instant restore. */
	dashboard: CanvasDashboard | null;
};

/**
 * Client session store. The token never comes from the server; it is written
 * here after a successful connect and sent back on restore.
 */
type CanvasSessionState = PersistedCanvasSession & {
	/** False until `localStorage` rehydration finishes on the client. */
	hasHydrated: boolean;
	/** True once a restore attempt has settled, so course queries may run. */
	sessionReady: boolean;
	/** True while a stored session is being replayed against the server. */
	isRestoring: boolean;
	rememberSession: (session: PersistedCanvasSession) => void;
	setDashboard: (dashboard: CanvasDashboard) => void;
	forgetSession: () => void;
	markHydrated: () => void;
	setSessionReady: (ready: boolean) => void;
	setIsRestoring: (restoring: boolean) => void;
};

function memoryStorage() {
	return {
		getItem: () => null,
		setItem: () => undefined,
		removeItem: () => undefined,
	};
}

function reviveDashboard(value: unknown): CanvasDashboard | null {
	if (typeof value !== "object" || value === null) return null;

	const record = value as Record<string, unknown>;
	if (typeof record.origin !== "string") return null;
	if (typeof record.profile !== "object" || record.profile === null)
		return null;
	if (!Array.isArray(record.courses) || !Array.isArray(record.upcoming)) {
		return null;
	}

	const connectedAt =
		record.connectedAt instanceof Date
			? record.connectedAt
			: new Date(
					typeof record.connectedAt === "string" ||
						typeof record.connectedAt === "number"
						? record.connectedAt
						: Date.now(),
				);

	return {
		origin: record.origin,
		connectedAt,
		profile: record.profile as CanvasDashboard["profile"],
		courses: record.courses as CanvasDashboard["courses"],
		upcoming: record.upcoming as CanvasDashboard["upcoming"],
	};
}

export const useCanvasStore = create<CanvasSessionState>()(
	persist(
		(set) => ({
			canvasUrl: "",
			token: "",
			dashboard: null,
			hasHydrated: false,
			sessionReady: false,
			isRestoring: false,
			rememberSession: (session) => set(session),
			setDashboard: (dashboard) => set({ dashboard }),
			forgetSession: () =>
				set({
					canvasUrl: "",
					token: "",
					dashboard: null,
				}),
			markHydrated: () => set({ hasHydrated: true }),
			setSessionReady: (ready) => set({ sessionReady: ready }),
			setIsRestoring: (restoring) => set({ isRestoring: restoring }),
		}),
		{
			name: STORAGE_KEY,
			storage: createJSONStorage(() =>
				typeof window === "undefined" ? memoryStorage() : localStorage,
			),
			skipHydration: true,
			partialize: (state) => ({
				canvasUrl: state.canvasUrl,
				token: state.token,
				dashboard: state.dashboard,
			}),
			merge: (persisted, current) => {
				if (typeof persisted !== "object" || persisted === null) return current;

				const stored = persisted as Record<string, unknown>;
				return {
					...current,
					canvasUrl:
						typeof stored.canvasUrl === "string"
							? stored.canvasUrl
							: current.canvasUrl,
					token:
						typeof stored.token === "string" ? stored.token : current.token,
					dashboard: reviveDashboard(stored.dashboard) ?? current.dashboard,
				};
			},
			onRehydrateStorage: () => (_state, error) => {
				if (error) {
					useCanvasStore.setState({ hasHydrated: true });
					return;
				}
				useCanvasStore.getState().markHydrated();
			},
		},
	),
);
