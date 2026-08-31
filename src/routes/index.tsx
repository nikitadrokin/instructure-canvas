import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Brand } from "#/components/brand";
import { ConnectScreen } from "#/components/connect-screen";
import { Dashboard } from "#/components/dashboard/dashboard";
import { Spinner } from "#/components/ui/spinner";
import { useCanvasStore } from "#/integrations/canvas/store";
import { useTRPC, useTRPCClient } from "#/integrations/trpc/react";

function getTrpcErrorMessage(error: unknown, fallback: string) {
	return error instanceof Error && error.message ? error.message : fallback;
}

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const trpc = useTRPC();
	const client = useTRPCClient();
	const queryClient = useQueryClient();
	const tokenInput = useRef<HTMLInputElement>(null);
	const restoreStarted = useRef(false);
	const hasHydrated = useCanvasStore((state) => state.hasHydrated);
	const storedUrl = useCanvasStore((state) => state.canvasUrl);
	const storedDashboard = useCanvasStore((state) => state.dashboard);
	const rememberSession = useCanvasStore((state) => state.rememberSession);
	const forgetSession = useCanvasStore((state) => state.forgetSession);
	const setStoredDashboard = useCanvasStore((state) => state.setDashboard);
	const [canvasUrl, setCanvasUrl] = useState("");
	const [connectionError, setConnectionError] = useState<string>();
	const [isConnecting, setIsConnecting] = useState(false);
	const [restoreFinished, setRestoreFinished] = useState(false);
	const dashboardQueryKey = trpc.canvas.dashboard.queryKey();

	useEffect(() => {
		void Promise.resolve(useCanvasStore.persist.rehydrate()).then(() => {
			if (!useCanvasStore.getState().hasHydrated) {
				useCanvasStore.getState().markHydrated();
			}
		});
	}, []);

	useEffect(() => {
		if (hasHydrated && storedUrl) {
			setCanvasUrl((current) => current || storedUrl);
		}
	}, [hasHydrated, storedUrl]);

	useEffect(() => {
		if (!hasHydrated || restoreStarted.current) return;
		restoreStarted.current = true;

		const cached = useCanvasStore.getState().dashboard;
		if (cached) {
			queryClient.setQueryData(dashboardQueryKey, cached);
		}

		const url = useCanvasStore.getState().canvasUrl;
		const token = useCanvasStore.getState().token;
		if (!url || !token) {
			setRestoreFinished(true);
			return;
		}

		setIsConnecting(true);
		void client.canvas.connect
			.mutate({ canvasUrl: url, token })
			.then((data) => {
				queryClient.setQueryData(dashboardQueryKey, data);
				rememberSession({ canvasUrl: url, token, dashboard: data });
			})
			.catch((error: unknown) => {
				setConnectionError(
					getTrpcErrorMessage(error, "Could not restore your Canvas session."),
				);
				queryClient.setQueryData(dashboardQueryKey, null);
				useCanvasStore.setState({ token: "", dashboard: null });
			})
			.finally(() => {
				setIsConnecting(false);
				setRestoreFinished(true);
			});
	}, [client, dashboardQueryKey, hasHydrated, queryClient, rememberSession]);

	const dashboard = useQuery(
		trpc.canvas.dashboard.queryOptions(undefined, {
			enabled: typeof window !== "undefined" && restoreFinished,
			retry: false,
			staleTime: 60_000,
		}),
	);

	useEffect(() => {
		if (dashboard.data) setStoredDashboard(dashboard.data);
	}, [dashboard.data, setStoredDashboard]);

	async function connect(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const token = tokenInput.current?.value ?? "";
		setConnectionError(undefined);
		setIsConnecting(true);

		try {
			const data = await client.canvas.connect.mutate({ canvasUrl, token });
			rememberSession({ canvasUrl, token, dashboard: data });
			queryClient.setQueryData(dashboardQueryKey, data);
			if (tokenInput.current) tokenInput.current.value = "";
		} catch (error) {
			setConnectionError(
				getTrpcErrorMessage(error, "Could not connect to Canvas."),
			);
		} finally {
			setIsConnecting(false);
		}
	}

	async function disconnect() {
		setConnectionError(undefined);
		forgetSession();
		try {
			await client.canvas.disconnect.mutate();
			queryClient.setQueryData(dashboardQueryKey, null);
			await dashboard.refetch();
		} catch (error) {
			setConnectionError(
				getTrpcErrorMessage(error, "Could not disconnect from Canvas."),
			);
		}
	}

	const data = dashboard.data ?? storedDashboard;

	if (!hasHydrated) return <LoadingScreen />;
	if (!data && (isConnecting || dashboard.isPending)) return <LoadingScreen />;

	if (!data) {
		return (
			<ConnectScreen
				canvasUrl={canvasUrl}
				error={connectionError ?? dashboard.error?.message}
				isPending={isConnecting}
				onCanvasUrlChange={setCanvasUrl}
				onSubmit={connect}
				tokenInput={tokenInput}
			/>
		);
	}

	return (
		<Dashboard
			data={data}
			error={connectionError ?? dashboard.error?.message}
			isRefreshing={isConnecting || dashboard.isFetching}
			onDisconnect={disconnect}
			onRefresh={() => dashboard.refetch()}
		/>
	);
}

function LoadingScreen() {
	return (
		<div
			className="flex min-h-screen flex-col items-center justify-center gap-6"
			aria-label="Loading your Canvas session"
		>
			<Brand />
			<Spinner className="size-6 text-muted-foreground" />
		</div>
	);
}
