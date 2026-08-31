import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import type { inferRouterOutputs } from "@trpc/server";
import { useMemo, useRef, useState } from "react";
import { useTRPC, useTRPCClient } from "#/integrations/trpc/react";
import type { TRPCRouter } from "#/integrations/trpc/router";

type DashboardData = inferRouterOutputs<TRPCRouter>["canvas"]["dashboard"];
type Course = DashboardData["courses"][number];
type UpcomingItem = DashboardData["upcoming"][number];

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const trpc = useTRPC();
	const client = useTRPCClient();
	const queryClient = useQueryClient();
	const tokenInput = useRef<HTMLInputElement>(null);
	const [canvasUrl, setCanvasUrl] = useState("");
	const [connectionError, setConnectionError] = useState<string>();
	const [isConnecting, setIsConnecting] = useState(false);
	const dashboard = useQuery(
		trpc.canvas.dashboard.queryOptions(undefined, {
			retry: false,
			staleTime: 60_000,
		}),
	);

	async function connect(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const token = tokenInput.current?.value ?? "";
		setConnectionError(undefined);
		setIsConnecting(true);

		try {
			const data = await client.canvas.connect.mutate({ canvasUrl, token });
			queryClient.setQueryData(trpc.canvas.dashboard.queryKey(), data);
			if (tokenInput.current) tokenInput.current.value = "";
		} catch (error) {
			setConnectionError(
				error instanceof Error ? error.message : "Could not connect to Canvas.",
			);
		} finally {
			setIsConnecting(false);
		}
	}

	async function disconnect() {
		await client.canvas.disconnect.mutate();
		queryClient.setQueryData(trpc.canvas.dashboard.queryKey(), undefined);
		await dashboard.refetch();
	}

	if (dashboard.isPending) return <LoadingScreen />;

	if (!dashboard.data) {
		return (
			<ConnectionScreen
				canvasUrl={canvasUrl}
				error={connectionError}
				isPending={isConnecting}
				onCanvasUrlChange={setCanvasUrl}
				onSubmit={connect}
				tokenInput={tokenInput}
			/>
		);
	}

	return (
		<Dashboard
			data={dashboard.data}
			isRefreshing={dashboard.isFetching}
			onDisconnect={disconnect}
			onRefresh={() => dashboard.refetch()}
		/>
	);
}

function LoadingScreen() {
	return (
		<output className="loading-screen" aria-label="Loading your Canvas session">
			<Brand />
			<span className="spinner dark" aria-hidden="true" />
		</output>
	);
}

function Brand() {
	return (
		<div className="brand">
			<span className="brand-mark" aria-hidden="true">
				<span />
				<span />
				<span />
			</span>
			<span>Canvas Local</span>
		</div>
	);
}

