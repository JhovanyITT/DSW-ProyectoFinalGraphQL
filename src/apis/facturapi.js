// a) Importa el paquete
const Facturapi = require('facturapi').default;

// b) Crea una instancia del cliente, usando la llave secreta
//    de la organización emisora (https://dashboard.facturapi.io/integration/apikeys)
const facturapi = new Facturapi('sk_test_nrPGwbXKzqQRD7yV5MPrgAbYO7N3edMlx0km2LEOgp');

async function createProduct(product) {
    const facturaProduct = {
        description: product.description,
        product_key: "50221304",
        price: product.price
    };
    return await facturapi.products.create(facturaProduct);
}

async function updateProduct(facturapiid, product) {
    const facturaProductUpdates = {
        description: product.description, 
        price: product.price
    };
    return await facturapi.products.update(facturapiid, facturaProductUpdates);
}

async function deleteProduct(facturapiid) {
    return await facturapi.products.del(facturapiid);
}

async function createUser(user) {
    const facturapiUser = {
        legal_name: user.nombreCompleto, 
        tax_id: user.rfc || "XAXX010101000",             
        tax_system: "601",     
        address: {
            street: user.direccion || "",
            zip: "12345"
          },     
        phone: user.telefono,
        email: user.email                
    };
    return await facturapi.customers.create(facturapiUser);
}

async function updateUser(id, user){
    const facturapiUser = {
        legal_name: user.nombreCompleto,
        address: user.address,
        email: user.email
    };
    return await facturapi.customers.update(id, facturapiUser);
}

async function deleteUser(facturapiid){
    return await facturapi.customers.del(facturapiid);
}

module.exports = { createProduct, updateProduct, deleteProduct, createUser, updateUser, deleteUser };