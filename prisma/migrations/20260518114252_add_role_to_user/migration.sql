-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER', 'NON_MEMBER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'NON_MEMBER';
