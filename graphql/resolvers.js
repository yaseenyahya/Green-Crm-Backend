var db = require("../database/db");
var bcrypt = require("bcrypt");
var Auth = require("../auth");
var { AuthenticationError } = require("apollo-server");
var {
  verifyTokenWithUserID,
  checkDesignationIdIsNotValid,
  checkManagerIdIsNotValid,
  verifyTokenWithUserIDWithLoginAsDetails,
} = require("./helper");
var validator = require("validator");
var crypto = require("crypto");
var mailerConfig = require("../config/mailer.json");
var cors = require("cors");
const nodemailer = require("nodemailer");
const { Op } = require("sequelize");
const { RedisPubSub } = require("graphql-redis-subscriptions");
const axios = require("axios");
const otherconfig = require("../config/otherconfig.json");
const moment = require("moment");
const env = process.env.NODE_ENV || "development";
const otherConfig = otherconfig[env];
const _ = require("lodash");
var globalVars = require("./globalVars");
const includes = require("./includes");
const pubsub = new RedisPubSub({
  connection: otherConfig.REDIS_URL,
});

const CHAT_ADDED = "CHAT_ADDED";
const CHAT_MARK_READ = "CHAT_MARK_READ";
const DELIVERY_STATUS_CHANGED = "DELIVERY_STATUS_CHANGED";
const RECIEPT_READ_STATUS_CHANGED = "RECIEPT_READ_STATUS_CHANGED";
const PENDING_CHAT_COUNT_CHANGED = "PENDING_CHAT_COUNT_CHANGED";
const CHAT_LABEL_REMOVED = "CHAT_LABEL_REMOVED";
const SUBSCRIPTION_DATA_CHANGED = "SUBSCRIPTION_DATA_CHANGED";
const MESSAGE_TYPING_STATUS_CHANGED = "MESSAGE_TYPING_STATUS_CHANGED";
const FORCE_LOGOUT = "FORCE_LOGOUT";
module.exports = {
  Subscription: {
    chatdetailadded: {
      subscribe: () => pubsub.asyncIterator(CHAT_ADDED),
    },
    markallmessagechatread: {
      subscribe: () => pubsub.asyncIterator(CHAT_MARK_READ),
    },
    deliverystatuschanged: {
      subscribe: () => pubsub.asyncIterator(DELIVERY_STATUS_CHANGED),
    },
    receiptreadstatuschanged: {
      subscribe: () => pubsub.asyncIterator(RECIEPT_READ_STATUS_CHANGED),
    },
    pendingchatcountchanged: {
      subscribe: () => pubsub.asyncIterator(PENDING_CHAT_COUNT_CHANGED),
    },
    chatlabelremove: {
      subscribe: () => pubsub.asyncIterator(CHAT_LABEL_REMOVED),
    },
    subscriptiondatachanged: {
      subscribe: () => pubsub.asyncIterator(SUBSCRIPTION_DATA_CHANGED),
    },
    messagetypingstatuschanged: {
      subscribe: () => pubsub.asyncIterator(MESSAGE_TYPING_STATUS_CHANGED),
    },
    forcelogout: {
      subscribe: () => pubsub.asyncIterator(FORCE_LOGOUT),
    },
  },
  Query: {
    designations: () => {
      return db.designations.findAll();
    },
    designation: (parent, args) => {
      return db.designations.findOne({
        where: {
          id: args.id,
        },
      });
    },
    pages: () => {
      return db.pages.findAll();
    },
    page: (parent, args) => {
      return db.pages.findAll({
        where: {
          id: args.id,
        },
      });
    },
    profiles: () => {
      return db.profiles.findAll();
    },
    profile: (parent, args) => {
      return db.profiles.findOne({
        where: {
          id: args.id,
        },
      });
    },
    loginasusers: async (parent, args, { req }) => {
      const dataVarified = verifyTokenWithUserIDWithLoginAsDetails(args, req);
      req.userID = dataVarified.userID;
      if (req.userID == null) return null;
      var where = {};
      var include = null;

      where = {
        status: 0,
        id: {
          [Op.notIn]: req.loginFromUserIDAndLoggingToUserLoginStatus
            ? [
                req.userID,
                req.loginFromUserIDAndLoggingToUserLoginStatus
                  ? req.loginFromUserIDAndLoggingToUserLoginStatus[0]
                  : undefined,
              ]
            : [req.userID],
        },
      };
      if (args.managerId) {
        where = {
          "$designation.paneltype$": 3, //agents only
          managerId: 4,
          ...where,
        };
        include = [
          {
            model: db.designations,
            attributes: [],
          },
        ];
      }
      if (where.lenght == 0) {
        where = null;
      }
      var users = await db.users.findAll({ where: where, include: include });

      var subscriptionDataParsed = new globalVars().getSubscriptionData();

      users.map((result) => {
        if (subscriptionDataParsed) {
          var findUserAvailable = _.find(
            subscriptionDataParsed,
            (item) => item.agentId == result.id
          );
          if (findUserAvailable)
            result.isUserLoggedIn = findUserAvailable.isUserLoggedIn;
        }
      });
      return users;
    },
    users: async (parent, args, { req }) => {
      var where = {};
      var include = null;
      if (args.managersOnly) {
        (where = {
          "$designation.paneltype$": 2,
        }),
          (include = [
            {
              model: db.designations,
              attributes: [],
            },
          ]);
      }

      if (args.managerId) {
        where = {
          managerId: args.managerId,
        };
      }
      if (where.lenght == 0) {
        where = null;
      }
      var users = await db.users.findAll({ where: where, include: include });

      return users;
    },
    user: async (parent, args) => {
      return await db.users.findOne({
        where: {
          id: args.id,
        },
      });
    },
    me: async (parent, args, { req }) => {
      const dataVarified = verifyTokenWithUserIDWithLoginAsDetails(args, req);

      req.userID = dataVarified.userID;
      if (req.userID == null) return null;

      var userData = await db.users.findOne({
        where: {
          id: req.userID,
        },
      });

      var pagesData = await db.pages.findAll();

      var pages = [];

      pagesData.map((result) => {
        pages.push({
          id: result.id,
          pageId: result.pageId,
          name: result.name,
          pageId: result.pageId,
          accesstoken: result.accesstoken,
        });
      });

      userData.pagesData = JSON.stringify(pages);

      if (includes.isLoginAsAccountRequest(dataVarified)) {
        userData.switchaccountsettings = dataVarified.loginAsId;
      }
      var subscriptionDataParsed = new globalVars().getSubscriptionData();

      var onlineStatus = false;
      var isUserLoggedIn = false;
      if (subscriptionDataParsed) {
        var findUserAvailable = _.find(
          subscriptionDataParsed,
          (item) => item.agentId == userData.id
        );

        if (findUserAvailable) {
          onlineStatus = findUserAvailable.isOnline;
          isUserLoggedIn = findUserAvailable.isUserLoggedIn;
        }
      }
      userData.onlineStatus = onlineStatus;
      userData.isUserLoggedIn = isUserLoggedIn;
      return userData;
    },
    getlabels: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      var userData = await db.users.findOne({
        where: {
          id: req.userID,
        },
        attributes: ["id", "labels"],
      });

      return userData;
    },
    usersettings: (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      return db.users.findOne({
        where: {
          id: req.userID,
          attributes: ["settings"],
        },
      });
    },
    leadform: (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      return db.leadforms.findAll({
        where: {
          customerId: args.customerId,
        },
      });
    },
    chatlastdetailsbyid: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;
      //moment().utc().add(5, "hours")
      var userID = args.userID;

      const NOW = new Date();
      var customerAndPageIds = await db.chatdetails.findAll({
        attributes: ["",[db.sequelize.fn("max", db.sequelize.col("id")), "id"]],
        group: ["customerId", "pageId"],
        where: {
          messagetimestamp: {
            // [Op.gt]: TODAY_START,
            [Op.lt]: NOW,
          },
          agentId: userID,
        },
        order: [["id", "asc"]],
      });

      if (customerAndPageIds) {
        let ids = customerAndPageIds.map((result) => {
          return result.id;
        });

        var messages = await db.chatdetails.findAll({
          where: {
            id: {
              [Op.in]: ids,
            },
          },
          raw: true,
          order: [["id", "DESC"]],
        });

        if (messages) {
          for (var i = 0; i < messages.length; i++) {
            var labels = await db.chatdetails.findAll({
              where: {
                customerId: messages[i].customerId,
                pageId: messages[i].pageId,
                messagetype: "label",
              },
              order: [["id", "ASC"]],
              attributes: ["messagetext"],
            });
            var labelsArray = [];
            labels.map((labelsResult) => {
              labelsArray.push(labelsResult.messagetext);
            });
            messages[i].labels = JSON.stringify(labelsArray);
          }
        }

        return messages;
      }
    },
    chatlastdetailsbyidwithpagination: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      var userID = args.userID;
      var include = null;
      if (args.managerId) {
        include = [
          {
            model: db.users,
            attributes: [],
          },
        ];
      }
      let customerAndPageIdsAllWhere = userID
        ? {
            where: {
              agentId: userID,
            },
          }
        : args.managerId
        ? {
            where: {
              "$user.managerId$": args.managerId,
            },
          }
        : {};
      const NOW = new Date();
      let customerAndPageIdsAll = await db.chatdetails.findAll({
        attributes: [[db.sequelize.fn("max", db.sequelize.col("chatdetails.id")), "id"]],
        group: ["customerId", "pageId"],

        ...customerAndPageIdsAllWhere,
        order: [["id", "asc"]],
        raw: true,
        include:include
      });

      customerAndPageIdsAll = _.uniqWith(customerAndPageIdsAll, _.isEqual);

      customerAndPageIdsAll = _.sortBy(customerAndPageIdsAll, (o) => o.id);

      //_.reverse(customerAndPageIdsAll);
      if (customerAndPageIdsAll && customerAndPageIdsAll.length > 0) {
        let totalCount = customerAndPageIdsAll.length;

        let cursorNumeric = parseInt(
          Buffer.from(args.after, "base64").toString("ascii")
        );
        if (!cursorNumeric)
          cursorNumeric =
            customerAndPageIdsAll[customerAndPageIdsAll.length - 1].id;

      

        var customerAndPageIds = [];
        for (
          let index = customerAndPageIdsAll.length - 1;
          index >= 0;
          index--
        ) {
          customerAndPageId = customerAndPageIdsAll[index];

          if (customerAndPageIds.length === args.first) {
            break;
          }
          if (
            cursorNumeric ==
              customerAndPageIdsAll[customerAndPageIdsAll.length - 1].id &&
            customerAndPageIdsAll[customerAndPageIdsAll.length - 1].id ==
              customerAndPageId.id
          ) {
            customerAndPageIds.push(customerAndPageId);
          } else {
            if (customerAndPageId.id < cursorNumeric) {
              customerAndPageIds.push(customerAndPageId);
            }
          }
        }

        //console.log("customerAndPageIdsAll",JSON.stringify(customerAndPageIdsAll))

        let ids = customerAndPageIds.map((result) => {
          return result.id;
        });

        var messages = await db.chatdetails.findAll({
          where: {
            id: {
              [Op.in]: ids,
            },
          },
          raw: true,
          order: [["id", "desc"]],
        });

        let customerIds = messages.map((result) => {
          return result.customerId;
        });

        var labels = await db.chatdetails.findAll({
          where: {
            customerId: {
              [Op.in]: customerIds,
            },
            messagetype: "label",
          },
          order: [["id", "ASC"]],
          attributes: [
            "customerId",
            [
              db.sequelize.fn("GROUP_CONCAT", db.sequelize.col("messagetext")),
              "messagetext",
            ],
          ],
          group: ["customerId"],
          raw: true,
        });

        if (messages) {
          for (var i = 0; i < messages.length; i++) {
            var labelConcat = _.find(
              labels,
              (label) => label.customerId == messages[i].customerId
            );

            if (labelConcat) {
              messages[i].labels = JSON.stringify(
                labelConcat.messagetext.split(",")
              );
            }
          }
        }

        let endCursor =
          messages.length > 0
            ? Buffer.from(ids[ids.length - 1].toString()).toString("base64")
            : NaN;
        let hasNextPageFlag = false;

        if (endCursor) {
          let endCursorNumeric = parseInt(
            Buffer.from(endCursor, "base64").toString("ascii")
          );

          var hasNextPageFlagData = _.filter(customerAndPageIdsAll, (item) => {
            return item.id < endCursorNumeric;
          });

          hasNextPageFlag = hasNextPageFlagData.length > 0;
        }

        return {
          id: endCursor,
          chatDetails: messages,
          totalCount: totalCount,
          endCursor: endCursor,
          hasNextPage: hasNextPageFlag,
          currentCursur: args.after,
          userID: userID,
          managerId:args.managerId
        };
      } else {
        return {
          id: null,
          chatDetails: [],
          totalCount: 0,
          endCursor: null,
          hasNextPage: false,
          currentCursur: args.after,
          userID: userID,
          managerId:args.managerId
        };
      }
    },
    chatdetailsbyagentcutomerpageid: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      var userID = args.userID;

      var chatData = await db.chatdetails.findAll({
        where: {
          agentId: userID,
          customerId: args.customerId,
          pageId: args.pageId,
        },
      });
      if (args.markChatRead) {
        chatData.forEach(function (t) {
          try {
            if (!t.read) t.update({ read: true });
          } catch (e) {}
        });

        pubsub.publish(CHAT_MARK_READ, {
          markallmessagechatread: {
            agentId: req.userID,
            customerId: args.customerId,
            pageId: args.pageId,
          },
        });
      }
      return chatData;
    },
    getfollowupbyagentid: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      var chatFollowUpDetail = await db.chatdetails.findAll({
        where: {
          agentId: req.userID,
          messagetype: "followuplabel",
          read: 0,
        },
      });

      var errorInJson = false;

      var followUpdata = [];

      chatFollowUpDetail.forEach((element) => {
        var textparse = JSON.parse(element.messagetext);
        var dateOfFollowUp = moment(moment.unix(textparse[1] / 1000));
        var CurrentDate = moment();

        if (CurrentDate.diff(dateOfFollowUp) >= 0)
          followUpdata.push({
            id: element.id,
            textJson: element.messagetext,
            pageId: element.pageId,
            customerId: element.customerId,
            read: element.read,
            marknottoaddinchatcircle: element.marknottoaddinchatcircle,
          });
      });
      var result = null;
      try {
        result = JSON.stringify(followUpdata);
      } catch (e) {
        errorInJson = true;
      }

      return {
        success: !errorInJson,
        error: errorInJson ? "Error in JSON." : null,
        result: result,
      };
    },
    getsubscriptiondata: async (parent, args) => {
      let subscriptiondata = await db.subscriptiondata.findOne({
        where: {
          id: 1,
        },
      });
      return subscriptiondata ? subscriptiondata.data : null;
    },
    getpendingchatsdata: async (parent, args) => {
      let pendingchatsdata = await db.pendingchatsdata.findOne({
        where: {
          id: 1,
        },
      });
      return pendingchatsdata ? pendingchatsdata.data : null;
    },
    getpendingchatcount: async (parent, args) => {
      return {
        success: 1,
        result: JSON.stringify(
          await new globalVars().getPendingDataOnlyCustomerIdAndPageId(db)
        ),
      };
    },
    pendingchatcountchanged: async (parent, args) => {
      var result = {
        success: 1,
        result: JSON.stringify(
         await new globalVars().getPendingDataOnlyCustomerIdAndPageId(db)
        ),
      };

      pubsub.publish(PENDING_CHAT_COUNT_CHANGED, {
        pendingchatcountchanged: result,
      });
      return result;
    },
    getsearchdata: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

  
      var userID = args.userID;
      var include = null;
      if (args.managerId) {
        include = [
          {
            model: db.users,
            attributes: [],
          },
        ];
      }
      let customerAndPageIdsAllWhere = userID
        ? {
            where: {
              agentId: userID,
              messagetext: {
                [Op.like]: `%${args.searchText}%`,
              },
              messagetype: { [Op.ne]: "followuplabel" },
            },
          }
        : args.managerId
        ? {
            where: {
              "$user.managerId$": args.managerId,
              messagetext: {
                [Op.like]: `%${args.searchText}%`,
              },
              messagetype: { [Op.ne]: "followuplabel" },
            },
          }
        : {
          where: {
           
            messagetext: {
              [Op.like]: `%${args.searchText}%`,
            },
            messagetype: { [Op.ne]: "followuplabel" },
          },
        };

      var searchData = await db.chatdetails.findAll({
        ...customerAndPageIdsAllWhere,
        attributes: ["customerId", "pageId"],
        group: ["customerId", "pageId"],
        include:include,
        raw: true,
      });

      return {
        details: searchData,
        searchText: args.searchText,
        userID: args.userID,
        managerId: args.managerId
      };
    },
    callsubscriptiondatachanged: async (parent, args) => {
      pubsub.publish(SUBSCRIPTION_DATA_CHANGED, {
        subscriptiondatachanged: {
          success: 1,
          result: args.data,
        },
      });

      return {
        success: true,
      };
    },
  },

  Users: {
    designation(parent) {
      return db.designations.findOne({
        where: {
          id: parent.designationId,
        },
      });
    },
    managerId(parent) {
      return db.users.findOne({
        where: {
          id: parent.managerId,
        },
      });
    },
  },
  Me: {
    designation(parent) {
      return db.designations.findOne({
        where: {
          id: parent.designationId,
        },
      });
    },
    managerId(parent) {
      return db.users.findOne({
        where: {
          id: parent.managerId,
        },
      });
    },
  },
  PanelType: {
    SUPERADMIN: 0,
    ADMIN: 1,
    MANAGER: 2,
    AGENT: 3,
    FINANCE: 4,
  },
  StatusType: {
    ACTIVE: 0,
    BLOCKED: 1,
    DEAD: 2,
  },
  Mutation: {
    backtoaccountswitchlogin: async (
      parent,
      args,
      { res, req, GraphQLResolvers_ }
    ) => {
      const dataVarified = verifyTokenWithUserIDWithLoginAsDetails(args, req);
      req.userID = dataVarified.userID;
      if (req.userID == null) return null;

      var loginFromOwnAccount = false;
      var loginFromUserID = null;
      if (includes.isLoginAsAccountRequest(dataVarified)) {
        loginFromUserID = dataVarified.loginAsId;
      } else {
        loginFromOwnAccount = true;
        loginFromUserID = dataVarified.userID;
      }

      var LoggingToUserLoggedIn = false;
      var LoggingToUserIsOnline = false;

      let loggingToUserDetails = await db.users.findOne({
        where: {
          id: loginFromUserID,
        },
      });

      var subscriptionDataParsed = new globalVars().getSubscriptionData();

      if (subscriptionDataParsed) {
        var findUserAvailable = _.find(
          subscriptionDataParsed,
          (item) => item.agentId == loggingToUserDetails.id
        );

        if (findUserAvailable) {
          LoggingToUserLoggedIn = findUserAvailable.loggedIn;
          LoggingToUserIsOnline = findUserAvailable.isOnline;
        }
      }

      new Auth().removeTokensInCookies(res);

      new globalVars().setLoginAsUserLoggedOutStatus(
        dataVarified.userID,
        loginFromUserID,
        db,
        GraphQLResolvers_
      );

      const { refreshToken, accessToken } = new Auth().createTokensInCookies(
        loggingToUserDetails.id,
        dataVarified.guid,
        res
      );

      loggingToUserDetails.accessToken = accessToken;
      loggingToUserDetails.refreshToken = refreshToken;

      if (loggingToUserDetails.status != 0)
        throw new AuthenticationError("User is not active.");

      return loggingToUserDetails;
    },
    switchlogin: async (parent, args, { res, req, GraphQLResolvers_ }) => {
      const dataVarified = verifyTokenWithUserIDWithLoginAsDetails(args, req);
      req.userID = dataVarified.userID;

      if (req.userID == null) return null;

      var loginFromOwnAccount = false;
      var loginFromUserID = null;
      if (includes.isLoginAsAccountRequest(dataVarified)) {
        loginFromUserID = dataVarified.loginAsId;
      } else {
        loginFromOwnAccount = true;
        loginFromUserID = dataVarified.userID;
      }

      var LoggingToUserLoggedIn = false;
      var LoggingToUserIsOnline = false;

      let loggingToUserDetails = await db.users.findOne({
        where: {
          id: args.id,
        },
      });

      var subscriptionDataParsed = new globalVars().getSubscriptionData();

      if (subscriptionDataParsed) {
        var findUserAvailable = _.find(
          subscriptionDataParsed,
          (item) => item.agentId == loggingToUserDetails.id
        );

        if (findUserAvailable) {
          LoggingToUserLoggedIn = findUserAvailable.loggedIn;
          LoggingToUserIsOnline = findUserAvailable.isOnline;
        }
      }

      new Auth().removeTokensInCookies(res);

      if (!loginFromOwnAccount) {
        new globalVars().setLoginAsUserLoggedOutStatus(
          dataVarified.userID,
          loginFromUserID,
          db,
          GraphQLResolvers_
        );
      }
      ////////

      const { refreshToken, accessToken } =
        new Auth().createTokensInCookiesForLoginAs(
          loggingToUserDetails.id,
          loginFromUserID,
          dataVarified.guid,
          res
        );

      loggingToUserDetails.accessToken = accessToken;
      loggingToUserDetails.refreshToken = refreshToken;

      if (loggingToUserDetails.status != 0)
        throw new AuthenticationError("User is not active.");

      new globalVars().setLoginAsUserLoggedInStatus(
        loggingToUserDetails.id,
        loginFromUserID,
        dataVarified.guid,
        db,
        GraphQLResolvers_
      );

      return loggingToUserDetails;
    },
    login: async (parent, args, { res, GraphQLResolvers_ }) => {
      let me = null;
      var guid = includes.guidGenerator();

      await db.users
        .findOne({
          where: {
            username: args.username,
          },
        })
        .then(function (user_) {
          if (user_) {
            let valid = bcrypt.compareSync(args.password, user_.password);
            if (valid) {
              me = user_;
            }
          }
        });

      if (!me) throw new AuthenticationError("Invalid username and password.");
      if (me.status != 0) throw new AuthenticationError("User is not active.");

      const { refreshToken, accessToken } = new Auth().createTokensInCookies(
        me.id,
        guid,
        res
      );

      me.accessToken = accessToken;
      me.refreshToken = refreshToken;

      var userIsLoggedIn = false;
      var subscriptionDataParsed = new globalVars().getSubscriptionData();

      if (subscriptionDataParsed) {
        var findUserAvailableInLoginList = _.find(
          subscriptionDataParsed,
          (item) => item.agentId == me.id && item.isUserLoggedIn
        );

        if (findUserAvailableInLoginList) userIsLoggedIn = true;
      }
      if (userIsLoggedIn)
        throw new AuthenticationError("User is already loggedin.");

      new globalVars().setUserLoggedInStatus(
        me.id,
        guid,
        db,
        GraphQLResolvers_
      );

      return me;
    },
    logout: async (parent, args, { req, res, GraphQLResolvers_ }) => {
      req.userID = verifyTokenWithUserID(args, req);
      new Auth().removeTokensInCookies(res);

      new globalVars().setUserLoggedOutStatus(
        req.userID,
        db,
        GraphQLResolvers_
      );

      return {
        success: true,
        error: null,
      };
    },
    updateme: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      let errorEmptyUsername = false;
      let errorEmptyNewPassword = false;
      let errorEmptyName = false;
      let errorEmail = false;

      var userData = await db.users.findOne({
        where: {
          username: args.username,
          id: args.id,
        },
      });
      if (userData) {
        let valid = bcrypt.compareSync(args.currentpassword, userData.password);
        if (!valid) {
          throw new AuthenticationError("Invalid username and password.");
        } else {
          if (args.username != undefined) {
            userData.username = args.username;
            errorEmptyUsername = validator.isEmpty(args.username);
          }
          if (args.newpassword) {
            userData.password = args.newpassword;
            errorEmptyPassword = validator.isEmpty(args.newpassword);
          }
          if (args.name != undefined) {
            userData.name = args.name;
            errorEmptyName = validator.isEmpty(args.name);
          }
          if (args.email != undefined) {
            userData.email = args.email;
            errorEmail = !validator.isEmail(args.email);
          }

          if (args.pseudonym != undefined) userData.pseudonym = args.pseudonym;
          if (args.picture != undefined) userData.picture = args.picture;
          if (args.number != undefined) userData.number = args.number;
        }

        if (
          !errorEmptyUsername &&
          !errorEmptyNewPassword &&
          !errorEmptyName &&
          !errorEmail
        )
          var errorOnSaveText = false;
        try {
          await userData.save();
        } catch (e) {
          errorOnSaveText = e;
          console.log(e);
        }
      }
      return {
        success:
          !errorEmptyUsername &&
          !errorEmptyNewPassword &&
          !errorEmptyName &&
          !errorEmail &&
          !errorOnSaveText,
        error:
          errorEmptyUsername ||
          errorEmptyNewPassword ||
          errorEmptyName ||
          errorEmail
            ? "Email is not valid."
            : errorOnSaveText
            ? errorOnSaveText
            : null,
      };
    },
    addpages: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;
      if (args.objects && args.objects.length > 0) {
        try {
          await db.pages.bulkCreate(args.objects);
        } catch (e) {
          console.log(e);
        }
      }
      return {
        success: true,
        error: null,
      };
    },
    deletepage: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      await db.pages.destroy({
        where: {
          id: args.id,
        },
      });

      return {
        success: true,
        error: null,
      };
    },
    removechatlabel: async (parent, args, { req, GraphQLResolvers_ }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      let errorEmptyCustomerId = false;
      let errorEmptyPageId = false;
      let errorEmptyMessageText = false;

      errorEmptyCustomerId = validator.isEmpty(args.customerId);
      errorEmptyPageId = validator.isEmpty(args.pageId);
      errorEmptyMessageText = validator.isEmpty(args.messagetext);

      if (
        !errorEmptyCustomerId &&
        !errorEmptyPageId &&
        !errorEmptyMessageText
      ) {
        await db.chatdetails.destroy({
          where: {
            customerId: args.customerId,
            pageId: args.pageId,
            messagetext: args.messagetext,
            messagetype: "label",
          },
        });
        var messages = await db.chatdetails.findOne({
          where: {
            customerId: args.customerId,
            pageId: args.pageId,
          },
          raw: true,
          order: [["id", "DESC"]],
        });

        if (messages) {
          pubsub.publish(CHAT_LABEL_REMOVED, {
            chatlabelremove: {
              success: 1,
              result: JSON.stringify({
                removeData: {
                  customerId: args.customerId,
                  pageId: args.pageId,
                  messagetext: args.messagetext,
                  messagetype: "label",
                },
                lastChatDetails: messages,
              }),
            },
          });
        }
      }
      return {
        success:
          !errorEmptyCustomerId && !errorEmptyPageId && !errorEmptyMessageText,
        error:
          errorEmptyCustomerId || errorEmptyPageId || errorEmptyMessageText
            ? "String can not be empty."
            : null,
      };
    },
    addchatdetail: async (parent, args, { GraphQLResolvers_ }) => {
      //  req.userID = verifyTokenWithUserID(args, req);
      // if (req.userID == null) return null;

      let errorEmptyCustomerId = false;
      let errorEmptyPageId = false;
      let errorEmptyMessageText = false;
      let errorEmptMessageTimestamp = false;
      let errorEmptyMessageType = false;
      let errorEmptyAgentId = false;

      errorEmptyCustomerId = validator.isEmpty(args.customerId);
      errorEmptyPageId = validator.isEmpty(args.pageId);
      errorEmptyMessageText = validator.isEmpty(args.messagetext);
      //errorEmptMessageTimestamp = validator.isEmpty(args.messagetimestamp);
      errorEmptyMessageType = validator.isEmpty(args.messagetype);
      errorEmptyAgentId = validator.isEmpty(args.agentId.toString());

      if (
        !errorEmptyCustomerId &&
        !errorEmptyPageId &&
        !errorEmptyMessageText &&
        !errorEmptMessageTimestamp &&
        !errorEmptyMessageType &&
        !errorEmptyAgentId
      ) {
        let chatDetailsOfLastMessage = await db.chatdetails.findOne({
          where: {
            customerId: args.customerId,
            pageId: args.pageId,
          },
          order: [["id", "DESC"]],
          attributes: ["marknottoaddinchatcircle"],
        });
        var marknottoaddinchatcircle = false;

        if (chatDetailsOfLastMessage) {
          marknottoaddinchatcircle =
            chatDetailsOfLastMessage.marknottoaddinchatcircle;
        }

        if (args.messagetype == "closelabel") {
          marknottoaddinchatcircle = true;
          var chatData = await db.chatdetails.findAll({
            where: {
              agentId: args.agentId,
              customerId: args.customerId,
              pageId: args.pageId,
            },
          });

          for (var i = 0; i < chatData.length; i++) {
            try {
              await chatData[i].update({ marknottoaddinchatcircle: true });
            } catch (e) {}
          }
          new globalVars().removeChatFromSubscriptionData(
            db,
            args.agentId,
            args.customerId,
            args.pageId,
            GraphQLResolvers_
          );
          new globalVars().checkAndSendPendingChatsFromSubscriptionData(
            db,
            GraphQLResolvers_
          );
        }
        var insertData = {
          customerId: args.customerId,
          pageId: args.pageId,
          messageId: args.messageId,
          messagetext: args.messagetext,
          messagetimestamp: isNaN(parseInt(args.messagetimestamp))
            ? args.messagetimestamp
            : parseInt(args.messagetimestamp),
          messagetype: args.messagetype,
          agentId: args.agentId,
          alternateagentId: args.alternateagentId,
          read: args.read,
          marknottoaddinchatcircle: marknottoaddinchatcircle,
        };

        var result = await db.chatdetails.create(insertData);
        insertData.id = result.id;
        pubsub.publish(CHAT_ADDED, { chatdetailadded: insertData });
      }
      return {
        success:
          !errorEmptyCustomerId &&
          !errorEmptyPageId &&
          !errorEmptyMessageText &&
          !errorEmptMessageTimestamp &&
          !errorEmptyMessageType &&
          !errorEmptyAgentId,
        error:
          errorEmptyCustomerId ||
          errorEmptyPageId ||
          errorEmptyMessageText ||
          errorEmptMessageTimestamp ||
          errorEmptyMessageType ||
          errorEmptyAgentId
            ? "String can not be empty."
            : null,
      };
    },
    adduser: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      let errorEmptyUsername = false;
      let errorEmptyPassword = false;
      let errorEmptyName = false;
      let errorEmptyDesignationId = false;
      let errorEmptyStatus = false;
      let errorDesignationId = false;
      let errorManagerId = false;
      let errorEmail = false;

      errorEmptyUsername = validator.isEmpty(args.username);
      errorEmptyPassword = validator.isEmpty(args.password);
      errorEmptyName = validator.isEmpty(args.name);
      errorEmptyDesignationId = validator.isEmpty(args.designationId);
      errorEmptyStatus = validator.isEmpty(args.status);

      if (args.email) {
        errorEmail = !validator.isEmail(args.email);
      }

      if (args.designationId) {
        errorDesignationId = await checkDesignationIdIsNotValid(
          db,
          args.designationId
        );
      }

      if (args.managerId) {
        errorManagerId = await checkManagerIdIsNotValid(db, args.managerId);
      }
      if (
        !errorEmptyUsername &&
        !errorEmptyPassword &&
        !errorEmptyName &&
        !errorEmptyDesignationId &&
        !errorEmptyStatus &&
        !errorDesignationId &&
        !errorManagerId &&
        !errorEmail
      ) {
        await db.users.create({
          picture: args.picture,
          pseudonym: args.pseudonym,
          username: args.username,
          password: args.password,
          name: args.name,
          email: args.email,
          number: args.number,
          status: args.status,
          comments: args.comments,
          designationId: args.designationId,
          managerId: args.managerId,
          settings: args.settings,
          agentlimitchatassign: args.agentlimitchatassign,
          pages: args.pages,
        });
      }
      return {
        success:
          !errorEmptyUsername &&
          !errorEmptyPassword &&
          !errorEmptyName &&
          !errorEmptyDesignationId &&
          !errorEmptyStatus &&
          !errorDesignationId &&
          !errorManagerId,
        error:
          errorEmptyUsername ||
          errorEmptyPassword ||
          errorEmptyName ||
          errorEmptyDesignationId ||
          errorEmptyStatus
            ? "String can not be empty."
            : errorEmail
            ? "Email is not valid."
            : errorDesignationId
            ? "Invalid designation id"
            : errorManagerId
            ? "Invalid manager id"
            : null,
      };
    },
    updateuser: async (parent, args, { req, GraphQLResolvers_ }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      let userData = await db.users.findOne({
        where: {
          id: args.id,
        },
      });
      let errorEmptyUsername = false;
      let errorEmptyPassword = false;
      let errorEmptyName = false;
      let errorEmptyDesignationId = false;
      let errorEmptyStatus = false;
      let errorDesignationId = false;
      let errorManagerId = false;
      let errorEmail = false;

      if (userData) {
        if (args.username != undefined) {
          userData.username = args.username;
          errorEmptyUsername = validator.isEmpty(args.username);
        }
        if (args.password) {
          userData.password = args.password;
          errorEmptyPassword = validator.isEmpty(args.password);
        }
        if (args.name != undefined) {
          userData.name = args.name;
          errorEmptyName = validator.isEmpty(args.name);
        }
        if (args.status != undefined) {
          userData.status = args.status;
          errorEmptyStatus = validator.isEmpty(args.status);
        }
        if (args.email != undefined) {
          userData.email = args.email;
          errorEmail = !validator.isEmail(args.email);
        }
        if (args.designationId != undefined) {
          userData.designationId = args.designationId;
          errorEmptyDesignationId = validator.isEmpty(args.designationId);
        }
        if (args.designationId != undefined) {
          userData.designationId = args.designationId;
          errorDesignationId = await checkDesignationIdIsNotValid(
            db,
            args.designationId
          );
        }
        if (args.agentlimitchatassign != undefined) {
          userData.agentlimitchatassign = args.agentlimitchatassign;
        }
        if (args.managerId != undefined) {
          userData.managerId = args.managerId;
          errorManagerId = await checkManagerIdIsNotValid(db, args.managerId);
        }
        if (args.pseudonym != undefined) userData.pseudonym = args.pseudonym;
        if (args.picture != undefined) userData.picture = args.picture;
        if (args.number != undefined) userData.number = args.number;
        if (args.comments != undefined) userData.comments = args.comments;
        if (args.settings != undefined) userData.settings = args.settings;

        if (args.pages != undefined) userData.pages = args.pages;

        if (
          !errorEmptyUsername &&
          !errorEmptyPassword &&
          !errorEmptyName &&
          !errorEmptyDesignationId &&
          !errorEmptyStatus &&
          !errorDesignationId &&
          !errorManagerId &&
          !errorEmail
        )
          var errorOnSaveText = false;
        try {
          await userData.save();
        } catch (e) {
          errorOnSaveText = e;
          console.log(e);
        }
      }

      var success_ =
        !errorEmptyUsername &&
        !errorEmptyPassword &&
        !errorEmptyName &&
        !errorEmptyDesignationId &&
        !errorEmptyStatus &&
        !errorDesignationId &&
        !errorManagerId &&
        !errorEmail &&
        !errorOnSaveText;

      if (success_) {
        new globalVars().checkAndSendPendingChatsFromSubscriptionData(
          db,
          GraphQLResolvers_
        );
      }
      return {
        success: success_,
        error:
          errorEmptyUsername ||
          errorEmptyPassword ||
          errorEmptyName ||
          errorEmptyDesignationId ||
          errorEmptyStatus
            ? "String can not be empty."
            : errorEmail
            ? "Email is not valid."
            : errorDesignationId
            ? "Invalid designation id"
            : errorManagerId
            ? "Invalid manager id"
            : errorOnSaveText
            ? errorOnSaveText
            : null,
      };
    },
    updatelabels: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      let userData = await db.users.findOne({
        where: {
          id: req.userID,
        },
      });
      let errorEmptyLabel = false;

      if (userData) {
        if (args.labels != undefined) {
          userData.labels = args.labels;
          errorEmptyLabel = validator.isEmpty(args.labels);
        }

        if (!errorEmptyLabel) {
          var errorOnSaveText = false;
          try {
            await userData.save();
          } catch (e) {
            errorOnSaveText = e;
            console.log(e);
          }
        }
      }
      return {
        success: !errorEmptyLabel,
        error: errorEmptyLabel
          ? "String can not be empty."
          : errorOnSaveText
          ? errorOnSaveText
          : null,
      };
    },
    deleteuser: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      let isCurrentUser = false;
      if (req.userID != args.id) {
        await db.users.destroy({
          where: {
            id: args.id,
          },
        });
      } else {
        isCurrentUser = true;
      }
      return {
        success: !isCurrentUser,
        error: isCurrentUser ? "Cannot delete loggedin user" : null,
      };
    },
    deleteprofile: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      await db.profiles.destroy({
        where: {
          id: args.id,
        },
      });

      return {
        success: 1,
        error: null,
      };
    },
    addprofile: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      let errorEmptyName = false;
      let errorEmptyPaneltype = false;

      errorEmptyName = validator.isEmpty(args.name);
      errorEmptyPaneltype = validator.isEmpty(args.paneltype);

      if (!errorEmptyName && !errorEmptyPaneltype) {
        await db.profiles.create({
          name: args.name,
          paneltype: args.paneltype,
          settings: args.settings,
        });
      }
      return {
        success: !errorEmptyName && !errorEmptyPaneltype,
        error:
          errorEmptyName || errorEmptyPaneltype
            ? "String can not be empty."
            : null,
      };
    },
    addchattofacebook: async (parent, args, { req }) => {
      let errorEmptyCustomerId = false;
      let errorEmptyPageId = false;
      let errorEmptyMessage = false;
      let errorEmptyOutgoingMessageId = false;

      errorEmptyCustomerId = validator.isEmpty(args.customerId);
      errorEmptyPageId = validator.isEmpty(args.pageId);
      errorEmptyMessage = validator.isEmpty(args.message);

      var errorMessageFromFaebook = "";

      if (!errorEmptyCustomerId && !errorEmptyPageId && !errorEmptyMessage) {
        const qs = {
          access_token: args.accesstoken,
          messaging_type: "RESPONSE",
          recipient: {
            id: args.customerId,
          },
          message: {
            text: args.message,
          },
        };

        var result;
        try {
          const response = await axios.post(
            "https://graph.facebook.com/v10.0/me/messages",
            qs
          );
          result = response.data;
        } catch (error) {
          if (error.response.data.error.code == 10)
            errorMessageFromFaebook =
              "According to Facebook policy you are not allowed to respond on messages after 24 hours.";
          else errorMessageFromFaebook = error.response.data.error.message;
        }
      }

      return {
        success:
          !errorEmptyCustomerId &&
          !errorEmptyPageId &&
          !errorEmptyMessage &&
          !errorMessageFromFaebook,
        error:
          errorEmptyCustomerId || errorEmptyPageId || errorEmptyMessage
            ? "String can not be empty."
            : errorMessageFromFaebook != ""
            ? errorMessageFromFaebook
            : null,
        result: JSON.stringify({
          outgoingMessageId: args.outgoingMessageId,
          message_id: result ? result.message_id : null,
        }),
      };
    },
    updateprofile: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      let profileData = await db.profiles.findOne({
        where: {
          id: args.id,
        },
      });
      let errorEmptyName = false;
      let errorEmptyPaneltype = false;

      if (profileData) {
        if (args.name != undefined) {
          profileData.name = args.name;

          errorEmptyName = validator.isEmpty(args.name);
        }
        if (args.paneltype) {
          profileData.paneltype = args.paneltype;
          errorEmptyPaneltype = validator.isEmpty(args.paneltype);
        }
        if (args.settings != undefined) profileData.settings = args.settings;

        if (!errorEmptyName && !errorEmptyPaneltype)
          var errorOnSaveText = false;
        try {
          await profileData.save();
        } catch (e) {
          errorOnSaveText = e;
          console.log(e);
        }
      }
      return {
        success: !errorEmptyName && !errorEmptyPaneltype && !errorOnSaveText,
        error:
          errorEmptyName || errorEmptyPaneltype
            ? "String can not be empty."
            : errorOnSaveText
            ? errorOnSaveText
            : null,
      };
    },
    addleadform: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;
      let errorEmptyCustomerId = false;
      let errorEmptyFirstName = false;
      let errorEmptyLastName = false;
      let errorEmptyPhoneNumber = false;
      let errorEmptyCurrentAddress = false;
      let errorEmptyDateOfBirth = false;
      let errorEmptyService = false;
      let errorEmptyReferenceNumber = false;
      let errorEmptyAccountNumber = false;
      let errorEmptyMonthlyTotal = false;
      let errorEmptyFirstMonthBill = false;

      errorEmptyCustomerId = validator.isEmpty(args.customerId);
      errorEmptyFirstName = validator.isEmpty(args.firstname);
      errorEmptyLastName = validator.isEmpty(args.lastname);
      errorEmptyPhoneNumber = validator.isEmpty(args.phonenumber);
      errorEmptyCurrentAddress = validator.isEmpty(args.currentaddress);
      errorEmptyDateOfBirth = validator.isEmpty(args.dateofbirth);

      errorEmptyService = validator.isEmpty(args.service);
      errorEmptyReferenceNumber = validator.isEmpty(args.referencenumber);
      errorEmptyAccountNumber = validator.isEmpty(args.accountnumber);
      errorEmptyMonthlyTotal = validator.isEmpty(args.monthlytotal);
      errorEmptyFirstMonthBill = validator.isEmpty(args.firstmonthbill);

      if (
        !errorEmptyCustomerId &&
        !errorEmptyFirstName &&
        !errorEmptyLastName &&
        !errorEmptyPhoneNumber &&
        !errorEmptyCurrentAddress &&
        !errorEmptyDateOfBirth &&
        !errorEmptyService &&
        !errorEmptyReferenceNumber &&
        !errorEmptyAccountNumber &&
        !errorEmptyMonthlyTotal &&
        !errorEmptyFirstMonthBill
      ) {
        await db.leadforms.create({
          customerId: args.customerId,
          firstname: args.firstname,
          lastname: args.lastname,
          phonenumber: args.phonenumber,
          alternatephonenumber: args.alternatephonenumber,
          emailaddress: args.emailaddress,
          previousaddress: args.previousaddress,
          currentaddress: args.currentaddress,
          dateofbirth: args.dateofbirth,
          ssn: args.ssn,
          provider: args.provider,
          service: args.service,
          referencenumber: args.referencenumber,
          accountnumber: args.accountnumber,
          monthlytotal: args.monthlytotal,
          firstmonthbill: args.firstmonthbill,
          comments: args.comments,
        });
      }
      return {
        success:
          !errorEmptyCustomerId &&
          !errorEmptyFirstName &&
          !errorEmptyLastName &&
          !errorEmptyPhoneNumber &&
          !errorEmptyCurrentAddress &&
          !errorEmptyDateOfBirth &&
          !errorEmptyService &&
          !errorEmptyReferenceNumber &&
          !errorEmptyAccountNumber &&
          !errorEmptyMonthlyTotal &&
          !errorEmptyFirstMonthBill,
        error:
          errorEmptyCustomerId ||
          errorEmptyFirstName ||
          errorEmptyLastName ||
          errorEmptyPhoneNumber ||
          errorEmptyCurrentAddress ||
          errorEmptyDateOfBirth ||
          errorEmptyService ||
          errorEmptyReferenceNumber ||
          errorEmptyAccountNumber ||
          errorEmptyMonthlyTotal ||
          errorEmptyFirstMonthBill
            ? "String can not be empty."
            : null,
      };
    },
    markreadchat: async (parent, args, { req }) => {
      let chatData = await db.chatdetails.findOne({
        where: {
          id: args.id,
        },
      });
      var errorOnSaveText = "";
      if (chatData) {
        chatData.read = 1;
        try {
          await chatData.save();
        } catch (e) {
          errorOnSaveText = e;
          console.log(e);
        }
      }

      return {
        success: !errorOnSaveText,
        error: errorOnSaveText ? errorOnSaveText : null,
      };
    },
    updateleadform: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      let leadFormsData = await db.leadforms.findOne({
        where: {
          id: args.id,
        },
      });
      let errorEmptyFirstName = false;
      let errorEmptyLastName = false;
      let errorEmptyPhoneNumber = false;
      let errorEmptyCurrentAddress = false;
      let errorEmptyDateOfBirth = false;

      let errorEmptyService = false;
      let errorEmptyReferenceNumber = false;
      let errorEmptyAccountNumber = false;
      let errorEmptyMonthlyTotal = false;
      let errorEmptyFirstMonthBill = false;

      if (leadFormsData) {
        if (args.firstname != undefined) {
          leadFormsData.firstname = args.firstname;
          errorEmptyFirstName = validator.isEmpty(args.firstname);
        }
        if (args.lastname) {
          leadFormsData.lastname = args.lastname;
          errorEmptyLastName = validator.isEmpty(args.lastname);
        }
        if (args.phonenumber != undefined) {
          leadFormsData.phonenumber = args.phonenumber;
          errorEmptyPhoneNumber = validator.isEmpty(args.phonenumber);
        }

        if (args.alternatephonenumber != undefined)
          leadFormsData.alternatephonenumber = args.alternatephonenumber;

        if (args.emailaddress != undefined)
          leadFormsData.emailaddress = args.emailaddress;

        if (args.previousaddress != undefined)
          leadFormsData.previousaddress = args.previousaddress;

        if (args.currentaddress != undefined) {
          leadFormsData.currentaddress = args.currentaddress;
          errorEmptyCurrentAddress = validator.isEmpty(args.currentaddress);
        }
        if (args.dateofbirth != undefined) {
          leadFormsData.dateofbirth = args.dateofbirth;
          errorEmptyDateOfBirth = validator.isEmail(args.dateofbirth);
        }
        if (args.ssn != undefined) {
          leadFormsData.ssn = args.ssn;
        }
        if (args.ssn != undefined) {
          leadFormsData.provider = args.provider;
        }
        if (args.service != undefined) {
          leadFormsData.service = args.service;
          errorEmptySSN = validator.isEmpty(args.service);
        }
        if (args.referencenumber != undefined) {
          leadFormsData.referencenumber = args.referencenumber;
          errorEmptyReferenceNumber = validator.isEmpty(args.referencenumber);
        }
        if (args.accountnumber != undefined) {
          leadFormsData.accountnumber = args.accountnumber;
          errorEmptyAccountNumber = validator.isEmpty(args.accountnumber);
        }
        if (args.monthlytotal != undefined) {
          leadFormsData.monthlytotal = args.monthlytotal;
          errorEmptyMonthlyTotal = validator.isEmpty(args.monthlytotal);
        }
        if (args.firstmonthbill != undefined) {
          leadFormsData.firstmonthbill = args.firstmonthbill;
          errorEmptyFirstMonthBill = validator.isEmpty(args.firstmonthbill);
        }
        if (args.comments != undefined) leadFormsData.comments = args.comments;

        if (
          !errorEmptyFirstName &&
          !errorEmptyLastName &&
          !errorEmptyPhoneNumber &&
          !errorEmptyCurrentAddress &&
          !errorEmptyDateOfBirth &&
          !errorEmptyService &&
          !errorEmptyReferenceNumber &&
          !errorEmptyAccountNumber &&
          !errorEmptyMonthlyTotal &&
          !errorEmptyFirstMonthBill
        )
          var errorOnSaveText = false;
        try {
          await leadFormsData.save();
        } catch (e) {
          errorOnSaveText = e;
          console.log(e);
        }
      }
      return {
        success:
          !errorEmptyFirstName &&
          !errorEmptyLastName &&
          !errorEmptyPhoneNumber &&
          !errorEmptyCurrentAddress &&
          !errorEmptyDateOfBirth &&
          !errorEmptyService &&
          !errorEmptyReferenceNumber &&
          !errorEmptyAccountNumber &&
          !errorEmptyMonthlyTotal &&
          !errorEmptyFirstMonthBill &&
          !errorOnSaveText,
        error:
          errorEmptyFirstName ||
          errorEmptyLastName ||
          errorEmptyPhoneNumber ||
          errorEmptyCurrentAddress ||
          errorEmptyDateOfBirth ||
          errorEmptyService ||
          errorEmptyReferenceNumber ||
          errorEmptyAccountNumber ||
          errorEmptyMonthlyTotal ||
          errorEmptyFirstMonthBill
            ? "String can not be empty."
            : errorOnSaveText
            ? errorOnSaveText
            : null,
      };
    },
    deleteleadform: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      await db.leadforms.destroy({
        where: {
          id: args.id,
        },
      });

      return {
        success: true,
        error: null,
      };
    },
    adddesignation: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      let errorEmptyName = false;
      let errorEmptyPaneltype = false;

      errorEmptyName = validator.isEmpty(args.name);
      errorEmptyPaneltype = validator.isEmpty(args.paneltype);

      if (!errorEmptyName && !errorEmptyPaneltype) {
        await db.designations.create({
          name: args.name,
          paneltype: args.paneltype,
        });
      }
      return {
        success: !errorEmptyName && !errorEmptyPaneltype,
        error:
          errorEmptyName || errorEmptyPaneltype
            ? "String can not be empty."
            : null,
      };
    },
    updatedesignation: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      let designationData = await db.designations.findOne({
        where: {
          id: args.id,
        },
      });
      let errorEmptyName = false;
      let errorEmptyPaneltype = false;

      if (designationData) {
        if (args.name != undefined) {
          designationData.name = args.name;
          errorEmptyName = validator.isEmpty(args.name);
        }
        if (args.paneltype) {
          designationData.paneltype = args.paneltype;
          errorEmptyPaneltype = validator.isEmpty(args.paneltype);
        }

        if (!errorEmptyName && !errorEmptyPaneltype)
          var errorOnSaveText = false;
        try {
          await designationData.save();
        } catch (e) {
          errorOnSaveText = e;
          console.log(e);
        }
      }
      return {
        success: !errorEmptyName && !errorEmptyPaneltype && !errorOnSaveText,
        error:
          errorEmptyName || errorEmptyPaneltype
            ? "String can not be empty."
            : errorOnSaveText
            ? errorOnSaveText
            : null,
      };
    },
    deletedesignation: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;

      let isDesignationAlreadyUsed = false;
      let designationUserData = await db.users.findOne({
        where: {
          designationId: args.id,
        },
      });
      if (designationUserData) {
        isDesignationAlreadyUsed = true;
      } else {
        await db.designations.destroy({
          where: {
            id: args.id,
          },
        });
      }
      return {
        success: !isDesignationAlreadyUsed,
        error: isDesignationAlreadyUsed ? "Designation is in use." : null,
      };
    },
    requestresettoken: async (parent, args, { req }) => {
      let userData = await db.users.findOne({
        where: {
          email: args.email,
        },
      });
      var emailMatch = false;
      var emailErrorText = "";
      if (userData) {
        emailMatch = true;
        const token = crypto.randomBytes(20).toString("hex");
        userData.resetPasswordToken = token;
        userData.resetPasswordExpires = Date.now() + 3600000;

        userData.save();

        var transport = {
          port: 465,
          host: mailerConfig.HOST,
          secure: true, // e.g. smtp.gmail.com
          auth: {
            user: mailerConfig.USERNAME,
            pass: mailerConfig.PASSWORD,
          },
        };
        try {
          var transporter = nodemailer.createTransport(transport);

          //transporter.verify((error, success) => {
          //if (error) {
          //  console.log(error);
          // } else {
          //   console.log("mailing service is ready");
          //  }
          //});

          const subject = "Link to reset password";
          const email = args.email;

          var mail = {
            from: mailerConfig.EMAIL,
            to: email,
            subject: subject,

            text: `You've asked to reset your password for the GreenMarketingCRM account associated with this email address (${email}). To get the password reset code, please click on the following link:\n\n${mailerConfig.WEBSITEURL}/${token}`,
          };

          try {
            let info = await transporter.sendMail(mail);
          } catch (err) {
            console.log("Email Error Details", err);
            emailErrorText = "Email unable to sent. Please contact admin.";
          }
        } catch (e) {
          console.log("Email Error Details 2", err);
        }
      }
      return {
        success: emailMatch && emailErrorText == "",
        error: !emailMatch
          ? "Email not found."
          : emailErrorText != ""
          ? emailErrorText
          : null,
      };
    },
    deliverystatuschanged: async (parent, args) => {
      var chatData = await db.chatdetails.findAll({
        where: {
          customerId: args.customerId,
          pageId: args.pageId,
        },
      });

      chatData.forEach(function (t) {
        try {
          if (!t.deliverytimestamp)
            t.update({ deliverytimestamp: args.deliverytimestamp });
        } catch (e) {}
      });

      pubsub.publish(DELIVERY_STATUS_CHANGED, {
        deliverystatuschanged: {
          customerId: args.customerId,
          pageId: args.pageId,

          deliverytimestamp: args.deliverytimestamp,
        },
      });

      return chatData;
    },
    markallmessagechatread: async (parent, args, { req }) => {
      req.userID = verifyTokenWithUserID(args, req);
      if (req.userID == null) return null;
      var chatData = await db.chatdetails.findAll({
        where: {
          agentId: req.userID,
          customerId: args.customerId,
          pageId: args.pageId,
        },
      });

      chatData.forEach(function (t) {
        try {
          if (!t.read) t.update({ read: true });
        } catch (e) {}
      });

      pubsub.publish(CHAT_MARK_READ, {
        markallmessagechatread: {
          agentId: req.userID,
          customerId: args.customerId,
          pageId: args.pageId,
        },
      });
    },
    receiptreadstatuschanged: async (parent, args) => {
      var chatData = await db.chatdetails.findAll({
        where: {
          customerId: args.customerId,
          pageId: args.pageId,
        },
      });

      chatData.forEach(function (t) {
        try {
          if (!t.receiptreadtimestamp)
            t.update({ receiptreadtimestamp: args.receiptreadtimestamp });
        } catch (e) {}
      });

      pubsub.publish(RECIEPT_READ_STATUS_CHANGED, {
        receiptreadstatuschanged: {
          customerId: args.customerId,
          pageId: args.pageId,
          receiptreadtimestamp: args.receiptreadtimestamp,
        },
      });

      return chatData;
    },
    changepasswordfromvalidresettoken: async (parent, args, { req }) => {
      let userData = await db.users.findOne({
        where: {
          resetPasswordToken: args.token,
          resetPasswordExpires: {
            [Op.gt]: Date.now(),
          },
        },
      });
      var validToken = false;

      if (userData) {
        validToken = true;
        const token = crypto.randomBytes(20).toString("hex");
        userData.resetPasswordToken = null;
        userData.resetPasswordExpires = null;
        userData.password = args.password;

        try {
          await userData.save();
        } catch (e) {
          console.log("userData Error", e);
        }
      }
      return {
        success: validToken,
        error: !validToken
          ? "Password reset link is invalid or has expired."
          : null,
      };
    },

    changeonlinestatus: (parent, args, { req, GraphQLResolvers_ }) => {
      const dataVarified = verifyTokenWithUserIDWithLoginAsDetails(args, req);
      req.userID = dataVarified.userID;
      if (req.userID == null) return null;

      var loginFromOwnAccount = false;

      var loginFromUserID = null;
      if (includes.isLoginAsAccountRequest(dataVarified)) {
        loginFromUserID = dataVarified.loginAsId;
      } else {
        loginFromOwnAccount = true;
        loginFromUserID = dataVarified.userID;
      }

      new globalVars().setUserOnlineStatus(
        req.userID,
        args.online,
        loginFromOwnAccount,
        db,
        GraphQLResolvers_
      );
      new globalVars().checkAndSendPendingChatsFromSubscriptionData(
        db,
        GraphQLResolvers_
      );
      return {
        success: true,
        error: null,
        result: args.online,
      };
    },
    messagetypingstatuschanged: (parent, args, { req, GraphQLResolvers_ }) => {
      pubsub.publish(MESSAGE_TYPING_STATUS_CHANGED, {
        messagetypingstatuschanged: {
          customerId: args.customerId,
          pageId: args.pageId,
          agentId: args.agentId,
          userId: args.userId,
          username: args.username,
        },
      });
      return {
        customerId: args.customerId,
        pageId: args.pageId,
        agentId: args.agentId,
        userId: args.userId,
        username: args.username,
      };
    },
    forcelogout: async (parent, args, { req, GraphQLResolvers_ }) => {
      var subscriptionDataParsed = new globalVars().getSubscriptionData();

      if (subscriptionDataParsed) {
        var findUserAvailable = _.find(
          subscriptionDataParsed,
          (item) => item.agentId == args.id
        );
        var guid = null;
        if (findUserAvailable) {
          guid = findUserAvailable.guid;
        }

        var findUsersByGuid = _.filter(
          subscriptionDataParsed,
          (item) => item.guid == guid
        );
        findUsersByGuid.map((user) => {
          pubsub.publish(FORCE_LOGOUT, {
            forcelogout: {
              id: user.agentId,
              username: args.username,
            },
          });
          new globalVars().setUserLoggedOutStatus(
            user.agentId,
            db,
            GraphQLResolvers_
          );
        });
      }
      return {
        success: true,
        error: null,
      };
    },
  },
};
