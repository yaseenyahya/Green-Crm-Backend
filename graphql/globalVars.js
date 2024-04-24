var _ = require("lodash");
const { Op } = require("sequelize");
module.exports = class globalVars {
  getSubscriptionData(){
    if (global.subscriptionData == null) global.subscriptionData = [];
    return global.subscriptionData;
  }
  setUserOnlineStatus(agentId, online,isRealUserOnlineStatus, db, GraphQLResolvers_) {
    if (global.subscriptionData == null) global.subscriptionData = [];

    var userSubscriptionData = _.find(
      global.subscriptionData,
      (item) => item.agentId == agentId
    );
    if (userSubscriptionData) {
      userSubscriptionData.isOnline = online;
      if(isRealUserOnlineStatus)
      userSubscriptionData.userOnlineStatus = online;
    } else {
      var data = {
        agentId: agentId,
        isOnline: online,
        chats: [],
      };
      if(isRealUserOnlineStatus)
      data.userOnlineStatus = online;

      global.subscriptionData.push(data);
    }
    this.updateSubscriptionData(
      db,
      {
        data: JSON.stringify(global.subscriptionData),
      },
      GraphQLResolvers_
    );
  }
  async getPendingDataOnlyCustomerIdAndPageId(db) {
  
  var pendingchats = await db.pendingchats.findAll({
    attributes: ['pageId','customerId', [db.sequelize.fn('COUNT', 'id'), 'count']],
    group: ["customerId", "pageId"],
    where:{
      text: {
        // [Op.gt]: TODAY_START,
        [Op.ne]: null,
      }
    },
    raw:true
  });
 
    

    return pendingchats;
  }
  setUserLoggedInStatus(agentId, guid, db, GraphQLResolvers_) {
    if (global.subscriptionData == null) global.subscriptionData = [];

    var userSubscriptionData = _.find(
      global.subscriptionData,
      (item) => item.agentId == agentId
    );
    if (userSubscriptionData) {
      userSubscriptionData.loggedIn = true;
      userSubscriptionData.isOnline = false;
      userSubscriptionData.isUserLoggedIn = true;
      userSubscriptionData.userOnlineStatus = false;
      userSubscriptionData.guid = guid;
    } else {
      global.subscriptionData.push({
        agentId: agentId,
        loggedIn: true,
        isOnline: false,
        isUserLoggedIn: true,
        userOnlineStatus: false,
        guid: guid,
        chats: [],
      });
    }

    this.updateSubscriptionData(
      db,
      {
        data: JSON.stringify(global.subscriptionData),
      },
      GraphQLResolvers_
    );
  }
  setLoginAsUserLoggedInStatus(agentId,loginFromUserID, guid, db, GraphQLResolvers_) {
    if (global.subscriptionData == null) global.subscriptionData = [];

    var userSubscriptionData = _.find(
      global.subscriptionData,
      (item) => item.agentId == agentId
    );
    if (userSubscriptionData) {
      if(!userSubscriptionData.loginAsLogins)
      userSubscriptionData.loginAsLogins = [];

      userSubscriptionData.loginAsLogins.push(loginFromUserID);


      userSubscriptionData.loggedIn = true;


      userSubscriptionData.userOnlineStatus = false;
      userSubscriptionData.guid = guid;
    } else {
      global.subscriptionData.push({
        agentId: agentId,
        loggedIn: true,
        isOnline: false,
        isUserLoggedIn: false,
        userOnlineStatus: false,
        guid: guid,
        chats: [],
      });
    }

    this.updateSubscriptionData(
      db,
      {
        data: JSON.stringify(global.subscriptionData),
      },
      GraphQLResolvers_
    );
  }
  setLoginAsUserLoggedOutStatus(agentId,loginFromUserID, db, GraphQLResolvers_) {
    if (global.subscriptionData == null) global.subscriptionData = [];

    var userSubscriptionData = _.find(
      global.subscriptionData,
      (item) => item.agentId == agentId
    );
    if (userSubscriptionData) {

      var realUserIsLoggedIn = userSubscriptionData.isUserLoggedIn;
      var loginAsLogins = userSubscriptionData.loginAsLogins;

      if(loginAsLogins)
      _.remove(loginAsLogins , item => item == loginFromUserID);

      userSubscriptionData.loggedIn = realUserIsLoggedIn || loginAsLogins && loginAsLogins.length > 0;
      
      if(userSubscriptionData.loggedIn)
      userSubscriptionData.isOnline =  userSubscriptionData.userOnlineStatus;
      
      if(!userSubscriptionData.loggedIn){
      userSubscriptionData.isOnline = false;
      userSubscriptionData.isUserLoggedIn = false;
      userSubscriptionData.userOnlineStatus = false;
      userSubscriptionData.guid = undefined;
      }

    } else {
      global.subscriptionData.push({
        agentId: agentId,
        loggedIn: false,
        isOnline: false,
        isUserLoggedIn: false,
        userOnlineStatus: false,
        guid : undefined,
        chats: [],
      });
    }

    this.updateSubscriptionData(
      db,
      {
        data: JSON.stringify(global.subscriptionData),
      },
      GraphQLResolvers_
    );
  }
  setUserLoggedOutStatus(agentId, db, GraphQLResolvers_) {
    if (global.subscriptionData == null) global.subscriptionData = [];

    var userSubscriptionData = _.find(
      global.subscriptionData,
      (item) => item.agentId == agentId
    );
    if (userSubscriptionData) {
      userSubscriptionData.loggedIn =
      userSubscriptionData.loginAsLogins && userSubscriptionData.loginAsLogins.length > 0 ? true : false;
      userSubscriptionData.isOnline = false;
      userSubscriptionData.isUserLoggedIn = false;
      userSubscriptionData.userOnlineStatus = false;
      userSubscriptionData.guid = undefined;
    } else {
      global.subscriptionData.push({
        agentId: agentId,
        loggedIn: false,
        isOnline: false,
        isUserLoggedIn: false,
        userOnlineStatus: false,
        guid : undefined,
        chats: [],
      });
    }

    this.updateSubscriptionData(
      db,
      {
        data: JSON.stringify(global.subscriptionData),
      },
      GraphQLResolvers_
    );
  }
  setUserSubscriptionConnectionStatus(
    agentId,
    connected,
    db,
    GraphQLResolvers_
  ) {
    if (global.subscriptionData == null) global.subscriptionData = [];

    var userSubscriptionData = _.find(
      global.subscriptionData,
      (item) => item.agentId == agentId
    );
    if (userSubscriptionData) {
      userSubscriptionData.isConnected = connected;
      if (connected) userSubscriptionData.loggedIn = true;
    } else {
      global.subscriptionData.push({
        agentId: agentId,
        isConnected: connected,
        loggedIn: connected ? true : false,
        chats: [],
      });
    }
    this.updateSubscriptionData(
      db,
      {
        data: JSON.stringify(global.subscriptionData),
      },
      GraphQLResolvers_
    );
  }
  async getMinimumChatCountToCircleAssignByManagerAndPagesIdsAssigned(
    db,
    agentId
  ) {
    var agentManagerIdAndPages = await db.users.findOne({
      where: {
        id: agentId,
      },
      attributes: ["managerId", "pages"],
    });
    var agentManagerAgentLimitChatAssign = await db.users.findOne({
      where: {
        id: agentManagerIdAndPages.managerId,
      },
      attributes: ["agentlimitchatassign"],
    });

    return {
      agentlimitchatassign:
        agentManagerAgentLimitChatAssign.agentlimitchatassign,
      pages:
        agentManagerIdAndPages.pages != null
          ? JSON.parse(agentManagerIdAndPages.pages)
          : [],
    };
  }
  async updateSubscriptionData(db, args, GraphQLResolvers_) {
    let subscriptionData = await db.subscriptiondata.findOne({
      where: {
        id: 1,
      },
    });
    subscriptionData.data = args.data;
    try {
      await subscriptionData.save();
    } catch (e) {
      console.log("error update subscription data", e);
      this.updateSubscriptionData(parent, args, GraphQLResolvers_);
    }

    GraphQLResolvers_.Query.callsubscriptiondatachanged(null, args);
  }
  getUserIdFromSubscriptionChatsByCustomerAndPageId(customerId, pageId) {
    var agentId = null;
    var userSubscriptionData = _.find(
      global.subscriptionData,
      (item) =>
        _.find(
          item.chats,
          (chatItem) =>
            chatItem.customerId == customerId && chatItem.pageId == pageId
        ) != undefined
    );
    if (userSubscriptionData) agentId = userSubscriptionData.agentId;
    return agentId;
  }
  removeChatFromSubscriptionData(
    db,
    agentId,
    customerId,
    pageId,
    GraphQLResolvers_
  ) {
    var userSubscriptionData = _.find(
      global.subscriptionData,
      (item) => item.agentId == agentId
    );
    if (userSubscriptionData) {
      _.remove(
        userSubscriptionData.chats,
        (item) => item.customerId == customerId && item.pageId == pageId
      );

      this.updateSubscriptionData(
        db,
        {
          data: JSON.stringify(global.subscriptionData),
        },
        GraphQLResolvers_
      );
    }
  }
  //////////////////////////
  async addInPendingChats(event_, db) {
    try{
    var pageId = event_.pageIdAdded ;
    var isPage = pageId == event_.sender.id;
    var customerId = isPage ? event_.recipient.id : event_.sender.id;
    
    await db.pendingchats.create({
      event:  JSON.stringify(event_),
      ispage:isPage,
      customerId:customerId,
      pageId:pageId,
      text:event_.message && event_.message.text ? JSON.stringify(event_.message.text) :null,
      delivery:event_.delivery ? JSON.stringify(event_.delivery) :null,
      read:event_.read ? JSON.stringify(event_.read) :null,
      timestamp:event_.timestamp
    });
  }catch(e){
    console.log("errrrr",e)
  }
  }
  timer = (ms) => new Promise((res) => setTimeout(res, ms));
  async checkAndSendPendingChatsFromSubscriptionData(db, GraphQLResolvers_) {
    try{
    var isCalledOneTime = false; // if it called multiple time so it called multiple time but after completing one call
    var isChatAddedThenRepeat = false;

    if (!global.checkAndSendPendingChatsFromSubscriptionDataStarted) {
      global.checkAndSendPendingChatsFromSubscriptionDataStarted = true;
      isCalledOneTime = true;

        var subscriptionDataTemp = _.cloneDeep(global.subscriptionData);

        var subscriptionDataTemp = _.filter(
          subscriptionDataTemp,
          (itm) => itm.isOnline && itm.isConnected
        );

        subscriptionDataTemp.sort(function (a, b) {
          return a.chats.length - b.chats.length;
        });

        for (var i = 0; i < subscriptionDataTemp.length; i++) {
          var agentChatslimitAndPagesId =
            await this.getMinimumChatCountToCircleAssignByManagerAndPagesIdsAssigned(
              db,
              subscriptionDataTemp[i].agentId
            );
          var agentChatslimit = agentChatslimitAndPagesId.agentlimitchatassign;
          var userPagesIds = agentChatslimitAndPagesId.pages;
     
          if (subscriptionDataTemp[i].chats.length < agentChatslimit) {
           var pendingchatsFirstData =  await db.pendingchats.findOne({
              attributes: ['event'],
              where:{
                text: {
                  // [Op.gt]: TODAY_START,
                  [Op.ne]: null,
                },
                pageId:{
                  [Op.in]:userPagesIds
                }
              },
              raw:true,
              order: [["timestamp", "ASC"]],
            });
           
            var firstTextMessageEvent = pendingchatsFirstData ? pendingchatsFirstData.event : null;
    
            if (firstTextMessageEvent) {
              firstTextMessageEvent = JSON.parse(firstTextMessageEvent);
            
              isChatAddedThenRepeat = true;
              var firstTextMessageEventPageId =
                firstTextMessageEvent.pageIdAdded;
              var firstTextMessageEventIsPage =
                firstTextMessageEventPageId == firstTextMessageEvent.sender.id;
              var firstTextMessageEventCustomerId = firstTextMessageEventIsPage
                ? firstTextMessageEvent.recipient.id
                : firstTextMessageEvent.sender.id;

                var filteredCustomerAndPageEvents =  await db.pendingchats.findAll({
                  attributes: ['event'],
                  where:{
                    pageId:firstTextMessageEventPageId,
                    customerId:firstTextMessageEventCustomerId
                  },
                  raw:true,
                  order: [["timestamp", "ASC"]],
                });


              for (
                var i_ = 0;
                i_ < filteredCustomerAndPageEvents.length;
                i_++
              ) {
                var event_ = JSON.parse(filteredCustomerAndPageEvents[i_].event);
                var pageId = event_.pageIdAdded;
                var isPage = pageId == event_.sender.id;
                var customerId = isPage
                  ? event_.recipient.id
                  : event_.sender.id;

                if (event_.message && event_.message.text) {
                  var timestamp = event_.timestamp;
                  var messageId = event_.message.mid;
                  var messageText = event_.message.text;
                  // Your Logic Replaces the following Line
                  //var result = await getUserFromChatCircle(customerId);

                  await GraphQLResolvers_.Mutation.addchatdetail(
                    null,
                    {
                      customerId: customerId,
                      pageId: pageId,
                      messagetext: messageText,
                      messagetimestamp: timestamp,
                      messageId: messageId,
                      messagetype: isPage ? "outgoing" : "incoming",
                      agentId: subscriptionDataTemp[i].agentId,
                      read: isPage ? true : false,
                    },
                    { GraphQLResolvers_ }
                  );
                } else if (event_.delivery) {
                  var timestamp = event_.timestamp;

                  await GraphQLResolvers_.Mutation.deliverystatuschanged(null, {
                    customerId: customerId,
                    pageId: pageId,
                    deliverytimestamp: timestamp,
                  });
                } else if (event_.read) {
                  var timestamp = event_.timestamp;

                  await GraphQLResolvers_.Mutation.receiptreadstatuschanged(
                    null,
                    {
                      customerId: customerId,
                      pageId: pageId,
                      receiptreadtimestamp: timestamp,
                    }
                  );
                }
              }

              await db.pendingchats.destroy({
                where:{
                  pageId:firstTextMessageEventPageId,
                  customerId:firstTextMessageEventCustomerId
                },
              });
           

              var userSubscriptionData = _.find(
                global.subscriptionData,
                (item) => item.agentId == subscriptionDataTemp[i].agentId
              );
              if (userSubscriptionData) {
                userSubscriptionData.chats.push({
                  customerId: firstTextMessageEventCustomerId,
                  pageId: firstTextMessageEventPageId,
                });

                var getUserSubscriptionDataIndex = _.indexOf(
                  global.subscriptionData,
                  userSubscriptionData,
                  0
                );
                if (getUserSubscriptionDataIndex != -1) {
                  global.subscriptionData.splice(
                    global.subscriptionData.length,
                    0,
                    global.subscriptionData.splice(
                      getUserSubscriptionDataIndex,
                      1
                    )[0]
                  );
                
                }
                this.updateSubscriptionData(
                  db,
                  {
                    data: JSON.stringify(global.subscriptionData),
                  },
                  GraphQLResolvers_
                );
              }
            }
          }
        }
      
    
        global.checkAndSendPendingChatsFromSubscriptionDataStarted = false;
    }else{
      console.log("global.checkAndSendPendingChatsFromSubscriptionDataStarted is false");
    }

    if (isChatAddedThenRepeat) {
      this.checkAndSendPendingChatsFromSubscriptionData(db, GraphQLResolvers_);
    }

    GraphQLResolvers_.Query.pendingchatcountchanged();

    if (!isCalledOneTime) {
      //while (global.checkAndSendPendingChatsFromSubscriptionDataStarted) {
        console.log("checkAndSendPendingChatsFromSubscriptionData is waiting");
       // await this.timer(1000);
      //}
     // this.checkAndSendPendingChatsFromSubscriptionData(db, GraphQLResolvers_);
    }
  }catch(ex){
    console.log("checkAndSendPendingChatsFromSubscriptionData exception",ex)
  }
  }

}