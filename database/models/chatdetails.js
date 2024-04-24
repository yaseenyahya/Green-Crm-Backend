module.exports = (sequelize, DataTypes) => {
  const ChatDetails = sequelize.define(
    "chatdetails",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      customerId: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      pageId: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      messageId: {
        type: DataTypes.STRING,
        allowNulls: true,
      },
      messagetext: {
        type:  DataTypes.TEXT("long"),
        allowNulls: false,
      },
      messagetimestamp: {
        type: DataTypes.DATE,
        allowNulls: false,
      },
      messagetype: {
        type: DataTypes.STRING,
        allowNulls: false,
      },
      alternateagentId: {
        type: DataTypes.INTEGER,
        allowNulls: false,
      },
      read: {
        type: DataTypes.INTEGER,
        allowNulls: false,
        defaultValue:0
      },
      deliverytimestamp:{
        type: DataTypes.STRING,
        allowNulls: true,
      },
      receiptreadtimestamp:{
        type: DataTypes.STRING,
        allowNulls: true,
      },
      marknottoaddinchatcircle:{
        type: DataTypes.INTEGER,
        allowNulls: false,
        defaultValue:0
      },
    },
    {
      timestamps: true,
    }
  );
  ChatDetails.associate = (models) => {
    ChatDetails.belongsTo(models.users, {
      foreignKey: "agentId",
      allowNull: false,
    });
  };
  
  return ChatDetails;
};
