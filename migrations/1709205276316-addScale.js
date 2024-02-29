const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class AddScale1709205276316 {
    name = 'AddScale1709205276316'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "odds" TYPE numeric(13,2)`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "stake" TYPE numeric(13,2)`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "commissionAmount" TYPE numeric(13,2)`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "commissionAmount" TYPE numeric(13,0)`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "stake" TYPE numeric(13,0)`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "odds" TYPE numeric(13,0)`);
    }
}
