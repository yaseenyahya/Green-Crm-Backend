var { gql } = require("apollo-server-express");
module.exports = gql`
  type Subscription {
    chatdetailadded: ChatDetails
    markallmessagechatread: MarkReadChatDetails
    deliverystatuschanged: DeliveryStatusChangedDetails
    receiptreadstatuschanged: ReceiptReadStatusChangedDetails
    pendingchatcountchanged: QueryStatus
    chatlabelremove: QueryStatus
    subscriptiondatachanged: QueryStatus
    messagetypingstatuschanged: MessageTypingStatusChangedDetails
    forcelogout: ForceLogoutDetails
  }
  type ForceLogoutDetails {
    id: ID!
    username: String!
  }
  type MessageTypingStatusChangedDetails {
    customerId: String!
    pageId: String!
    agentId: ID!
    userId: ID!
    username: String!
  }
  type DeliveryStatusChangedDetails {
    customerId: String
    pageId: String
    deliverytimestamp: String
  }
  type ReceiptReadStatusChangedDetails {
    customerId: String
    pageId: String
    receiptreadtimestamp: String
  }
  type MarkReadChatDetails {
    agentId: ID
    customerId: String
    pageId: String
  }
  type SubscriptionData {
    id: ID!
    data: String
  }
  type PendingChatsData {
    id: ID!
    data: String
  }
  type ChatDetails {
    id: ID
    customerId: String
    pageId: String
    messageId: String
    messagetext: String
    messagetimestamp: String
    messagetype: String
    agentId: ID
    alternateagentId: ID
    read: Int
    deliverytimestamp: String
    receiptreadtimestamp: String
    labels: String
    marknottoaddinchatcircle: Int
  }
  type ChatDetailsWithPagination {
    id:String
    chatDetails: [ChatDetails]
    totalCount: Int
    endCursor: String
    hasNextPage: Boolean
    currentCursur:String
    userID:ID
    managerId:ID
  }
  type SearchData {
    details: [SearchDetails]
    searchText: String
    userID:ID
    managerId:ID
  }
  type SearchDetails {
    customerId: String
    pageId: String
  }
  input pages_insert_input {
    name: String
    pageId: String
    accesstoken: String
  }

  type Bureaus {
    id: ID!
    name: String!
  }

  type Designations {
    id: ID!
    name: String!
    paneltype: PanelType!
  }

  enum PanelType {
    SUPERADMIN
    ADMIN
    MANAGER
    AGENT
    FINANCE
  }
  type Pages {
    id: ID!
    name: String!
    pageId: String!
    accesstoken: String!
  }

  type Profiles {
    id: ID!
    name: String!
    paneltype: PanelType!
    settings: String
  }

  enum StatusType {
    ACTIVE
    BLOCKED
    DEAD
  }
  type Users {
    id: ID!
    picture: String
    username: String!
    pseudonym: String
    password: String!
    name: String!
    email: String!
    number: String
    status: StatusType!
    comments: String
    designation: Designations!
    managerId: Users
    settings: String
    labels: String
    agentlimitchatassign: Int
    pages: String
    isUserLoggedIn: Boolean
  }
  type UserSettings {
    settings: String!
  }
  type Me {
    id: ID!
    username: String!
    pseudonym: String
    name: String!
    status: StatusType
    accessToken: String
    refreshToken: String
    designation: Designations!
    managerId: Users
    email: String!
    number: String
    picture: String
    settings: String
    labels: String
    pagesData: String
    pages: String
    switchaccountsettings: String
    onlineStatus: Boolean
    isUserLoggedIn: Boolean
  }
  type Labels {
    id: ID
    labels: String
  }
  type LeadForms {
    id: ID!
    customerId: String!
    firstname: String!
    lastname: String!
    phonenumber: String!
    alternatephonenumber: String
    emailaddress: String
    previousaddress: String
    currentaddress: String!
    dateofbirth: String!
    ssn: String
    provider: Int
    service: String!
    referencenumber: String!
    accountnumber: String!
    monthlytotal: String!
    firstmonthbill: String!
    comments: String
  }

  type QueryStatus {
    success: Int!
    error: String
    result: String
  }

  type Query {
    designations: [Designations]
    designation(id: ID!): Designations
    pages: [Pages]
    page(id: ID!): Pages
    profiles: [Profiles]
    profile(id: ID!): Profiles
    users(managersOnly: Boolean, managerId: String): [Users]
    loginasusers(managerId: String): [Users]
    user(id: ID!): Users
    me(accessToken: String): Me
    getlabels(accessToken: String): Labels
    usersettings(id: ID!, accessToken: String): UserSettings
    leadform(customerId: String!): [LeadForms]
    chatlastdetailsbyid(userID: ID!): [ChatDetails]
    chatlastdetailsbyidwithpagination(
      userID: ID
      managerId:ID
      first: Int
      after: String
    ): ChatDetailsWithPagination
    chatdetailsbyagentcutomerpageid(
      userID: ID!
      customerId: String!
      pageId: String!
      markChatRead: Boolean!
    ): [ChatDetails]
    getfollowupbyagentid: QueryStatus
    getsubscriptiondata: SubscriptionData
    getpendingchatsdata: PendingChatsData
    getpendingchatcount: QueryStatus
    pendingchatcountchanged: QueryStatus
    getsearchdata(searchText: String!, userID: ID,managerId: ID): SearchData
    callsubscriptiondatachanged: QueryStatus
  }

  type Mutation {
    backtoaccountswitchlogin(id: String!): Me
    switchlogin(id: String!): Me
    login(username: String!, password: String!): Me
    adduser(
      username: String!
      password: String!
      name: String!
      pseudonym: String
      picture: String
      email: String!
      number: String
      status: ID!
      comments: String
      designationId: ID!
      managerId: ID
      settings: String
      agentlimitchatassign: Int
      pages: String
    ): QueryStatus
    logout: QueryStatus
    updateuser(
      id: ID!
      username: String
      password: String
      name: String
      pseudonym: String
      picture: String
      email: String
      number: String
      status: ID
      comments: String
      designationId: ID
      managerId: ID
      settings: String
      agentlimitchatassign: Int
      pages: String
    ): QueryStatus

    updatelabels(labels: String!): QueryStatus
    deleteuser(id: ID!): QueryStatus
    requestresettoken(email: String!): QueryStatus
    changepasswordfromvalidresettoken(
      token: String!
      password: String!
    ): QueryStatus

    deleteprofile(id: ID!): QueryStatus
    addprofile(name: String!, paneltype: ID!, settings: String): QueryStatus
    updateprofile(
      id: ID!
      name: String
      paneltype: ID
      settings: String
    ): QueryStatus

    addpages(objects: [pages_insert_input!]): QueryStatus
    deletepage(id: ID!): QueryStatus

    adddesignation(name: String!, paneltype: ID!): QueryStatus
    updatedesignation(id: ID!, name: String, paneltype: ID): QueryStatus
    deletedesignation(id: ID!): QueryStatus

    addleadform(
      customerId: String!
      firstname: String!
      lastname: String!
      phonenumber: String!
      alternatephonenumber: String
      emailaddress: String
      previousaddress: String
      currentaddress: String!
      dateofbirth: String!
      ssn: String
      provider: Int
      service: String!
      referencenumber: String!
      accountnumber: String!
      monthlytotal: String!
      firstmonthbill: String!
      comments: String
    ): QueryStatus
    updateleadform(
      id: ID!
      firstname: String!
      lastname: String!
      phonenumber: String!
      alternatephonenumber: String
      emailaddress: String
      previousaddress: String
      currentaddress: String!
      dateofbirth: String!
      ssn: String
      service: String!
      provider: Int
      referencenumber: String!
      accountnumber: String!
      monthlytotal: String!
      firstmonthbill: String!
      comments: String
    ): QueryStatus
    deleteleadform(id: ID!): QueryStatus
    updateme(
      id: ID!
      username: String!
      name: String!
      pseudonym: String
      picture: String
      email: String!
      number: String
      currentpassword: String!
      newpassword: String
    ): QueryStatus
    addchatdetail(
      customerId: String!
      pageId: String!
      messageId: String
      messagetext: String!
      messagetimestamp: String!
      messagetype: String!
      agentId: ID!
      alternateagentId: ID
      read: Int!
    ): QueryStatus
    removechatlabel(
      customerId: String!
      pageId: String!
      messagetext: String!
    ): QueryStatus
    addchattofacebook(
      customerId: String!
      pageId: String!
      message: String!
      outgoingMessageId: String!
      accesstoken: String
    ): QueryStatus
    markreadchat(id: ID!): QueryStatus
    deliverystatuschanged(
      customerId: String!
      pageId: String!
      deliverytimestamp: String!
    ): QueryStatus
    markallmessagechatread(customerId: String!, pageId: String!): QueryStatus
    receiptreadstatuschanged(
      customerId: String!
      pageId: String!
      receiptreadtimestamp: String!
    ): QueryStatus

    changeonlinestatus(online: Boolean!): QueryStatus

    messagetypingstatuschanged(
      customerId: String!
      pageId: String!
      agentId: ID!
      userId: ID!
      username: String!
    ): MessageTypingStatusChangedDetails
    forcelogout(id: ID!, username: String!): QueryStatus
  }
`;
