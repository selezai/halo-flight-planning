import { proxyOpenAipDetail } from '@/lib/openaip/detailProxy';
import { withApiLogging } from '@/lib/observability/apiLogger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withApiLogging(request, '/api/openaip/airports/[id]', () => proxyOpenAipDetail('airports', id));
}