function ConnectionScreen({
	canvasUrl,
	error,
	isPending,
	onCanvasUrlChange,
	onSubmit,
	tokenInput,
}: {
	canvasUrl: string;
	error?: string;
	isPending: boolean;
	onCanvasUrlChange: (value: string) => void;
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
	tokenInput: React.RefObject<HTMLInputElement | null>;
}) {
	return (
		<div className="connect-page">
			<header className="connect-header">
				<Brand />
				<div className="local-badge">
					<span aria-hidden="true" /> Local session
				</div>
			</header>

			<main className="connect-main">
				<section className="connect-copy" aria-labelledby="connect-heading">
					<p className="eyebrow">A calmer Canvas dashboard</p>
					<h1 id="connect-heading">Your classes, without the clutter.</h1>
					<p className="hero-copy">
						Connect your school&rsquo;s Canvas account to see courses, grades,
						and upcoming work in one focused view.
					</p>

					<ul className="feature-list" aria-label="Product features">
						<li className="feature-item">
							<Icon name="courses" />
							<div>
								<strong>One view for every course</strong>
								<span>Current classes, scores, and terms at a glance.</span>
							</div>
						</li>
						<li className="feature-item">
							<Icon name="calendar" />
							<div>
								<strong>Upcoming work, already sorted</strong>
								<span>Assignments and events ordered by what comes next.</span>
							</div>
						</li>
						<li className="feature-item">
							<Icon name="shield" />
							<div>
								<strong>Private by default</strong>
								<span>
									Your token stays in the local server and is never saved.
								</span>
							</div>
						</li>
					</ul>
				</section>

				<section className="connect-panel" aria-labelledby="panel-heading">
					<div className="panel-heading">
						<div className="panel-icon">
							<Icon name="key" />
						</div>
						<div>
							<h2 id="panel-heading">Connect to Canvas</h2>
							<p>Use a personal access token from your own account.</p>
						</div>
					</div>

					<form onSubmit={onSubmit} className="connect-form">
						<label htmlFor="canvas-url">Canvas domain</label>
						<div className="input-shell">
							<Icon name="globe" />
							<input
								id="canvas-url"
								name="canvas-url"
								type="text"
								inputMode="url"
								autoCapitalize="none"
								autoCorrect="off"
								placeholder="school.instructure.com"
								value={canvasUrl}
								onChange={(event) => onCanvasUrlChange(event.target.value)}
								required
							/>
						</div>

						<div className="label-row">
							<label htmlFor="canvas-token">Personal access token</label>
							<a
								href="https://community.instructure.com/en/kb/articles/662901-how-do-i-manage-api-access-tokens-in-my-user-account"
								target="_blank"
								rel="noreferrer"
							>
								Where do I find this?
							</a>
						</div>
						<div className="input-shell">
							<Icon name="lock" />
							<input
								ref={tokenInput}
								id="canvas-token"
								name="canvas-token"
								type="password"
								autoComplete="off"
								placeholder="Paste your token"
								required
							/>
						</div>

						{error ? (
							<div className="form-error" role="alert">
								<Icon name="alert" />
								{error}
							</div>
						) : null}

						<button
							className="primary-button"
							type="submit"
							disabled={isPending}
						>
							{isPending ? (
								<span className="spinner" aria-hidden="true" />
							) : null}
							{isPending ? "Connecting…" : "Open my dashboard"}
							{isPending ? null : <Icon name="arrow" />}
						</button>
					</form>

					<div className="privacy-note">
						<Icon name="shield" />
						<p>
							<strong>Your credentials are not stored.</strong>
							They remain in local server memory and disappear on restart.
						</p>
					</div>
				</section>
			</main>

			<footer className="connect-footer">
				<span>Built on the Canvas LMS API</span>
				<span aria-hidden="true">·</span>
				<span>Personal local prototype</span>
			</footer>
		</div>
	);
}

function Dashboard({
	data,
	isRefreshing,
	onDisconnect,
	onRefresh,
}: {
	data: DashboardData;
	isRefreshing: boolean;
	onDisconnect: () => void;
	onRefresh: () => void;
}) {
	const scores = useMemo(
		() =>
			data.courses
				.map(getCourseScore)
				.filter((score): score is number => score !== null),
		[data.courses],
	);
	const average = scores.length
		? Math.round(
				scores.reduce((total, score) => total + score, 0) / scores.length,
			)
		: null;
	const firstName =
		data.profile.short_name?.split(" ")[0] ?? data.profile.name.split(" ")[0];
	const weekday = new Intl.DateTimeFormat(undefined, {
		weekday: "long",
	}).format(new Date());

	return (
		<div className="app-shell">
			<aside className="sidebar">
				<Brand />
				<nav aria-label="Main navigation">
					<a className="nav-item active" href="#overview" aria-current="page">
						<Icon name="grid" /> Overview
					</a>
					<a className="nav-item" href="#courses">
						<Icon name="courses" /> Courses
					</a>
					<a className="nav-item" href="#upcoming">
						<Icon name="calendar" /> Upcoming
					</a>
				</nav>

				<div className="sidebar-connection">
					<div className="connection-domain">
						<span aria-hidden="true" />
						<div>
							<strong>Connected</strong>
							<small>{new URL(data.origin).hostname}</small>
						</div>
					</div>
					<button type="button" onClick={onDisconnect}>
						<Icon name="logout" /> Disconnect
					</button>
				</div>
			</aside>

			<main className="dashboard-main" id="overview">
				<header className="dashboard-header">
					<div>
						<p className="eyebrow">{weekday} overview</p>
						<h1>Good morning, {firstName}.</h1>
						<p>
							Here&rsquo;s what&rsquo;s happening across your Canvas courses.
						</p>
					</div>
					<div className="header-actions">
						<button
							className="secondary-button"
							type="button"
							onClick={onRefresh}
							disabled={isRefreshing}
						>
							<Icon name="refresh" />
							{isRefreshing ? "Refreshing…" : "Refresh"}
						</button>
						<Avatar profile={data.profile} />
					</div>
				</header>

				<section className="stats-grid" aria-label="Dashboard summary">
					<StatCard
						icon="courses"
						label="Active courses"
						value={String(data.courses.length)}
						note={
							data.courses.length === 1
								? "current enrollment"
								: "current enrollments"
						}
					/>
					<StatCard
						icon="chart"
						label="Average score"
						value={average === null ? "—" : `${average}%`}
						note={
							scores.length
								? `across ${scores.length} graded courses`
								: "No scores released yet"
						}
					/>
					<StatCard
						icon="clock"
						label="Coming up"
						value={String(data.upcoming.length)}
						note="assignments and events"
					/>
				</section>

				<div className="dashboard-grid">
					<section
						className="courses-section"
						id="courses"
						aria-labelledby="courses-heading"
					>
						<div className="section-heading">
							<div>
								<p className="eyebrow">Current term</p>
								<h2 id="courses-heading">Your courses</h2>
							</div>
							<span>{data.courses.length} total</span>
						</div>

						{data.courses.length ? (
							<div className="course-grid">
								{data.courses.map((course, index) => (
									<CourseCard
										key={course.id}
										course={course}
										index={index}
										origin={data.origin}
									/>
								))}
							</div>
						) : (
							<EmptyState
								icon="courses"
								title="No active courses"
								copy="Canvas did not return any available, active enrollments for this account."
							/>
						)}
					</section>

					<section
						className="upcoming-section"
						id="upcoming"
						aria-labelledby="upcoming-heading"
					>
						<div className="section-heading">
							<div>
								<p className="eyebrow">Next in line</p>
								<h2 id="upcoming-heading">Upcoming</h2>
							</div>
						</div>

						{data.upcoming.length ? (
							<div className="upcoming-list">
								{data.upcoming.slice(0, 7).map((item) => (
									<UpcomingRow
										key={`${item.type}-${item.id}`}
										item={item}
										origin={data.origin}
									/>
								))}
							</div>
						) : (
							<EmptyState
								icon="check"
								title="You’re all clear"
								copy="Canvas has no upcoming assignments or calendar events for you."
							/>
						)}
					</section>
				</div>
			</main>
		</div>
	);
}

