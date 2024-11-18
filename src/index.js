const { ApolloServer } = require('apollo-server');
const mongoose = require('mongoose');
const productTypeDefs = require('./schemas/productSchema');
const productResolvers = require('./resolvers/productResolver');
const userTypeDefs = require('./schemas/userSchema');
const userResolvers = require('./resolvers/userResolver');
const { merge } = require('lodash');

const startServer = async () => {
  await mongoose.connect('mongodb+srv://alazamaralde:eVzE7gndAdZ0nKGl@aldocluster.bynde.mongodb.net/?retryWrites=true&w=majority&appName=AldoCluster');
  
  const typeDefs = [ productTypeDefs, userTypeDefs ];
  const resolvers = merge(productResolvers, userResolvers);

  const server = new ApolloServer({ typeDefs, resolvers });

  server.listen().then(({ url }) => {
      console.log(`Servidor corriendo en ${url}`);
  });
};

startServer();
