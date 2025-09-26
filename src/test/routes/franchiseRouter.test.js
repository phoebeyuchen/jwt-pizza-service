const request = require("supertest");
const app = require("../../service");
const { Role } = require("../../model/model.js");
const { DB } = require("../../database/database.js");

let testUser;
let testUserAuthToken;
let testUserId;

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
  testUserId = loginRes.body.user.id;
});

test("getFranchises", async () => {
  const franchiseRes = await request(app)
    .get("/api/franchise")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(franchiseRes.status).toBe(200);
  expect(franchiseRes.body).not.toBeNull();
});

test("createFranchise", async () => {
  const testFranchise = {
    name: "pizza franchize-" + Math.random().toString(36).substring(2, 12),
    admins: [testUser],
  };
  const franchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(testFranchise);
  expect(franchiseRes.status).toBe(200);
  expect(franchiseRes.body).not.toBeNull();
});

test("getUsersFranchises", async () => {
  const testFranchise = {
    name: "pizza franchize-" + Math.random().toString(36).substring(2, 12),
    admins: [testUser],
  };
  await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(testFranchise);
  const franchiseRes = await request(app)
    .get(`/api/franchise/${testUserId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(franchiseRes.status).toBe(200);
  expect(franchiseRes.body).not.toBeNull();
});

test("deleteFranchise", async () => {
  const testFranchise = {
    name: "pizza franchize-" + Math.random().toString(36).substring(2, 12),
    admins: [testUser],
  };
  const franchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(testFranchise);
  const franchiseId = franchiseRes.body.id;

  const deleteRes = await request(app)
    .delete(`/api/franchise/${franchiseId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(deleteRes.status).toBe(200);
});

test("createStore", async () => {
  const testFranchise = {
    name: "pizza franchize-" + Math.random().toString(36).substring(2, 12),
    admins: [testUser],
  };
  const franchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(testFranchise);
  const franchiseId = franchiseRes.body.id;

  const storeRes = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send({ name: "store" });
  expect(storeRes.status).toBe(200);
});

test("deleteStore", async () => {
  const testFranchise = {
    name: "pizza franchize-" + Math.random().toString(36).substring(2, 12),
    admins: [testUser],
  };
  const franchiseRes = await request(app)
    .post("/api/franchise")
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(testFranchise);
  const franchiseId = franchiseRes.body.id;

  const storeRes = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send({ name: "store" });
  const storeId = storeRes.body.id;

  const deleteRes = await request(app)
    .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(deleteRes.status).toBe(200);
});
