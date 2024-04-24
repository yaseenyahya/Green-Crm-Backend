module.exports = class initialDatabaseEntry {
    async insertInitialData(db) {

        let designationId = await this.insertDesignationsData(db);

        this.insertUserData(db, designationId);

        this.insertSubscriptionData(db);
        
    }
    async insertSubscriptionData(db) {
        let subscriptionData = db.subscriptiondata;
        const [model, created] = await subscriptionData.findOrCreate({
            where: {//object containing fields to found
                id: "1",
            },
            defaults: {//object containing fields and values to apply
                id: "1",
                data:null
            }
        });
        return model.id;
    }
 
    async insertDesignationsData(db) {
        let designations = db.designations;
        const [model, created] = await designations.findOrCreate({
            where: {//object containing fields to found
                name: "Super-Admin",
                paneltype:0
            },
            defaults: {//object containing fields and values to apply
                name: "Super-Admin",
                paneltype:0
            }
        });
        return model.id;
    }

    async insertUserData(db, designationId) {
        let users = db.users;
        const [model, created] = await users.findOrCreate({
            where: {//object containing fields to found
                designationId: designationId
            },
            defaults: {//object containing fields and values to apply
                username: "SuperAdmin",
                password: "SuperAdmin123",
                name: "Super-Admin",
                status: 0,
                comments: "Initial Entry",
                email:"yaseenyahya021@gmail.com",
                designationId: designationId
            }
        });

        if(created) console.log("Initial User Created. \nUsername:SuperAdmin \nPassword:SuperAdmin123");
        else
        console.log("Initial User Already Created. \nUsername:SuperAdmin \nPassword:SuperAdmin123");
    }
}
