"use strict";

import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
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
    } else {
      return null;
    }
  },
  (obj) => {
    if (obj instanceof db.Root) {
      return rootType;
    } else if (obj instanceof db.ProducingOrg) {
      return producingOrgType;
    } else {
      return null;
    }
  }
);

/**
 * Define your own types here
 */

var rootType = new GraphQLObjectType({
  name: 'Root',
  description: 'The root object in the seattle-theatre schema.',
  fields: () => ({
    id: globalIdField('Root'),
    producingOrgs: {
      type: producingOrgConnection,
      description: 'All producing organizations in the system.',
      args: connectionArgs,
      resolve: (_, args) => 
        new Promise((resolve, reject) => {
          db.getProducingOrgs().then(
            result => resolve(connectionFromArray(result, args)),
            rejectReason => reject('Producing orgs could not be retrieved because: ' + rejectReason)
          );
        }),
    }, 
  }),
  interfaces: [nodeInterface],
});
var producingOrgType = new GraphQLObjectType({
  name: 'ProducingOrg',
  description: 'An organization that produces theatrical events.',
  fields: () => ({
    id: globalIdField('ProducingOrg'),
    name: {
      type: GraphQLString,
      description: 'The name of the organization.',
    },
    missionStatement: {
      type: GraphQLString,
      description: 'The mission statement describing the organization\'s goals, artistic or otherwise.',
    },
  }),
  interfaces: [nodeInterface],
});

/**
 * Define your own connection types here
 */
 var {connectionType: producingOrgConnection} =
  connectionDefinitions({name: 'ProducingOrg', nodeType: producingOrgType});

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
    // Add your own mutations here
  })
});

/**
 * Finally, we construct our schema (whose starting query type is the query
 * type we defined above) and export it.
 */
export var Schema = new GraphQLSchema({
  query: queryType,
  // Uncomment the following after adding some mutation fields:
  // mutation: mutationType
});
