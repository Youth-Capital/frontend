import { api } from "@/shared/api/client";

/**
 * Save a file the API only hands to an authenticated caller.
 *
 * A plain link cannot do this. The endpoints that return a file sit behind the
 * same bearer token as everything else, and a `<a href>` navigation carries no
 * Authorization header — the browser would arrive unauthenticated and be sent
 * to the sign-in page instead of being given the document. So the bytes are
 * fetched through the configured client, which already attaches the token and
 * refreshes it, and only then handed to the browser as a download.
 */
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  const response = await api.get<Blob>(url, { responseType: "blob" });

  const objectUrl = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download =
    filenameFromDisposition(response.headers["content-disposition"]) ?? fallbackName;

  // Firefox only follows a click on an element that is in the document.
  document.body.appendChild(link);
  link.click();
  link.remove();

  // The blob stays in memory until it is released, and a CV is not small. The
  // revoke is deferred because Safari reads the href after the click returns.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
}

/**
 * The name the server chose, out of `Content-Disposition`.
 *
 * Two forms have to be understood. `filename*=UTF-8''...` is what Django sends
 * whenever the name is not plain ASCII — which, for a platform whose users are
 * named in Cyrillic and Uzbek Latin, is most of the time — and plain
 * `filename="..."` is what it sends otherwise. Reading only the second would
 * quietly fall back to the generic name for exactly those people.
 */
function filenameFromDisposition(header: unknown): string | null {
  if (typeof header !== "string") return null;

  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // A malformed header is not worth failing a download over.
    }
  }

  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}
