import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) =>
  c.json({
    service: "mcbanners-api-next",
    status: "ok"
  })
);

export default app;
