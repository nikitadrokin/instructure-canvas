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
    /** Present when `include[]=favorites` is requested. */
    is_favorite: z.boolean().optional(),
  })
  .passthrough();

const canvasFileSchema = z
  .object({
    id: canvasIdSchema,
    display_name: z.string(),
    filename: z.string().optional(),
    "content-type": z.string().optional(),
    url: z.string().optional(),
    size: z.number().nullable().optional(),
    created_at: nullableStringSchema,
    updated_at: nullableStringSchema,
    folder_id: canvasIdSchema.nullable().optional(),
    mime_class: z.string().optional(),
    thumbnail_url: nullableStringSchema,
    locked: z.boolean().optional(),
    hidden: z.boolean().optional(),
    locked_for_user: z.boolean().optional(),
    lock_explanation: nullableStringSchema,
  })
  .passthrough();

const canvasCommentAuthorSchema = z
  .object({
    id: canvasIdSchema.optional(),
    display_name: nullableStringSchema,
    avatar_image_url: nullableStringSchema,
  })
  .passthrough();

const canvasSubmissionCommentSchema = z
  .object({
    id: canvasIdSchema,
    author_name: nullableStringSchema,
    comment: nullableStringSchema,
    created_at: nullableStringSchema,
    author: canvasCommentAuthorSchema.nullable().optional(),
  })
  .passthrough();

/** The current user's submission for an assignment. */
const canvasSubmissionSchema = z
  .object({
    id: canvasIdSchema.optional(),
    assignment_id: canvasIdSchema.optional(),
    attempt: nullableNumberSchema,
    score: nullableNumberSchema,
    grade: nullableStringSchema,
    submitted_at: nullableStringSchema,
    graded_at: nullableStringSchema,
    posted_at: nullableStringSchema,
    /** submitted | unsubmitted | graded | pending_review */
    workflow_state: z.string().optional(),
    submission_type: nullableStringSchema,
    late: z.boolean().optional(),
    missing: z.boolean().optional(),
    excused: z.boolean().nullable().optional(),
    late_policy_status: nullableStringSchema,
    seconds_late: z.number().optional(),
    preview_url: z.string().optional(),
    body: nullableStringSchema,
    url: nullableStringSchema,
    grade_matches_current_submission: z.boolean().optional(),
    attachments: z.array(canvasFileSchema).optional(),
    submission_comments: z.array(canvasSubmissionCommentSchema).optional(),
    rubric_assessment: z
      .record(
        z.string(),
        z
          .object({
            points: nullableNumberSchema,
            rating_id: nullableStringSchema,
            comments: nullableStringSchema,
          })
          .passthrough(),
      )
      .nullable()
      .optional(),
  })
  .passthrough();

const canvasRubricRatingSchema = z
  .object({
    id: canvasIdSchema,
    description: nullableStringSchema,
    long_description: nullableStringSchema,
    points: nullableNumberSchema,
  })
  .passthrough();

const canvasRubricCriterionSchema = z
  .object({
    id: canvasIdSchema,
    description: nullableStringSchema,
    long_description: nullableStringSchema,
    points: nullableNumberSchema,
    ignore_for_scoring: z.boolean().optional(),
    ratings: z.array(canvasRubricRatingSchema).optional(),
  })
  .passthrough();

