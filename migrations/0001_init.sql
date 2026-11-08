-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "subcategory" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "hasWebsite" BOOLEAN NOT NULL DEFAULT false,
    "website" TEXT,
    "websiteStatus" TEXT,
    "websiteScreenshot" TEXT,
    "demoHtml" TEXT,
    "demoHtmlAt" DATETIME,
    "demoPrompt" TEXT,
    "hasSocial" BOOLEAN NOT NULL DEFAULT false,
    "instagram" TEXT,
    "facebook" TEXT,
    "tiktok" TEXT,
    "lastSocialPost" DATETIME,
    "googleRating" REAL,
    "googleReviews" INTEGER,
    "addressFull" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "lat" REAL,
    "lng" REAL,
    "priorityScore" INTEGER NOT NULL DEFAULT 0,
    "priorityReason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NUOVO',
    "notes" TEXT,
    "source" TEXT,
    "osmId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "lat" REAL,
    "lng" REAL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Location_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1'
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "note" TEXT,
    "channel" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT,
    "title" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GeneratedMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "waLink" TEXT,
    "aiUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT,
    "evidence" TEXT,
    "checkedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verification_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationRetry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "reason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "nextAttemptAt" DATETIME NOT NULL,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VerificationRetry_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Receipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL DEFAULT 'contanti',
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Receipt_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT,
    "toEmail" TEXT NOT NULL,
    "toName" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INVIATO',
    "hasReply" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repliedAt" DATETIME,
    CONSTRAINT "EmailLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT 'read,write',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_LeadToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_LeadToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_LeadToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_osmId_key" ON "Lead"("osmId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_priorityScore_idx" ON "Lead"("priorityScore");

-- CreateIndex
CREATE INDEX "Lead_category_idx" ON "Lead"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Activity_leadId_idx" ON "Activity"("leadId");

-- CreateIndex
CREATE INDEX "FollowUp_dueDate_idx" ON "FollowUp"("dueDate");

-- CreateIndex
CREATE INDEX "FollowUp_done_idx" ON "FollowUp"("done");

-- CreateIndex
CREATE INDEX "Appointment_startsAt_idx" ON "Appointment"("startsAt");

-- CreateIndex
CREATE INDEX "GeneratedMessage_leadId_idx" ON "GeneratedMessage"("leadId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");

-- CreateIndex
CREATE INDEX "Verification_leadId_idx" ON "Verification"("leadId");

-- CreateIndex
CREATE INDEX "Verification_field_idx" ON "Verification"("field");

-- CreateIndex
CREATE INDEX "VerificationRetry_nextAttemptAt_idx" ON "VerificationRetry"("nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRetry_leadId_field_key" ON "VerificationRetry"("leadId", "field");

-- CreateIndex
CREATE UNIQUE INDEX "Receipt_number_key" ON "Receipt"("number");

-- CreateIndex
CREATE INDEX "Receipt_leadId_idx" ON "Receipt"("leadId");

-- CreateIndex
CREATE INDEX "Receipt_paidAt_idx" ON "Receipt"("paidAt");

-- CreateIndex
CREATE INDEX "EmailLog_leadId_idx" ON "EmailLog"("leadId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_enabled_idx" ON "ApiKey"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "_LeadToTag_AB_unique" ON "_LeadToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_LeadToTag_B_index" ON "_LeadToTag"("B");

