/*
  Warnings:

  - A unique constraint covering the columns `[user_id,schedule_id]` on the table `bookings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "trainer_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "bookings_user_id_schedule_id_key" ON "bookings"("user_id", "schedule_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
