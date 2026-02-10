-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "requiredRoleId" TEXT;

-- CreateTable
CREATE TABLE "org_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_org_roles" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "orgRoleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_org_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_roles_organisationId_idx" ON "org_roles"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "org_roles_name_organisationId_key" ON "org_roles"("name", "organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "member_org_roles_memberId_orgRoleId_key" ON "member_org_roles"("memberId", "orgRoleId");

-- AddForeignKey
ALTER TABLE "org_roles" ADD CONSTRAINT "org_roles_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_org_roles" ADD CONSTRAINT "member_org_roles_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_org_roles" ADD CONSTRAINT "member_org_roles_orgRoleId_fkey" FOREIGN KEY ("orgRoleId") REFERENCES "org_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_requiredRoleId_fkey" FOREIGN KEY ("requiredRoleId") REFERENCES "org_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