function Avatar({ profile }: { profile: DashboardData["profile"] }) {
	const initials = profile.name
		.split(" ")
		.slice(0, 2)
		.map((part) => part[0])
		.join("");

	return profile.avatar_url ? (
		<img
			className="avatar"
			src={profile.avatar_url}
			alt={`${profile.name}'s avatar`}
		/>
	) : (
		<div
			className="avatar avatar-fallback"
			role="img"
			aria-label={profile.name}
		>
			{initials}
		</div>
	);
}

function StatCard({
	icon,
	label,
	note,
	value,
}: {
	icon: IconName;
	label: string;
	note: string;
	value: string;
}) {
	return (
		<article className="stat-card">
			<div className="stat-icon">
				<Icon name={icon} />
			</div>
			<div>
				<span>{label}</span>
				<strong>{value}</strong>
				<small>{note}</small>
			</div>
		</article>
	);
}

function getCourseScore(course: Course) {
	const enrollment = course.enrollments?.[0];
	return (
		enrollment?.computed_current_score ?? enrollment?.current_score ?? null
	);
}

function CourseCard({
	course,
	index,
	origin,
}: {
	course: Course;
	index: number;
	origin: string;
}) {
	const enrollment = course.enrollments?.[0];
	const score = getCourseScore(course);
	const grade = enrollment?.computed_current_grade ?? enrollment?.current_grade;
	const role = enrollment?.role?.replace("Enrollment", "") ?? "Member";
	const href = course.html_url ?? `${origin}/courses/${course.id}`;

	return (
		<a
			className="course-card"
			data-tone={(index % 4) + 1}
			href={href}
			target="_blank"
			rel="noreferrer"
		>
			<div className="course-stripe" />
			<div className="course-content">
				<div className="course-topline">
					<span className="course-code">{course.course_code}</span>
					<Icon name="external" />
				</div>
				<h3>{course.name ?? course.course_code}</h3>
				<p>{course.term?.name ?? "Current enrollment"}</p>
				<div className="course-footer">
					<span>{role}</span>
					<strong>
						{grade ?? (score === null ? "No grade" : `${Math.round(score)}%`)}
					</strong>
				</div>
			</div>
		</a>
	);
}

