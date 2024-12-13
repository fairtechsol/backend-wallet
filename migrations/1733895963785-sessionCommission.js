const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class SessionCommission1733895963785 {
    name = 'SessionCommission1733895963785'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" ADD "sessionCommission" double precision NOT NULL DEFAULT '0'`);
        await queryRunner.query(`CREATE TYPE "public"."commissions_matchtype_enum" AS ENUM('SESSION', 'MATCHBETTING')`);
        await queryRunner.query(`ALTER TABLE "commissions" ADD "matchType" "public"."commissions_matchtype_enum"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "sessionCommission"`);
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "matchType"`);
        await queryRunner.query(`DROP TYPE "public"."commissions_matchtype_enum"`);
    }
}
