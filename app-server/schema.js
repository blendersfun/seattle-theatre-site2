"use strict";

import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLEnumType,
  GraphQLUnionType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from 'graphql';

import {
  connectionArgs,
  connectionDefinitions,
  connectionFromArray,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions,
} from 'graphql-relay';

import {
  Api,
  User,
  ProducingOrg,
  Production,
} from './database';

import config from '../config/config.json';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

var {nodeInterface, nodeField} = nodeDefinitions(
  (globalId) => {
    var {type, id} = fromGlobalId(globalId);
    if (type === 'Api') {
      return Api.get();
    } else if (type === 'User') {
      return User.getById(id);
    } else if (type === 'ProducingOrg') {
      return ProducingOrg.getById(id);
    } else if (type === 'Production') {
      return Production.getByShowId(id);
    } else {
      return null;
    }
  },
  (obj) => {
    if (obj instanceof Api) {
      return apiType;
    } else if (obj instanceof User) {
      return userType;
    } else if (obj instanceof ProducingOrg) {
      return producingOrgType;
    } else if (obj instanceof Production) {
      return productionType;
    } else {
      return null;
    }
  }
);







/**
 * Seattle-theatre API:
 */

var apiType = new GraphQLObjectType({
  name: 'Api',
  description: 'The seattle-theatre server api.',
  fields: () => ({
    id: globalIdField('Api'),
    authError: { type: authErrorType },
    authToken: { type: GraphQLString },
    user: {
      type: userType,
      args: {
        authToken: { type: GraphQLString }
      },
      resolve: (api, args) => {
        var authToken = args.authToken;

        if (authToken) {
          return new Promise((resolve, reject) => {
            var decoded = jwt.verify(authToken, config.auth.secret);
            User.getById(decoded.userId).then(
              user => resolve(user)
            ).catch(
              reason => reject(reason)
            );
          });
        } else {
          return null;
        }
      }
    },
    producingOrgError: { type: producingOrgErrorType },
  }),
  interfaces: [nodeInterface],
});






/* 
 * User Schema
 */

var userType = new GraphQLObjectType({
  name: 'User',
  description: 'A user of the system.',
  fields: () => ({
    id: globalIdField('User'),
    email: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The user\'s email address.'
    },
    accessLevel: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The user\'s permissions information.'
    },
    orgAdminFor: {
      type: producingOrgType,
      description: 'The producing organization this user administers.',
      resolve: ({id, accessLevel}) => {
        if (accessLevel === 'ORG_ADMIN') {
          return new Promise((resolve, reject) => {
            ProducingOrg.getByOrgAdminUserId(id).then(
              org => resolve(org)
            ).catch(
              reason => reject(reason)
            );
          });
        } else {
          return null;
        }
      }
    }
  }),
  interfaces: [nodeInterface],
});

var authErrorType = new GraphQLEnumType({
  name: 'AuthError',
  description: 'Error codes for authentication operations.',
  values: {
    USER_ALREADY_EXISTS: {},
    INVALID_CREDENTIALS: {}
  }
});

/*
 * Mutation: CreateUser
 *  Creates a user account and then returns an authToken (so that
 *  the user will now be logged in).
 */

var createUserInputType = new GraphQLInputObjectType({
  name: 'CreateUser',
  description: 'The input type for the CreateUser mutation.',
  fields: () => ({
    email: { type: new GraphQLNonNull(GraphQLString) },
    password: { type: new GraphQLNonNull(GraphQLString) }
  })
});

