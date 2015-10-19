"use strict";

import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
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

import db from './database';
import config from "../config/config.json";
import jwt from "jsonwebtoken";

/**
 * We get the node interface and field from the Relay library.
 *
 * The first method defines the way we resolve an ID to its object.
 * The second defines the way we resolve an object to its GraphQL type.
 */
var {nodeInterface, nodeField} = nodeDefinitions(
  (globalId) => {
    var {type, id} = fromGlobalId(globalId);
    if (type === 'Root') {
      return db.getRoot(id);
    } else if (type === 'ProducingOrg') {
      return db.getProducingOrg(id);
    } else if (type === 'Person') {
      return db.getPerson(id);
    } else if (type === 'User') {
      return db.getUser(id);
    } else {
      return null;
    }
  },
  (obj) => {
    if (obj instanceof db.Root) {
      return rootType;
    } else if (obj instanceof db.ProducingOrg) {
      return producingOrgType;
    } else if (obj instanceof db.Person) {
      return personType;
    } else if (obj instanceof db.User) {
      return userType;
    } else {
      return null;
    }
  }
);

/**
 * Define your own types here
 */

var fooType = new GraphQLObjectType({
  name: 'Foo',
  description: 'A foo.',
  fields: () => ({
    id: globalIdField('Foo'),
    name: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The name of the foo.',
    }
  }),
  interfaces: [nodeInterface],
});

var rootType = new GraphQLObjectType({
  name: 'Root',
  description: 'The root object in the seattle-theatre schema.',
  fields: () => ({
    id: globalIdField('Root'),
    authToken: {
      type: GraphQLString,
      description: 'The user authentication token, if the user has logged in.'
    },
    producingOrgs: {
      type: producingOrgConnection,
      description: 'All producing organizations in the system.',
      args: connectionArgs,
      resolve: (_, args) => 
        new Promise((resolve, reject) => {
          db.getProducingOrgs().then(
            result => resolve(connectionFromArray(result, args))
          ).catch(
            rejectReason => reject('Producing orgs could not be retrieved because: ' + rejectReason)
          );
        }),
    },
    foo: {
      type: fooType,
      resolve: () => db.getFoo()
    },
    user: {
      type: userType,
      resolve: ({authToken}) => {
        if (authToken) {
          return new Promise((resolve, reject) => {
            var decoded = jwt.verify(authToken, config.auth.secret);
            db.getUser(decoded.userId).then(
              user => { resolve(user); }
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

var producingOrgType = new GraphQLObjectType({
  name: 'ProducingOrg',
  description: 'An organization that produces theatrical events.',
  fields: () => ({
    id: globalIdField('ProducingOrg'),
    name: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The name of the organization.',
    },
    missionStatement: {
      type: GraphQLString,
      description: 'The mission statement describing the organization\'s goals, artistic or otherwise.',
    },
  }),
  interfaces: [nodeInterface],
});
var {connectionType: producingOrgConnection} =
  connectionDefinitions({name: 'ProducingOrg', nodeType: producingOrgType});

/**
 * User Types
 */

var userInProgressType = new GraphQLObjectType({
  name: 'UserInProgress',
  description: 'A container which houses a user and a person record' + 
               ' that already exists that should potentially be linked to it. ' +
               ' Note: this type cannot be refetched.',
  fields: () => ({
    user: {
      type: new GraphQLNonNull(userType),
      description: 'The user being created.'
    },
    personMatch: {
      type: new GraphQLNonNull(personType),
      description: 'The person that is a potential match.'
    }
  })
});
var userType = new GraphQLObjectType({
  name: 'User',
  description: 'A user of the system.',
  fields: () => ({
    id: globalIdField('User'),
    email: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The user\'s email address.'
    },
    phone: {
      type: GraphQLString,
      description: 'The user\'s phone number.'
    },
    person: {
      type: personType,
      description: 'The person information describing the owner of this account.'
    }
  }),
  interfaces: [nodeInterface],
});
var personType = new GraphQLObjectType({
  name: 'Person',
  description: 'A person who may or may not user the system, but nevertheless needs to be referred to.',
  fields: () => ({
    id: globalIdField('Person'),
    firstName: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The person\'s first name.'
    },
    middleName: {
      type: GraphQLString,
      description: 'The person\'s middle name.'
    },
    lastName: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The person\'s last name.'
    },
    inActorsEquity: {
      type: GraphQLBoolean,
      description: 'Marks whether this person is a member of Actors\' Equity Association.'
    },
    user: {
      type: userType,
      description: 'The user information for this person, if this person has an account.'
    }
  })
});

var createUserType = new GraphQLInputObjectType({
  name: 'CreateUser',
  description: 'The input type for the CreateUserMutation.',
  fields: () => ({
    firstName: { type: new GraphQLNonNull(GraphQLString) },
    middleName: { type: GraphQLString },
    lastName: { type: new GraphQLNonNull(GraphQLString) },
    email: { type: new GraphQLNonNull(GraphQLString) },
    password: { type: new GraphQLNonNull(GraphQLString) },
    phone: { type: GraphQLString }
  })
});

var createUserMutation = mutationWithClientMutationId({
  name: 'CreateUser',
  inputFields: {
    createUser: { type: createUserType },
  },
  outputFields: {
    root: { 
      type: rootType,
      resolve: ({authToken}) => {
        var root = db.getRoot();
        root.authToken = authToken;
        return root;
      }
    }
  },
  mutateAndGetPayload: ({createUser}) => {
    return new Promise((resolve, reject) => {
      var user = db.createUser(createUser);
      user.then(user => {
        var authToken = jwt.sign({ userId: user.id }, config.auth.secret, { expiresIn: "24h" });
        resolve({ authToken, user });
      }).catch(reason => {
        reject('Problem in mutateAndGetPayload: ' + reason)
      });
    });
  },
});

/**
 * This is the type that will be the root of our query,
 * and the entry point into our schema.
 */
var queryType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    node: nodeField,
    root: {
      type: rootType,
      resolve: () => db.getRoot(),
    },
  }),
});

/**
 * This is the type that will be the root of our mutations,
 * and the entry point into performing writes in our schema.
 */
var mutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    createUser: createUserMutation
  })
});

/**
 * Finally, we construct our schema (whose starting query type is the query
 * type we defined above) and export it.
 */
export var Schema = new GraphQLSchema({
  query: queryType,
  mutation: mutationType
});
