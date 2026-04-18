export default {
  async fetch(request) {
    const url = new URL(request.url);
    const videoUrl = url.searchParams.get('url');
    const download = url.searchParams.get('download');

    if (!videoUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    if (!videoUrl.includes('vz-82cf94cd-f52.b-cdn.net')) {
      return new Response('Forbidden', { status: 403 });
    }

    const bunnyResponse = await fetch(videoUrl);

    const headers = new Headers(bunnyResponse.headers);
    headers.set('Access-Control-Allow-Origin', '*');

    if (download === '1') {
      const parts = new URL(videoUrl).pathname.split('/');
      const filename = (parts[1] || 'video') + '.mp4';
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    }

    return new Response(bunnyResponse.body, {
      status: bunnyResponse.status,
      headers
    });
  }
};
