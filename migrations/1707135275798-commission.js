const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Commission1707135275798 {
    name = 'Commission1707135275798'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "commissions" ADD "partnerShip" integer DEFAULT '100'`);
        await queryRunner.query(`ALTER TABLE "resultFaileds" DROP CONSTRAINT "FK_0c6dfa5539787ad66e424bab5ca"`);
        await queryRunner.query(`ALTER TABLE "resultFaileds" DROP CONSTRAINT "REL_0c6dfa5539787ad66e424bab5c"`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "betPlaceId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "teamName" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "betPlaceDate" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "odds" TYPE numeric(13)`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "odds" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "betType" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "resultFaileds" ADD CONSTRAINT "FK_0c6dfa5539787ad66e424bab5ca" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "resultFaileds" DROP CONSTRAINT "FK_0c6dfa5539787ad66e424bab5ca"`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "betType" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "odds" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "odds" TYPE numeric(13,0)`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "betPlaceDate" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "teamName" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "commissions" ALTER COLUMN "betPlaceId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "resultFaileds" ADD CONSTRAINT "REL_0c6dfa5539787ad66e424bab5c" UNIQUE ("userId")`);
        await queryRunner.query(`ALTER TABLE "resultFaileds" ADD CONSTRAINT "FK_0c6dfa5539787ad66e424bab5ca" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "commissions" DROP COLUMN "partnerShip"`);
    }
}
