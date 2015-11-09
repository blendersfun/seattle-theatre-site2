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
  Person,
  ProducingOrg,
  Production,
  Venue,
  PerformanceSpace,
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
    } else if (type === 'Venue') {
      return Venue.getById(id);
    } else if (type === 'PerformanceSpace') {
      return PerformanceSpace.getById(id);
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
    } else if (obj instanceof Venue) {
      return venueType;
    } else if (obj instanceof PerformanceSpace) {
      return performanceSpaceType;
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
          var decoded = jwt.verify(authToken, config.auth.secret);
          return User.getById(decoded.userId);
        } else {
          return null;
        }
      }
    },
    venues: {
      type: new GraphQLList(venueType),
      resolve: () => Venue.getAll()
    },
    venue: {
      type: venueType,
      args: {
        id: { type: GraphQLID },
      },
      resolve: (_, {id}) => {
        if (id) {
          var parts = fromGlobalId(id);
          return Venue.getById(parts.id);
        }
        return null;
      }
    },
    producingOrganizations: {
      type: new GraphQLList(producingOrgType),
      resolve: () => ProducingOrg.getAll()
    },
    producingOrganization: {
      type: producingOrgType,
      args: {
        id: { type: GraphQLID }
      },
      resolve: (_, {id}) => {
        if (id) {
          var parts = fromGlobalId(id);
          return ProducingOrg.getById(parts.id);
        }
        return null;
      } 
    },
    producingOrgError: { type: producingOrgErrorType },
    personSearch: {
      type: new GraphQLList(personType),
      args: {
        query: { type: GraphQLString }
      },
      resolve: (_, {query}) => {
        if (query === '') return [];

        var terms = query.split(',');
        return Person.search(terms);
      }
    }
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
          return ProducingOrg.getByOrgAdminUserId(id);
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

    return User.create(createUserDB).then(
      user => {
        var userId = null, accessLevel = null;
        var authToken = null;

        userId = user.id;
        accessLevel = user.accessLevel;
        authToken = signToken({userId, accessLevel});

        return {authToken, userId};
      }
    ).catch(
      err => {
        if (err.code === 'ER_DUP_ENTRY') {
          return {authError: 'USER_ALREADY_EXISTS'};
        }
        return Promise.reject(err);
      }
    );
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
      User.getIdAndPasswordByEmail(login.email).then(
        ({id, password}) => {
          var authToken = null;
          var userId = null, accessLevel = null;
          var authError = null;

          if (!password) {
            authError = 'INVALID_CREDENTIALS';
          } else if (hashPassword(login.password) !== password) {
            authError = 'INVALID_CREDENTIALS';
          } else {
            userId = id;
            accessLevel = 'ORG_ADMIN';
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
 * Person Schema
 */

var personType = new GraphQLObjectType({
  name: 'Person',
  description: 'A person who participates in local theatre events.',
  fields: () => ({
    id: globalIdField('Person'),
    firstName: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The person\'s first, or given name.'
    },
    middleName: {
      type: GraphQLString,
      description: 'The person\'s middle name.'
    },
    lastName: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The person\'s last, or family name.'
    }
  }),
  interfaces: [nodeInterface],
});

/*
 * Mutation: CreatePerson
 *  Creates a person.
 */

var createPersonInputType = new GraphQLInputObjectType({
  name: 'CreatePerson',
  description: 'The input type for the CreatePerson mutation.',
  fields: () => ({
    firstName: { type: new GraphQLNonNull(GraphQLString) },
    middleName: { type: GraphQLString },
    lastName: { type: new GraphQLNonNull(GraphQLString) },
  })
});

var createPersonMutation = mutationWithClientMutationId({
  name: 'CreatePerson',
  description: 'A mutation which creates a new person.',
  inputFields: {
    createPerson: { type: createPersonInputType },
  },
  outputFields: {
    api: { 
      type: apiType,
      resolve: ({personId}) => Api.get()
    }
  },
  mutateAndGetPayload: ({createPerson}) => 
    Person.create(createPerson)
      .then(personId => ({personId})),
});






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
      resolve: ({id}) => 
        Production.getListByProducingOrgId(id).then(
          ({upcomingProductions}) => {
            upcomingProductions.sort((a, b) => {
              return a.opening - b.opening;
            });
            return upcomingProductions;
          }
        )
    },
    pastProductions: {
      type: new GraphQLList(productionType),
      resolve: ({id}) =>
        Production.getListByProducingOrgId(id).then(
          ({pastProductions}) => pastProductions
        )
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

    return ProducingOrg.create(createProducingOrg).then(
      ({producingOrg, user}) => {
        var authToken = null;
        var userId = null, accessLevel = null;

        if (user) {
          userId = user.id;
          accessLevel = user.accessLevel;
          authToken = signToken({userId, accessLevel});
        }

        return {authToken, userId};
      }
    ).catch(
      err => {
        if (err.code === 'ER_DUP_ENTRY') {
          return {producingOrgError: 'PRODUCING_ORG_ALREADY_EXISTS'};
        }
        return Promise.reject(err);
      }
    );
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
    performanceSpace: {
      type: performanceSpaceType,
      resolve: ({id}) => PerformanceSpace.getByShowId(id)
    },
    director: {
      type: personType,
      resolve: ({id}) => Person.getCollaboratorWithShowAndRole(id, 3)
    },
    stageManager: {
      type: personType,
      resolve: ({id}) => Person.getCollaboratorWithShowAndRole(id, 1)
    }
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
    directorId: { type: GraphQLID },
    stageManagerId: { type: GraphQLID },
    spaceId: { type: GraphQLID },
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
    var orgIdParts = fromGlobalId(createProduction.orgId);
    var orgId = createProduction.orgId = orgIdParts.id;

    if (createProduction.spaceId) {
      var spaceIdParts = fromGlobalId(createProduction.spaceId);
      createProduction.spaceId = spaceIdParts.id;
    }
    if (createProduction.directorId) {
      var directorIdParts = fromGlobalId(createProduction.directorId);
      createProduction.directorId = directorIdParts.id;
    }
    if (createProduction.stageManagerId) {
      var stageManagerIdParts = fromGlobalId(createProduction.stageManagerId);
      createProduction.stageManagerId = stageManagerIdParts.id;
    }

    return new Promise((resolve, reject) => {
      Production.create(createProduction).then(
        showId => resolve({showId, orgId})
      ).catch(
        reason => reject(reason)
      );
    });
  },
});






