const { gql } = require('apollo-server');

const userTypeDefs = gql`
  enum PaymentMethod {
    PayPal
    CreditCard
    DebitCard
    ApplePay
  }

  enum UserType{
    Cliente
    Admin
  }

  type User {
    _id: ID!
    nombreCompleto: String!
    email: String!
    password: String!
    direccion: String
    telefono: String
    fechaRegistro: String
    tipoUsuario: UserType
    metodoPagoPreferido: PaymentMethod
    facturapiid: String
  }

  type Query {
    users: [User]
  }

  type Mutation {
    createUser(
    nombreCompleto: String!,
    email: String!,
    password: String!,
    direccion: String,
    telefono: String,
    tipoUsuario: UserType,
    metodoPagoPreferido: PaymentMethod,
  ): User

    updateUser(
      _id: ID!,
      nombreCompleto: String,
      email: String,
      direccion: String,
      telefono: String,
      tipoUsuario: UserType,
      metodoPagoPreferido: PaymentMethod
    ): User

    deleteUser(_id: ID!): User
  }
`;

module.exports = userTypeDefs;