import { proxyOpenAipDetail } from '@/lib/openaip/detailProxy';
import { withApiLogging } from '@/lib/observability/api';

export const dynamic = 'force-dynamic';

export const GET = withApiLogging('/api/openaip/rc-airfields/[id]', async (
  _request: Request,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  return proxyOpenAipDetail('rc-airfields', id);
});