const canvasAssignmentSchema = z
  .object({
    id: canvasIdSchema,
    name: z.string(),
    description: nullableStringSchema,
    due_at: nullableStringSchema,
    unlock_at: nullableStringSchema,
    lock_at: nullableStringSchema,
    points_possible: nullableNumberSchema,
    html_url: z.string().optional(),
    submission_types: z.array(z.string()).optional(),
    allowed_extensions: z.array(z.string()).optional(),
    allowed_attempts: z.number().optional(),
    /** points | percent | letter_grade | gpa_scale | pass_fail | not_graded */
    grading_type: z.string().optional(),
    assignment_group_id: canvasIdSchema.optional(),
    position: z.number().optional(),
    workflow_state: z.string().optional(),
    published: z.boolean().optional(),
    has_submitted_submissions: z.boolean().optional(),
    omit_from_final_grade: z.boolean().optional(),
    peer_reviews: z.boolean().optional(),
    is_quiz_assignment: z.boolean().optional(),
    quiz_id: canvasIdSchema.optional(),
    discussion_topic: z
      .object({ id: canvasIdSchema })
      .passthrough()
      .nullable()
      .optional(),
    external_tool_tag_attributes: z
      .object({ url: z.string().optional() })
      .passthrough()
      .nullable()
      .optional(),
    locked_for_user: z.boolean().optional(),
    lock_explanation: nullableStringSchema,
    use_rubric_for_grading: z.boolean().optional(),
    rubric: z.array(canvasRubricCriterionSchema).nullable().optional(),
    rubric_settings: z
      .object({
        id: canvasIdSchema.optional(),
        title: nullableStringSchema,
        points_possible: nullableNumberSchema,
        free_form_criterion_comments: z.boolean().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    submission: canvasSubmissionSchema.nullable().optional(),
  })
  .passthrough();

const canvasPageSchema = z
  .object({
    page_id: canvasIdSchema,
    url: z.string().optional(),
    title: z.string(),
    body: nullableStringSchema,
    html_url: z.string().optional(),
    created_at: nullableStringSchema,
    updated_at: nullableStringSchema,
    front_page: z.boolean().optional(),
    published: z.boolean().optional(),
    locked_for_user: z.boolean().optional(),
    lock_explanation: nullableStringSchema,
  })
  .passthrough();

const canvasDiscussionTopicSchema = z
  .object({
    id: canvasIdSchema,
    title: z.string(),
    message: nullableStringSchema,
    html_url: z.string().optional(),
    posted_at: nullableStringSchema,
    last_reply_at: nullableStringSchema,
    delayed_post_at: nullableStringSchema,
    discussion_subentry_count: z.number().optional(),
    unread_count: z.number().optional(),
    /** read | unread */
    read_state: z.string().optional(),
    pinned: z.boolean().optional(),
    locked: z.boolean().optional(),
    published: z.boolean().optional(),
    is_announcement: z.boolean().optional(),
    assignment_id: canvasIdSchema.nullable().optional(),
    author: canvasCommentAuthorSchema.nullable().optional(),
    attachments: z.array(canvasFileSchema).optional(),
    locked_for_user: z.boolean().optional(),
    lock_explanation: nullableStringSchema,
  })
  .passthrough();

/** One reply in a discussion thread, as returned by the `/view` endpoint. */
export type CanvasDiscussionEntry = {
  id: string;
  user_id?: string;
  parent_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  message?: string | null;
  deleted?: boolean;
  replies?: CanvasDiscussionEntry[];
};

const canvasDiscussionEntrySchema: z.ZodType<CanvasDiscussionEntry> = z.lazy(
  () =>
    z.object({
      id: canvasIdSchema,
      user_id: canvasIdSchema.optional(),
      parent_id: canvasIdSchema.nullable().optional(),
      created_at: nullableStringSchema,
      updated_at: nullableStringSchema,
      message: nullableStringSchema,
      deleted: z.boolean().optional(),
      replies: z.array(canvasDiscussionEntrySchema).optional(),
    }),
);

const canvasDiscussionViewSchema = z
  .object({
    unread_entries: z.array(canvasIdSchema).optional(),
    participants: z.array(canvasCommentAuthorSchema).optional(),
    view: z.array(canvasDiscussionEntrySchema).optional(),
  })
  .passthrough();

const canvasQuizSchema = z
  .object({
    id: canvasIdSchema,
    title: z.string(),
    description: nullableStringSchema,
    html_url: z.string().optional(),
    /** practice_quiz | assignment | graded_survey | survey */
    quiz_type: z.string().optional(),
    assignment_id: canvasIdSchema.nullable().optional(),
    due_at: nullableStringSchema,
    unlock_at: nullableStringSchema,
    lock_at: nullableStringSchema,
    points_possible: nullableNumberSchema,
    question_count: z.number().optional(),
    time_limit: nullableNumberSchema,
    allowed_attempts: z.number().optional(),
    published: z.boolean().optional(),
    locked_for_user: z.boolean().optional(),
    lock_explanation: nullableStringSchema,
  })
  .passthrough();

const canvasModuleItemSchema = z
  .object({
    id: canvasIdSchema,
    title: z.string(),
    position: z.number().optional(),
    indent: z.number().nullable().optional(),
    /** File | Page | Discussion | Assignment | Quiz | SubHeader | ExternalUrl | ExternalTool */
    type: z.string().optional(),
    content_id: canvasIdSchema.optional(),
    html_url: z.string().optional(),
    page_url: z.string().optional(),
    external_url: z.string().optional(),
    new_tab: z.boolean().nullable().optional(),
    published: z.boolean().optional(),
    completion_requirement: z
      .object({
        /** must_view | must_submit | must_contribute | min_score | min_percentage | must_mark_done */
        type: z.string().optional(),
        min_score: nullableNumberSchema,
        completed: z.boolean().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    content_details: z
      .object({
        points_possible: nullableNumberSchema,
        due_at: nullableStringSchema,
        unlock_at: nullableStringSchema,
        lock_at: nullableStringSchema,
        locked_for_user: z.boolean().optional(),
        lock_explanation: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const canvasModuleSchema = z
  .object({
    id: canvasIdSchema,
    name: z.string(),
    position: z.number().optional(),
    /** Student progress: locked | unlocked | started | completed */
    state: z.string().optional(),
    unlock_at: nullableStringSchema,
    require_sequential_progress: z.boolean().optional(),
    /** all | one */
    requirement_type: z.string().optional(),
    prerequisite_module_ids: z.array(canvasIdSchema).optional(),
    completed_at: nullableStringSchema,
    published: z.boolean().optional(),
    items_count: z.number().optional(),
    // Canvas omits inline items when a module is too large; see getCourseDetail.
    items: z.array(canvasModuleItemSchema).nullable().optional(),
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

const canvasCourseNicknameSchema = z
  .object({
    course_id: canvasIdSchema,
    nickname: z.string(),
  })
  .passthrough();

/**
 * Assignment objects from GET /api/v1/users/self/missing_submissions.
 * Description HTML is omitted on purpose; `include[]=course` is optional.
 * @see https://developerdocs.instructure.com/services/canvas/resources/users
 */
const canvasMissingAssignmentSchema = z
  .object({
    id: canvasIdSchema,
    name: z.string(),
    due_at: nullableStringSchema,
    points_possible: nullableNumberSchema,
    html_url: z.string().optional(),
    course_id: canvasIdSchema.optional(),
    course: z
      .object({
        id: canvasIdSchema,
        name: nullableStringSchema,
        course_code: nullableStringSchema,
      })
      .passthrough()
      .optional(),
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

/**
 * CalendarEvent and AssignmentEvent from GET /api/v1/calendar_events.
 * @see https://developerdocs.instructure.com/services/canvas/resources/calendar_events
 */
const canvasCalendarEventSchema = z
  .object({
    id: canvasIdSchema,
    title: z.string().optional(),
    start_at: nullableStringSchema,
    end_at: nullableStringSchema,
    location_name: nullableStringSchema,
    location_address: nullableStringSchema,
    context_code: z.string().optional(),
    context_name: nullableStringSchema,
    html_url: z.string().optional(),
    url: z.string().optional(),
    all_day: z.boolean().optional(),
    all_day_date: nullableStringSchema,
    workflow_state: z.string().optional(),
    hidden: z.boolean().optional(),
    assignment: z
      .object({
        id: canvasIdSchema,
        name: z.string().optional(),
        due_at: nullableStringSchema,
        points_possible: nullableNumberSchema,
        html_url: z.string().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough();

/**
 * Saved calendar colors from GET /api/v1/users/self/colors.
 * @see https://developerdocs.instructure.com/services/canvas/resources/users
 */
const canvasCustomColorsSchema = z
  .object({
    custom_colors: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

/** Canvas calendar query type. Assignments are a separate list from events. */
export type CanvasCalendarKind = "event" | "assignment";

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
  nickname?: string;
  /** Starred in Canvas (`include[]=favorites`). */
  is_favorite: boolean;
};

/**
 * One dated item on the local calendar, normalized from Canvas events or
 * assignment due dates. Description HTML is omitted on purpose.
 */
export type CanvasCalendarItem = {
  id: string;
  kind: CanvasCalendarKind;
  title: string;
  start_at?: string | null;
  end_at?: string | null;
  all_day: boolean;
  all_day_date?: string | null;
  location_name?: string;
  context_code?: string;
  context_name?: string | null;
  html_url?: string;
  points_possible?: number | null;
};

/** Past-due assignment with no submission, from `missing_submissions`. */
export type CanvasMissingItem = {
  id: string;
  name: string;
  due_at?: string | null;
  points_possible?: number | null;
  html_url?: string;
  course_id?: string;
  course_name?: string | null;
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
  missing: CanvasMissingItem[];
};

export type CanvasAssignment = z.infer<typeof canvasAssignmentSchema>;
export type CanvasSubmission = z.infer<typeof canvasSubmissionSchema>;
export type CanvasPage = z.infer<typeof canvasPageSchema>;
export type CanvasDiscussionTopic = z.infer<typeof canvasDiscussionTopicSchema>;
export type CanvasQuiz = z.infer<typeof canvasQuizSchema>;
export type CanvasFile = z.infer<typeof canvasFileSchema>;
export type CanvasRubricCriterion = z.infer<typeof canvasRubricCriterionSchema>;

/** Content behind a module item, keyed by the item's Canvas type. */
export type CanvasModuleItemContent =
  | { kind: "page"; page: CanvasPage }
  | { kind: "assignment"; assignment: CanvasAssignment }
  | {
      kind: "discussion";
      topic: CanvasDiscussionTopic;
      entries: CanvasDiscussionEntry[];
      participants: Array<z.infer<typeof canvasCommentAuthorSchema>>;
    }
  | { kind: "quiz"; quiz: CanvasQuiz }
  | { kind: "file"; file: CanvasFile };

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
    params.append("include[]", "favorites");

    return this.fetchAllPages(
      `/api/v1/courses?${params}`,
      canvasCourseSchema,
      "course list",
    );
  }

  async getCourseNicknames() {
    return this.fetchAllPages(
      "/api/v1/users/self/course_nicknames?per_page=100",
      canvasCourseNicknameSchema,
      "course nickname list",
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
    moduleParams.append("include[]", "content_details");
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
    // Canvas drops inline items for large modules even with include[]=items,
    // so backfill each missing list from the module items endpoint.
    const modules =
      moduleResult.status === "fulfilled"
        ? await Promise.all(
            moduleResult.value.map(async (module) =>
              module.items != null
                ? module
                : {
                    ...module,
                    items: await this.getModuleItems(courseId, module.id).catch(
                      () => undefined,
                    ),
                  },
            ),
          )
        : [];
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
      modules,
      announcements:
        announcementResult.status === "fulfilled"
          ? announcementResult.value
          : [],
      issues,
    };
  }

  /**
   * Loads the content behind a module item using the type-specific Canvas
   * endpoint (pages, assignments, discussion topics, quizzes, files).
   */
  async getModuleItemContent(
    courseId: string,
    input: { type: string; contentId?: string; pageUrl?: string },
  ): Promise<CanvasModuleItemContent> {
    const course = encodeURIComponent(courseId);
    const contentId = input.contentId
      ? encodeURIComponent(input.contentId)
      : null;

    switch (input.type) {
      case "Page": {
        if (!input.pageUrl)
          throw new CanvasApiError("This page has no Canvas URL.", 400);
        const page = await this.parseResponse(
          canvasPageSchema,
          await this.request(
            `/api/v1/courses/${course}/pages/${encodeURIComponent(input.pageUrl)}`,
          ),
          "page",
        );
        return { kind: "page", page };
      }
      case "Assignment": {
        if (!contentId)
          throw new CanvasApiError("This assignment has no Canvas id.", 400);
        const params = new URLSearchParams();
        params.append("include[]", "submission");
        params.append("include[]", "rubric_assessment");
        const assignment = await this.parseResponse(
          canvasAssignmentSchema,
          await this.request(
            `/api/v1/courses/${course}/assignments/${contentId}?${params}`,
          ),
          "assignment",
        );
        return { kind: "assignment", assignment };
      }
      case "Discussion": {
        if (!contentId)
          throw new CanvasApiError("This discussion has no Canvas id.", 400);
        const topic = await this.parseResponse(
          canvasDiscussionTopicSchema,
          await this.request(
            `/api/v1/courses/${course}/discussion_topics/${contentId}`,
          ),
          "discussion",
        );
        // The topic view (threaded replies) is best-effort: some topics
        // have no readable view yet, and Canvas returns 403 for those.
        const view = await this.request(
          `/api/v1/courses/${course}/discussion_topics/${contentId}/view`,
        )
          .then((response) =>
            this.parseResponse(
              canvasDiscussionViewSchema,
              response,
              "discussion view",
            ),
          )
          .catch(() => ({
            view: [] as CanvasDiscussionEntry[],
            participants: [] as Array<
              z.infer<typeof canvasCommentAuthorSchema>
            >,
          }));
        return {
          kind: "discussion",
          topic,
          entries: view.view ?? [],
          participants: view.participants ?? [],
        };
      }
      case "Quiz": {
        if (!contentId)
          throw new CanvasApiError("This quiz has no Canvas id.", 400);
        const quiz = await this.parseResponse(
          canvasQuizSchema,
          await this.request(`/api/v1/courses/${course}/quizzes/${contentId}`),
          "quiz",
        );
        return { kind: "quiz", quiz };
      }
      case "File": {
        if (!contentId)
          throw new CanvasApiError("This file has no Canvas id.", 400);
        const file = await this.parseResponse(
          canvasFileSchema,
          await this.request(`/api/v1/courses/${course}/files/${contentId}`),
          "file",
        );
        return { kind: "file", file };
      }
      default:
        throw new CanvasApiError(
          "This item type can only be opened in Canvas.",
          400,
        );
    }
  }

  private async getModuleItems(courseId: string, moduleId: string) {
    const params = new URLSearchParams({ per_page: "100" });
    params.append("include[]", "content_details");
    return this.fetchAllPages(
      `/api/v1/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/items?${params}`,
      canvasModuleItemSchema,
      "module item list",
    );
  }

  async getUpcomingAssignments() {
    const params = new URLSearchParams({ per_page: "25" });
    return this.fetchAllPages(
      `/api/v1/users/self/upcoming_events?${params}`,
      canvasUpcomingItemSchema,
      "upcoming list",
    );
  }

  /**
   * Past-due assignments the current user has not submitted.
   * `filter[]=submittable` drops locked items the student cannot turn in.
   * @see https://developerdocs.instructure.com/services/canvas/resources/users
   */
  async getMissingSubmissions() {
    const params = new URLSearchParams({ per_page: "100" });
    params.append("include[]", "course");
    params.append("filter[]", "submittable");
    return this.fetchAllPages(
      `/api/v1/users/self/missing_submissions?${params}`,
      canvasMissingAssignmentSchema,
      "missing submissions",
    );
  }

  /**
   * Loads dated calendar events and assignment due dates for a range.
   * Canvas accepts at most 10 `context_codes[]` per request, so larger
   * course lists are fetched in sequential batches.
   */
  async getCalendarEvents(input: {
    startDate: string;
    endDate: string;
    contextCodes: string[];
  }): Promise<CanvasCalendarItem[]> {
    const kinds: CanvasCalendarKind[] = ["event", "assignment"];
    const batches = chunkArray(input.contextCodes, 10);
    const seen = new Set<string>();
    const items: CanvasCalendarItem[] = [];

    for (const contextCodes of batches) {
      for (const kind of kinds) {
        const params = new URLSearchParams({
          type: kind,
          start_date: input.startDate,
          end_date: input.endDate,
          per_page: "100",
        });
        params.append("excludes[]", "description");
        params.append("excludes[]", "child_events");
        for (const code of contextCodes) {
          params.append("context_codes[]", code);
        }

        const page = await this.fetchAllPages(
          `/api/v1/calendar_events?${params}`,
          canvasCalendarEventSchema,
          `${kind} calendar list`,
        );
        for (const event of page) {
          const item = toCalendarItem(event, kind);
          if (!item) continue;
          const key = `${item.kind}:${item.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          items.push(item);
        }
      }
    }

    return items.sort((a, b) => {
      const aTime = a.start_at ?? a.all_day_date;
      const bTime = b.start_at ?? b.all_day_date;
      if (!aTime) return 1;
      if (!bTime) return -1;
      const byTime = new Date(aTime).getTime() - new Date(bTime).getTime();
      if (byTime !== 0) return byTime;
      return a.title.localeCompare(b.title);
    });
  }

  /**
   * Loads this user's saved calendar colors, keyed by context code.
   * Missing or empty maps are treated as no custom colors.
   */
  async getCustomColors(): Promise<Record<string, string>> {
    const response = await this.parseResponse(
      canvasCustomColorsSchema,
      await this.request("/api/v1/users/self/colors"),
      "calendar colors",
    );
    return response.custom_colors ?? {};
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

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size < 1) return [items];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks.length > 0 ? chunks : [[]];
}

function toCalendarItem(
  event: z.infer<typeof canvasCalendarEventSchema>,
  kind: CanvasCalendarKind,
): CanvasCalendarItem | null {
  if (event.hidden || event.workflow_state === "deleted") return null;

  const assignmentName = event.assignment?.name;
  return {
    id: event.id,
    kind,
    title: assignmentName ?? event.title ?? "Canvas event",
    start_at: event.start_at,
    end_at: event.end_at,
    all_day: event.all_day ?? false,
    all_day_date: event.all_day_date,
    location_name: compactString(event.location_name),
    context_code: event.context_code,
    context_name: event.context_name,
    html_url: event.html_url ?? event.url ?? event.assignment?.html_url,
    points_possible: event.assignment?.points_possible,
  };
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

function toCourse(
  course: z.infer<typeof canvasCourseSchema>,
  nickname?: string,
): CanvasCourse {
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
    nickname,
    is_favorite: course.is_favorite === true,
  };
}

function courseSortLabel(course: CanvasCourse): string {
  return (course.nickname ?? course.name ?? course.course_code).toLowerCase();
}

/** Starred (real) courses first, then helpers, then name. */
function compareCoursesByFavorite(a: CanvasCourse, b: CanvasCourse): number {
  if (a.is_favorite !== b.is_favorite) {
    return a.is_favorite ? -1 : 1;
  }
  return courseSortLabel(a).localeCompare(courseSortLabel(b));
}

/**
 * Courses the user starred in Canvas. If none are starred yet, Canvas has
 * not recorded favorites, so fall back to the full enrollment list.
 */
export function primaryCourses(courses: CanvasCourse[]): CanvasCourse[] {
  const starred = courses.filter((course) => course.is_favorite);
  return starred.length > 0 ? starred : courses;
}

function upcomingBelongsToCourse(
  item: CanvasUpcomingItem,
  courseIds: Set<string>,
): boolean {
  const code = item.context_code;
  if (!code?.startsWith("course_")) return true;
  return courseIds.has(code.slice("course_".length));
}

function missingBelongsToCourse(
  item: CanvasMissingItem,
  courseIds: Set<string>,
): boolean {
  if (!item.course_id) return true;
  return courseIds.has(item.course_id);
}

function toMissingItem(
  item: z.infer<typeof canvasMissingAssignmentSchema>,
): CanvasMissingItem {
  return {
    id: item.id,
    name: item.name,
    due_at: item.due_at,
    points_possible: item.points_possible,
    html_url: item.html_url,
    course_id: item.course_id ?? item.course?.id,
    course_name: item.course?.name ?? item.course?.course_code ?? null,
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
 * `get-current-user`, `list-courses`, and `get-upcoming-assignments`, plus
 * `GET /api/v1/users/self/missing_submissions`.
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
    const [user, courses, upcoming, missing, nicknames] = await Promise.all([
      client.getCurrentUser(),
      client.getCourses("active"),
      client.getUpcomingAssignments(),
      client.getMissingSubmissions().catch((error) => {
        if (
          error instanceof CanvasApiError &&
          (error.status === 403 || error.status === 404)
        ) {
          return [];
        }
        throw error;
      }),
      client.getCourseNicknames().catch(() => []),
    ]);
    const nicknamesByCourse = new Map(
      nicknames.map((item) => [item.course_id, item.nickname]),
    );
    const mappedCourses = courses
      .map((course) => toCourse(course, nicknamesByCourse.get(course.id)))
      .sort(compareCoursesByFavorite);
    const starredIds = new Set(
      primaryCourses(mappedCourses).map((course) => course.id),
    );

    return {
      origin,
      connectedAt: new Date(),
      profile: toProfile(user),
      courses: mappedCourses,
      upcoming: upcoming
        .map(toUpcomingItem)
        .filter((item) => upcomingBelongsToCourse(item, starredIds))
        .sort((a, b) => {
          const aTime = a.assignment?.due_at ?? a.start_at;
          const bTime = b.assignment?.due_at ?? b.start_at;
          if (!aTime) return 1;
          if (!bTime) return -1;
          return new Date(aTime).getTime() - new Date(bTime).getTime();
        }),
      missing: missing
        .map(toMissingItem)
        .filter((item) => missingBelongsToCourse(item, starredIds))
        .sort((a, b) => {
          if (!a.due_at) return 1;
          if (!b.due_at) return -1;
          return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
        }),
    };
  } finally {
    client.forgetCredentials();
  }
}
