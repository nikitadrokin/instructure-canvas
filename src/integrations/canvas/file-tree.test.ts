import assert from "node:assert/strict";
import { test } from "node:test";
import type { CanvasFolder } from "./client";
import { childFolders, findRootFolder, folderPath } from "./file-tree";

function folder(
  id: string,
  name: string,
  parent: string | null,
  extra: Partial<CanvasFolder> = {},
): CanvasFolder {
  return { id, name, parent_folder_id: parent, ...extra };
}

const folders = [
  folder("1", "course files", null),
  folder("3", "Week 10", "1"),
  folder("2", "Week 2", "1"),
  folder("4", "Slides", "2"),
  folder("5", "Secret", "1", { hidden_for_user: true }),
];

test("the root folder is the one without a parent", () => {
  assert.equal(findRootFolder(folders)?.id, "1");
});

test("child folders are naturally sorted and skip hidden folders", () => {
  assert.deepEqual(
    childFolders(folders, "1").map((entry) => entry.name),
    ["Week 2", "Week 10"],
  );
});

test("folder paths run from the root to the folder", () => {
  assert.deepEqual(
    folderPath(folders, "4").map((entry) => entry.name),
    ["course files", "Week 2", "Slides"],
  );
  assert.deepEqual(folderPath(folders, "999"), []);
});

test("folder paths stop on parent cycles", () => {
  const cyclic = [folder("1", "a", "2"), folder("2", "b", "1")];
  assert.equal(folderPath(cyclic, "1").length, 2);
});
