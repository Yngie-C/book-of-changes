import { useState, useCallback, useEffect, useRef } from 'react';
import type { AiInterpretation, AiErrorType } from '@/lib/ai';
import { requestAiInterpretation, AiError } from '@/lib/ai';
import { preloadInterstitialAd, showInterstitialAd } from '@/lib/ads';

export type AiState =
  | { status: 'idle' }
  | { status: 'processing' }
  | { status: 'success'; data: AiInterpretation }
  | { status: 'error'; errorType: AiErrorType; message: string; canRetry: boolean };

interface UseAiInterpretationParams {
  hexagramNumber: number;
  changingHexagramNumber: number | null;
  highlightedLines: number[];
}

export function useAiInterpretation({
  hexagramNumber,
  changingHexagramNumber,
  highlightedLines,
}: UseAiInterpretationParams) {
  const [state, setState] = useState<AiState>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  // 전면형 광고 사전 로드 (마운트 시)
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    preloadInterstitialAd().then(c => {
      cleanup = c;
    });

    return () => {
      cleanup?.();
    };
  }, []);

  const requestInterpretation = useCallback(
    async (situation: string, category: string) => {
      // 이전 요청 취소
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ status: 'processing' });

      // 전면형 광고 + AI 요청 병렬 처리
      // 광고가 닫히고 AI 응답도 도착해야 결과 표시
      const adPromise = new Promise<void>((resolve) => {
        showInterstitialAd(resolve).catch(() => resolve());
      });

      const aiPromise = requestAiInterpretation(
        {
          hexagramNumber,
          changingHexagramNumber: changingHexagramNumber ?? undefined,
          highlightedLines,
          situation,
          category,
        },
        controller.signal,
      );

      try {
        const [, data] = await Promise.all([adPromise, aiPromise]);

        if (!controller.signal.aborted) {
          setState({ status: 'success', data });
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        if (error instanceof AiError) {
          setState({
            status: 'error',
            errorType: error.type,
            message: error.message,
            canRetry: error.type !== 'rate-limited',
          });
        } else {
          setState({
            status: 'error',
            errorType: 'network',
            message: '네트워크 연결을 확인해 주세요',
            canRetry: true,
          });
        }
      }
    },
    [hexagramNumber, changingHexagramNumber, highlightedLines],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: 'idle' });
  }, []);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { state, requestInterpretation, reset };
}
