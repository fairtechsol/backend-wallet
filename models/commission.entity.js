const { EntitySchema } = require('typeorm');
const { baseColumnsSchemaPart, matchComissionTypeConstant, betType } = require("../config/contants");
const { ColumnNumericTransformer } = require('../services/commonService');

const commissionSchema = new EntitySchema({
  name: 'commission',
  columns: {
    ...baseColumnsSchemaPart,
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
      nullable: false,
    },
    teamName: {
      type:'varchar',
      nullable:false
    },
    betPlaceDate: {
      type:'timestamp with time zone',
    },
    odds: {
      type:'decimal',
      nullable:false,
      precision: 13,
      default: 0,
      transformer:new ColumnNumericTransformer(),

    },
    betType: {
      type:"enum",
      enum:betType,
    },
    stake: {
      type:'decimal',
      transformer:new ColumnNumericTransformer(),
      nullable:true,
      precision: 13,
      default: 0,
    },
    commissionAmount: {
      type: 'decimal',
      precision: 13,
      default: 0,
      nullable: false,
      transformer: new ColumnNumericTransformer()
    },
    commissionType:{
      type: 'enum',
      enum: Object.values(matchComissionTypeConstant),
      nullable: true
    },
    parentId:{
      type: 'uuid',
      nullable: false,
    }
  }
});

module.exports = commissionSchema;
