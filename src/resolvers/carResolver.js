const Car = require('../models/carModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const { sendEmail } = require('../apis/mailjet');
const facturapi = require('../apis/facturapi');
const Twilio = require('../apis/twilio');
const { uploadFile } = require('../apis/firebase');
const Stripe = require('../apis/stripe');
const fs = require('fs');

const cartResolvers = {
  Query: {
    leerTodos: async () => {
        return await Car.find().populate('usuario').populate('productos.producto');
    },
    leerCarrito: async (_, { id_carrito }) => {
        return await Car.findById(id_carrito).populate('usuario').populate('productos.producto');
    },
    leerHistorial: async (_, { usuario }) => {
        return await Car.find({ usuario }).populate('usuario').populate('productos.producto');
    }
  },
  Mutation: {
    crearCarrito: async (_, { usuario }) => {
        const existingCart = await Car.findOne({ usuario, estatus: 'activo' });

        //Validar que un usuario no tenga dos carritos en activo
        if (existingCart) {
          throw new Error(`El usuario ya tiene un carrito activo. Por favor, cierra el carrito actual antes de crear uno nuevo.`);
        }

        const newCart = new Car({ usuario, productos: [] });
        await newCart.save();
        return await Car.findById(newCart._id).populate('usuario');
    },
    agregarProd: async (_, { id_carrito, productoId, cantidad }) => {
        const cart = await Car.findById(id_carrito);

        if (!cart) return 'Carrito no encontrado';

        // Verifica si el carrito ya esta cerrado
        if (cart.estatus === 'cerrado'){
          throw new Error(`El carrito ya ha sido cerrado, no se pueden agregar productos`);
        }

        const existingProduct = cart.productos.find((item) => item.producto.equals(productoId));
        if (existingProduct) {
          existingProduct.cantidad += cantidad;
        } else {
          cart.productos.push({ producto: productoId, cantidad });
        }
  
        await updateCartTotals(cart);
        await cart.save();
  
        // Popula los productos y usuario después de guardar el carrito
        return await Car.findById(id_carrito).populate('usuario').populate('productos.producto');  
    },
    eliminarProd: async (_, { id_carrito, productoId }) => {
        const cart = await Car.findById(id_carrito);
        
        if (!cart) throw new Error(`Carrito no encontrado`);


        // Verifica si el carrito ya esta cerrado
        if (cart.estatus === 'cerrado'){
          throw new Error(`El carrito ya ha sido cerrado, no se pueden remover productos`);
        }

        // Verifica si el producto existe en el carrito
        const productIndex = cart.productos.findIndex((item) => item.producto.equals(productoId));
        if (productIndex === -1) {
            throw new Error(`El producto no se encuentra en el carrito`);
        }

        // Filtra el producto del array
        cart.productos.splice(productIndex, 1);
  
        await updateCartTotals(cart);
        await cart.save();
  
        // Popula los productos y usuario después de guardar el carrito
        return await Car.findById(id_carrito).populate('usuario').populate('productos.producto');
    },
    cerrarCarrito: async (_, { id_carrito, currency, payment_method}) => {
        const cart = await Car.findById(id_carrito).populate('usuario').populate('productos.producto');
        
        if (!cart) throw new Error(`Carrito no encontrado`);


        if (cart.estatus === 'cerrado'){
          throw new Error(`El carrito ya ha sido cerrado`);
        }

        // Validar que exista stocke suficiente del producto
        for (const item of cart.productos) {
          const product = await Product.findById(item.producto._id);
          if (product.stock < item.cantidad) {
            throw new Error(`No hay suficiente stock para el producto: ${product.name}`);
          }
        }
        
        // Eliminar stock del producto en la base de datos
        for (const item of cart.productos) {
          const product = await Product.findById(item.producto._id);
          product.stock -= item.cantidad;
          await product.save();
        }

        const user = await User.findById(cart.usuario._id);
        if (!user) {
          throw new Error('Usuario no encontrado');
        }

        // Crear el modelo para la factura en facturapi
        const invoiceData = {
          customer: {
              legal_name: cart.usuario.nombreCompleto,
              email: cart.usuario.email,
              tax_id: 'ABC101010111',
              tax_system: '601',
              address: {
                  street: cart.usuario.direccion,
                  zip: '12345'
              }
          },
          items: cart.productos.map((item) => ({
              quantity: item.cantidad,
              product: {
                  description: item.producto.name,
                  product_key: '50221304',
                  price: item.producto.price,
                  taxes: [
                      {
                          type: 'IVA',
                          rate: 0.16
                      }
                  ]
              }
          })),
          use: 'G01',
          payment_form: '28'
        };



        // Crear el pago en stripe
        let amount = cart.total * 100;
        const pago = await Stripe.createPayment(amount, currency, payment_method);

        cart.stripeId = pago.id;

        // Envia la factura a facturapi
        const factura = await facturapi.createInvoice(invoiceData);

        // Generar PDF de la factura de manera local
        const zipFilePath = await facturapi.downloadInvoice(factura.id);

        // Subir PDF de la factura a firebase storage
        const facturaurl = await uploadFile(zipFilePath);

        // Eliminar el PDF de manera local
        await deleteInvoicePDF(zipFilePath);

        // Enviar un SMS
        const mensaje = `
          Gracias por su compra! Puede descargar su factura aqui:
          ${facturaurl}
        `;
        await Twilio.sendSMS(user.telefono,mensaje);

        // Crear el modelo para el contenido del email
        const emailContent = `
          <!DOCTYPE html>
          <html>
          <head>
              <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 0;
              }
              .email-container {
                  max-width: 600px;
                  margin: 20px auto;
                  background-color: #ffffff;
                  border: 1px solid #ddd;
                  border-radius: 5px;
                  overflow: hidden;
              }
              .header {
                  background-color: #007BFF;
                  color: #ffffff;
                  text-align: center;
                  padding: 20px;
              }
              .header h1 {
                  margin: 0;
                  font-size: 24px;
              }
              .content {
                  padding: 20px;
              }
              .content h2 {
                  color: #333333;
              }
              .content p {
                  color: #555555;
              }
              .product-list {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 20px 0;
              }
              .product-list th, .product-list td {
                  padding: 10px;
                  text-align: left;
                  border-bottom: 1px solid #ddd;
              }
              .product-list th {
                  background-color: #f8f8f8;
              }
              .footer {
                  background-color: #007BFF;
                  color: #ffffff;
                  text-align: center;
                  padding: 10px;
                  font-size: 14px;
              }
              </style>
          </head>
          <body>
              <div class="email-container">
              <div class="header">
                  <h1>Gracias por tu compra</h1>
              </div>
              <div class="content">
                  <h2>Hola ${user.nombreCompleto},</h2>
                  <p>Tu carrito se ha cerrado exitosamente. Aquí tienes los detalles de tu compra:</p>
                  <table class="product-list">
                  <thead>
                      <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${cart.productos
                      .map(
                          (item) =>
                          `<tr>
                              <td>${item.producto.name}</td>
                              <td>${item.cantidad}</td>
                          </tr>`
                      )
                      .join('')}
                  </tbody>
                  </table>
                  <p><strong>Total:</strong> $${factura.total.toFixed(2)}</p>
                  <p>Más detalles de la factura:</p>
                  <a href="${facturaurl}">Descargar factura</a>
              </div>
              <div class="footer">
                  <p>Gracias por tu preferencia.</p>
                  <p>&copy; 2024 Flare Dev S.A de C.V</p>
              </div>
              </div>
          </body>
          </html>
        `;

        // Intentar enviar el correo
        await sendEmail(user.email, 'Confirmación de Compra', emailContent);
        
        // Colocar el estatus del carrito como cerrado
        cart.estatus = 'cerrado';
        cart.fecha_cierre = new Date();
        await cart.save();

        return cart;
    },
  },
  };


// Función para eliminar el archivo generado
async function deleteInvoicePDF(filePath) {
  return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
          if (err) {
              reject(`Error al eliminar el archivo: ${err.message}`);
          } else {
              resolve('Archivo eliminado correctamente');
          }
      });
  });
}

// Función para actualizar subtotal, IVA y total
async function updateCartTotals(cart) {
  let total = 0;

  for (const item of cart.productos) {
    const product = await Product.findById(item.producto);
    total += product.price * item.cantidad;
  }
  let subtotal = total - (total * 0.16);
  cart.subtotal = subtotal;
  cart.iva = total * 0.16;
  cart.total= total;
}

module.exports = cartResolvers;