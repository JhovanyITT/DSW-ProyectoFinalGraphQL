const User = require('../models/userModel');
const facturapi = require('../apis/facturapi');

const userService = {
  getUsers: async () => await User.find(),
  createUser: async (args) => {
    const user = new User(args);
    const facturapiCustomer = await facturapi.createUser(user);
    user.facturapiid = facturapiCustomer.id;
    return await user.save();
  },

  updateUser: async ({ _id, ...rest }) => {
    const userToUpdate = await User.findById(_id);
    if (!userToUpdate) throw new Error('Usuario no encontrado');

    await facturapi.updateUser(userToUpdate.facturapiid, rest);
    Object.assign(userToUpdate, rest);
    return await userToUpdate.save();
  },

  deleteUser: async (_id) => {
    const userToDelete = await User.findById(_id);
    if (!userToDelete) throw new Error('Usuario no encontrado');

    await facturapi.deleteUser(userToDelete.facturapiid);
    return await User.findByIdAndDelete(_id);
  },
};

module.exports = userService;