const { EntitySchema } = require('typeorm');
const { baseColumnsSchemaPart, matchComissionTypeConstant } = require("../config/contants");
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
    }
  }
});

module.exports = commissionSchema;
