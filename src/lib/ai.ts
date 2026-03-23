/**
 * AI 맞춤 해석 API 클라이언트
 */

const API_BASE_URL = process.env.PUBLIC_AI_API_URL ?? '';

export type AiErrorType = 'timeout' | 'network' | 'server' | 'rate-limited' | 'invalid-response';

export class AiError extends Error {
  constructor(
    public readonly type: AiErrorType,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export interface AiRequestParams {
  hexagramNumber: number;
  changingHexagramNumber?: number | null;
  highlightedLines: number[];
  situation: string;
  category: string;
}

export interface AiInterpretation {
  interpretation: string;
  advice: string;
}

async function getDeviceId(): Promise<string | undefined> {
  try {
    const { getDeviceId } = await import('@apps-in-toss/web-bridge');
    return await getDeviceId();
  } catch {
    return undefined;
  }
}

export async function requestAiInterpretation(
  params: AiRequestParams,
  signal?: AbortSignal,
): Promise<AiInterpretation> {
  if (!API_BASE_URL) {
    throw new AiError('server', 'AI API URL이 설정되지 않았습니다');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  // 외부 signal과 내부 timeout 결합
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const deviceId = await getDeviceId();

    const body = {
      hexagramNumber: params.hexagramNumber,
      ...(params.changingHexagramNumber ? { changingHexagramNumber: params.changingHexagramNumber } : {}),
      highlightedLines: params.highlightedLines,
      userContext: {
        situation: params.situation,
        category: params.category,
      },
      ...(deviceId ? { deviceId } : {}),
    };

    const response = await fetch(`${API_BASE_URL}/api/interpret`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw new AiError('rate-limited', '요청이 너무 잦아요. 잠시 후 다시 시도해 주세요');
    }

    if (!response.ok) {
      throw new AiError('server', '일시적인 오류가 발생했어요. 잠시 후 다시 시도해 주세요');
    }

    const data = await response.json();

    if (!data.interpretation || !data.advice) {
      throw new AiError('invalid-response', '응답 형식이 올바르지 않습니다');
    }

    return {
      interpretation: data.interpretation,
      advice: data.advice,
    };
  } catch (error) {
    if (error instanceof AiError) throw error;

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AiError('timeout', '분석에 시간이 걸리고 있어요. 다시 시도해 주세요');
    }

    throw new AiError('network', '네트워크 연결을 확인해 주세요');
  } finally {
    clearTimeout(timeoutId);
  }
}
