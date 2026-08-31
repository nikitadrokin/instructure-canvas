import { lookup as dnsLookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

/**
 * Canvas API error with an HTTP status for tRPC mapping.
 */
export class CanvasApiError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "CanvasApiError";
	}
}

/**
 * Default allowlist matches the hosted MCP: Instructure-hosted Canvas only.
 * Custom school domains belong in `CANVAS_ALLOWED_HOSTS`, never as allow-all.
 */
const DEFAULT_ALLOWED_HOSTS = [".instructure.com"];

/**
 * DNS labels only: lowercase letters, digits, hyphens, and dots.
 * Rejects IPs, underscores, spaces, and single-label hosts.
 */
const HOSTNAME_PATTERN =
	/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const BLOCKED_NETWORKS = new BlockList();
BLOCKED_NETWORKS.addSubnet("0.0.0.0", 8, "ipv4");
BLOCKED_NETWORKS.addSubnet("10.0.0.0", 8, "ipv4");
BLOCKED_NETWORKS.addSubnet("100.64.0.0", 10, "ipv4");
BLOCKED_NETWORKS.addSubnet("127.0.0.0", 8, "ipv4");
BLOCKED_NETWORKS.addSubnet("169.254.0.0", 16, "ipv4");
BLOCKED_NETWORKS.addSubnet("172.16.0.0", 12, "ipv4");
BLOCKED_NETWORKS.addSubnet("192.168.0.0", 16, "ipv4");
BLOCKED_NETWORKS.addSubnet("::1", 128, "ipv6");
BLOCKED_NETWORKS.addSubnet("fc00::", 7, "ipv6");
BLOCKED_NETWORKS.addSubnet("fe80::", 10, "ipv6");

/**
 * Resolves a hostname to addresses. Injectable in tests so DNS is not live.
 */
export type HostnameLookup = (
	hostname: string,
) => Promise<Array<{ address: string; family: number }>>;

/**
 * Optional hostname allowlist from `CANVAS_ALLOWED_HOSTS`.
 * Defaults to Instructure-hosted Canvas (`*.instructure.com`).
 */
export function getAllowedCanvasHosts(
	value = process.env.CANVAS_ALLOWED_HOSTS,
) {
	const configuredHosts = value
		?.split(",")
		.map((host) => host.trim().toLowerCase())
		.filter(Boolean);

	return configuredHosts?.length ? configuredHosts : DEFAULT_ALLOWED_HOSTS;
}

/**
 * `*` in the allowlist is a public SSRF hole. It is ignored unless this is
 * explicitly set to the string `true`.
 */
export function isUnrestrictedCanvasHostsEnabled(
	value = process.env.CANVAS_ALLOW_UNRESTRICTED_HOSTS,
) {
	return value === "true";
}

/**
 * Returns whether a hostname matches a Canvas host allowlist.
 */
export function isAllowedCanvasHost(
	hostname: string,
	allowedHosts: string[],
	allowUnrestricted = isUnrestrictedCanvasHostsEnabled(),
) {
	if (allowedHosts.includes("*")) {
		if (!allowUnrestricted) {
			throw new CanvasApiError(
				"CANVAS_ALLOWED_HOSTS=* is refused unless CANVAS_ALLOW_UNRESTRICTED_HOSTS=true.",
				400,
			);
		}
		return true;
	}

	return allowedHosts.some((entry) => matchesHostRule(hostname, entry));
}

/**
 * True when an IP must never be used as a Canvas destination.
 */
export function isBlockedDestinationIp(address: string) {
	const family = isIP(address);
	if (family === 4) {
		return BLOCKED_NETWORKS.check(address, "ipv4");
	}
	if (family === 6) {
		if (BLOCKED_NETWORKS.check(address, "ipv6")) {
			return true;
		}
		const mapped = address.toLowerCase();
		if (mapped.startsWith("::ffff:")) {
			const ipv4 = mapped.slice("::ffff:".length);
			return isIP(ipv4) === 4 && BLOCKED_NETWORKS.check(ipv4, "ipv4");
		}
		return false;
	}
	return true;
}

/**
 * Sanitizes a user-controlled Canvas institution value to `https://{host}`.
 * Paths, query strings, credentials, ports, and IPs are stripped or rejected.
 */
