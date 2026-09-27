/*
  Warnings:

  - A unique constraint covering the columns `[clerkUserId]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clerkUserId]` on the table `Parent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clerkUserId]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clerkUserId]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "clerkUserId" TEXT;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "clerkUserId" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "clerkUserId" TEXT;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "clerkUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Admin_clerkUserId_key" ON "Admin"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_clerkUserId_key" ON "Parent"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_clerkUserId_key" ON "Student"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_clerkUserId_key" ON "Teacher"("clerkUserId");
