import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

type TelegramUpdate = {
  message?: { chat?: { id?: number }; text?: string };
};

http.route({
  path: "/telegram/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env["TELEGRAM_WEBHOOK_SECRET"];
    if (secret !== undefined && secret !== "") {
      const incoming = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
      if (incoming !== secret) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    let update: TelegramUpdate;
    try {
      update = (await request.json()) as TelegramUpdate;
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    const chatId = update.message?.chat?.id;
    const text = update.message?.text;

    if (chatId !== undefined && text !== undefined) {
      await ctx.scheduler.runAfter(0, internal.telegram.agent.processMessage, {
        chatId: String(chatId),
        text,
      });
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
