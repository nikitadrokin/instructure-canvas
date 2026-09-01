import { z } from "zod";

import {
	assertCanvasApiRequest,
	assertPublicCanvasHostname,
	CanvasApiError,
	normalizeCanvasBaseUrl,
} from "./auth";

export { CanvasApiError } from "./auth";

function devLog(event: string, details: Record<string, unknown>) {
	if (process.env.NODE_ENV === "development") {
		console.info(`[canvas] ${event}`, details);
	}
}

/**
 * Canvas IDs are numbers by default (as the MCP client uses). Some instances
 * honor `application/json+canvas-string-ids` and return strings instead.
 */
const canvasIdSchema = z.union([z.string(), z.number()]).transform(String);

const nullableNumberSchema = z.number().nullable().optional();
const nullableStringSchema = z.string().nullable().optional();

const canvasGradesSchema = z
	.object({
		current_score: nullableNumberSchema,
		current_grade: nullableStringSchema,
		unposted_current_score: nullableNumberSchema,
		unposted_current_grade: nullableStringSchema,
	})
	.passthrough();

const canvasEnrollmentSchema = z
	.object({
		type: z.string().optional(),
		role: z.string().optional(),
		enrollment_state: z.string().optional(),
		computed_current_score: nullableNumberSchema,
		computed_current_grade: nullableStringSchema,
		computed_final_score: nullableNumberSchema,
		computed_final_grade: nullableStringSchema,
		current_score: nullableNumberSchema,
		current_grade: nullableStringSchema,
		current_period_computed_current_score: nullableNumberSchema,
		current_period_computed_current_grade: nullableStringSchema,
		grades: canvasGradesSchema.optional(),
	})
	.passthrough();

const canvasUserSchema = z
	.object({
		id: canvasIdSchema,
		name: z.string(),
		short_name: z.string().optional(),
		sortable_name: z.string().optional(),
		avatar_url: nullableStringSchema,
		primary_email: nullableStringSchema,
		email: nullableStringSchema,
		locale: nullableStringSchema,
		time_zone: nullableStringSchema,
	})
	.passthrough();

const canvasCourseSchema = z
	.object({
		id: canvasIdSchema,
		name: nullableStringSchema,
		course_code: nullableStringSchema,
		workflow_state: z.string().optional(),
		start_at: nullableStringSchema,
		end_at: nullableStringSchema,
		html_url: z.string().optional(),
		term: z
			.object({
				id: canvasIdSchema,
				name: z.string(),
				start_at: nullableStringSchema,
				end_at: nullableStringSchema,
			})
			.nullable()
			.optional(),
		enrollments: z.array(canvasEnrollmentSchema).optional(),
		syllabus_body: nullableStringSchema,
		public_description: nullableStringSchema,
		default_view: nullableStringSchema,
	})
	.passthrough();

const canvasAssignmentSchema = z
	.object({
		id: canvasIdSchema,
		name: z.string(),
		due_at: nullableStringSchema,
		points_possible: nullableNumberSchema,
		html_url: z.string().optional(),
		submission_types: z.array(z.string()).optional(),
		workflow_state: z.string().optional(),
		has_submitted_submissions: z.boolean().optional(),
	})
	.passthrough();

const canvasModuleItemSchema = z
	.object({
		id: canvasIdSchema,
		title: z.string(),
		type: z.string().optional(),
		html_url: z.string().optional(),
		completion_requirement: z
			.object({ completed: z.boolean().optional() })
			.passthrough()
			.nullable()
			.optional(),
	})
	.passthrough();

const canvasModuleSchema = z
	.object({
		id: canvasIdSchema,
		name: z.string(),
		position: z.number().optional(),
		state: z.string().optional(),
		items_count: z.number().optional(),
		items: z.array(canvasModuleItemSchema).optional(),
	})
	.passthrough();

const canvasAnnouncementSchema = z
	.object({
		id: canvasIdSchema,
		title: z.string(),
		posted_at: nullableStringSchema,
		html_url: z.string().optional(),
		author: z
			.object({
				display_name: z.string().optional(),
				avatar_image_url: nullableStringSchema,
			})
			.passthrough()
			.optional(),
	})
	.passthrough();

const canvasTabSchema = z
	.object({
		id: z.string(),
		label: z.string(),
		html_url: z.string(),
		type: z.string().optional(),
		position: z.number().optional(),
		hidden: z.boolean().optional(),
		visibility: z.string().optional(),
	})
	.passthrough();

