const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class MatchLock1715931687896 {
    name = 'MatchLock1715931687896'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "userMatchLocks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "blockBy" uuid NOT NULL, "matchId" uuid NOT NULL, "matchLock" boolean NOT NULL DEFAULT false, "sessionLock" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_2d306e91e74af8a15328eddb256" PRIMARY KEY ("id"))`);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "userMatchLocks"`);
    }
}
