const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class SessionCommission1734085534878 {
    name = 'SessionCommission1734085534878'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TYPE "public"."commissions_matchtype_enum" AS ENUM('SESSION', 'MATCHBETTING')`);
        await queryRunner.query(`ALTER TABLE "commissions" ADD "matchType" "public"."commissions_matchtype_enum"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "matchType"`);
        await queryRunner.query(`DROP TYPE "public"."commissions_matchtype_enum"`);
    }
}
