const { ApolloServer } = require('apollo-server');
const mongoose = require('mongoose');
const productTypeDefs = require('./schemas/productSchema');
const productResolvers = require('./resolvers/productResolver');
const userTypeDefs = require('./schemas/userSchema');
const userResolvers = require('./resolvers/userResolver');
const carTypeDefs = require('./schemas/carSchema');
const carResolvers = require('./resolvers/carResolver');
const { merge } = require('lodash');
require('dotenv').config();

const startServer = async () => {
  await mongoose.connect(`${process.env.MONGO_CLUSTER_URL}`);
  
  const typeDefs = [ productTypeDefs, userTypeDefs, carTypeDefs ];
  const resolvers = merge(productResolvers, userResolvers, carResolvers);

const server = new ApolloServer({ 
    typeDefs, 
    resolvers,
    introspection: true,
    playground: true,
});

  server.listen().then(({ url }) => {
      console.log(`Servidor corriendo en ${url}`);
  });
};

startServer();
