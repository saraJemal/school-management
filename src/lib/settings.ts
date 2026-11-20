export const ITEM_PER_PAGE = 15;

type RouteAccessMap = {
  [key: string]: string[];
};

export const routeAccessMap: RouteAccessMap = {
  "/admin(.*)": ["admin"],
  "/student(.*)": ["student"],
  "/teacher(.*)": ["teacher"],
  "/parent(.*)": ["parent"],
  "/list/teachers": ["admin", "teacher"],
  "/list/students": ["admin", "teacher"],
  "/list/student-enrollments": ["admin"],
  "/list/parents": ["admin", "teacher"],
  "/list/subjects": ["admin"],
  "/list/admins": ["admin"],
  "/list/classes": ["admin", "teacher"],
  "/list/assessments": ["admin", "teacher"],
  "/list/results": ["admin", "teacher", "student", "parent"],
  "/list/report-cards(.*)": ["admin", "teacher"],
  "/list/academic-years": ["admin"],
  "/list/promotion-policies": ["admin"],
  "/list/attendance": ["admin", "teacher", "student", "parent"],
  "/list/supervisor-results": ["admin", "teacher"],
  "/list/events": ["admin", "teacher", "student", "parent"],
  "/list/announcements": ["admin", "teacher", "student", "parent"],
  "/list/communication-book(.*)": ["admin", "teacher", "parent"],
  "/list/performance-analysis(.*)": ["admin", "teacher"],
  "/list/messages": ["admin", "teacher"],
};