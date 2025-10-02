-- AlterTable
ALTER TABLE "public"."InterviewSession" ALTER COLUMN "questions" SET DEFAULT ARRAY[]::JSONB[];
