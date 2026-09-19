const orderRepo = require('../repositories/order.repo');

function validateOrderPayload(body) {
  const errors = [];
  if (!body.customer_name?.trim()) errors.push('Name is required');
  if (!body.customer_phone?.trim()) errors.push('Phone is required');
  if (!['dine_in','takeaway','delivery'].includes(body.order_type)) {
    errors.push('Invalid order type');
  }
  if (body.order_type === 'delivery' && !body.customer_address?.trim()) {
    errors.push('Address required for delivery');
  }
  return errors;
}

async function createOrder(restaurantId, body) {
  const errors = validateOrderPayload(body);
  if (errors.length) throw Object.assign(new Error(errors.join(', ')), { status: 400 });
  if (!Array.isArray(body.items) || !body.items.length) {
    throw Object.assign(new Error('Cart is empty'), { status: 400 });
  }
  return orderRepo.create(restaurantId, {
    customer_name: body.customer_name.trim(),
    customer_phone: body.customer_phone.trim(),
    customer_address: body.customer_address?.trim() || null,
    order_type: body.order_type,
    table_number: body.table_number || null,
    notes: body.notes?.trim() || null,
    items: body.items,
  });
}

module.exports = { createOrder };