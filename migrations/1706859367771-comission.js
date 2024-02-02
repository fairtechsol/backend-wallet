const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Comission1706859367771 {
    name = 'Comission1706859367771'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" ADD "teamName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commissions" ADD "betPlaceDate" TIMESTAMP WITH TIME ZONE NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commissions" ADD "odds" numeric(13) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`CREATE TYPE "public"."commissions_bettype_enum" AS ENUM('YES', 'NO', 'BACK', 'LAY')`);
        await queryRunner.query(`ALTER TABLE "commissions" ADD "betType" "public"."commissions_bettype_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commissions" ADD "stake" numeric(13) DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "commissions" ADD "parentId" uuid NOT NULL`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "parentId"`);
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "stake"`);
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "betType"`);
        await queryRunner.query(`DROP TYPE "public"."commissions_bettype_enum"`);
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "odds"`);
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "betPlaceDate"`);
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "teamName"`);
    }
}
