// src/resolvers/userResolver.js
const userService = require('../services/userService');

const resolvers = {
  Query: {
    users: async () => await userService.getUsers(),
  },
  Mutation: {
    createUser: async (_, args) => await userService.createUser(args),
    updateUser: async (_, args) => await userService.updateUser(args),
    deleteUser: async (_, { _id }) => await userService.deleteUser(_id),
  },
};

module.exports = resolvers;