const EMAIL_PATTERN =
  /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;

const WHATSAPP_PATTERN =
  /\b(?:whats?app|wa|wp)\b|হোয়াটসঅ্যাপ|হোয়াটসঅ্যাপ/i;
const APPLICATION_PATTERN =
  /\b(?:apply|application|send|submit|cv|resume|email|mail|contact)\b|আবেদন|পাঠান|সিভি|ইমেইল|ইমেল|যোগাযোগ/i;

function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

function toWesternDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) =>
    String(digit.charCodeAt(0) - 0x09e6)
  );
}

function whatsappPhone(value: string): string | null {
  const digits = toWesternDigits(value).replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;

  if (/^01[3-9]\d{8}$/.test(digits)) return `88${digits}`;
  if (/^8801[3-9]\d{8}$/.test(digits)) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits;
}

/** Return a safe, clickable target for an application URL or contact value. */
export function getApplicationHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const email = trimmed.replace(/^mailto:/i, "");
  if (isEmail(email)) return `mailto:${email}`;

  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // Continue with the plain WhatsApp-number form.
  }

  if (!/^[+0-9০-৯][+0-9০-৯ \t().-]*$/.test(trimmed)) return null;
  const phone = whatsappPhone(trimmed);
  return phone ? `https://wa.me/${phone}` : null;
}

export function isValidApplicationLink(value: string): boolean {
  return getApplicationHref(value) !== null;
}

export function getApplicationLinkLabel(value: string): string {
  const trimmed = value.trim();
  if (isEmail(trimmed.replace(/^mailto:/i, ""))) return "Email to apply";
  if (whatsappPhone(trimmed)) return "Open WhatsApp";

  try {
    if (new URL(trimmed).hostname === "wa.me") return "Open WhatsApp";
  } catch {
    // Not a URL; use the generic application-link label.
  }
  return "Open application link";
}

/** Find an apply URL, email, or WhatsApp contact in copied job-post text. */
export function extractJobUrl(text: string): string {
  const urls = [...text.matchAll(/https?:\/\/[^\s<>"'`]+/gi)]
    .map((match) => {
      const value = match[0].replace(/[),.!?;:\]}»]+$/g, "");
      try {
        const url = new URL(value);
        const start = match.index ?? 0;
        const context = text.slice(Math.max(0, start - 100), start);
        const applicationContext =
          /(?:apply|application|register|registration|job\s*(?:details|link)|form|আবেদন|আবেদনের|লিংক|ফরম|নিবন্ধন)[^\n]{0,80}[:：\s-]*$/i.test(
            context
          );
        const socialHost =
          /(^|\.)(facebook\.com|fb\.com|linkedin\.com|instagram\.com)$/i.test(
            url.hostname
          );
        const imagePath = /\.(?:png|jpe?g|gif|webp)(?:$|\?)/i.test(
          url.pathname + url.search
        );
        return {
          url: url.toString(),
          applicationContext,
          score:
            (applicationContext ? 10 : 0) -
            (socialHost ? 5 : 0) -
            (imagePath ? 20 : 0),
          start,
        };
      } catch {
        return null;
      }
    })
    .filter(
      (
        candidate
      ): candidate is {
        url: string;
        applicationContext: boolean;
        score: number;
        start: number;
      } => candidate !== null
    )
    .sort((a, b) => b.score - a.score || a.start - b.start);

  const applicationUrl = urls.find((candidate) => candidate.applicationContext);
  if (applicationUrl) return applicationUrl.url;

  const emails = [...text.matchAll(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)]
    .map((match) => {
      const start = match.index ?? 0;
      const context = text.slice(Math.max(0, start - 100), start);
      return {
        email: match[0].replace(/[),.!?;:]+$/g, ""),
        applicationContext: APPLICATION_PATTERN.test(context),
        start,
      };
    })
    .sort(
      (a, b) =>
        Number(b.applicationContext) - Number(a.applicationContext) ||
        a.start - b.start
    );
  if (emails[0]) return emails[0].email;

  const phones = [...text.matchAll(/[+0-9০-৯][+0-9০-৯ \t().-]{6,}[0-9০-৯]/g)]
    .map((match) => {
      const start = match.index ?? 0;
      const context = text.slice(
        Math.max(0, start - 60),
        start + match[0].length + 60
      );
      return {
        phone: match[0].trim(),
        isWhatsApp: WHATSAPP_PATTERN.test(context),
        applicationContext: APPLICATION_PATTERN.test(context),
        start,
      };
    })
    .filter((candidate) => {
      const phone = whatsappPhone(candidate.phone);
      return candidate.isWhatsApp && Boolean(phone);
    })
    .sort(
      (a, b) =>
        Number(b.applicationContext) - Number(a.applicationContext) ||
        a.start - b.start
    );
  if (phones[0]) return phones[0].phone;

  return urls[0]?.url ?? "";
}
