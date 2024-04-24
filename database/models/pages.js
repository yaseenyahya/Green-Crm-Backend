module.exports = (sequelize, DataTypes) => {
    const Pages = sequelize.define('pages', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name:{
            type: DataTypes.STRING,
            allowNulls: false
        },
        pageId:{
            type: DataTypes.STRING,
            allowNulls: false,
            unique: {
                args: true,
                msg: "Page already in use.",
              },
        },
        accesstoken: {
            type: DataTypes.STRING,
            allowNulls: false
        }
    }, {

        timestamps: true
    }
    );
   
    return Pages;
}