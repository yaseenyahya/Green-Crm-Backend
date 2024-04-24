var express = require("express");
var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var db = require("./database/db");
var initialDatabaseEntry = require("./database/initialDatabaseEntry");
var { ApolloServer } = require("apollo-server-express");
var GraphQLTypes_ = require("./graphql/typeDefs");
var GraphQLResolvers_ = require("./graphql/resolvers");
const includes = require("./graphql/includes");
var { sameSiteCookieMiddleware } = require("express-samesite-default");
var { json } = require("express");
const https = require("https");
const http = require("http");
const fs = require("fs");
var cors = require("cors");
var _ = require("lodash");
var globalVars = require("./graphql/globalVars");
const moment = require("moment");

const app = express();

app.enable("trust proxy");
app.use(sameSiteCookieMiddleware());
app.use(cookieParser());

app.use(json({ limit: "200mb" }));

const env = process.env.NODE_ENV || "development";

var corsOptions = {
  // origin: config.front_end_url,
  origin: true,
  credentials: true, // <-- REQUIRED backend setting
};

// Body parser
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

global.subscriptionData = null;

global.checkAndSendPendingChatsFromSubscriptionDataStarted = false;

db.sequelize
  .sync()
  .then(async () => {
    let initialDatabaseEntryObj = new initialDatabaseEntry();
    initialDatabaseEntryObj.insertInitialData(db);

    var subscriptionData = await GraphQLResolvers_.Query.getsubscriptiondata();
    global.subscriptionData =
      subscriptionData != null
        ? JSON.parse(subscriptionData)
        : subscriptionData;

////////////////////initial entry from pendingchatsdata to pendingchats /////
/// delete after migration ///

//var pendingData = await db.pendingchatsdata.findOne({
 // where: {
 //   id: 1,
 // },
 // raw:true
//});
//var pendingDataParse = JSON.parse(pendingData.data);
//var pendingDataParseArrayFordbEntry = [];
//pendingDataParse.map((event_)=>{

 // var pageId = event_.pageIdAdded ;
 // var isPage = pageId == event_.sender.id;
  //var customerId = isPage ? event_.recipient.id : event_.sender.id;

 // pendingDataParseArrayFordbEntry.push({
 //   event:  JSON.stringify(event_),
 //   ispage:isPage,
 //   customerId:customerId,
 //   pageId:pageId,
  //  text:event_.message && event_.message.text ? JSON.stringify(event_.message.text) :null,
  //  delivery:event_.delivery ? JSON.stringify(event_.delivery) :null,
   // read:event_.read ? JSON.stringify(event_.read) :null,
  //  timestamp:event_.timestamp
  //});
 
//});

//await db.pendingchats.bulkCreate(pendingDataParseArrayFordbEntry);
//console.log("-------------done-----------")
//await pendingChatsData.save();

////

    const server = new ApolloServer({
      typeDefs: GraphQLTypes_,
      resolvers: GraphQLResolvers_,

      subscriptions: {
        keepAlive: 10000,
        onConnect: (connectionParams, webSocket, context) => {
          const agentId = webSocket.upgradeReq.url.replace(
            "/subscriptions?userId=",
            ""
          );
          new globalVars().setUserSubscriptionConnectionStatus(
            agentId,
            true,
            db,
            GraphQLResolvers_
          );

          new globalVars().checkAndSendPendingChatsFromSubscriptionData(
            db,
            GraphQLResolvers_
          );
        },
        onDisconnect: (webSocket, context) => {
          const agentId = webSocket.upgradeReq.url.replace(
            "/subscriptions?userId=",
            ""
          );
          new globalVars().setUserSubscriptionConnectionStatus(
            agentId,
            false,
            db,
            GraphQLResolvers_
          );
        },
        path: "/subscriptions",
        // ...other options...
      },
      context: ({ req, res }) => ({
        req,
        res,
        GraphQLResolvers_: GraphQLResolvers_,
      }),
    });

    //using one domain on server wit hsame port
    //if (process.env.NODE_ENV === "production") {
    // app.use(express.static(path.join(__dirname, "client/build")));
    //app.get('*', (req, res) => {    res.sendfile(path.join(__dirname = 'client/build/index.html'));  })
    //}
    app.use(async (req, res, next) => {
      // getting token from client side
      const accessToken = req.cookies["access-token"];
      const refreshToken = req.cookies["refresh-token"];

    

      if (!refreshToken && !accessToken) {
        return next();
      }
  
      if (includes.verifyAccessTokenAndPushDataToReq(accessToken, req,res)) {
       
        return next();
      }

      if (!refreshToken) return next();

      if (
        await includes.verifyRefreshTokenAndCreateAccessTokenAndPushDataToReq(
          refreshToken,
          db,
          req,
          res
        )
      ) {
        return next();
      }

      return next();
      //res.status(404).json({ errors: { global: "Still working on it. Please try again later when we implement it." } });
    });

    server.applyMiddleware({
      app: app,
      path: `/graphql`,
      cors: false,
    });

    if (env == "development") {
      const httpsServer = https.createServer(
        {
          key: fs.readFileSync("key.pem"),
          cert: fs.readFileSync("cert.pem"),
        },
        app
      );
      server.installSubscriptionHandlers(httpsServer);
      httpsServer.listen(process.env.PORT, () => {
        console.log(
          `🚀 Server ready at https://localhost:${process.env.PORT}${server.graphqlPath}`
        );
        console.log(
          `🚀 Subscriptions ready at wss://localhost:${process.env.PORT}${server.subscriptionsPath}`
        );
      });
    } else {
      const httpServer = http.createServer(app);
      server.installSubscriptionHandlers(httpServer);
      httpServer.listen(process.env.PORT, () => {
        console.log(
          `🚀 Server ready at http://localhost:${process.env.PORT}${server.graphqlPath}`
        );
        console.log(
          `🚀 Subscriptions ready at ws://localhost:${process.env.PORT}${server.subscriptionsPath}`
        );
      });
    }
  })
  .catch((error) => console.log("This error occured", error));

