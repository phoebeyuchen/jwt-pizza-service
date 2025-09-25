const request = require("supertest");
const app = require("../../service");
const { setAuthUser } = require("../../routes/authRouter.js");

const testUser = { name: "pizza diner", email: "reg@test.com", password: "a" };
let testUserAuthToken;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimout(500000);
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const registerRes = await request(app).post("/api/auth").send(testUser);
  testUserAuthToken = registerRes.body.token;
});

test("register", async () => {
  const user = { name: "pizza diner", email: "reg@test.com", password: "a" };
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const regRes = await request(app).post("/api/auth").send(user);
  expect(regRes.status).toBe(200);
});

test("register without password", async () => {
  const user = { name: "pizza diner", email: "reg@test.com" };
  user.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  const regRes = await request(app).post("/api/auth").send(user);
  expect(regRes.status).toBe(400);
});

test("login", async () => {
  const loginRes = await request(app).put("/api/auth").send(testUser);
  expect(loginRes.status).toBe(200);

  const expectedUser = { ...testUser, roles: [{ role: "diner" }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test("setAuthUser()", async () => {
  const req = { headers: { authorization: `Bearer ${testUserAuthToken}` } };
  const res = {};
  const next = jest.fn();
  await setAuthUser(req, res, next);

  expect(req.user.email).toBe(testUser.email);
  expect(next).toHaveBeenCalled();
});

test("setAuthUser() with bad token", async () => {
  const req = { headers: { authorization: `Bearer ${testUserAuthToken}bad` } };
  const res = {};
  const next = jest.fn();
  await setAuthUser(req, res, next);

  expect(req.user).toBeUndefined();
  expect(next).toHaveBeenCalled();
});

test("logout", async () => {
  await request(app).put("/api/auth").send(testUser);
  const logoutRes = await request(app)
    .delete("/api/auth")
    .set("Authorization", `Bearer ${testUserAuthToken}`);
  expect(logoutRes.status).toBe(200);
});
