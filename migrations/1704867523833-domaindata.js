const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Domaindata1704867523833 {
    name = 'Domaindata1704867523833'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "domainDatas" DROP CONSTRAINT "UQ_c62ed60e7bf39701fa04e9231fb"`);
        await queryRunner.query(`ALTER TABLE "domainDatas" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ADD "userId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ADD CONSTRAINT "UQ_c62ed60e7bf39701fa04e9231fb" UNIQUE ("userId")`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "domainDatas" DROP CONSTRAINT "UQ_c62ed60e7bf39701fa04e9231fb"`);
        await queryRunner.query(`ALTER TABLE "domainDatas" DROP COLUMN "userId"`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ADD "userId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "domainDatas" ADD CONSTRAINT "UQ_c62ed60e7bf39701fa04e9231fb" UNIQUE ("userId")`);
    }
}
