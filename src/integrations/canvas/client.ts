import { isIP } from "node:net";
import { z } from "zod";

const canvasProfileSchema = z.object({
	id: z.string(),
	name: z.string(),
	short_name: z.string().optional(),
	sortable_name: z.string().optional(),
	avatar_url: z.string().optional(),
	primary_email: z.string().optional(),
	locale: z.string().optional(),
	time_zone: z.string().optional(),
});

const canvasEnrollmentSchema = z
	.object({
		type: z.string().optional(),
		role: z.string().optional(),
		enrollment_state: z.string().optional(),
		computed_current_score: z.number().nullable().optional(),
		computed_current_grade: z.string().nullable().optional(),
		current_score: z.number().nullable().optional(),
		current_grade: z.string().nullable().optional(),
		last_activity_at: z.string().nullable().optional(),
		total_activity_time: z.number().optional(),
	})
	.passthrough();

const canvasCourseSchema = z
	.object({
		id: z.string(),
		name: z.string().nullable().optional(),
		course_code: z.string(),
		workflow_state: z.string().optional(),
		start_at: z.string().nullable().optional(),
		end_at: z.string().nullable().optional(),
		html_url: z.string().optional(),
		term: z
			.object({
				id: z.string(),
				name: z.string(),
				start_at: z.string().nullable().optional(),
				end_at: z.string().nullable().optional(),
			})
			.nullable()
			.optional(),
		enrollments: z.array(canvasEnrollmentSchema).optional(),
	})
	.passthrough();

const canvasUpcomingItemSchema = z
	.object({
		id: z.string(),
		title: z.string(),
		start_at: z.string().nullable().optional(),
		end_at: z.string().nullable().optional(),
		html_url: z.string().optional(),
		context_code: z.string().optional(),
		type: z.string().optional(),
		assignment: z
			.object({
				id: z.string(),
				name: z.string(),
				due_at: z.string().nullable().optional(),
				points_possible: z.number().nullable().optional(),
				html_url: z.string().optional(),
			})
			.passthrough()
			.optional(),
	})
	.passthrough();

const canvasErrorSchema = z.object({
	errors: z
		.array(
			z.union([
				z.object({ message: z.string() }),
				z.object({ error_code: z.string(), message: z.string().optional() }),
			]),
		)
		.optional(),
	message: z.string().optional(),
});

export type CanvasProfile = z.infer<typeof canvasProfileSchema>;
export type CanvasCourse = z.infer<typeof canvasCourseSchema>;
export type CanvasUpcomingItem = z.infer<typeof canvasUpcomingItemSchema>;

export class CanvasApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "CanvasApiError";
	}
}

function isAllowedHostname(hostname: string) {
	if (
		hostname === "localhost" ||
		hostname.endsWith(".localhost") ||
		hostname.endsWith(".local") ||
		hostname.endsWith(".internal") ||
		isIP(hostname) !== 0
	) {
		return false;
	}

	const allowlist = process.env.CANVAS_ALLOWED_HOSTS?.split(",")
		.map((host) => host.trim().toLowerCase())
		.filter(Boolean);

	if (!allowlist?.length) return true;

	return allowlist.some((entry) => {
		if (entry.startsWith("*.")) {
			const suffix = entry.slice(1);
			return hostname.endsWith(suffix) && hostname !== suffix.slice(1);
		}
		return hostname === entry;
	});
}

export function normalizeCanvasOrigin(value: string) {
	const candidate = value.includes("://") ? value : `https://${value}`;
	let url: URL;

	try {
		url = new URL(candidate);
	} catch {
		throw new CanvasApiError("Enter a valid Canvas domain.", 400);
	}

	if (
		url.protocol !== "https:" ||
		url.username ||
		url.password ||
		(url.port && url.port !== "443") ||
		(url.pathname !== "/" && url.pathname !== "") ||
		url.search ||
		url.hash ||
		!isAllowedHostname(url.hostname.toLowerCase())
	) {
		throw new CanvasApiError(
			"Use a public HTTPS Canvas domain without a path, query, or port.",
			400,
		);
	}

	return url.origin;
}

