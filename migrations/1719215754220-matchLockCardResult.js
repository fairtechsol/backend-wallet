const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class MatchLockCardResult1719215754220 {
    name = 'MatchLockCardResult1719215754220'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "userMatchLocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "blockBy" uuid NOT NULL, "matchId" uuid NOT NULL, "matchLock" boolean NOT NULL DEFAULT false, "sessionLock" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_2d306e91e74af8a15328eddb256" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cardResults" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "gameType" character varying NOT NULL, "result" jsonb NOT NULL, CONSTRAINT "PK_4832e2c48eb7536491cb0eb57ae" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "cardResult_type" ON "cardResults" ("gameType") `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "public"."cardResult_type"`);
        await queryRunner.query(`DROP TABLE "cardResults"`);
        await queryRunner.query(`DROP TABLE "userMatchLocks"`);
    }
}
