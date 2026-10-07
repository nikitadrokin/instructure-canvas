import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Download,
  File as FileIcon,
  FileText,
  Folder,
  FolderOpen,
  ImageIcon,
  Lock,
} from "lucide-react";
import { type ReactElement, useState } from "react";
import { formatBytes, formatDate } from "@/components/courses/items/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CanvasFile } from "@/integrations/canvas/client";
import { canvasFileContentPath } from "@/integrations/canvas/file-paths";
import {
  childFolders,
  findRootFolder,
  folderPath,
} from "@/integrations/canvas/file-tree";
import { useCanvasStore } from "@/integrations/canvas/store";
import { useCoursePageTitle } from "@/integrations/canvas/use-course-title";
import { useTRPC } from "@/integrations/trpc/react";

function fileIcon(file: CanvasFile): ReactElement {
  if (file.mime_class === "image") return <ImageIcon />;
  if (file.mime_class === "pdf" || file.mime_class === "doc")
    return <FileText />;
  return <FileIcon />;
}

/** Folder browser for a course's Canvas files. */
export function CourseFiles({
  courseId,
  folderId,
}: {
  courseId: string;
  folderId?: string;
}): ReactElement {
  const trpc = useTRPC();
  const ready = useCanvasStore((state) => state.sessionReady);
  const [search, setSearch] = useState("");

  const folders = useQuery(
    trpc.canvas.courseFolders.queryOptions(
      { courseId },
      { enabled: ready, retry: false, staleTime: 5 * 60_000 },
    ),
  );
  const root = folders.data ? findRootFolder(folders.data) : undefined;
  const current = folders.data
    ? (folders.data.find(
        (folder) => folder.id === folderId && !folder.hidden_for_user,
      ) ?? root)
    : undefined;
  const files = useQuery(
    trpc.canvas.folderFiles.queryOptions(
      { courseId, folderId: current?.id ?? "0" },
      {
        enabled: ready && Boolean(current),
        retry: false,
        staleTime: 5 * 60_000,
      },
    ),
  );

  const needle = search.trim().toLocaleLowerCase();
  const matches = (name: string) => name.toLocaleLowerCase().includes(needle);
  const subfolders =
    folders.data && current
      ? childFolders(folders.data, current.id).filter((folder) =>
          matches(folder.name),
        )
      : [];
  const visibleFiles = (files.data ?? []).filter(
    (file) => !file.hidden && matches(file.display_name),
  );
  const path =
    folders.data && current ? folderPath(folders.data, current.id) : [];
  const error = folders.error ?? files.error;
  useCoursePageTitle(
    courseId,
    current?.parent_folder_id ? current.name : "Files",
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Breadcrumb>
          <BreadcrumbList>
            {path.map((folder, index) => {
              const last = index === path.length - 1;
              const label = folder.parent_folder_id ? folder.name : "Files";
              return (
                <BreadcrumbItem key={folder.id}>
                  {last ? (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      render={
                        <Link
                          to="/courses/$courseId/files"
                          params={{ courseId }}
                          search={{
                            folder: folder.parent_folder_id
                              ? folder.id
                              : undefined,
                          }}
                        />
                      }
                    >
                      {label}
                    </BreadcrumbLink>
                  )}
                  {last ? null : <BreadcrumbSeparator />}
                </BreadcrumbItem>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
        <Input
          aria-label="Search files"
          placeholder="Search this folder…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
      </div>

      {folders.isPending || (current && files.isPending) ? (
        <div className="grid gap-2">
          <span className="sr-only">Loading files</span>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {error ? (
        <Alert variant="error">
          <AlertTitle>Couldn&rsquo;t load files</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
          <Button
            variant="outline"
            onClick={() => {
              folders.refetch();
              files.refetch();
            }}
          >
            Retry
          </Button>
        </Alert>
      ) : null}

      {folders.data && !current ? (
        <FilesEmpty
          title="No files"
          description="Canvas did not return a files folder for this course."
        />
      ) : null}

      {current && files.data ? (
        subfolders.length || visibleFiles.length ? (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead className="w-px">
                    <span className="sr-only">Download</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subfolders.map((folder) => (
                  <TableRow key={`folder-${folder.id}`}>
                    <TableCell className="font-medium">
                      <Link
                        to="/courses/$courseId/files"
                        params={{ courseId }}
                        search={{ folder: folder.id }}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Folder className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{folder.name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {folder.files_count != null
                        ? `${folder.files_count} files`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {folder.updated_at ? formatDate(folder.updated_at) : "—"}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ))}
                {visibleFiles.map((file) => (
                  <TableRow key={`file-${file.id}`}>
                    <TableCell className="font-medium">
                      {file.locked_for_user ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Lock className="size-4 shrink-0" />
                          <span className="truncate">{file.display_name}</span>
                        </span>
                      ) : (
                        <Link
                          to="/courses/$courseId/files/$fileId"
                          params={{ courseId, fileId: file.id }}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <span className="shrink-0 text-muted-foreground [&_svg]:size-4">
                            {fileIcon(file)}
                          </span>
                          <span className="truncate">{file.display_name}</span>
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {file.size != null ? formatBytes(file.size) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {file.updated_at ? formatDate(file.updated_at) : "—"}
                    </TableCell>
                    <TableCell>
                      {file.locked_for_user ? null : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={
                            // biome-ignore lint/a11y/useAnchorContent: Button children supply the rendered anchor's accessible text
                            <a
                              href={canvasFileContentPath(
                                courseId,
                                file.id,
                                true,
                              )}
                              aria-label={`Download ${file.display_name}`}
                            />
                          }
                        >
                          <Download />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <FilesEmpty
            title={needle ? "No matches" : "This folder is empty"}
            description={
              needle
                ? "No files or folders match your search."
                : "There are no files in this folder."
            }
          />
        )
      ) : null}
    </div>
  );
}

function FilesEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}): ReactElement {
  return (
    <Card>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen />
          </EmptyMedia>
          <EmptyTitle>{title}</EmptyTitle>
          <EmptyDescription>{description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </Card>
  );
}
