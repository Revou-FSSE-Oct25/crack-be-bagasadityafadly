-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "google_event_id" TEXT;

-- AlterTable
ALTER TABLE "user_rewards" ADD COLUMN     "coupon_code" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "bronze_border_unlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_apply_as_pt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "google_access_token" TEXT,
ADD COLUMN     "google_refresh_token" TEXT,
ADD COLUMN     "google_token_expiry" TIMESTAMP(3);