var createUserMutation = mutationWithClientMutationId({
  name: 'CreateUser',
  description: 'A mutation which creates a user account and logs the user into it.',
  inputFields: {
    createUser: { type: createUserInputType },
  },
  outputFields: {
    api: { 
      type: apiType,
      resolve: ({authToken, userId, authError}) => {
        var api = Api.get();
        api.authToken = authToken;
        api.authError = authError;
        return api;
      }
    }
  },
  mutateAndGetPayload: ({createUser}) => {
    var createUserDB = {
      email: createUser.email,
      password: hashPassword(createUser.password)
    };

    return new Promise((resolve, reject) => {
      User.create(createUserDB).then(
        ({user, error}) => {
          var userId = null, accessLevel = null;
          var authToken = null;
          var authError = null;

          if (error && error.code === 'ER_DUP_ENTRY') {
            authError = 'USER_ALREADY_EXISTS';
          } else {
            userId = user.id;
            accessLevel = user.accessLevel;
            authToken = signToken({userId, accessLevel});
          }

          resolve({ authToken, userId, authError });
        }
      ).catch(
        reason => reject(reason)
      );
    });
  },
});

/*
 * Mutation: Login
 *  Looks up the user account and verifies the authentication
 *  information is correct then signs and sends back an authToken.
 */

var loginInputType = new GraphQLInputObjectType({
  name: 'Login',
  description: 'The input type for the Login mutation.',
  fields: () => ({
    email: { type: new GraphQLNonNull(GraphQLString) },
    password: { type: new GraphQLNonNull(GraphQLString) }
  })
});

var loginMutation = mutationWithClientMutationId({
  name: 'Login',
  description: 'A mutation for logging in.',
  inputFields: {
    login: { type: loginInputType },
  },
  outputFields: {
    api: { 
      type: apiType,
      resolve: ({authToken, userId, authError}) => {
        var api = Api.get();
        api.authToken = authToken;
        api.authError = authError;
        return api;
      }
    }
  },
  mutateAndGetPayload: ({login}) => {
    return new Promise((resolve, reject) => {
      User.getUserAndPasswordByEmail(login.email).then(
        ({user, password}) => {
          var authToken = null;
          var userId = null, accessLevel = null;
          var authError = null;

          if (!user) {
            authError = 'INVALID_CREDENTIALS';
          } else if (hashPassword(login.password) !== password) {
            authError = 'INVALID_CREDENTIALS';
          } else {
            userId = user.id;
            accessLevel = user.accessLevel;
            authToken = signToken({userId, accessLevel});
          }

          resolve({authToken, userId, authError});
        }
      ).catch(
        reason => reject(reason)
      );
    });
  },
});

function hashPassword(plainPassword) {
  return crypto.createHash('sha512').update(plainPassword).digest('base64')
}
function signToken(payload) {
  return jwt.sign(payload, config.auth.secret, { expiresIn: "24h" });
}








/* 
 * Producing Org Schema
 */

var producingOrgErrorType = new GraphQLEnumType({
  name: 'ProducingOrgError',
  description: 'Error codes for producing org operations.',
  values: {
    PRODUCING_ORG_ALREADY_EXISTS: {}
  }
});

var producingOrgType = new GraphQLObjectType({
  name: 'ProducingOrg',
  description: 'An organization that produces theatre.',
  fields: () => ({
    id: globalIdField('ProducingOrg'),
    name: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The organization\'s name'
    },
    missionStatement: {
      type: GraphQLString,
      description: 'The organization\'s mission statement.'
    },
    upcomingProductions: {
      type: new GraphQLList(productionType),
      resolve: ({id}) => {
        return new Promise((resolve, reject) => {
          Production.getListByProducingOrgId(id).then(
            ({upcomingProductions}) => resolve(upcomingProductions)
          ).catch(
            reason => reject(reason)
          );
        });
      }
    },
    pastProductions: {
      type: new GraphQLList(productionType),
      resolve: ({id}) => {
        return new Promise((resolve, reject) => {
          Production.getListByProducingOrgId(id).then(
            ({pastProductions}) => resolve(pastProductions)
          ).catch(
            reason => reject(reason)
          );
        });
      }
    }
  }),
  interfaces: [nodeInterface],
});

/*
 * Mutation: CreateProducingOrg
 *  Creates a producing organization and modifies the user's permissions
 *  so that they have admin access to it.
 */

var createProducingOrgInputType = new GraphQLInputObjectType({
  name: 'CreateProducingOrg',
  description: 'The input type for the CreateProducingOrg mutation.',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    missionStatement: { type: GraphQLString },
    userId: { type: new GraphQLNonNull(GraphQLID) },
  })
});

