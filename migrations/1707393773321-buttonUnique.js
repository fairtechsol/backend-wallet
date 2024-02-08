const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class ButtonUnique1707393773321 {
    name = 'ButtonUnique1707393773321'

    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "buttons" DROP CONSTRAINT "FK_1b57705131901411bf9ad8f9658"`);
        await queryRunner.query(`DROP INDEX "public"."button_createBy"`);
        await queryRunner.query(`ALTER TABLE "buttons" DROP CONSTRAINT "REL_1b57705131901411bf9ad8f965"`);
        await queryRunner.query(`CREATE INDEX "button_createBy" ON "buttons" ("createBy") `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "public"."button_createBy"`);
        await queryRunner.query(`ALTER TABLE "buttons" ADD CONSTRAINT "REL_1b57705131901411bf9ad8f965" UNIQUE ("createBy")`);
        await queryRunner.query(`CREATE UNIQUE INDEX "button_createBy" ON "buttons" ("createBy") `);
        await queryRunner.query(`ALTER TABLE "buttons" ADD CONSTRAINT "FK_1b57705131901411bf9ad8f9658" FOREIGN KEY ("createBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
}
