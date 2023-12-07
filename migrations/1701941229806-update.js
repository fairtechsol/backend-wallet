const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class Update1701941229806 {
    name = 'Update1701941229806'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "urlDatas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createBy" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "userName" character varying NOT NULL, "url" character varying NOT NULL, "headerColor" character varying NOT NULL, "sideBarColor" character varying NOT NULL, "footerColor" character varying NOT NULL, CONSTRAINT "UQ_f3c179b456b9563f31c5ef44f51" UNIQUE ("userName"), CONSTRAINT "UQ_e4e979515c85a33372ba7a5fa3e" UNIQUE ("url"), CONSTRAINT "PK_d8997651c52c5b313d8636f825e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "urlData_userName" ON "urlDatas" ("id", "userName") `);
    }

    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX "public"."urlData_userName"`);
        await queryRunner.query(`DROP TABLE "urlDatas"`);
    }
}
