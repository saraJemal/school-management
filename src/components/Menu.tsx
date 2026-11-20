import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";

const menuItems = [
  {
    title: "MENU",
    items: [
      {
        icon: "/home.png",
        label: "Home",
        href: "/",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/profile.png",
        label: "Administrators",
        href: "/list/admins",
        visible: ["admin"],
      },
      {
        icon: "/teacher.png",
        label: "Teachers",
        href: "/list/teachers",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/student.png",
        label: "Students",
        href: "/list/students",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/student.png",
        label: "Student Enrollments",
        href: "/list/student-enrollments",
        visible: ["admin"],
      },
      {
        icon: "/parent.png",
        label: "Parents",
        href: "/list/parents",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/subject.png",
        label: "Subjects",
        href: "/list/subjects",
        visible: ["admin"],
      },
      {
        icon: "/class.png",
        label: "Classes",
        href: "/list/classes",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/lesson.png",
        label: "Lessons",
        href: "/list/lessons",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/exam.png",
        label: "Assessments",
        href: "/list/assessments",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/result.png",
        label: "Results",
        href: "/list/results",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        label: "Promotion Policies",
        href: "/list/promotion-policies",
        icon: "/lesson.png",
        visible: ["admin"],
      },
      {
        icon: "/result.png",
        label: "Report Cards",
        href: "/list/report-cards",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/attendance.png",
        label: "Attendance",
        href: "/list/attendance",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/result.png",
        label: "Supervisor Results",
        href: "/list/supervisor-results",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/calendar.png",
        label: "Events",
        href: "/list/events",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/message.png",
        label: "Messages",
        href: "/list/messages",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/announcement.png",
        label: "Announcements",
        href: "/list/announcements",
        visible: ["admin", "teacher", "student", "parent"],
      },
      { icon: "/calendar.png",
        label: "Communication Book",
        href: "/list/communication-book",
        visible: ["admin", "teacher", "parent"],
      },
      { icon: "/result.png",
        label: "Performance Analysis",
        href: "/list/performance-analysis",
        visible: ["admin", "teacher"],
      },
      {
        icon: "/calendar.png",
        label: "Academic Years",
        href: "/list/academic-years",
        visible: ["admin"],
      },
    ],
  },
  {
    title: "OTHER",
    items: [
      {
        icon: "/profile.png",
        label: "Profile",
        href: "/profile",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/setting.png",
        label: "Settings",
        href: "/settings",
        visible: ["admin", "teacher", "student", "parent"],
      },
      {
        icon: "/logout.png",
        label: "Logout",
        href: "/logout",
        visible: ["admin", "teacher", "student", "parent"],
      },
    ],
  },
];
const Menu = async () => {
  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as {
    role?: string;
  })?.role ?? "";
  return(
    <div className="">
      {menuItems.map((i) => (
        <div key={i.title} className="flex flex-col gap-2">
          <span className="hidden lg:block text-gray-400 font-light my-4">{i.title}</span>
          {i.items.map((item) => {
            if(item.visible.includes(role)){
              return(
            <Link href={item.href} key={item.label} className="group relative flex items-center justify-center lg:justify-start gap-4 text-gray-500 py-2 md:px-2 rounded-md hover:bg-badirStar">
            <Image src={item.icon} alt={item.label} width={20} height={20}/>
            <span className="hidden lg:block">{item.label}</span>
            <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 lg:hidden z-50">
              {item.label}
            </span>
            </Link>
              );
          }})}
        </div>
          ))}
    </div>
  );
};
export default Menu;