const request = require("supertest");
const app = require("../../service");
const { Role } = require("../../model/model.js");
const { DB } = require("../../database/database.js");

let testUser;
let testUserAuthToken;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimout(500000);
}

async function createAdminUser() {
  let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
  user.name = "PizzaDiner-" + Math.random().toString(36).substring(2, 12);
  user.email = user.name + "@admin.com";

  await DB.addUser(user);
  user.password = "toomanysecrets";

  return user;
}

beforeAll(async () => {
  testUser = await createAdminUser();
  const loginRes = await request(app).put("/api/auth").send(testUser);
  testUserAuthToken = loginRes.body.token;
});

test("get pizza menu", async () => {
  const menuRes = await request(app).get("/api/order/menu");
  expect(menuRes.status).toBe(200);
  expect(menuRes.body).not.toBeNull();
});

test("create order", async () => {
  const createMenuItemReq = await request(app)
    .put("/api/order/menu")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send({
      title: "TestItem",
      description: "Test item description",
      price: 0.0038,
      image: "noimg.png",
    });

  const createdMenuItems = createMenuItemReq.body;
  const newMenuItem = createdMenuItems[createdMenuItems.length - 1];
  const newMenuItemId = newMenuItem.id;

  const orderReq = {
    franchiseId: 1,
    storeId: "1",
    items: [
      {
        menuId: newMenuItemId,
        description: "Test item description",
        price: 0.0038,
      },
    ],
  };

  const orderRes = await request(app)
    .post("/api/order")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(orderReq);

  expect(orderRes.status).toBe(200);
  expect(orderRes.body.order).not.toBeNull();
  expect(orderRes.body.order.reportSlowPizzaToFactoryUrl).not.toBeNull();
});

test("get orders", async () => {
  const orderReq = {
    franchiseId: 1,
    storeId: "1",
    items: [
      { menuId: 1, description: "Veggie", price: 0.0038 },
      { menuId: 2, description: "Pepperoni", price: 0.0042 },
    ],
  };

  await request(app)
    .post("/api/order")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(orderReq);
  const ordersRes = await request(app)
    .get("/api/order")
    .set("Authorization", `Bearer ${testUserAuthToken}`);

  expect(ordersRes.status).toBe(200);
  expect(ordersRes.body.orders.orders).not.toBeNull();
  expect(ordersRes.body.orders.length).toBeGreaterThan(0);
});
