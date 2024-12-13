const { gql } = require('apollo-server');

const carTypeDefs = gql`
  type ProductInCar {
    producto: Product
    cantidad: Int
  }

  type Car {
    _id: ID!                     
    usuario: User
    productos: [ProductInCar]
    subtotal: Float
    iva: Float
    total: Float
    estatus: String
    stripeId: String
    fecha_creacion: String
    fecha_cierre: String
  }

  type Query {
    leerCarrito(id_carrito: ID!): Car
    leerHistoria(usuario: ID!): [Car]
  }

  type Mutation {
    agregarProd(id_carrito: ID!, productoId: ID!, cantidad: Int!): Car
    eliminarProd(id_carrito: ID!, productoId: ID!): Car
    crearCarrito(usuario: ID!): Car
    cerrarCarrito(
      id_carrito: ID!,
      currency: String!,
      payment_method: String!
    ): Car
  }
`;

module.exports = carTypeDefs;