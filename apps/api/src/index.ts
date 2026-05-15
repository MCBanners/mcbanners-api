import { createApp } from "./app";
import { createFixtureAdapter, MC_STATUS_FIXTURES } from "@mcbanners/minecraft-status";

const adapter = createFixtureAdapter(MC_STATUS_FIXTURES);
const app = createApp(adapter);

export default app;