function getNextLink(header: string | null) {
	if (!header) return null;

	for (const segment of header.split(",")) {
		const match = segment.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
		if (match?.[1]) return match[1];
	}

	return null;
}

async function getCanvasError(response: Response) {
	try {
		const body = canvasErrorSchema.safeParse(await response.json());
		if (!body.success) return null;
		return (
			body.data.message ??
			body.data.errors?.find((error) => "message" in error)?.message ??
			null
		);
	} catch {
		return null;
	}
}

function createCanvasFetch(origin: string, token: string) {
	const headers = {
		Accept: "application/json+canvas-string-ids",
		Authorization: `Bearer ${token}`,
	};

	return async function canvasFetch(pathOrUrl: string) {
		const url = new URL(pathOrUrl, origin);

		if (url.origin !== origin || !url.pathname.startsWith("/api/v1/")) {
			throw new CanvasApiError(
				"Canvas returned an unsafe pagination link.",
				502,
			);
		}

		let response: Response;
		try {
			response = await fetch(url, {
				headers,
				redirect: "manual",
				signal: AbortSignal.timeout(12_000),
			});
		} catch {
			throw new CanvasApiError(
				"Could not reach that Canvas instance. Check the domain and try again.",
				502,
			);
		}

		if (!response.ok) {
			const canvasMessage = await getCanvasError(response);
			const fallback =
				response.status === 401
					? "Canvas rejected this access token."
					: response.status === 403
						? "This token does not have permission to read that data."
						: response.status === 429
							? "Canvas is rate limiting requests. Wait a moment and try again."
							: "Canvas could not complete the request.";

			throw new CanvasApiError(canvasMessage ?? fallback, response.status);
		}

		return response;
	};
}

async function fetchAllPages<T>(
	canvasFetch: ReturnType<typeof createCanvasFetch>,
	path: string,
	schema: z.ZodType<T>,
) {
	const items: T[] = [];
	let nextUrl: string | null = path;
	let page = 0;

	while (nextUrl && page < 10) {
		const response = await canvasFetch(nextUrl);
		const parsed = z.array(schema).safeParse(await response.json());

		if (!parsed.success) {
			throw new CanvasApiError("Canvas returned an unexpected response.", 502);
		}

		items.push(...parsed.data);
		nextUrl = getNextLink(response.headers.get("link"));
		page += 1;
	}

	return items;
}

export async function getCanvasDashboard(input: {
	canvasUrl: string;
	token: string;
}) {
	const origin = normalizeCanvasOrigin(input.canvasUrl);
	const canvasFetch = createCanvasFetch(origin, input.token);
	const courseParams = new URLSearchParams({
		enrollment_state: "active",
		per_page: "50",
	});
	courseParams.append("state[]", "available");
	courseParams.append("include[]", "term");
	courseParams.append("include[]", "total_scores");
	courseParams.append("include[]", "current_grading_period_scores");

	const upcomingParams = new URLSearchParams({ per_page: "25" });

	const [profileResponse, courses, upcoming] = await Promise.all([
		canvasFetch("/api/v1/users/self/profile"),
		fetchAllPages(
			canvasFetch,
			`/api/v1/courses?${courseParams}`,
			canvasCourseSchema,
		),
		fetchAllPages(
			canvasFetch,
			`/api/v1/users/self/upcoming_events?${upcomingParams}`,
			canvasUpcomingItemSchema,
		),
	]);

	const profile = canvasProfileSchema.safeParse(await profileResponse.json());
	if (!profile.success) {
		throw new CanvasApiError("Canvas returned an unexpected profile.", 502);
	}

	return {
		origin,
		connectedAt: new Date(),
		profile: profile.data,
		courses,
		upcoming: upcoming.sort((a, b) => {
			const aTime = a.assignment?.due_at ?? a.start_at;
			const bTime = b.assignment?.due_at ?? b.start_at;
			if (!aTime) return 1;
			if (!bTime) return -1;
			return new Date(aTime).getTime() - new Date(bTime).getTime();
		}),
	};
}
