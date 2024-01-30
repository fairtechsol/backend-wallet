const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Domaindata1706607901532 {
    name = 'Domaindata1706607901532'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "domainDatas" ALTER COLUMN "logo" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ALTER COLUMN "headerColor" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ALTER COLUMN "sidebarColor" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ALTER COLUMN "footerColor" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "domainDatas" DROP CONSTRAINT "UQ_dddffea7d991f34ee1fec1606dc"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "domainDatas" ALTER COLUMN "footerColor" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ALTER COLUMN "sidebarColor" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ALTER COLUMN "headerColor" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ALTER COLUMN "logo" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ADD CONSTRAINT "UQ_dddffea7d991f34ee1fec1606dc" UNIQUE ("domain")`);
    }
}
