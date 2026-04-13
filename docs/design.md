# CTP1 Task Manager - Design Document

## Tổng quan kiến trúc UI

Trang Project Board (`ProjectBoardPage.tsx`) gồm 3 phần chính từ trên xuống dưới:

1. **Config Event (tuần)** — `WeeklyEventTimeline.tsx`
   - Hiển thị các event bar theo tuần (Build bar + Live bar cho mỗi loại event)
   - Mỗi tuần có 1 build bar chung (VD: "T1 Build", "T2 Build") + các live bar theo event type
   - Hỗ trợ assign member vào từng tuần → tự động tạo task ở Task Detail
   - Dữ liệu event weeks lưu **localStorage** (không qua API)

2. **Dev Timeline** — `BuildTimeline.tsx` (nằm trong WeeklyEventTimeline)
   - Hiển thị các build/feature với nhiều phase (Build 1, Build 2, Live)
   - Hỗ trợ assign member vào build → tự động tạo task ở Task Detail với `buildId`
   - Dữ liệu phase lưu **localStorage**, build lưu qua **API**

3. **Task Detail** — `TreeTable.tsx` (trái) + `GanttChart.tsx` (phải)
   - TreeTable: hiển thị tasks theo tuần → member → task (dạng tree)
   - GanttChart: hiển thị Gantt bar tương ứng, kéo thả để đổi ngày
   - Dữ liệu tasks lưu qua **API** (database)

## Luồng đồng bộ thời gian (Time Sync)

### Config Event → Task Detail
- Khi resize build bar ở Config Event (tuần), callback `onWeekBuildResize` được gọi
- ProjectBoardPage tìm tasks có `title` trùng với `buildLabel` (VD: "T1 Build") và update ngày
- Khi shift 1 tuần, tất cả tuần khác cũng shift → sync hết tasks tương ứng

### Dev Timeline → Task Detail
- Khi resize phase bar trong Dev Timeline, callback `onPhaseResize` được gọi
- ProjectBoardPage tìm tasks có `buildId` trùng và update startDate/endDate theo range tổng của phases

### Task Detail → Dev Timeline
- Khi kéo Gantt bar của task có `buildId`, `handleDateChange` sẽ:
  1. Update task qua API
  2. Update phases trong localStorage (`devPhases-{buildId}`) — phase đầu nhận startDay, phase cuối nhận endDay
  3. Bump `timelineSyncKey` → BuildTimeline useEffect reload phases từ localStorage → re-render

### Task Detail → Config Event (tuần)
- Khi kéo Gantt bar của task có title dạng "T{n} Build", `handleDateChange` sẽ:
  1. Update task qua API
  2. Update eventWeeks trong localStorage (`eventWeeks-{year}-{month}`) — build bar của tuần tương ứng
  3. Bump `timelineSyncKey` → WeeklyEventTimeline useEffect reload eventWeeks từ localStorage → re-render

### Cơ chế đồng bộ (syncKey pattern)
- `timelineSyncKey` (number state) ở ProjectBoardPage bump lên khi task dates thay đổi liên quan đến timeline
- Truyền qua `syncKey` prop → WeeklyEventTimeline + BuildTimeline
- Mỗi component có useEffect watch `syncKey`, reload data từ localStorage khi thay đổi

### Assign Flow
- **Config Event assign**: `onAssignWeek` → tạo task với title = buildLabel, dates = build bar range
- **Dev Timeline assign**: `onAssignBuild` → assign user vào build + tạo task với buildId, dates = first→last phase range
- **Unassign**: xóa task tương ứng (Config Event) hoặc remove user từ build assignees (Dev Timeline)

## Thứ tự hiển thị tuần (Task Summary)

- Tuần được sort **giảm dần** (tuần 4 → 3 → 2 → 1)
- Tuần mới nhất hiển thị ở đầu để dễ theo dõi

## Thứ tự hiển thị member trong mỗi tuần

- Sort theo position: **Designer → Dev → Artist**
