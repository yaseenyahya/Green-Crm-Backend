module.exports = (sequelize, DataTypes) => {
  const PendingChatsData = sequelize.define(
    "pendingchats",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      event:{
        type: DataTypes.TEXT('long'),
        allowNulls: false,
      },
      ispage: {
        type: DataTypes.INTEGER,
        allowNulls: false,

      },
      customerId: {
        type: DataTypes.STRING,
        allowNulls: false,

      },
      pageId: {
        type: DataTypes.STRING,
        allowNulls: false,

      },
      text: {
        type:DataTypes.TEXT('long'),
        allowNulls: true,

      },
      delivery: {
        type: DataTypes.STRING(2000),
        allowNulls: true,

      },
      read: {
        type: DataTypes.STRING,
        allowNulls: true,

      },
      timestamp:{
        type: DataTypes.STRING,
        allowNulls: false,
      }
    },
    {
      timestamps: true,
    }
  );

  return PendingChatsData;
};
