export type TelegramBotCommand = {
  command: string;
  description: string;
};

export const telegramHelpCommand = "/help";
export const telegramLinkCommand = "/link";
export const telegramUnlinkCommand = "/unlink";

export const telegramBotCommands: readonly TelegramBotCommand[] = [
  {
    command: telegramHelpCommand.slice(1),
    description: "Show available commands and how to use the bot",
  },
  {
    command: telegramUnlinkCommand.slice(1),
    description: "Unlink this chat from your account",
  },
];

export function extractTelegramCommand(text: string): `/${string}` | null {
  const match = /^\/([a-z0-9_]+)(?:@[a-z0-9_]+)?(?:\s|$)/i.exec(text.trim());
  if (match === null) {
    return null;
  }

  const command = match[1];
  if (command === undefined) {
    return null;
  }

  return `/${command.toLowerCase()}`;
}

export function formatTelegramHelpMessage(input: {
  isLinked: boolean;
  linkUrl?: string | undefined;
}): string {
  const commandLines = [
    "Available commands:",
    `${telegramHelpCommand} — show this help`,
    `${telegramUnlinkCommand} — unlink only this chat from your account`,
    "",
    "You can also send natural-language messages to list tasks, create tasks, and log completed work.",
  ];

  if (input.isLinked) {
    commandLines.push("", "This chat is currently linked.");
  } else {
    commandLines.push("", "This chat is not linked yet.");
    if (input.linkUrl !== undefined) {
      commandLines.push("", `Link this chat here:\n${input.linkUrl}`);
    }
    commandLines.push(
      "",
      `After linking, you can use ${telegramUnlinkCommand} to disconnect this chat again.`,
    );
  }

  return commandLines.join("\n");
}

export function formatLinkConfirmationMessage(userName: string | undefined): string {
  const resolvedUserName = userName ?? "A user";
  return [
    `✅ ${resolvedUserName} is now linked to this chat.`,
    "",
    `Use ${telegramHelpCommand} to see what the bot can do.`,
    `Use ${telegramUnlinkCommand} to disconnect only this chat later.`,
  ].join("\n");
}
