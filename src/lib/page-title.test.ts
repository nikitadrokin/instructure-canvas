import assert from "node:assert/strict";
import { test } from "node:test";
import { formatPageTitle, SITE_TITLE } from "./page-title";

test("title parts are joined most specific first", () => {
  assert.equal(
    formatPageTitle("Week 1 reading", "Biology 101"),
    "Week 1 reading | Biology 101",
  );
});

test("empty, missing and blank parts are skipped", () => {
  assert.equal(
    formatPageTitle(undefined, "  ", "Assignments", null, "Biology 101"),
    "Assignments | Biology 101",
  );
});

test("the site name is used when there are no parts", () => {
  assert.equal(formatPageTitle(), SITE_TITLE);
  assert.equal(formatPageTitle(undefined, ""), "Instructure Canvas");
});
