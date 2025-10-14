const request = require("supertest");
const app = require("../../service");
const { Role } = require("../../model/model.js");
const { DB } = require("../../database/database.js");

let testUser;
let testUserAuthToken;
let testUserId;
let adminUser;
let adminAuthToken;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(500000);
}

async function createAdminUser() {
  let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
  user.name = "AdminUser-" + Math.random().toString(36).substring(2, 12);
  user.email = user.name + "@admin.com";

  await DB.addUser(user);
  user.password = "toomanysecrets";

  return user;
}

beforeAll(async () => {
  testUser = { 
    name: "pizza diner", 
    email: Math.random().toString(36).substring(2, 12) + "@test.com", 
    password: "a" 
  };
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id;
  
  adminUser = await createAdminUser();
  const adminLoginRes = await request(app).put("/api/auth").send(adminUser);
  adminAuthToken = adminLoginRes.body.token;
});

test("get authenticated user", async () => {
  const res = await request(app)
    .get("/api/user/me")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  
  expect(res.status).toBe(200);
  expect(res.body.email).toBe(testUser.email);
  expect(res.body.name).toBe(testUser.name);
  expect(res.body.roles).toEqual([{ role: "diner" }]);
});

test("get authenticated user without token", async () => {
  const res = await request(app).get("/api/user/me");
  
  expect(res.status).toBe(401);
  expect(res.body.message).toBe("unauthorized");
});

test("get authenticated user with invalid token", async () => {
  const res = await request(app)
    .get("/api/user/me")
    .set("Authorization", "Bearer invalidtoken");
  
  expect(res.status).toBe(401);
  expect(res.body.message).toBe("unauthorized");
});

test("user updates own profile", async () => {
  const updateData = {
    name: "Updated Name",
    email: testUser.email,
    password: "newpassword123"
  };
  
  const res = await request(app)
    .put(`/api/user/${testUserId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(updateData);
  
  expect(res.status).toBe(200);
  expect(res.body.user.name).toBe("Updated Name");
  expect(res.body.token).toBeDefined();
  
  testUser.name = updateData.name;
  testUser.password = updateData.password;
  testUserAuthToken = res.body.token;
});

test("user updates only name", async () => {
  const updateData = {
    name: "Name Only Update",
    email: testUser.email  
  };
  
  const res = await request(app)
    .put(`/api/user/${testUserId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(updateData);
  
  expect(res.status).toBe(200);
  expect(res.body.user.name).toBe("Name Only Update");
  
  testUser.name = updateData.name;
});

test("user updates only email", async () => {
  const newEmail = Math.random().toString(36).substring(2, 12) + "@test.com";
  const updateData = {
    email: newEmail,
    name: testUser.name  
  };
  
  const res = await request(app)
    .put(`/api/user/${testUserId}`)
    .set("Authorization", `Bearer ${testUserAuthToken}`)
    .send(updateData);
  
  expect(res.status).toBe(200);
  expect(res.body.user.email).toBe(newEmail);
  
  testUser.email = newEmail;
});

test("admin updates other user", async () => {
  const updateData = {
    name: "Admin Updated",
    email: testUser.email
  };
  
  const res = await request(app)
    .put(`/api/user/${testUserId}`)
    .set("Authorization", `Bearer ${adminAuthToken}`)
    .send(updateData);
  
  expect(res.status).toBe(200);
  expect(res.body.user.name).toBe("Admin Updated");
  
  testUser.name = updateData.name;
});

test('list users unauthorized', async () => {
  const listUsersRes = await request(app).get('/api/user');
  expect(listUsersRes.status).toBe(401);
});

test('list users as non-admin', async () => {
  const listUsersRes = await request(app)
    .get('/api/user')
    .set('Authorization', 'Bearer ' + testUserAuthToken);
  expect(listUsersRes.status).toBe(403);
});

test('list users as admin', async () => {
  const listUsersRes = await request(app)
    .get('/api/user')
    .set('Authorization', 'Bearer ' + adminAuthToken);
  expect(listUsersRes.status).toBe(200);
  expect(listUsersRes.body.users).toBeDefined();
  expect(Array.isArray(listUsersRes.body.users)).toBe(true);
  expect(listUsersRes.body.more).toBeDefined();
});

test('list users with pagination', async () => {
  const res = await request(app)
    .get('/api/user?page=0&limit=2')
    .set('Authorization', `Bearer ${adminAuthToken}`);
  
  expect(res.status).toBe(200);
  expect(res.body.users.length).toBeLessThanOrEqual(2);
});

test('list users with name filter', async () => {
  // Create a user with a unique name just for this test
  const uniqueName = 'UniqueTestUser' + Math.random().toString(36).substring(2, 8);
  const uniqueUser = {
    name: uniqueName,
    email: `${Math.random().toString(36).substring(2, 12)}@test.com`,
    password: 'test'
  };
  
  await request(app).post('/api/auth').send(uniqueUser);
  
  // Search for this unique user
  const res = await request(app)
    .get(`/api/user?name=*${uniqueName}*`)
    .set('Authorization', `Bearer ${adminAuthToken}`);
  
  expect(res.status).toBe(200);
  const foundUser = res.body.users.find(u => u.name === uniqueName);
  expect(foundUser).toBeDefined();
  expect(foundUser.email).toBe(uniqueUser.email);
});