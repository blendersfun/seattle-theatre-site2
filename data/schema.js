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
    } else {
      return null;
    }
  },
  (obj) => {
    if (obj instanceof Api) {
      return apiType;
    } else if (obj instanceof User) {
      return userType;
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

        // Gets an auth token either as a client argument or from 
        // off the Api type (used when login status has not
        // yet propagated to the client).
        var authToken = args.authToken || api.authToken || false;

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
    }
  }),
  interfaces: [nodeInterface],
});

var userType = new GraphQLObjectType({
  name: 'User',
  description: 'A user of the system.',
  fields: () => ({
    id: globalIdField('User'),
    email: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The user\'s email address.'
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
          var userId = null;
          var authToken = null;
          var authError = null;

          if (error && error.code === 'ER_DUP_ENTRY') {
            authError = 'USER_ALREADY_EXISTS';
          } else {
            userId = user.id;
            authToken = signToken({userId});
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
          var userId = null;
          var authError = null;

          if (!user) {
            authError = 'INVALID_CREDENTIALS';
          } else if (hashPassword(login.password) !== password) {
            authError = 'INVALID_CREDENTIALS';
          } else {
            userId = user.id;
            authToken = signToken({userId});
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

var queryType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    node: nodeField,
    api: {
      type: apiType,
      resolve: () => Api.get(),
    },
  }),
});

var mutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    createUser: createUserMutation,
    login: loginMutation
  })
});

export var Schema = new GraphQLSchema({
  query: queryType,
  mutation: mutationType
});
