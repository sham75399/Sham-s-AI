export const generateTitle = (firstMessage) => {
  if (!firstMessage) return "New Chat";
  // Take first ~6 words and clean up
  const clean = firstMessage.replace(/\s+/g, " ").trim();
  const words = clean.split(" ").slice(0, 6).join(" ");
  const title = words.charAt(0).toUpperCase() + words.slice(1);
  return title.length > 60 ? title.slice(0, 60) + "..." : title;
};