/* 
 * Venue Schema
 */

var venueType = new GraphQLObjectType({
  name: 'Venue',
  description: 'A venue, containing one ore more perforances spaces which may be used to present a production.',
  fields: () => ({
    id: globalIdField('Venue'),
    name: { type: new GraphQLNonNull(GraphQLString) },
    addressLine1: { type: new GraphQLNonNull(GraphQLString) },
    addressLine2: { type: GraphQLString },
    city: { type: new GraphQLNonNull(GraphQLString) },
    state: { type: new GraphQLNonNull(GraphQLString) },
    zip: { type: new GraphQLNonNull(GraphQLString) },
    lat: { type: GraphQLFloat },
    lng: { type: GraphQLFloat },
    performanceSpaces: { 
      type: new GraphQLList(performanceSpaceType),
      resolve: ({id}) => {
        return PerformanceSpace.getListByVenueId(id);
      }
    },
  }),
  interfaces: [nodeInterface],
});

var performanceSpaceType = new GraphQLObjectType({
  name: 'PerformanceSpace',
  description: 'A performance space inside a venue where a production may be presented.',
  fields: () => ({
    id: globalIdField('PerformanceSpace'),
    name: { type: new GraphQLNonNull(GraphQLString) },
    capacity: { type: GraphQLInt },
    style: { type: performanceSpaceStyleType },
    description: { type: GraphQLString },
    venue: {
      type: venueType,
      resolve: ({id}) => Venue.getBySpaceId(id)
    }
  }),
  interfaces: [nodeInterface],
});

var performanceSpaceStyleType = new GraphQLEnumType({
  name: 'PerformanceSpaceStyle',
  description: 'A style of performance space.',
  values: {
    PROSCENIUM: {},
    ARENA: {},
    THRUST: {},
    BLACK_BOX: {},
    FOUND: {},
  }
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
    createPerson: createPersonMutation,
  })
});

export var Schema = new GraphQLSchema({
  query: queryType,
  mutation: mutationType,
});
