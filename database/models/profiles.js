module.exports = (sequelize, DataTypes) => {
  const Profiles = sequelize.define(
    "profiles",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNulls: false,
        unique: {
          args: true,
          msg: "Name already in use.",
        },
      },
      paneltype: {
        type: DataTypes.INTEGER,
        allowNulls: false,
      },
      settings: {
        type: DataTypes.TEXT("long"),
        allowNulls: true,
      },
    },
    {
      timestamps: true,
    }
  );

  return Profiles;
};
