
import UserCard from "@/components/userCard";
import FinanceChart, {
  type FinanceChartAnalysis,
} from "@/components/FinanceChart";
import Announcements from "@/components/Announcements";
import CountChartContainer from "@/components/CountChartContainer";
import AttendanceChartContainer from "@/components/AttendanceChartContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import { prisma } from "@/lib/prisma";

const AdminPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  // Read the saved SCHOOL-level OVERALL analysis snapshots.
  const savedAnalyses = await prisma.performanceAnalysis.findMany({
    where: {
      level: "SCHOOL",
      assessmentScope: "OVERALL",
    },
    select: {
      id: true,
      academicYearId: true,
      semester: true,
      subjectId: true,
      subjectName: true,
      createdAt: true,
      summary: {
        select: {
          totalStudents: true,
          totalMale: true,
          totalFemale: true,
          excellentMale: true,
          excellentFemale: true,
          veryGoodMale: true,
          veryGoodFemale: true,
          averageMale: true,
          averageFemale: true,
          poorMale: true,
          poorFemale: true,
          failMale: true,
          failFemale: true,
        },
      },
      academicYear: {
        select: {
          id: true,
          name: true,
          isCurrent: true,
          startDate: true,
        },
      },
    },
    // Newest snapshot first. If duplicate analyses exist for the
    // same year, subject and semester, use the newest one.
    orderBy: {
      createdAt: "desc",
    },
  });

  const latestBySlot = new Map<string, FinanceChartAnalysis>();

  for (const analysis of savedAnalyses) {
    if (!analysis.summary || analysis.subjectId === null) {
      continue;
    }

    const key = [
      analysis.academicYearId,
      analysis.subjectId,
      analysis.semester,
    ].join("-");

    // Because results are ordered newest first, keep the first.
    if (latestBySlot.has(key)) {
      continue;
    }

    latestBySlot.set(key, {
      academicYearId: analysis.academicYearId,
      academicYearName: analysis.academicYear.name,
      academicYearStartDate:
        analysis.academicYear.startDate.toISOString(),
      isCurrentAcademicYear: analysis.academicYear.isCurrent,
      semester: analysis.semester,
      subjectId: analysis.subjectId,
      subjectName: analysis.subjectName ?? "Subject",
      summary: analysis.summary,
    });
  }

  const financeChartData = Array.from(latestBySlot.values());

  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row">
      {/* Left */}
      <div className="w-full lg:w-2/3 flex flex-col gap-8">
        {/* User cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <UserCard type="admin" />
          <UserCard type="student" />
          <UserCard type="teacher" />
          <UserCard type="parent" />
        </div>

        {/* Middle charts */}
        <div className="flex gap-4 flex-col lg:flex-row">
          <div className="w-full lg:w-1/3 h-[450px]">
            <CountChartContainer />
          </div>

          <div className="w-full lg:w-2/3 h-[450px]">
            <AttendanceChartContainer />
          </div>
        </div>

        {/* Whole-school performance chart */}
        <div className="w-full h-[500px]">
          <FinanceChart analyses={financeChartData} />
        </div>
      </div>

      {/* Right */}
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        <EventCalendarContainer searchParams={searchParams} />
        <Announcements />
      </div>
    </div>
  );
};

export default AdminPage;