//Sync database with Sequelize models

var requestObjectQue = [];
app.post("/webhook/", (req, res) => {
  let body = req.body;

  // Checks this is an event from a page subscription
  
  
  if (body.object === "page") {
    requestObjectQue.push(body);
    startQuePollingIfNotStarted();
    // Returns a '200 OK' response to all requests
    res.status(200).send("EVENT_RECEIVED");
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
});
app.get("/webhook/", (req, res) => {
  // Your verify token. Should be a random string.

  let VERIFY_TOKEN = "123123123";

  // Parse the query params
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

var queStartPolling = false;
async function startQuePollingIfNotStarted() {
  if (requestObjectQue.length > 0 && !queStartPolling) {
    queStartPolling = true;
    await pollMessage();
    queStartPolling = false;
  }
}
async function pollMessage() {
  if (requestObjectQue.length > 0) {
    await checkMessage(requestObjectQue[0]);
    requestObjectQue.splice(0, 1);
    await pollMessage();
  }
}
async function checkMessage(body) {
  console.log("-----------------------check message called--------------------");
  var pageId = body.entry[0].id;
  var messaging_events = body.entry[0].messaging;

  for (i = 0; i < messaging_events.length; i++) {
    var event_ = body.entry[0].messaging[i];
    event_.pageIdAdded = pageId;
    var isPage = pageId == event_.sender.id;
    console.log("-----------------------check message called pageId -------------------- " + pageId);
    var customerId = isPage ? event_.recipient.id : event_.sender.id;
    var agentIdToForwardChat =
      await getUserIfUserAlreadyChatingOrIfUserIsAlreadyChatedAndUserIsActive(
        customerId,
        pageId
      );
    if (event_.message && event_.message.text) {
      var timestamp = event_.timestamp;
      var messageId = event_.message.mid;
      var messageText = event_.message.text;
      // Your Logic Replaces the following Line
      //var result = await getUserFromChatCircle(customerId);

      if (agentIdToForwardChat) {
        await GraphQLResolvers_.Mutation.addchatdetail(
          null,
          {
            customerId: customerId,
            pageId: pageId,
            messagetext: messageText,
            messagetimestamp: timestamp,
            messageId: messageId,
            messagetype: isPage ? "outgoing" : "incoming",
            agentId: agentIdToForwardChat,
            read: isPage ? true : false,
          },
          { GraphQLResolvers_ }
        );

        // var chatAgent = _.find(
        //   chatCircleUsersWithChats,
        //   (item) => item.agentId == result
        //  );

        //  if (chatAgent) {
        //   if (
        //    !_.find(
        //     chatAgent.chats,
        //     (item) => item.customerId == customerId && item.pageId == pageId
        //   )
        //  )
        //    chatAgent.chats.push({
        //      customerId: customerId,
        //      pageId: pageId,
        //    });
        // }
      } else {
      await new globalVars().addInPendingChats(event_, db);
        
      }
    } else if (event_.delivery) {
      if (agentIdToForwardChat) {
        var timestamp = event_.timestamp;

        await GraphQLResolvers_.Mutation.deliverystatuschanged(null, {
          customerId: customerId,
          pageId: pageId,
          deliverytimestamp: timestamp,
        });
      } else {
      await new globalVars().addInPendingChats(event_, db);
        
      }
    } else if (event_.read) {
      if (agentIdToForwardChat) {
        var timestamp = event_.timestamp;

        await GraphQLResolvers_.Mutation.receiptreadstatuschanged(null, {
          customerId: customerId,
          pageId: pageId,
          receiptreadtimestamp: timestamp,
        });
      } else {
       await new globalVars().addInPendingChats(event_, db);
       
      }
    }
  }
  console.log("check message save")
  new globalVars().checkAndSendPendingChatsFromSubscriptionData(
    db,
    GraphQLResolvers_
  );
}
const getUserIfUserAlreadyChatingOrIfUserIsAlreadyChatedAndUserIsActive =
  async (customerId, pageId) => {
    var agentIdWithMarkNotToAddInChatCircleStatus =
      new globalVars().getUserIdFromSubscriptionChatsByCustomerAndPageId(
        customerId,
        pageId
      );

    if (!agentIdWithMarkNotToAddInChatCircleStatus) {
      let chatData = await db.chatdetails.findOne({
        where: {
          customerId: customerId,
          pageId: pageId,
        },
        order: [["id", "DESC"]],
      });

      if (chatData) {
        agentIdWithMarkNotToAddInChatCircleStatus = chatData.agentId;
      }
    }

    if (agentIdWithMarkNotToAddInChatCircleStatus) {
      let agentData = await GraphQLResolvers_.Query.user(null, {
        id: agentIdWithMarkNotToAddInChatCircleStatus,
      });

      if (agentData) {
        if (agentData.status == 0) {
          return agentIdWithMarkNotToAddInChatCircleStatus;
        }
      }
    }
    return null;
  };
