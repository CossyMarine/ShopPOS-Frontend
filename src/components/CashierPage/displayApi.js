import API from "../../api/axios";

export const postDisplayCart = (cart) => {
  const items = cart.map(({ productId, productName, displayName, imageUrl, unitPrice, quantity, vatClass }) => ({
    productId, productName: displayName || productName, imageUrl, unitPrice, quantity, vatClass,
  }));
  return API.post("/display/cart", { items }).catch(() => {}); // display is never allowed to break a sale
};

export const postDisplayBill = (receiptId) =>
  receiptId ? API.post("/display/bill", { receiptId }).catch(() => {}) : Promise.resolve();
