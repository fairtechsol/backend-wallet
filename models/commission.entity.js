const { EntitySchema } = require('typeorm');
const { baseColumnsSchemaPart, matchComissionTypeConstant, betType, marketBetType } = require("../config/contants");
const { ColumnNumericTransformer } = require('../services/dbService');

const commissionSchema = new EntitySchema({
  name: 'commission',
  columns: {
    ...baseColumnsSchemaPart,
    userName: {
      type: 'varchar',
      nullable: true
    },
    matchId: {
      type: 'uuid',
      nullable: true
    },
    betId: {
      type: 'uuid',
      nullable: true
    },
    betPlaceId: {
      type: 'uuid',
      nullable: true,
    },
    teamName: {
      type: 'varchar',
      nullable: true
    },
    betPlaceDate: {
      type: 'timestamp with time zone',
      nullable: true,
    },
    odds: {
      type: 'decimal',
      nullable: true,
      precision: 13,
      scale: 2,
      default: 0,
      transformer: new ColumnNumericTransformer(),

    },
    betType: {
      type: "enum",
      enum: betType,
      nullable: true,
    },
    stake: {
      type: 'decimal',
      transformer: new ColumnNumericTransformer(),
      nullable: true,
      precision: 13,
      scale: 2,
      default: 0,
    },
    commissionAmount: {
      type: 'decimal',
      precision: 13,
      scale: 2,
      default: 0,
      nullable: false,
      transformer: new ColumnNumericTransformer()
    },
    commissionType: {
      type: 'enum',
      enum: Object.values(matchComissionTypeConstant),
      nullable: true
    },
    parentId: {
      type: 'uuid',
      nullable: false,
    },
    partnerShip: {
      type: "int",
      default: 100,
      nullable: true
    },
    matchName: {
      type: "varchar",
      nullable: true
    },
    matchStartDate: {
      type: "timestamp with time zone",
      nullable: true
    },
    settled: {
      type: Boolean,
      default: false
    },
    matchType: {
      type: 'enum',
      enum: Object.values(marketBetType),
      nullable: true
    }
  },
  indices: [
    {
      name: 'commission_betId',   // index name should be start with the table name
      columns: ['betId'],
    },
    {
      name: 'commission_matchId',   // index name should be start with the table name
      columns: ['matchId'],
    },
    {
      name: 'commission_createBy',   // index name should be start with the table name
      columns: ['createBy'],
    }
  ],
});

module.exports = commissionSchema;
