const backendUrl = () => (process.env.RESUMEIQ_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const response = await fetch(`${backendUrl()}/upload`, {
      method: 'POST',
      body: formData,
      cache: 'no-store',
    });
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return Response.json(
      { detail: 'ResumeIQ could not reach the analysis service. Please try again shortly.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
