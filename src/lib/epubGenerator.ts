import JSZip from "jszip";

interface EpubChapterInput {
  title: string;
  content: string;
}

export async function generateEpub(bookName: string, chapters: EpubChapterInput[]): Promise<Blob> {
  const zip = new JSZip();

  // 1. mimetype (Must be first, and must NOT be compressed in standard EPUB, but JSZip handles it well)
  // We can write it with compression option set to STORE
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  // 2. META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file("META-INF/container.xml", containerXml);

  // Generate a random UUID for the book ID
  const uuid = "epub-" + Math.random().toString(36).substring(2, 15) + "-" + Math.random().toString(36).substring(2, 15);
  const cleanTitle = bookName.replace(/\.[^/.]+$/, "");

  // 3. OEBPS/stylesheet.css
  const stylesheetCss = `body {
  font-family: "Georgia", "Lora", serif;
  line-height: 1.8;
  margin: 24px;
  color: #1a1a1a;
  background-color: #ffffff;
}
h1 {
  font-family: serif;
  text-align: center;
  margin-top: 40px;
  margin-bottom: 20px;
  font-size: 2em;
  color: #111111;
}
h2 {
  font-family: serif;
  text-align: center;
  margin-top: 40px;
  margin-bottom: 24px;
  font-size: 1.5em;
  border-bottom: 1px solid #eaeaea;
  padding-bottom: 10px;
  color: #111111;
}
p {
  margin-top: 0;
  margin-bottom: 1.5em;
  text-indent: 1.5em;
  text-align: justify;
}
p:first-of-type, h2 + p {
  text-indent: 0;
}
.center {
  text-align: center;
}
.italic {
  font-style: italic;
}`;
  zip.file("OEBPS/stylesheet.css", stylesheetCss);

  // Prepare chapters, manifest items, and spine items
  let manifestItems = "";
  let spineItems = "";
  let navPoints = "";

  chapters.forEach((ch, idx) => {
    const chId = `chapter_${idx + 1}`;
    const filename = `${chId}.xhtml`;

    // Format content paragraphs into XHTML paragraphs
    const paragraphHtml = ch.content
      .split("\n\n")
      .map(p => {
        const trimmed = p.trim();
        if (!trimmed) return "";
        // If it looks like a sub-header, render as a header
        if (/^Chapter\s+/i.test(trimmed) || /^Chapter\s+\d+/i.test(trimmed) || (trimmed.length < 35 && !trimmed.endsWith("."))) {
          return `<h3>${escapeXml(trimmed)}</h3>`;
        }
        return `<p>${escapeXml(trimmed)}</p>`;
      })
      .filter(Boolean)
      .join("\n");

    const chapterHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>${escapeXml(ch.title)}</title>
    <link rel="stylesheet" href="stylesheet.css" type="text/css"/>
  </head>
  <body>
    <h2>${escapeXml(ch.title)}</h2>
    <div class="chapter-content">
      ${paragraphHtml}
    </div>
  </body>
</html>`;

    zip.file(`OEBPS/${filename}`, chapterHtml);

    // Manifest entry
    manifestItems += `    <item id="${chId}" href="${filename}" media-type="application/xhtml+xml"/>\n`;
    
    // Spine entry
    spineItems += `    <itemref idref="${chId}"/>\n`;

    // NavPoint for table of contents
    navPoints += `    <navPoint id="nav_${chId}" playOrder="${idx + 1}">
      <navLabel>
        <text>${escapeXml(ch.title)}</text>
      </navLabel>
      <content src="${filename}"/>
    </navPoint>\n`;
  });

  // 4. OEBPS/content.opf
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookID" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${escapeXml(cleanTitle)}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="BookID">urn:uuid:${uuid}</dc:identifier>
    <dc:creator>Linguist</dc:creator>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="stylesheet.css" media-type="text/css"/>
${manifestItems}  </manifest>
  <spine toc="ncx">
${spineItems}  </spine>
</package>`;
  zip.file("OEBPS/content.opf", contentOpf);

  // 5. OEBPS/toc.ncx
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD NCX V1.0//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx-2005-1.dtd" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(cleanTitle)}</text>
  </docTitle>
  <navMap>
${navPoints}  </navMap>
</ncx>`;
  zip.file("OEBPS/toc.ncx", tocNcx);

  return await zip.generateAsync({ type: "blob" });
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case "\"": return "&quot;";
      default: return c;
    }
  });
}
