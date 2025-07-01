import { Hono } from 'hono';
import { createAuthMiddleware } from '../middleware/auth';

import { Container, getContainer } from '@cloudflare/containers';
import type { Env } from '../index';

export class SandboxShellContainer extends Container {
  defaultPort = 8000;
  sleepAfter = '10m';

  async runCommand(command: string, cwd: string) {
    const response = await this.containerFetch("https://container/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({command, cwd})
    });
    return await response.json();
  }
}

export function createContainerRoutes() {

  const app = new Hono<{ Bindings: Env }>();
  app.use('*', createAuthMiddleware());
  app.post('/sandbox/:slug', async(c) => {
    const payload = await c.req.json();
    const {slug} = c.req.param();
    const container = getContainer(c.env.SANDBOX_SHELL_CONTAINER, slug);
    const result = await container.runCommand(payload.command, payload.cwd);
    return c.json(result);

  });

  return app;

}