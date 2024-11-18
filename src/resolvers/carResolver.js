const Car = require('../models/carModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const { sendEmail } = require('../apis/mailjet');


const cartResolvers = {
  Query: {
    leerCarrito: async (_, { id_carrito }) => {
      return await Car.findById(id_carrito).populate('usuario').populate('productos.producto');
    },
    leerHistoria: async (_, { usuario }) => {
        return await Car.find({ usuario, estatus: 'cerrado' }).populate('productos.producto');
    }
  },
  Mutation: {
    crearCarrito: async (_, { usuario }) => {
      const newCart = new Car({ usuario, productos: [] });
      await newCart.save();

      return await Car.findById(newCart._id).populate('usuario');
    },
    agregarProd: async (_, { id_carrito, productoId, cantidad }) => {
        const cart = await Car.findById(id_carrito);
        const existingProduct = cart.productos.find((item) => item.producto.equals(productoId));
  
        if (existingProduct) {
          existingProduct.cantidad += cantidad;
        } else {
          cart.productos.push({ producto: productoId, cantidad });
        }
  
        await updateCartTotals(cart);
        await cart.save();
  
        // Popula los productos después de guardar el carrito
        return await Car.findById(id_carrito).populate('productos.producto');
      },
    eliminarProd: async (_, { id_carrito, productoId }) => {
        const cart = await Car.findById(id_carrito);
  
        // Filtrar el producto a eliminar
        cart.productos = cart.productos.filter((item) => !item.producto.equals(productoId));
  
        await updateCartTotals(cart);
        await cart.save();
  
        // Popula los productos después de guardar el carrito
        return await Car.findById(id_carrito).populate('productos.producto');
      },
    actualizarCarrito: async (_, { id_carrito }) => {
      const cart = await Car.findById(id_carrito);
      await updateCartTotals(cart);

      return await cart.save();
    },
    cerrarCarrito: async (_, { id_carrito }) => {
      const cart = await Car.findById(id_carrito).populate('usuario').populate('productos.producto');

      for (const item of cart.productos) {
        const product = await Product.findById(item.producto._id);

        if (product.stock < item.cantidad) {
          throw new Error(`No hay suficiente stock para el producto: ${product.name}`);
        }
      }

      for (const item of cart.productos) {
        const product = await Product.findById(item.producto._id);
        product.stock -= item.cantidad;
        await product.save();
      }

      cart.estatus = 'cerrado';
      cart.fecha_cierre = new Date();
      await cart.save();

      const user = await User.findById(cart.usuario._id);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

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
            <th>Precio</th>
          </tr>
        </thead>
        <tbody>
          ${cart.productos
            .map(
              (item) =>
                `<tr>
                  <td>${item.producto.name}</td>
                  <td>${item.cantidad}</td>
                  <td>$${item.producto.price.toFixed(2)}</td>
                </tr>`
            )
            .join('')}
        </tbody>
      </table>
      <p><strong>Subtotal:</strong> $${cart.subtotal.toFixed(2)}</p>
      <p><strong>IVA:</strong> $${cart.iva.toFixed(2)}</p>
      <p><strong>Total:</strong> $${cart.total.toFixed(2)}</p>
    </div>
    <div class="footer">
      <p>Gracias por tu preferencia.</p>
      <p>&copy; 2024 Tu Empresa</p>
    </div>
  </div>
</body>
</html>
`;
      // Intentar enviar el correo
      await sendEmail(user.email, 'Confirmación de Compra', emailContent);

      return cart;
    },
  },
  };


// Función para actualizar subtotal, IVA y total
async function updateCartTotals(cart) {
  let subtotal = 0;

  for (const item of cart.productos) {
    const product = await Product.findById(item.producto);
    subtotal += product.price * item.cantidad;
  }

  cart.subtotal = subtotal;
  cart.iva = subtotal * 0.16; // Suponiendo un IVA del 16%
  cart.total = cart.subtotal + cart.iva;
}

module.exports = cartResolvers;