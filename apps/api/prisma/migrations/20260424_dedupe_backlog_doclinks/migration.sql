-- One-shot dedupe: remove duplicate Backlog/DocLink rows created by buggy migration logic.
-- Keep the row with the smallest id per (projectId, content) tuple.

DELETE FROM "BacklogItem" a
USING "BacklogItem" b
WHERE a."projectId" = b."projectId"
  AND a.text = b.text
  AND a.id > b.id;

DELETE FROM "DocLink" a
USING "DocLink" b
WHERE a."projectId" = b."projectId"
  AND a.title = b.title
  AND a.url = b.url
  AND a.id > b.id;