function UpcomingRow({ item, origin }: { item: UpcomingItem; origin: string }) {
	const dueAt = item.assignment?.due_at ?? item.start_at;
	const title = item.assignment?.name ?? item.title;
	const href = item.assignment?.html_url ?? item.html_url ?? origin;
	const courseId = item.context_code?.startsWith("course_")
		? item.context_code.replace("course_", "Course ")
		: "Canvas";

	return (
		<a className="upcoming-row" href={href} target="_blank" rel="noreferrer">
			<div className="date-tile" aria-hidden="true">
				<span>{dueAt ? formatMonth(dueAt) : "TBD"}</span>
				<strong>{dueAt ? formatDay(dueAt) : "—"}</strong>
			</div>
			<div className="upcoming-copy">
				<strong>{title}</strong>
				<span>
					{courseId} · {dueAt ? formatTime(dueAt) : "No due date"}
				</span>
			</div>
			<Icon name="chevron" />
		</a>
	);
}

function EmptyState({
	icon,
	title,
	copy,
}: {
	icon: IconName;
	title: string;
	copy: string;
}) {
	return (
		<div className="empty-state">
			<div>
				<Icon name={icon} />
			</div>
			<strong>{title}</strong>
			<p>{copy}</p>
		</div>
	);
}

function formatMonth(date: string) {
	return new Intl.DateTimeFormat(undefined, { month: "short" }).format(
		new Date(date),
	);
}

function formatDay(date: string) {
	return new Intl.DateTimeFormat(undefined, { day: "numeric" }).format(
		new Date(date),
	);
}

function formatTime(date: string) {
	return new Intl.DateTimeFormat(undefined, {
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(date));
}

type IconName =
	| "alert"
	| "arrow"
	| "calendar"
	| "chart"
	| "check"
	| "chevron"
	| "clock"
	| "courses"
	| "external"
	| "globe"
	| "grid"
	| "key"
	| "lock"
	| "logout"
	| "refresh"
	| "shield";

function Icon({ name }: { name: IconName }) {
	const paths: Record<IconName, React.ReactNode> = {
		alert: (
			<>
				<circle cx="12" cy="12" r="9" />
				<path d="M12 8v5M12 16h.01" />
			</>
		),
		arrow: (
			<>
				<path d="M5 12h14M14 7l5 5-5 5" />
			</>
		),
		calendar: (
			<>
				<rect x="3" y="5" width="18" height="16" rx="2" />
				<path d="M16 3v4M8 3v4M3 10h18" />
			</>
		),
		chart: (
			<>
				<path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
			</>
		),
		check: (
			<>
				<circle cx="12" cy="12" r="9" />
				<path d="m8 12 2.5 2.5L16 9" />
			</>
		),
		chevron: <path d="m9 18 6-6-6-6" />,
		clock: (
			<>
				<circle cx="12" cy="12" r="9" />
				<path d="M12 7v5l3 2" />
			</>
		),
		courses: (
			<>
				<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
				<path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
			</>
		),
		external: (
			<>
				<path d="M14 4h6v6M20 4l-9 9" />
				<path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
			</>
		),
		globe: (
			<>
				<circle cx="12" cy="12" r="9" />
				<path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
			</>
		),
		grid: (
			<>
				<rect x="3" y="3" width="7" height="7" rx="1" />
				<rect x="14" y="3" width="7" height="7" rx="1" />
				<rect x="3" y="14" width="7" height="7" rx="1" />
				<rect x="14" y="14" width="7" height="7" rx="1" />
			</>
		),
		key: (
			<>
				<circle cx="8" cy="15" r="4" />
				<path d="m11 12 8-8M16 7l3 3M14 9l2 2" />
			</>
		),
		lock: (
			<>
				<rect x="5" y="10" width="14" height="11" rx="2" />
				<path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
			</>
		),
		logout: (
			<>
				<path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5M14 8l4 4-4 4M18 12H8" />
			</>
		),
		refresh: (
			<>
				<path d="M20 7v5h-5" />
				<path d="M18.5 16a8 8 0 1 1 .7-8.8L20 12" />
			</>
		),
		shield: (
			<>
				<path d="M12 3 5 6v5c0 4.6 2.8 8.6 7 10 4.2-1.4 7-5.4 7-10V6z" />
				<path d="m9 12 2 2 4-4" />
			</>
		),
	};

	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			{paths[name]}
		</svg>
	);
}
