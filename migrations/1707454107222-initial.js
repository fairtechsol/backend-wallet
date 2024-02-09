const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Initial1707454107222 {
    name = 'Initial1707454107222'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "userBalances" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "currentBalance" numeric(13,2) NOT NULL DEFAULT '0', "exposure" numeric(13,2) NOT NULL DEFAULT '0', "userId" uuid NOT NULL, "profitLoss" numeric(13,2) NOT NULL DEFAULT '0', "myProfitLoss" numeric(13,2) NOT NULL DEFAULT '0', "downLevelBalance" numeric(13,2) NOT NULL DEFAULT '0', "totalCommission" numeric(13,2) NOT NULL DEFAULT '0', CONSTRAINT "UQ_e0d46cb3619d6665866b54577ed" UNIQUE ("userId"), CONSTRAINT "REL_e0d46cb3619d6665866b54577e" UNIQUE ("userId"), CONSTRAINT "PK_e7210fe11b45cc7d53a3a8d35b8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "userBalance_userId" ON "userBalances" ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."users_rolename_enum" AS ENUM('fairGameWallet', 'fairGameAdmin', 'superAdmin', 'admin', 'superMaster', 'master', 'agent', 'expert', 'user')`);
        await queryRunner.query(`CREATE TYPE "public"."users_matchcomissiontype_enum" AS ENUM('totalLoss', 'entryWise', 'settled')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createBy" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "userName" character varying NOT NULL, "fullName" character varying, "password" character varying NOT NULL, "transPassword" character varying, "phoneNumber" character varying, "city" character varying, "remark" character varying, "roleName" "public"."users_rolename_enum" NOT NULL, "userBlock" boolean NOT NULL DEFAULT false, "betBlock" boolean NOT NULL DEFAULT false, "userBlockedBy" uuid, "betBlockedBy" uuid, "fwPartnership" integer NOT NULL DEFAULT '0', "faPartnership" integer NOT NULL DEFAULT '0', "saPartnership" integer NOT NULL DEFAULT '0', "aPartnership" integer NOT NULL DEFAULT '0', "smPartnership" integer NOT NULL DEFAULT '0', "mPartnership" integer NOT NULL DEFAULT '0', "agPartnership" integer NOT NULL DEFAULT '0', "exposureLimit" numeric(13,2) NOT NULL DEFAULT '0', "maxBetLimit" numeric(13,2) NOT NULL DEFAULT '0', "minBetLimit" numeric(13,2) NOT NULL DEFAULT '0', "creditRefrence" numeric(13,2) NOT NULL DEFAULT '0', "downLevelCreditRefrence" numeric(13,2) NOT NULL DEFAULT '0', "sessionCommission" double precision NOT NULL DEFAULT '0', "matchComissionType" "public"."users_matchcomissiontype_enum", "matchCommission" double precision NOT NULL DEFAULT '0', "isUrl" boolean NOT NULL DEFAULT false, "delayTime" integer NOT NULL DEFAULT '5', "loginAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_226bb9aa7aa8a69991209d58f59" UNIQUE ("userName"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "user_userName" ON "users" ("id", "userName") `);
        await queryRunner.query(`CREATE TYPE "public"."transactions_transtype_enum" AS ENUM('add', 'withDraw', 'win', 'loss', 'creditReference')`);
        await queryRunner.query(`CREATE TABLE "transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createBy" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "searchId" uuid NOT NULL, "userId" uuid NOT NULL, "actionBy" uuid NOT NULL, "amount" numeric(13,2) NOT NULL DEFAULT '0', "closingBalance" numeric(13,2) NOT NULL DEFAULT '0', "transType" "public"."transactions_transtype_enum" NOT NULL, "description" character varying, "matchId" uuid, "betId" uuid, "actionByUserId" uuid, CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "transaction_searchId" ON "transactions" ("searchId") `);
        await queryRunner.query(`CREATE TABLE "systemTables" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createBy" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "type" character varying NOT NULL, "value" character varying, CONSTRAINT "PK_c70d94890c6018a3a4ad2d01a56" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "systemTable_type" ON "systemTables" ("type") `);
        await queryRunner.query(`CREATE TABLE "resultFaileds" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createBy" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "matchId" uuid NOT NULL, "betId" uuid NOT NULL, "userId" uuid NOT NULL, "result" character varying NOT NULL, CONSTRAINT "PK_b27d3ed4c4ca43f1bcf46a6d7e1" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "domainDatas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createBy" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "userName" character varying NOT NULL, "userId" uuid NOT NULL, "domain" character varying NOT NULL, "logo" character varying, "headerColor" character varying, "sidebarColor" character varying, "footerColor" character varying, CONSTRAINT "UQ_dc1771716744efdb1f7e2bc9a11" UNIQUE ("userName"), CONSTRAINT "UQ_c62ed60e7bf39701fa04e9231fb" UNIQUE ("userId"), CONSTRAINT "PK_406ca0536868a588bbdf6ea4e52" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "domainData_userName" ON "domainDatas" ("id", "userName") `);
        await queryRunner.query(`CREATE TYPE "public"."commissions_bettype_enum" AS ENUM('YES', 'NO', 'BACK', 'LAY')`);
        await queryRunner.query(`CREATE TYPE "public"."commissions_commissiontype_enum" AS ENUM('totalLoss', 'entryWise', 'settled')`);
        await queryRunner.query(`CREATE TABLE "commissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createBy" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "userName" character varying, "matchId" uuid, "betId" uuid, "betPlaceId" uuid, "teamName" character varying, "betPlaceDate" TIMESTAMP WITH TIME ZONE, "odds" numeric(13) DEFAULT '0', "betType" "public"."commissions_bettype_enum", "stake" numeric(13) DEFAULT '0', "commissionAmount" numeric(13) NOT NULL DEFAULT '0', "commissionType" "public"."commissions_commissiontype_enum", "parentId" uuid NOT NULL, "partnerShip" integer DEFAULT '100', "matchName" character varying, "matchStartDate" TIME WITH TIME ZONE, "settled" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_2701379966e2e670bb5ff0ae78e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "userBalances" ADD CONSTRAINT "FK_e0d46cb3619d6665866b54577ed" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_8cd147a85d1b45cfbff10260ed1" FOREIGN KEY ("actionByUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "resultFaileds" ADD CONSTRAINT "FK_0c6dfa5539787ad66e424bab5ca" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "resultFaileds" DROP CONSTRAINT "FK_0c6dfa5539787ad66e424bab5ca"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_8cd147a85d1b45cfbff10260ed1"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"`);
        await queryRunner.query(`ALTER TABLE "userBalances" DROP CONSTRAINT "FK_e0d46cb3619d6665866b54577ed"`);
        await queryRunner.query(`DROP TABLE "commissions"`);
        await queryRunner.query(`DROP TYPE "public"."commissions_commissiontype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."commissions_bettype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."domainData_userName"`);
        await queryRunner.query(`DROP TABLE "domainDatas"`);
        await queryRunner.query(`DROP TABLE "resultFaileds"`);
        await queryRunner.query(`DROP INDEX "public"."systemTable_type"`);
        await queryRunner.query(`DROP TABLE "systemTables"`);
        await queryRunner.query(`DROP INDEX "public"."transaction_searchId"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_transtype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."user_userName"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_matchcomissiontype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_rolename_enum"`);
        await queryRunner.query(`DROP INDEX "public"."userBalance_userId"`);
        await queryRunner.query(`DROP TABLE "userBalances"`);
    }
}