export function normalizeCanvasBaseUrl(
	value: string,
	allowedHosts = getAllowedCanvasHosts(),
	allowInsecure = process.env.ALLOW_INSECURE_CANVAS_URLS === "true",
	allowUnrestricted = isUnrestrictedCanvasHostsEnabled(),
) {
	const candidate = value.trim();
	if (!candidate) {
		throw new CanvasApiError("Enter a valid Canvas domain.", 400);
	}

	if (hasControlChars(candidate) || candidate.includes("@")) {
		throw new CanvasApiError("Enter a valid Canvas domain.", 400);
	}

	let url: URL;
	try {
		url = new URL(
			candidate.includes("://") ? candidate : `https://${candidate}`,
		);
	} catch {
		throw new CanvasApiError("Enter a valid Canvas domain.", 400);
	}

	if (url.username || url.password) {
		throw new CanvasApiError(
			"Use a public HTTPS Canvas domain without a path, query, or port.",
			400,
		);
	}

	if (url.protocol !== "https:" && !allowInsecure) {
		throw new CanvasApiError(
			"Use a public HTTPS Canvas domain without a path, query, or port.",
			400,
		);
	}

	if (url.port && url.port !== "443" && !allowInsecure) {
		throw new CanvasApiError(
			"Use a public HTTPS Canvas domain without a path, query, or port.",
			400,
		);
	}

	const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
	if (!HOSTNAME_PATTERN.test(hostname) || isIP(hostname)) {
		throw new CanvasApiError(
			"Use a public HTTPS Canvas domain without a path, query, or port.",
			400,
		);
	}

	if (!isAllowedCanvasHost(hostname, allowedHosts, allowUnrestricted)) {
		throw new CanvasApiError(
			"That Canvas hostname is not allowed. Standard schools use *.instructure.com; add a custom domain to CANVAS_ALLOWED_HOSTS.",
			400,
		);
	}

	return `${url.protocol}//${hostname}`;
}

/**
 * Resolves the hostname and rejects private, loopback, and link-local IPs.
 * This is a second SSRF check after the hostname allowlist.
 */
export async function assertPublicCanvasHostname(
	hostname: string,
	lookup: HostnameLookup = defaultHostnameLookup,
) {
	let records: Awaited<ReturnType<HostnameLookup>>;
	try {
		records = await lookup(hostname);
	} catch {
		throw new CanvasApiError(
			"Could not reach that Canvas instance. Check the domain and try again.",
			502,
		);
	}

	if (!records.length) {
		throw new CanvasApiError(
			"Could not reach that Canvas instance. Check the domain and try again.",
			502,
		);
	}

	for (const record of records) {
		if (isBlockedDestinationIp(record.address)) {
			throw new CanvasApiError(
				"Use a public HTTPS Canvas domain without a path, query, or port.",
				400,
			);
		}
	}
}

/**
 * Pins an outbound Canvas HTTP request to the sanitized origin and `/api/v1/`.
 */
export function assertCanvasApiRequest(baseUrl: string, requestUrl: string) {
	const base = new URL(baseUrl);
	const resolved = new URL(requestUrl, base);

	if (resolved.username || resolved.password) {
		throw new CanvasApiError(
			"Canvas requests cannot contain credentials.",
			502,
		);
	}

	if (resolved.origin !== base.origin) {
		throw new CanvasApiError("Canvas returned an unsafe pagination link.", 502);
	}

	if (!resolved.pathname.startsWith("/api/v1/")) {
		throw new CanvasApiError("Canvas returned an unsafe pagination link.", 502);
	}

	return resolved;
}

async function defaultHostnameLookup(hostname: string) {
	return dnsLookup(hostname, { all: true, verbatim: true });
}

function matchesHostRule(hostname: string, entry: string) {
	const rule = entry.toLowerCase().replace(/\.$/, "");
	if (rule.startsWith("*.")) {
		const suffix = rule.slice(2);
		return hostname === suffix || hostname.endsWith(`.${suffix}`);
	}
	if (rule.startsWith(".")) {
		const suffix = rule.slice(1);
		return hostname === suffix || hostname.endsWith(`.${suffix}`);
	}
	return hostname === rule;
}

function hasControlChars(value: string) {
	for (let index = 0; index < value.length; index += 1) {
		const code = value.charCodeAt(index);
		if (code <= 31 || code === 127) return true;
	}
	return false;
}
