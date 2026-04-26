const BUNNY_LIBRARY_ID = "636169";
const BUNNY_CDN_HOST = "vz-82cf94cd-f52.b-cdn.net";
const BUNNY_TUS_ENDPOINT = "https://video.bunnycdn.com/tusupload";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeFileName(value) {
  let name = String(value || "PoppyTV Video").trim();
  name = name.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim();
  if (!name.toLowerCase().endsWith(".mp4")) name += ".mp4";
  return name;
}

function fileNameFromParts(title, year) {
  let name = String(title || "PoppyTV Video").trim();
  if (year) name += " " + String(year).trim();
  return sanitizeFileName(name);
}

async function fetchFirstWorkingVideo(videoId) {
  const heights = [1080, 720, 480, 360, 240];

  for (const h of heights) {
    const url = `https://${BUNNY_CDN_HOST}/${videoId}/play_${h}p.mp4`;
    const res = await fetch(url, {
      headers: { Referer: "https://poppytv.me/" },
    });

    if (res.ok) return res;
  }

  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // UPLOAD: get credentials
    if (request.method === "POST" && url.pathname === "/upload-url") {
      const body = await request.json();
      const title = body.title || "Untitled";

      const res = await fetch(
        `https://video.bunnycdn.com/library/${BUNNY_LIBRARY_ID}/videos`,
        {
          method: "POST",
          headers: {
            AccessKey: env.BUNNY_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title }),
        }
      );

      const video = await res.json();

      return json({
        videoId: video.guid,
        libraryId: BUNNY_LIBRARY_ID,
        tusEndpoint: BUNNY_TUS_ENDPOINT,
      });
    }

    // SAVE metadata
    if (request.method === "POST" && url.pathname === "/save-video") {
      const body = await request.json();

      const entry = {
        id: body.videoId.slice(0, 8),
        videoId: body.videoId,
        title: body.title,
        year: body.year || "",
        category: body.category,
        uploadedAt: new Date().toISOString(),
        originalFileName: body.originalFileName || "",
        thumbnailUrl: `https://${BUNNY_CDN_HOST}/${body.videoId}/thumbnail.jpg`,
      };

      await env.POPPYTV_UPLOADS.put(
        `upload:${body.videoId}`,
        JSON.stringify(entry)
      );

      return json({ success: true, entry });
    }

    // GET uploads
    if (request.method === "GET" && url.pathname === "/uploads") {
      const list = await env.POPPYTV_UPLOADS.list({ prefix: "upload:" });

      const items = await Promise.all(
        list.keys.map(async (k) => {
          const val = await env.POPPYTV_UPLOADS.get(k.name);
          return JSON.parse(val);
        })
      );

      return json({ uploads: items });
    }

    // THUMBNAIL
    if (request.method === "GET" && url.pathname === "/thumbnail") {
      const videoId = url.searchParams.get("videoId");

      return Response.redirect(
        `https://${BUNNY_CDN_HOST}/${videoId}/thumbnail.jpg`,
        302
      );
    }

    // DOWNLOAD (fixed)
    if (request.method === "GET" && url.pathname === "/download") {
      const videoId = url.searchParams.get("videoId");
      const title = url.searchParams.get("title");
      const year = url.searchParams.get("year");
      const filename = url.searchParams.get("filename");

      const upstream = await fetchFirstWorkingVideo(videoId);

      if (!upstream) {
        return new Response("Video not found", { status: 404 });
      }

      const headers = new Headers(CORS);
      headers.set(
        "Content-Disposition",
        `attachment; filename="${
          filename
            ? sanitizeFileName(filename)
            : fileNameFromParts(title, year)
        }"`
      );

      return new Response(upstream.body, { headers });
    }

    return json({ error: "Not found" }, 404);
  },
};
