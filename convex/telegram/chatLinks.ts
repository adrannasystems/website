export function buildTelegramChatsByUserId(
  linkedChats: { chatId: string; userId: string }[],
): Map<string, string[]> {
  const chatsByUserId = new Map<string, string[]>();

  for (const linkedChat of linkedChats) {
    const existing = chatsByUserId.get(linkedChat.userId);
    if (existing === undefined) {
      chatsByUserId.set(linkedChat.userId, [linkedChat.chatId]);
    } else {
      existing.push(linkedChat.chatId);
    }
  }

  return chatsByUserId;
}
