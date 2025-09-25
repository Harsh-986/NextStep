-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."InterviewSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "industry" TEXT,
    "role" TEXT,
    "difficulty" TEXT,
    "duration" INTEGER,
    "questions" JSONB[],
    "responses" JSONB[],
    "overallScore" DOUBLE PRECISION,
    "technicalScore" DOUBLE PRECISION,
    "communicationScore" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "improvementTips" TEXT[],
    "detailedFeedback" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CallAnalytics" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "duration" DOUBLE PRECISION,
    "cost" DOUBLE PRECISION,
    "transcript" TEXT,
    "speakingTime" DOUBLE PRECISION,
    "silenceTime" DOUBLE PRECISION,
    "wordsPerMinute" DOUBLE PRECISION,
    "fillerWordsCount" INTEGER,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewSession_userId_idx" ON "public"."InterviewSession"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CallAnalytics_sessionId_key" ON "public"."CallAnalytics"("sessionId");

-- CreateIndex
CREATE INDEX "CallAnalytics_userId_idx" ON "public"."CallAnalytics"("userId");

-- CreateIndex
CREATE INDEX "CallAnalytics_sessionId_idx" ON "public"."CallAnalytics"("sessionId");

-- AddForeignKey
ALTER TABLE "public"."InterviewSession" ADD CONSTRAINT "InterviewSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CallAnalytics" ADD CONSTRAINT "CallAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