var createProducingOrgMutation = mutationWithClientMutationId({
  name: 'CreateProducingOrg',
  description: 'A mutation which creates a producing organization and ' +
               'modifies the user permissions for the user who created it ' +
               'so that they have administrative access to it.',
  inputFields: {
    createProducingOrg: { type: createProducingOrgInputType },
  },
  outputFields: {
    api: { 
      type: apiType,
      resolve: ({authToken, producingOrgError}) => {
        var api = Api.get();
        api.authToken = authToken;
        api.producingOrgError = producingOrgError;
        return api;
      }
    }
  },
  mutateAndGetPayload: ({createProducingOrg}) => {
    var {type, id} = fromGlobalId(createProducingOrg.userId);
    createProducingOrg.userId = id;

    return new Promise((resolve, reject) => {
      ProducingOrg.create(createProducingOrg).then(
        ({producingOrg, user, error}) => {
          var authToken = null;
          var userId = null, accessLevel = null;
          var producingOrgError = null;

          if (error) {
            if (error.code === 'ER_DUP_ENTRY') {
              producingOrgError = 'PRODUCING_ORG_ALREADY_EXISTS';
              resolve({producingOrgError});
            } else {
              reject(error);
            }
          } else {
            if (user) {
              userId = user.id;
              accessLevel = user.accessLevel;
              authToken = signToken({userId, accessLevel});
            } else {
              console.warn("Updated user record missing during createOrg mutate.");
            }
          }

          resolve({authToken, userId});
        }
      ).catch(
        reason => reject(reason)
      );
    });
  },
});







/* 
 * Production Schema
 */

var productionType = new GraphQLObjectType({
  name: 'Production',
  description: 'A theatrical production.',
  fields: () => ({
    id: globalIdField('Production'),
    title: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The title of the production.'
    },
    description: { type: GraphQLString },
    opening: { type: GraphQLInt },
    closing: { type: GraphQLInt },
  })
});

/*
 * Mutation: CreateProduction
 *  Creates a production by a given producing organization.
 */

var createProductionInputType = new GraphQLInputObjectType({
  name: 'CreateProduction',
  description: 'The input type for the CreateProduction mutation.',
  fields: () => ({
    orgId: { type: new GraphQLNonNull(GraphQLID) },
    isScripted: { type: new GraphQLNonNull(GraphQLBoolean) },
    isSingleEvent: { type: new GraphQLNonNull(GraphQLBoolean) },
    stagingTitle: { type: GraphQLString },
    description: { type: GraphQLString },
    scriptTitle: { type: GraphQLString },
    synopsis: { type: GraphQLString },
    opening: { type: new GraphQLNonNull(GraphQLInt) },
    closing: { type: new GraphQLNonNull(GraphQLInt) },
  })
});

var createProductionMutation = mutationWithClientMutationId({
  name: 'CreateProduction',
  description: 'A mutation which creates a new production for a producing organization.',
  inputFields: {
    createProduction: { type: createProductionInputType },
  },
  outputFields: {
    producingOrg: { 
      type: producingOrgType,
      resolve: ({orgId, producingOrgError}) => {
        return ProducingOrg.getById(orgId);
      }
    }
  },
  mutateAndGetPayload: ({createProduction}) => {
    var {id} = fromGlobalId(createProduction.orgId);
    var orgId = createProduction.orgId = id;

    return new Promise((resolve, reject) => {
      Production.create(createProduction).then(
        showId => resolve({showId, orgId})
      ).catch(
        reason => reject(reason)
      );
    });
  },
});







var queryType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    node: nodeField,
    api: {
      type: apiType,
      resolve: () => {
        var api = Api.get();
        return api;
      },
    },
  }),
});

var mutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    createUser: createUserMutation,
    login: loginMutation,
    createProducingOrg: createProducingOrgMutation,
    createProduction: createProductionMutation,
  })
});

export var Schema = new GraphQLSchema({
  query: queryType,
  mutation: mutationType,
});
