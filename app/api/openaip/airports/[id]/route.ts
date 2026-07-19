import { proxyOpenAipDetail } from '@/lib/openaip/detailProxy';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  return proxyOpenAipDetail('airports', params.id);
}