const canvasUpcomingItemSchema = z
	.object({
		id: canvasIdSchema,
		title: z.string().optional(),
		start_at: nullableStringSchema,
		end_at: nullableStringSchema,
		html_url: z.string().optional(),
		url: z.string().optional(),
		context_code: z.string().optional(),
		context_name: nullableStringSchema,
		type: z.string().optional(),
		assignment: z
			.object({
				id: canvasIdSchema,
				name: z.string().optional(),
				due_at: nullableStringSchema,
				points_possible: nullableNumberSchema,
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

/** Connected Canvas user shown in the dashboard header. */
export type CanvasProfile = {
	id: string;
	name: string;
	short_name?: string;
	sortable_name?: string;
	avatar_url?: string;
	primary_email?: string;
	locale?: string;
	time_zone?: string;
};

/** Course card fields from `GET /api/v1/courses`, matching the MCP client. */
export type CanvasCourse = {
	id: string;
	name: string | null;
	course_code: string;
	workflow_state?: string;
	start_at?: string | null;
	end_at?: string | null;
	html_url?: string;
	term?: {
		id: string;
		name: string;
		start_at?: string | null;
		end_at?: string | null;
	} | null;
	enrollments?: Array<z.infer<typeof canvasEnrollmentSchema>>;
	syllabus_body?: string | null;
	public_description?: string | null;
	default_view?: string | null;
};

/** Planner-style upcoming assignment or calendar event. */
export type CanvasUpcomingItem = {
	id: string;
	title: string;
	start_at?: string | null;
	end_at?: string | null;
	html_url?: string;
	context_code?: string;
	context_name?: string | null;
	type?: string;
	assignment?: {
		id: string;
		name: string;
		due_at?: string | null;
		points_possible?: number | null;
		html_url?: string;
	};
};

/** Normalized dashboard payload returned to the browser. Never includes the token. */
export type CanvasDashboard = {
	origin: string;
	connectedAt: Date;
	profile: CanvasProfile;
	courses: CanvasCourse[];
	upcoming: CanvasUpcomingItem[];
};

export type CanvasCourseDetail = {
	course: z.infer<typeof canvasCourseSchema>;
	tabs: Array<z.infer<typeof canvasTabSchema>>;
	assignments: Array<z.infer<typeof canvasAssignmentSchema>>;
	modules: Array<z.infer<typeof canvasModuleSchema>>;
	announcements: Array<z.infer<typeof canvasAnnouncementSchema>>;
	issues: Array<{
		section: "assignments" | "modules" | "announcements";
		message: string;
	}>;
};

/**
 * Per-call Canvas connection. Do not persist this object or its token.
 */
interface CanvasConfig {
	/** Sanitized institution origin, for example `https://school.instructure.com`. */
	baseUrl: string;
	/** Personal access token for this request only. */
	accessToken: string;
}

function getNextLink(header: string | null, origin: string) {
	if (!header) return null;

	for (const segment of header.split(",")) {
		const match = segment.match(/<([^>]+)>\s*;\s*rel="?next"?/i);
		if (!match?.[1]) continue;

		try {
			return assertCanvasApiRequest(origin, match[1]).toString();
		} catch {
			return null;
		}
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

function parseList<T>(schema: z.ZodType<T>, data: unknown, label: string) {
	if (!Array.isArray(data)) {
		throw new CanvasApiError(`Canvas returned an unexpected ${label}.`, 502);
	}

	const items = data.flatMap((item) => {
		const parsed = schema.safeParse(item);
		return parsed.success ? [parsed.data] : [];
	});

	if (data.length > 0 && items.length === 0) {
		throw new CanvasApiError(`Canvas returned an unexpected ${label}.`, 502);
	}

	return items;
}

/**
 * Canvas HTTP client used the same way as the MCP server: one instance per
 * call, Bearer auth, no redirects, `/api/v1/` only, then forget the token.
 */
export class CanvasClient {
	private readonly baseUrl: string;
	private accessToken: string | undefined;

	constructor(config: CanvasConfig) {
		this.baseUrl = config.baseUrl;
		this.accessToken = config.accessToken;
	}

	/**
	 * Drops the access token from this instance. Call after the outbound
	 * Canvas request completes so credentials do not remain in memory.
	 */
	forgetCredentials() {
		this.accessToken = undefined;
	}

	async getCurrentUser() {
		return this.parseResponse(
			canvasUserSchema,
			await this.request("/api/v1/users/self"),
			"profile",
		);
	}

	async getCourses(enrollmentState = "active") {
		const params = new URLSearchParams({
			enrollment_state: enrollmentState,
			per_page: "50",
		});
		params.append("include[]", "term");
		params.append("include[]", "total_scores");
		params.append("include[]", "current_grading_period_scores");

		return this.fetchAllPages(
			`/api/v1/courses?${params}`,
			canvasCourseSchema,
			"course list",
		);
	}

	async getCourseDetail(courseId: string): Promise<CanvasCourseDetail> {
		const encodedId = encodeURIComponent(courseId);
		const assignmentParams = new URLSearchParams({
			per_page: "100",
			order_by: "due_at",
		});
		const moduleParams = new URLSearchParams({ per_page: "100" });
		moduleParams.append("include[]", "items");
		const announcementParams = new URLSearchParams({
			per_page: "50",
			active_only: "true",
			latest_only: "false",
		});
		announcementParams.append("context_codes[]", `course_${courseId}`);

		const [course, tabs] = await Promise.all([
			this.parseResponse(
				canvasCourseSchema,
				await this.request(`/api/v1/courses/${encodedId}`),
				"course",
			),
			this.fetchAllPages(
				`/api/v1/courses/${encodedId}/tabs?per_page=100`,
				canvasTabSchema,
				"course navigation",
			),
		]);
		const availableTabIds = new Set(
			tabs
				.filter((tab) => !tab.hidden && tab.visibility !== "admins")
				.map((tab) => tab.id),
		);
		devLog("course navigation resolved", {
			courseId,
			availableTabs: [...availableTabIds],
		});
		const sectionResults = await Promise.allSettled([
			availableTabIds.has("assignments")
				? this.fetchAllPages(
						`/api/v1/courses/${encodedId}/assignments?${assignmentParams}`,
						canvasAssignmentSchema,
						"assignment list",
					)
				: Promise.resolve([]),
			availableTabIds.has("modules")
				? this.fetchAllPages(
						`/api/v1/courses/${encodedId}/modules?${moduleParams}`,
						canvasModuleSchema,
						"module list",
					)
				: Promise.resolve([]),
			availableTabIds.has("announcements")
				? this.fetchAllPages(
						`/api/v1/announcements?${announcementParams}`,
						canvasAnnouncementSchema,
						"announcement list",
					)
				: Promise.resolve([]),
		]);
		const sections = ["assignments", "modules", "announcements"] as const;
		const issues = sectionResults.flatMap((result, index) =>
			result.status === "rejected"
				? [
						{
							section: sections[index],
							message: getSafeSectionError(result.reason),
						},
					]
				: [],
		);
		const [assignmentResult, moduleResult, announcementResult] = sectionResults;
		devLog("course sections resolved", {
			courseId,
			assignments: assignmentResult.status,
			modules: moduleResult.status,
			announcements: announcementResult.status,
			issues,
		});

		return {
			course,
			tabs: tabs.filter((tab) => !tab.hidden && tab.visibility !== "admins"),
			assignments:
				assignmentResult.status === "fulfilled" ? assignmentResult.value : [],
			modules: moduleResult.status === "fulfilled" ? moduleResult.value : [],
			announcements:
				announcementResult.status === "fulfilled"
					? announcementResult.value
					: [],
			issues,
		};
	}

	async getUpcomingAssignments() {
		const params = new URLSearchParams({ per_page: "25" });
		return this.fetchAllPages(
			`/api/v1/users/self/upcoming_events?${params}`,
			canvasUpcomingItemSchema,
			"upcoming list",
		);
	}

	private async fetchAllPages<T>(
		path: string,
		schema: z.ZodType<T>,
		label: string,
	) {
		const items: T[] = [];
		let nextUrl: string | null = path;
		let page = 0;

		while (nextUrl && page < 10) {
			const response = await this.request(nextUrl);
			const data: unknown = await response.json();
			items.push(...parseList(schema, data, label));
			nextUrl = getNextLink(response.headers.get("link"), this.baseUrl);
			page += 1;
		}

		return items;
	}

	private parseResponse<T>(
		schema: z.ZodType<T>,
		response: Response,
		label: string,
	) {
		return response.json().then((data: unknown) => {
			const parsed = schema.safeParse(data);
			if (!parsed.success) {
				devLog("response validation failed", {
					label,
					status: response.status,
					issues: parsed.error.issues.map((issue) => ({
						path: issue.path.join("."),
						message: issue.message,
					})),
				});
				throw new CanvasApiError(
					`Canvas returned an unexpected ${label}.`,
					502,
				);
			}
			return parsed.data;
		});
	}

	private async request(pathOrUrl: string) {
		const token = this.accessToken;
		if (!token) {
			throw new CanvasApiError(
				"Canvas credentials are no longer available.",
				401,
			);
		}

		const url = assertCanvasApiRequest(this.baseUrl, pathOrUrl);
		const startedAt = Date.now();
		devLog("request started", {
			method: "GET",
			path: `${url.pathname}${url.search}`,
		});
		let response: Response;
		try {
			response = await fetch(url, {
				headers: {
					Accept: "application/json",
					Authorization: `Bearer ${token}`,
				},
				redirect: "manual",
				signal: AbortSignal.timeout(20_000),
			});
		} catch (error) {
			devLog("request failed", {
				method: "GET",
				path: `${url.pathname}${url.search}`,
				durationMs: Date.now() - startedAt,
				error: error instanceof Error ? error.message : "Unknown network error",
			});
			throw new CanvasApiError(
				"Could not reach that Canvas instance. Check the domain and try again.",
				502,
			);
		}
		devLog("request completed", {
			method: "GET",
			path: `${url.pathname}${url.search}`,
			status: response.status,
			durationMs: Date.now() - startedAt,
		});

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
	}
}

function compactString(value: string | null | undefined) {
	if (!value) return undefined;
	return value;
}

function getSafeSectionError(error: unknown) {
	if (error instanceof CanvasApiError) {
		if (error.status === 403)
			return "Canvas does not allow this account to view this section.";
		if (error.status === 401)
			return "Canvas requires this account to sign in again for this section.";
		return error.message;
	}
	return "Canvas could not load this section.";
}

function toProfile(user: z.infer<typeof canvasUserSchema>): CanvasProfile {
	return {
		id: user.id,
		name: user.name,
		short_name: compactString(user.short_name),
		sortable_name: compactString(user.sortable_name),
		avatar_url: compactString(user.avatar_url),
		primary_email: compactString(user.primary_email ?? user.email),
		locale: compactString(user.locale),
		time_zone: compactString(user.time_zone),
	};
}

function toCourse(course: z.infer<typeof canvasCourseSchema>): CanvasCourse {
	return {
		id: course.id,
		name: course.name ?? null,
		course_code: course.course_code ?? "",
		workflow_state: course.workflow_state,
		start_at: course.start_at,
		end_at: course.end_at,
		html_url: course.html_url,
		term: course.term
			? {
					id: course.term.id,
					name: course.term.name,
					start_at: course.term.start_at,
					end_at: course.term.end_at,
				}
			: course.term,
		enrollments: course.enrollments,
	};
}

function toUpcomingItem(
	item: z.infer<typeof canvasUpcomingItemSchema>,
): CanvasUpcomingItem {
	const assignmentName = item.assignment?.name;
	const assignment =
		item.assignment && assignmentName
			? {
					id: item.assignment.id,
					name: assignmentName,
					due_at: item.assignment.due_at,
					points_possible: item.assignment.points_possible,
					html_url: item.assignment.html_url,
				}
			: undefined;

	return {
		id: item.id,
		title: assignmentName ?? item.title ?? "Canvas event",
		start_at: item.start_at,
		end_at: item.end_at,
		html_url: item.html_url ?? item.url,
		context_code: item.context_code,
		context_name: item.context_name,
		type: item.type,
		assignment,
	};
}

/**
 * Loads the dashboard using the same Canvas endpoints as the MCP tools
 * `get-current-user`, `list-courses`, and `get-upcoming-assignments`.
 */
export async function getCanvasDashboard(input: {
	canvasUrl: string;
	token: string;
}): Promise<CanvasDashboard> {
	const origin = normalizeCanvasBaseUrl(input.canvasUrl);
	await assertPublicCanvasHostname(new URL(origin).hostname);

	const client = new CanvasClient({
		baseUrl: origin,
		accessToken: input.token,
	});

	try {
		const [user, courses, upcoming] = await Promise.all([
			client.getCurrentUser(),
			client.getCourses("active"),
			client.getUpcomingAssignments(),
		]);

		return {
			origin,
			connectedAt: new Date(),
			profile: toProfile(user),
			courses: courses.map(toCourse),
			upcoming: upcoming.map(toUpcomingItem).sort((a, b) => {
				const aTime = a.assignment?.due_at ?? a.start_at;
				const bTime = b.assignment?.due_at ?? b.start_at;
				if (!aTime) return 1;
				if (!bTime) return -1;
				return new Date(aTime).getTime() - new Date(bTime).getTime();
			}),
		};
	} finally {
		client.forgetCredentials();
	}
}
