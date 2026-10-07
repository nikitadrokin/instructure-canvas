import type { CanvasFolder } from "./client";

/** Folders a student can browse, without Canvas-hidden entries. */
function visibleFolders(folders: CanvasFolder[]): CanvasFolder[] {
  return folders.filter((folder) => !folder.hidden_for_user);
}

/** The top-level "course files" folder: the one with no parent. */
export function findRootFolder(
  folders: CanvasFolder[],
): CanvasFolder | undefined {
  return visibleFolders(folders).find((folder) => !folder.parent_folder_id);
}

/** Direct subfolders of a folder, sorted by name in natural order. */
export function childFolders(
  folders: CanvasFolder[],
  parentId: string,
): CanvasFolder[] {
  return visibleFolders(folders)
    .filter((folder) => folder.parent_folder_id === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/**
 * Folders from the root down to `folderId`, for breadcrumbs. Returns an empty
 * list when the folder is unknown. Parent cycles stop the walk.
 */
export function folderPath(
  folders: CanvasFolder[],
  folderId: string,
): CanvasFolder[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: CanvasFolder[] = [];
  const seen = new Set<string>();
  let current = byId.get(folderId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parent_folder_id
      ? byId.get(current.parent_folder_id)
      : undefined;
  }
  return path;
}
