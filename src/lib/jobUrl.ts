/** Find the most likely apply/job link in copied post text. */
export function extractJobUrl(text: string): string {
  const candidates = [...text.matchAll(/https?:\/\/[^\s<>"'`]+/gi)]
    .map((match) => {
      const value = match[0].replace(/[),.!?;:\]}»]+$/g, "");
      try {
        const url = new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        const start = match.index ?? 0;
        const context = text.slice(Math.max(0, start - 100), start).toLowerCase();
        const applicationContext = /(?:apply|application|register|registration|job\s*(?:details|link)|form|আবেদন|আবেদনের|লিংক|ফরম|নিবন্ধন)[^\n]{0,80}[:：\s-]*$/i.test(context);
        const socialHost = /(^|\.)(facebook\.com|fb\.com|linkedin\.com|instagram\.com)$/i.test(url.hostname);
        const imagePath = /\.(?:png|jpe?g|gif|webp)(?:$|\?)/i.test(url.pathname + url.search);
        return {
          url: url.toString(),
          score: (applicationContext ? 10 : 0) - (socialHost ? 5 : 0) - (imagePath ? 20 : 0),
          start,
        };
      } catch {
        return null;
      }
    })
    .filter((candidate): candidate is { url: string; score: number; start: number } => candidate !== null)
    .sort((a, b) => b.score - a.score || a.start - b.start);

  return candidates[0]?.url ?? "";
}
