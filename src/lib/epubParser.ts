import JSZip from "jszip";
import { EpubChapter } from "../types";

export async function parseEpub(file: File): Promise<EpubChapter[]> {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // 1. Read container.xml to find the OPF file path
    const containerXmlPath = "META-INF/container.xml";
    const containerXmlText = await zip.file(containerXmlPath)?.async("text");
    if (!containerXmlText) {
      throw new Error("Invalid EPUB: Missing META-INF/container.xml");
    }

    // Simple XML extraction for full-path of OPF
    const fullPathMatch = containerXmlText.match(/full-path="([^"]+)"/);
    const opfPath = fullPathMatch ? fullPathMatch[1] : null;
    if (!opfPath) {
      throw new Error("Invalid EPUB: Could not locate OPF package file.");
    }

    // Get the base directory of the OPF file (needed for relative references)
    const opfDir = opfPath.includes("/") 
      ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) 
      : "";

    // 2. Read OPF file content
    const opfText = await zip.file(opfPath)?.async("text");
    if (!opfText) {
      throw new Error(`Invalid EPUB: Missing OPF file at ${opfPath}`);
    }

    // 3. Parse manifest items and spine
    // Since we don't have a full XML parser, we can parse with simple Regex or DOMParser if browser-based
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(opfText, "text/xml");
    
    // Find all items in manifest
    const manifestItems = xmlDoc.getElementsByTagName("item");
    const manifestMap: Record<string, { href: string; mediaType: string }> = {};
    for (let i = 0; i < manifestItems.length; i++) {
      const item = manifestItems[i];
      const id = item.getAttribute("id");
      const href = item.getAttribute("href");
      const mediaType = item.getAttribute("media-type");
      if (id && href) {
        manifestMap[id] = { href, mediaType: mediaType || "" };
      }
    }

    // Find the spine reading order
    const spineItems = xmlDoc.getElementsByTagName("itemref");
    const chapters: EpubChapter[] = [];

    for (let i = 0; i < spineItems.length; i++) {
      const idref = spineItems[i].getAttribute("idref");
      if (idref && manifestMap[idref]) {
        const item = manifestMap[idref];
        
        // Only parse HTML/XHTML content
        if (item.mediaType.includes("html") || item.mediaType.includes("xml")) {
          // Resolve full path inside zip
          const relativePath = item.href;
          // Unescape/decode URL encoding (e.g. %20 -> space)
          const decodedPath = decodeURIComponent(relativePath);
          const fullItemPath = resolveRelativePath(opfDir, decodedPath);
          
          const contentFile = zip.file(fullItemPath);
          if (contentFile) {
            const rawHtml = await contentFile.async("text");
            // Extract clean text or keep a nicely cleaned body
            const cleanContent = cleanHtmlContent(rawHtml);
            const title = extractTitle(rawHtml) || `Chapter ${chapters.length + 1}`;
            
            chapters.push({
              id: `${idref}-${i}`,
              title,
              filePath: fullItemPath,
              content: cleanContent,
            });
          }
        }
      }
    }

    return chapters;
  } catch (error) {
    console.error("EPUB parsing failed:", error);
    throw error;
  }
}

// Helper to resolve paths relative to OPF file
function resolveRelativePath(baseDir: string, relativePath: string): string {
  if (!baseDir) return relativePath;
  
  const stack = baseDir.split("/");
  // Remove empty or file parts
  stack.pop(); // The last item is empty or the opf filename

  const parts = relativePath.split("/");
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join("/");
}

// Clean HTML tags and extract content safely
function cleanHtmlContent(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  // Extract paragraphs, headings, etc.
  const body = doc.body;
  if (!body) {
    // Fallback simple regex tag strip
    return html.replace(/<[^>]*>/g, " ").trim();
  }

  // Find all paragraphs, blockquotes, divs, list items, headings
  const elements = body.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote");
  if (elements.length > 0) {
    return Array.from(elements)
      .map(el => el.textContent?.trim())
      .filter(text => text && text.length > 0)
      .join("\n\n");
  }

  // Otherwise return body text content
  return body.textContent?.trim() || "";
}

// Extract document title or chapter header if possible
function extractTitle(html: string): string | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  
  const titleEl = doc.querySelector("title");
  if (titleEl && titleEl.textContent && titleEl.textContent.trim().length > 0) {
    const titleText = titleEl.textContent.trim();
    if (titleText.toLowerCase() !== "untitled" && !titleText.endsWith(".xhtml") && !titleText.endsWith(".html")) {
      return titleText;
    }
  }

  // Try heading 1 or heading 2
  const h1 = doc.querySelector("h1");
  if (h1 && h1.textContent && h1.textContent.trim().length > 0) {
    return h1.textContent.trim();
  }

  const h2 = doc.querySelector("h2");
  if (h2 && h2.textContent && h2.textContent.trim().length > 0) {
    return h2.textContent.trim();
  }

  return null;
}
