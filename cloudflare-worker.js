export default {
  async fetch(request) {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url');
    const download = url.searchParams.get('download');

    if (!videoUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    // Only allow requests to Bunny CDN
    if (!videoUrl.includes('vz-82cf94cd-f52.b-cdn.net')) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const response = await fetch(videoUrl, {
        headers: {
          // Pass through range requests for video seeking
          'Range': request.headers.get('Range') || '',
        },
      });

      if (!response.ok) {
        return new Response(`Upstream error: ${response.status}`, { status: response.status });
      }

      // Build response headers
      const headers = new Headers();
      headers.set('Content-Type', response.headers.get('Content-Type') || 'video/mp4');
      headers.set('Access-Control-Allow-Origin', '*');

      // Get filename from URL for the download
      const urlPath = new URL(videoUrl).pathname;
      const filename = urlPath.split('/').pop() || 'video.mp4';

      if (download === '1') {
        headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      }

      // Pass through content-length and range headers if present
      const contentLength = response.headers.get('Content-Length');
      if (contentLength) headers.set('Content-Length', contentLength);

      const contentRange = response.headers.get('Content-Range');
      if (contentRange) headers.set('Content-Range', contentRange);

      return new Response(response.body, {
        status: response.status,
        headers,
      });

    } catch (err) {
      return new Response(`Worker error: ${err.message}`, { status: 500 });
    }
  }
};
