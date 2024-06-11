const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class CardResult1718093134819 {
    name = 'CardResult1718093134819'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "cardResults" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "cardResults" DROP COLUMN "deletedAt"`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "cardResults" ADD "deletedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "cardResults" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }
}
