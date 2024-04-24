module.exports = (sequelize, DataTypes) => {
  const PendingChatsData = sequelize.define(
    "pendingchatsdata",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      data: {
        type: DataTypes.TEXT('long'),
        allowNulls: true,

      },
      
    },
    {
      timestamps: true,
    }
  );

  return PendingChatsData;
};
